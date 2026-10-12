// Checks the demo's in-browser statistics against the numbers the bench itself reported.
// Usage: node check.mjs <analysis.json>   (the same file export_sweep.py was given)
import { readFileSync } from "node:fs";
import { bootstrap, composite, scoreTerms, summarise } from "../../public/demos/vcdr-bench-harness/stats.js";

const analysis = JSON.parse(readFileSync(process.argv[2], "utf8"));
const demo = JSON.parse(readFileSync(new URL("../../public/demos/vcdr-bench-harness/sweep/sweep.json", import.meta.url), "utf8"));

let failed = 0;
function close(label, got, want, tol) {
  const ok = want == null ? got == null : got != null && Math.abs(got - want) <= tol;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: demo ${got == null ? "n/a" : +got.toFixed(4)} vs bench ${want == null ? "n/a" : +want.toFixed(4)}`);
}

for (const c of demo.configs) {
  const want = analysis.per_config[c.key];
  const s = summarise(demo.runs.filter((r) => r.config === c.key));
  close(`${c.key} runs`, s.n, want.n, 0);
  close(`${c.key} mean coverage`, s.meanCoverage, want.mean_coverage, 1e-9);
  close(`${c.key} mean turns`, s.meanTurns, want.mean_agent_turns, 1e-9);
  for (const k of ["stt", "llm", "tts", "e2e"]) close(`${c.key} ${k} p50`, s.p50[k], want.latency[`${k}_p50`], 1e-6);
  // The bench drew its own random resamples, so intervals agree only approximately.
  if (s.coverage.length > 1) {
    const b = bootstrap(s.coverage);
    close(`${c.key} coverage CI low`, b.lo, want.coverage_ci95[0], 0.03);
    close(`${c.key} coverage CI high`, b.hi, want.coverage_ci95[1], 0.03);
  }
  const e = bootstrap(s.e2e);
  close(`${c.key} e2e mean CI low`, e.lo, want.latency.e2e_ci95[0], want.latency.e2e_mean * 0.02);
  close(`${c.key} e2e mean CI high`, e.hi, want.latency.e2e_ci95[1], want.latency.e2e_mean * 0.02);
}
close("total runs", demo.runs.length, analysis.n_runs, 0);

// Optional: check the aggregate score against a sweep the bench has scored itself.
//   node check.mjs <analysis.json> --scored <that sweep's analysis.json> <its scored.json>
const at = process.argv.indexOf("--scored");
if (at > -1) {
  const scoredRuns = JSON.parse(readFileSync(process.argv[at + 1], "utf8")).runs.map((r) => ({
    config: r.label, status: r.completion_status || "untracked", turns: r.agent_turns, e2e: r.stages.e2e,
    anchors: r.anchors_total == null ? null : [r.anchors_reached, r.anchors_total],
  }));
  const scored = JSON.parse(readFileSync(process.argv[at + 2], "utf8")).per_config;
  for (const [label, want] of Object.entries(scored)) {
    const terms = scoreTerms(scoredRuns.filter((r) => r.config === label));
    for (const k of ["quality", "completion", "efficiency"]) close(`${label} ${k}`, terms[k], want.composite.axes[k], 1e-4);
    close(`${label} score`, composite(terms), want.composite.value, 1e-4);
  }
}
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exit(failed ? 1 : 0);
