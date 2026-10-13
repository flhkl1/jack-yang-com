// vCDR-bench demo: choose a speech-to-text model, run it, read the score.
// Everything else sits under Diagnostics. Results are replayed from one recorded sweep.
import { WEIGHTS, composite, nearestRank, scoreTerms, summarise } from "./stats.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v) => (v == null ? "–" : `${Math.round(v * 100)}%`);
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
const TERMS = { quality: "Quality", completion: "Completion", efficiency: "Efficiency", protocol: "Protocol" };
// The interview setup the sweep held fixed while the speech-to-text model changed.
const LLM = "gpt-4o-mini";
// The model the page opens on.
const DEFAULT_STT = "whisper-large-v3-turbo";

let D, timer;
const app = $("#app"), sttPick = $("#stt"), runBtn = $("#run");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

const runsOf = (key) => D.runs.filter((r) => r.config === key);
const scoreOf = (key) => composite(scoreTerms(runsOf(key)));
const configFor = (stt, llm = LLM) => D.configs.find((c) => c.stt === stt && c.llm === llm);
const out100 = (v) => (v == null ? "–" : Math.round(v * 100));

function diagnostics(c) {
  const runs = runsOf(c.key), s = summarise(runs), terms = scoreTerms(runs);
  const termRows = Object.keys(TERMS).map((k) => `<span>${TERMS[k]} <span class="demo-muted">× ${WEIGHTS[k]}</span></span>
    <span class="vb-bar"><i style="width:${(terms[k] ?? 0) * 100}%"></i></span><span class="v">${pct(terms[k])}</span>`).join("");
  const stage = (label, v) => `<tr><th>${label}</th><td class="num">${secs(v)}</td></tr>`;
  const llms = [...new Set(D.configs.map((x) => x.llm))];
  const models = [...new Set(D.configs.map((x) => x.stt))].map((stt) => `<tr${stt === c.stt ? ' aria-current="true"' : ""}><td>${esc(stt)}</td>
    ${llms.map((l) => `<td class="num">${out100(scoreOf(configFor(stt, l).key))}</td>`).join("")}</tr>`).join("");
  const runRows = runs.map((r, i) => `<tr><td class="num">${i + 1}</td><td>${esc(r.status)}</td><td class="num">${r.turns}</td>
    <td class="num">${r.anchors ? pct(r.anchors[0] / r.anchors[1]) : "–"}</td>
    <td class="num">${r.e2e.length ? secs(nearestRank(r.e2e, 0.95)) : "–"}</td></tr>`).join("");
  const { tracked } = terms.detail;
  return `<details class="vb-diag"><summary>Diagnostics</summary>
    <div class="vb-grid">
      <div><h3>What the score is made of</h3><div class="vb-terms">${termRows}</div>
        <p class="demo-small demo-muted">${tracked ? `${tracked} of ${runs.length} runs recorded an outcome.` : `No run recorded an outcome, so the score is latency only.`}
          Terms with no data are left out. Protocol tests did not run in this sweep.</p></div>
      <div><h3>Median latency per turn</h3><table class="demo-kv">
        ${stage("Speech to text", s.p50.stt)}${stage("Language model", s.p50.llm)}${stage("Text to speech", s.p50.tts)}${stage("End to end", s.p50.e2e)}</table></div>
      <div><h3>Score by model</h3><table class="demo-kv vb-rank"><thead><tr><th>Speech to text</th>${llms.map((l) => `<th class="num">${esc(l)}</th>`).join("")}</tr></thead>
        <tbody>${models}</tbody></table></div>
    </div>
    <h3>Runs</h3>
    <div class="demo-table-wrap"><table class="demo-kv">
      <thead><tr><th class="num">#</th><th>Outcome</th><th class="num">Turns</th><th class="num">Script covered</th><th class="num">p95 latency</th></tr></thead>
      <tbody>${runRows}</tbody></table></div>
    <p class="demo-small demo-muted">Untracked runs hit the time limit before an outcome was recorded.
      <a href="https://github.com/flhkl1/jack-yang-com/tree/main/demos-src/vcdr-bench-harness" target="_blank" rel="noopener noreferrer">Export and check scripts</a></p>
  </details>`;
}

function result(c) {
  const runs = runsOf(c.key), score = Math.round(scoreOf(c.key) * 100);
  app.innerHTML = `<p class="vb-score"><b id="score">${still ? score : 0}</b><span>/ 100</span></p>
    <p class="demo-small demo-muted vb-basis">Recorded results from ${runs.length} simulated interviews.</p>${diagnostics(c)}`;
  if (still) return;
  const el = $("#score"), t0 = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / 500);
    el.textContent = Math.round(score * p);
    if (p < 1) timer = requestAnimationFrame(tick);
  };
  timer = requestAnimationFrame(tick);
}

// One dot per interview fills in, then the score appears.
function run() {
  stop();
  const c = configFor(sttPick.value), n = runsOf(c.key).length;
  if (still) { result(c); return; }
  runBtn.disabled = true;
  app.innerHTML = `<div class="vb-running"><div class="vb-dots">${"<i></i>".repeat(n)}</div>
    <p class="demo-small demo-muted" id="progress">Interview 1 of ${n}</p></div>`;
  const dots = app.querySelectorAll(".vb-dots i");
  let k = 0;
  timer = setInterval(() => {
    dots[k].classList.add("done");
    k++;
    if (k < n) { $("#progress").textContent = `Interview ${k + 1} of ${n}`; return; }
    clearInterval(timer);
    timer = setTimeout(() => { runBtn.disabled = false; result(c); }, 250);
  }, 160);
}

function stop() {
  clearInterval(timer); clearTimeout(timer); cancelAnimationFrame(timer);
  runBtn.disabled = false;
}

runBtn.addEventListener("click", run);
sttPick.addEventListener("change", () => { stop(); app.innerHTML = ""; });

fetch(new URL("sweep/sweep.json", import.meta.url)).then((r) => r.json()).then((d) => {
  D = d;
  const models = D.configs.filter((c) => c.llm === LLM);
  sttPick.innerHTML = models.map((c) => `<option value="${esc(c.stt)}">${esc(c.stt)}</option>`).join("");
  sttPick.value = DEFAULT_STT;
  $("#interview").innerHTML = `<option>vCDR · ${esc(LLM)} · ${esc(D.fixed.tts)} voice</option>`;
  runBtn.disabled = false;
}).catch((err) => {
  app.innerHTML = `<p class="demo-muted">The sweep data could not be loaded (${esc(err.message)}).</p>`;
});
