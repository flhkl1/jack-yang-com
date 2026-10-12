// NDD Copilot demo: put one patient in, get a referral decision out, open the rationale.
// Everything runs client-side from two files exported from the project:
//   pipeline/patients.json   the stored patients, model metadata and field ranges
//   pipeline/forest.bin      the saved RandomForestClassifier as flat arrays
// Input is a dropped CSV or one field at a time. The file never leaves the browser.

const $ = (sel, root = document) => root.querySelector(sel);
const app = $("#app");

const NAMES = {
  1: "Age", 2: "Sex", 3: "Hypertension", 4: "Diabetes", 5: "BMI", 6: "Smoking", 7: "Alcohol intake",
  8: "Physical activity", 9: "Total cholesterol", 12: "Family history of Alzheimer's", 15: "Cardiovascular disease",
  17: "Systolic BP", 18: "Diastolic BP", 19: "HDL cholesterol", 20: "LDL cholesterol", 21: "Triglycerides", 25: "Depression",
  26: "MMSE", 28: "Functional assessment (FAQ)",
};
const BINARY = new Set(["2", "3", "4", "6", "12", "15", "25"]);
// Raw column → schema code, as in src/ingestion/ingest.py (only the ones the model uses).
const COLUMN_TO_CODE = {
  Age: 1, Gender: 2, Hypertension: 3, Diabetes: 4, BMI: 5, Smoking: 6, AlcoholConsumption: 7,
  PhysicalActivity: 8, CholesterolTotal: 9, FamilyHistoryAlzheimers: 12, CardiovascularDisease: 15,
  SystolicBP: 17, DiastolicBP: 18, CholesterolHDL: 19, CholesterolLDL: 20, CholesterolTriglycerides: 21,
  Depression: 25, MMSE: 26, FunctionalAssessment: 28,
};
const BY_LOWER = Object.fromEntries(Object.entries(COLUMN_TO_CODE).map(([c, code]) => [c.toLowerCase(), String(code)]));
const K = 3, THRESHOLD = 0.5;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (v) => (Number.isInteger(v) ? String(v) : Number(v).toFixed(1));
const pct = (p) => `${Math.round(p * 100)}%`;

// ---------- loading ----------
async function load() {
  const base = new URL("pipeline/", import.meta.url);
  const [meta, forestBuf] = await Promise.all([
    fetch(new URL("patients.json", base)).then((r) => r.json()),
    fetch(new URL("forest.bin", base)).then((r) => r.arrayBuffer()),
  ]);
  const [nTrees, n] = new Int32Array(forestBuf, 0, 2);
  let off = 8;
  const take = (Ctor, count, bytes) => { const a = new Ctor(forestBuf, off, count); off += count * bytes; return a; };
  const forest = {
    roots: take(Int32Array, nTrees, 4), thr: take(Float32Array, n, 4), val: take(Float32Array, n, 4),
    left: take(Int32Array, n, 4), right: take(Int32Array, n, 4), feat: take(Int8Array, n, 1),
  };
  const cols = meta.feature_columns;
  const median = cols.map((_, k) => {
    const xs = meta.silver.map((p) => p.x[k]).sort((a, b) => a - b), m = xs.length >> 1;
    return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
  });
  const span = cols.map((c) => meta.ranges[c][1] - meta.ranges[c][0] || 1);
  return { meta, forest, cols, median, span };
}

function predict(x) {
  const { roots, thr, val, left, right, feat } = D.forest;
  let sum = 0;
  for (const root of roots) {
    let node = root;
    while (feat[node] !== -1) node = Math.fround(x[feat[node]]) <= thr[node] ? left[node] : right[node];
    sum += val[node];
  }
  return sum / roots.length;
}

// The stored patients closest to x, by distance over the 19 fields, each scaled by its range.
function nearest(x, skipId) {
  return D.meta.silver.filter((p) => p.id !== skipId).map((p) => {
    let s = 0;
    for (let k = 0; k < x.length; k++) s += ((x[k] - p.x[k]) / D.span[k]) ** 2;
    return { p, sim: 1 - Math.sqrt(s / x.length) };
  }).sort((a, b) => b.sim - a.sim).slice(0, K);
}

// How far each entered value moves the estimate, against the typical value for that
// field (or against the other answer, for a yes/no field).
function effects(x, p) {
  return x.map((v, k) => {
    if (state.x[k] == null) return null;
    const other = [...x];
    other[k] = BINARY.has(D.cols[k]) ? 1 - v : D.median[k];
    return { k, v, delta: p - predict(other) };
  }).filter((e) => e && Math.abs(e.delta) >= 0.005).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
}

// ---------- state ----------
let D, state;
const fresh = () => ({ view: "input", x: [], at: 0, source: null, error: "" });
const label = (k) => NAMES[D.cols[k]];
const shown = (k, v) => (BINARY.has(D.cols[k]) ? (D.cols[k] === "2" ? (v ? "Female" : "Male") : v ? "Yes" : "No") : fmt(v));
const missing = () => D.cols.map((_, k) => k).filter((k) => state.x[k] == null);

// The header row and first record of a CSV, matched to the model's fields by column name.
function readCsv(name, text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const cells = (l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  if (lines.length < 2) return "That file needs a header row and at least one record.";
  const head = cells(lines[0]), row = cells(lines[1]);
  const x = D.cols.map(() => null), kept = [], dropped = [];
  head.forEach((col, j) => {
    const code = BY_LOWER[col.toLowerCase()], v = Number(row[j]);
    if (!code || row[j] === "" || row[j] == null || !Number.isFinite(v)) return void dropped.push(col);
    x[D.cols.indexOf(code)] = v;
    kept.push([col, code, v]);
  });
  if (!kept.length) return "No columns in that file match. It expects names like Age, MMSE and FunctionalAssessment.";
  state = { ...fresh(), x, source: { kind: "file", name, kept, dropped, records: lines.length - 1 } };
  state.asked = missing();
  state.view = state.asked.length ? "ask" : "result";
}

// ---------- views ----------
function inputView() {
  return `<label class="ndd-drop" id="drop">
      <input type="file" id="file" accept=".csv,text/csv" hidden>
      <strong>Drop a patient file here</strong>
      <span class="demo-muted">or click to choose a CSV. It is read in your browser and never uploaded.</span>
    </label>
    ${state.error ? `<p class="ndd-error" role="alert">${esc(state.error)}</p>` : ""}
    <div class="demo-row ndd-or">
      <button type="button" class="demo-btn" id="manual">Enter by hand</button>
      <button type="button" class="demo-btn" id="sample">Use a sample patient</button>
    </div>`;
}

function askView() {
  const k = state.asked[state.at], code = D.cols[k], v = state.x[k];
  const [lo, hi] = D.meta.ranges[code];
  const from = state.source.kind === "file" ? `${esc(state.source.name)} had ${state.source.kept.length} of ${D.cols.length} fields. ` : "";
  const field = BINARY.has(code)
    ? `<div class="demo-row">${[[1, code === "2" ? "Female" : "Yes"], [0, code === "2" ? "Male" : "No"]].map(([val, text]) =>
        `<button type="button" class="demo-btn" data-pick="${val}" aria-pressed="${v === val}">${text}</button>`).join("")}</div>`
    : `<input id="val" class="demo-input" type="number" step="any" inputmode="decimal" value="${v ?? ""}" placeholder="${Math.round(lo)} to ${Math.round(hi)}" aria-describedby="hint">`;
  return `<form class="ndd-ask" id="ask" novalidate>
      <p class="demo-small demo-muted" id="hint">${from}Field ${state.at + 1} of ${state.asked.length}</p>
      <label class="ndd-q" for="val">${esc(label(k))}</label>
      ${field}
      <div class="demo-row ndd-nav">
        <button type="button" class="demo-btn" data-back>Back</button>
        <button type="button" class="demo-btn" data-skip>Skip</button>
        ${BINARY.has(code) ? "" : '<button type="submit" class="demo-btn" aria-pressed="true">Next</button>'}
      </div>
    </form>`;
}

function rationale(x, p, near) {
  const fx = effects(x, p), top = Math.max(...fx.map((e) => Math.abs(e.delta)), 0.01);
  const withDx = near.filter((n) => n.p.y === 1).length;
  const at = (rec, code) => rec.x[D.cols.indexOf(code)];
  return `<details class="ndd-fold"><summary>Rationale</summary>
      <h3>What moved the estimate</h3>
      ${fx.length ? `<div class="ndd-fx">${fx.map((e) => `<span>${esc(label(e.k))} <span class="demo-muted">${esc(shown(e.k, e.v))}</span></span>
        <div class="demo-bar"><span style="width:${(100 * Math.abs(e.delta) / top).toFixed(1)}%"></span></div>
        <span class="v">${e.delta > 0 ? "+" : "−"}${Math.abs(Math.round(e.delta * 100))} pts</span>`).join("")}</div>
      <p class="demo-small demo-muted">Points of risk each value adds or removes, against the typical patient's value.</p>`
      : '<p class="demo-small demo-muted">No single value moves the estimate by a point or more.</p>'}
      <h3>Most similar past patients</h3>
      <p>${withDx} of the ${K} closest were diagnosed with dementia.</p>
      <ul class="ndd-near">${near.map((n) => `<li><span>Patient ${n.p.id}</span>
        <span class="demo-muted">${pct(n.sim)} similar · age ${fmt(at(n.p, "1"))} · MMSE ${fmt(at(n.p, "26"))} · FAQ ${fmt(at(n.p, "28"))}</span>
        <span class="demo-tag ${n.p.y ? "strong" : ""}">${n.p.y ? "Dementia" : "No dementia"}</span></li>`).join("")}</ul>
    </details>`;
}

function diagnostics(x) {
  const s = state.source, m = D.meta.metrics, top = D.meta.importance.slice(0, 10), max = top[0].importance;
  const skipped = missing();
  const file = s.kind !== "file" ? "" : `<h3>The file</h3>
      <p class="demo-small demo-muted">${esc(s.name)}: ${s.records.toLocaleString()} record${s.records === 1 ? "" : "s"}, the first one used. ${s.kept.length} columns mapped onto the schema${s.dropped.length ? `, ${s.dropped.length} had no slot` : ""}.</p>
      <div class="demo-table-wrap ndd-scroll"><table class="demo-kv">${s.kept.map(([col, code, v]) =>
        `<tr><td class="demo-muted">${esc(col)}</td><td>→</td><th>${code}</th><td>${esc(NAMES[code])}</td><td class="num">${fmt(v)}</td></tr>`).join("")}</table></div>
      ${s.dropped.length ? `<p class="ndd-dropped">${s.dropped.map((c) => `<s>${esc(c)}</s>`).join(" ")}</p>` : ""}`;
  return `<details class="ndd-fold ndd-diag"><summary>Diagnostics</summary>
      ${file}
      <h3>What the model was given</h3>
      <div class="demo-table-wrap"><table class="demo-kv">${x.map((v, k) =>
        `<tr><th>${esc(label(k))}</th><td class="num">${esc(shown(k, v))}</td><td class="demo-muted">${skipped.includes(k) ? "skipped, typical value used" : ""}</td></tr>`).join("")}</table></div>
      <h3>The model</h3>
      <p class="demo-small demo-muted">A random forest on ${D.cols.length} fields, trained on ${D.meta.silver.length.toLocaleString()} patients. It refers at ${pct(THRESHOLD)} risk or above.
        Confidence is high below 30% or above 70%, low between 40% and 60%, and medium otherwise. A skipped field is filled with the median of the stored patients.
        Similar patients are the closest by distance over the ${D.cols.length} fields, each scaled by its range.</p>
      <div class="demo-grid">
        <div class="demo-card"><h3>Held-out performance</h3>
          <table class="demo-kv">
            <tr><th>Test ROC-AUC</th><td class="num">${m.test_roc_auc.toFixed(3)}</td></tr>
            <tr><th>5-fold CV ROC-AUC</th><td class="num">${m.cv_roc_auc_mean.toFixed(3)} ± ${m.cv_roc_auc_std.toFixed(3)}</td></tr>
            <tr><th>Test accuracy</th><td class="num">${m.test_accuracy.toFixed(3)}</td></tr>
            <tr><th>Precision / recall</th><td class="num">${m.test_precision.toFixed(3)} / ${m.test_recall.toFixed(3)}</td></tr>
          </table></div>
        <div class="demo-card"><h3>What the model leans on</h3>
          <div class="demo-bars">${top.map((f) => `<span>${esc(NAMES[f.feature])}</span>
            <div class="demo-bar"><span style="width:${(100 * f.importance / max).toFixed(1)}%"></span></div>
            <span class="v">${(f.importance * 100).toFixed(1)}%</span>`).join("")}</div></div>
      </div>
    </details>`;
}

function resultView() {
  const x = state.x.map((v, k) => v ?? D.median[k]);
  const p = predict(x), near = nearest(x, state.source.id);
  const confidence = p < 0.3 || p > 0.7 ? "high" : p < 0.4 || p > 0.6 ? "medium" : "low";
  return `<p class="demo-small demo-muted">Decision</p>
    <p class="ndd-decision">${p >= THRESHOLD ? "Refer to a specialist" : "No referral"}</p>
    <p class="ndd-sub">Estimated dementia risk ${pct(p)}, ${confidence} confidence.</p>
    ${rationale(x, p, near)}
    ${diagnostics(x)}
    <div class="demo-row ndd-or"><button type="button" class="demo-btn" id="again">Start over</button></div>`;
}

function render() {
  app.innerHTML = { input: inputView, ask: askView, result: resultView }[state.view]();
  if (state.view === "ask") $("#val")?.focus();
}

// ---------- actions ----------
function step(by) {
  state.at += by;
  if (state.at < 0) state = fresh();
  else if (state.at >= state.asked.length) state.view = "result";
  render();
}

function takeFile(file) {
  if (!file) return;
  if (file.size > 5e6) { state.error = "That file is over 5 MB. One record is enough."; return render(); }
  file.text().then((text) => {
    const error = readCsv(file.name, text);
    if (error) state = { ...fresh(), error };
    render();
  });
}

app.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.id === "again") { state = fresh(); return render(); }
  if (t.id === "manual") {
    state = { ...fresh(), view: "ask", x: D.cols.map(() => null), asked: D.cols.map((_, k) => k), source: { kind: "manual" } };
    return render();
  }
  if (t.id === "sample") {
    const p = D.meta.silver[Math.floor(Math.random() * D.meta.silver.length)];
    state = { ...fresh(), view: "result", x: [...p.x], source: { kind: "sample", id: p.id } };
    return render();
  }
  if (t.dataset.pick) { state.x[state.asked[state.at]] = Number(t.dataset.pick); return step(1); }
  if ("skip" in t.dataset) { state.x[state.asked[state.at]] = null; return step(1); }
  if ("back" in t.dataset) return step(-1);
});

app.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = $("#val").value.trim(), v = Number(raw);
  if (raw === "" || !Number.isFinite(v)) return $("#val").focus();
  state.x[state.asked[state.at]] = v;
  step(1);
});

app.addEventListener("change", (e) => { if (e.target.id === "file") takeFile(e.target.files[0]); });

// A file dropped anywhere on the page counts, and never navigates away from it.
document.addEventListener("dragover", (e) => { e.preventDefault(); $("#drop")?.classList.add("over"); });
document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) $("#drop")?.classList.remove("over"); });
document.addEventListener("drop", (e) => {
  e.preventDefault();
  $("#drop")?.classList.remove("over");
  if (state.view === "input") takeFile(e.dataTransfer.files[0]);
});

load().then((data) => {
  D = data;
  state = fresh();
  render();
}).catch((err) => {
  app.innerHTML = `<p>Could not load the model: ${esc(err.message)}</p>`;
});
