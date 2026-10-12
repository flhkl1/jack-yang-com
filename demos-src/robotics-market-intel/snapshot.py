"""Build a static JSON snapshot of the Robotics Market Intel API by calling the real route functions."""
import json, sys, types
from pathlib import Path
# Usage: python snapshot.py <out_dir> <path to the unbox repo>
sys.path[:0] = [str(Path(__file__).parent / "stubs"), str(Path(sys.argv[2]).resolve())]
import os; os.chdir(sys.argv[2])
from app import db
from app.routes import corpus, interviews, matrix, taxonomy, vectors, versions

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
EXCERPT = 600
def cut(text):
    text = (text or "").strip()
    return text if len(text) <= EXCERPT else text[:EXCERPT].rstrip() + " …"

db.init_db()
req = types.SimpleNamespace(app=types.SimpleNamespace(state=types.SimpleNamespace(scheduler=None)))
records = corpus.list_records(limit=500, offset=0)["items"]
for r in records: r["raw_text"] = cut(r["raw_text"])
vlist = versions.list_versions()
snap = {
    "generated_from": "data/corpus.db",
    "records": records,  # newest first, same order as the API
    "GET /api/corpus/stats": corpus.corpus_stats(),
    "GET /api/harvest/runs": corpus.list_runs(limit=200),
    "GET /api/harvest/status": corpus.harvest_status(req),
    "GET /api/interview-guide": interviews.list_guide(),
    "GET /api/interview-guide/suggestions": interviews.guide_suggestions(window_days=30, limit=5),
    "GET /api/interviews": interviews.list_interviews(),
    "GET /api/matrix": matrix.get_matrix(),
    "GET /api/taxonomy": taxonomy.get_taxonomy(),
    "GET /api/vectors": vectors.get_vectors(True),
    "GET /api/vectors?include_inactive=false": vectors.get_vectors(False),
    "GET /api/versions": vlist,
    "GET /api/versions/preflight": versions.version_preflight(),
    "GET /api/protocol": versions.protocol(),
}
for v in vlist:
    full = versions.get_version(v["id"])
    snap[f"GET /api/versions/{v['id']}"] = full
    (OUT / f"report-v{v['id']}.md").write_text(full["report_md"])
with db.connect() as conn:
    rows = conn.execute(f"SELECT {', '.join(corpus.EXPORT_FIELDS)} FROM records ORDER BY seq").fetchall()
(OUT / "corpus.jsonl").write_text("".join(json.dumps({**dict(r), "raw_text": cut(r["raw_text"])}) + "\n" for r in rows))
(OUT / "snapshot.json").write_text(json.dumps(snap, separators=(",", ":")))
print({k: (len(v) if isinstance(v, list) else "ok") for k, v in snap.items()})
