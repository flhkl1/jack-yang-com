"""Export NDD Copilot's pipeline outputs for the static demo at /demos/ndd-copilot/.

Run from the ndd-copilot repo root:  python export_ndd.py <out_dir>
Reads (does not modify):
  data/bronze/alzheimers_disease_data.csv    Kaggle Alzheimer's Disease Dataset (synthetic)
  data/silver/alzheimers_disease_data.csv    output of src/ingestion/ingest.py
  data/gold/chroma_db/                       output of src/ingestion/vectorize.py
  models/dementia_classifier.pkl             output of scripts/train_model.py
Writes:
  patients.json    bronze rows, silver rows + vignettes, model metadata
  embeddings.f16   N x 384 float16, unit-normalised, in silver row order
  forest.bin       the random forest as flat arrays (see the layout note below)
"""
import json
import pickle
import sqlite3
import struct
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "ndd-demo")
OUT.mkdir(parents=True, exist_ok=True)

# ---- gold: read vectors straight out of ChromaDB's files (no chromadb install needed)
seg = next(p for p in Path("data/gold/chroma_db").iterdir() if p.is_dir())
header = (seg / "header.bin").read_bytes()
_, _, count, size, label_off, data_off = struct.unpack_from("<6Q", header, 4)   # 4-byte version prefix
level0 = (seg / "data_level0.bin").read_bytes()
dim = (label_off - data_off) // 4
meta = pickle.load(open(seg / "index_metadata.pickle", "rb"))
emb = {}
for i in range(count):
    label = struct.unpack_from("<Q", level0, i * size + label_off)[0]
    emb[meta["label_to_id"][label]] = np.frombuffer(level0, "<f4", dim, i * size + data_off).copy()
con = sqlite3.connect("file:data/gold/chroma_db/chroma.sqlite3?mode=ro", uri=True)
for pid, vec in con.execute("SELECT id, vector FROM embeddings_queue ORDER BY seq_id"):   # not yet flushed to HNSW
    emb[pid] = np.frombuffer(vec, "<f4").copy()

bronze = pd.read_csv("data/bronze/alzheimers_disease_data.csv").drop(columns=["DoctorInCharge"])
silver = pd.read_csv("data/silver/alzheimers_disease_data.csv")
ids = [str(int(x)) for x in silver["0"]]
E = np.stack([emb[i] for i in ids]).astype(np.float32)
E /= np.linalg.norm(E, axis=1, keepdims=True)
E.astype(np.float16).tofile(OUT / "embeddings.f16")

# ---- model: flatten the forest. Layout: int32 nTrees, int32 nNodes, int32 roots[nTrees],
#      float32 threshold[n], float32 p_dementia[n], int32 left[n], int32 right[n], int8 feature[n] (-1 = leaf)
pkg = joblib.load("models/dementia_classifier.pkl")
model, feats = pkg["model"], pkg["feature_columns"]
X = silver[feats].to_numpy(float)
roots, feat, thr, left, right, val = [], [], [], [], [], []
for est in model.estimators_:
    t, base = est.tree_, len(feat)
    roots.append(base)
    v = t.value[:, 0, :]
    p1 = v[:, 1] / v.sum(1)
    for n in range(t.node_count):
        leaf = t.children_left[n] == -1
        feat.append(-1 if leaf else int(t.feature[n]))
        thr.append(float(t.threshold[n]))
        left.append(-1 if leaf else base + int(t.children_left[n]))
        right.append(-1 if leaf else base + int(t.children_right[n]))
        val.append(float(p1[n]))
feat, thr = np.array(feat, np.int8), np.array(thr, np.float32)
left, right, val = np.array(left, np.int32), np.array(right, np.int32), np.array(val, np.float32)


def forest_proba(x):
    total = 0.0
    for r in roots:
        n = r
        while feat[n] != -1:
            n = left[n] if np.float32(x[feat[n]]) <= thr[n] else right[n]
        total += val[n]
    return total / len(roots)


sk = model.predict_proba(X)[:, 1]
assert np.abs(np.array([forest_proba(x) for x in X]) - sk).max() < 1e-6, "flattened forest disagrees with sklearn"
with open(OUT / "forest.bin", "wb") as f:
    np.array([len(roots), len(feat)], np.int32).tofile(f)
    for arr in (np.array(roots, np.int32), thr, val, left, right, feat):
        arr.tofile(f)

# ---- patients
out = {
    "feature_columns": feats, "bronze_columns": list(bronze.columns),
    "metrics": pkg["training_metrics"], "importance": pkg["feature_importance"],
    "ranges": {f: [float(X[:, i].min()), float(X[:, i].max())] for i, f in enumerate(feats)},
    "bronze": [[round(v, 3) if isinstance(v, float) else (int(v) if hasattr(v, "item") else v) for v in row]
               for row in bronze.itertuples(index=False)],
    "silver": [{"id": int(r["0"]), "x": [round(float(r[f]), 4) for f in feats], "y": int(r["39"]),
                "vignette": r["clinical_vignette"], "p": round(float(sk[k]), 4)} for k, r in silver.iterrows()],
}
(OUT / "patients.json").write_text(json.dumps(out, separators=(",", ":")))
for f in sorted(OUT.iterdir()):
    print(f.name, f.stat().st_size)
