// The statistics the demo recomputes from the raw runs. Kept free of DOM code so
// demos-src/vcdr-bench-harness/check.mjs can run the same functions under Node.

export const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Linear-interpolated quantile, the same convention the bench's analysis uses.
export function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

// Small seeded generator, so a given seed always draws the same resamples.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Percentile bootstrap on the mean: resample with replacement, take the middle 95%.
export function bootstrap(xs, seed = 1, resamples = 2000) {
  const rand = rng(seed), n = xs.length, means = new Float64Array(resamples);
  for (let b = 0; b < resamples; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += xs[Math.floor(rand() * n)];
    means[b] = sum / n;
  }
  return { means, lo: quantile(means, 0.025), hi: quantile(means, 0.975) };
}

// One config's runs reduced to the numbers the tables show.
export function summarise(runs) {
  const tracked = runs.filter((r) => r.anchors);
  const coverage = tracked.map((r) => r.anchors[0] / r.anchors[1]);
  const pool = (k) => runs.flatMap((r) => r[k]);
  const p50 = (k) => quantile(pool(k), 0.5);
  return {
    n: runs.length,
    tracked: tracked.length,
    coverage,
    meanCoverage: coverage.length ? mean(coverage) : null,
    meanTurns: mean(runs.map((r) => r.turns)),
    turns: pool("e2e").length,
    e2e: pool("e2e"),
    p50: { stt: p50("stt"), llm: p50("llm"), tts: p50("tts"), e2e: p50("e2e") },
  };
}

// ---------------------------------------------------------------- aggregate score
// The benchmark's published weights and constants.
export const WEIGHTS = { protocol: 0.35, quality: 0.3, completion: 0.2, efficiency: 0.15 };
const EFFICIENCY = { turns: 0.6, latency: 0.4, idealTurns: 16, maxTurns: 60, targetP95: 3000, maxP95: 15000 };
const clamp = (v) => Math.min(1, Math.max(0, v));

// Kaplan-Meier median turns to completion. A run that never completed is censored:
// it needed more turns than were observed. Null when the curve never reaches one half.
export function kmMedian(observations) {
  const times = [...new Set(observations.map((o) => o.time))].sort((a, b) => a - b);
  let survival = 1;
  for (const t of times) {
    const atRisk = observations.filter((o) => o.time >= t).length;
    const events = observations.filter((o) => o.time === t && o.event).length;
    survival *= 1 - events / atRisk;
    if (survival <= 0.5) return t;
  }
  return null;
}

// The bench takes each run's own latency percentile by nearest rank, not by interpolation.
export function nearestRank(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}

// Weighted mean over the terms that have a value, so a missing term is left out, not zeroed.
export function composite(terms, weights = WEIGHTS) {
  let sum = 0, total = 0;
  for (const k of Object.keys(weights)) {
    if (terms[k] == null) continue;
    sum += weights[k] * terms[k];
    total += weights[k];
  }
  return total ? sum / total : null;
}

// The four terms for one configuration's runs. Protocol needs the behavioural tests,
// which did not run for this sweep, so it is null. Quality has one resolved metric here:
// checkpoint coverage on completed runs.
export function scoreTerms(runs) {
  const tracked = runs.filter((r) => r.anchors);
  const completed = tracked.filter((r) => r.status === "completed");
  const median = kmMedian(tracked.map((r) => ({ time: r.turns, event: r.status === "completed" })));
  // An undefined median scores 0: mostly not finishing is a fact about the configuration.
  const turns = median == null ? 0 : clamp((EFFICIENCY.maxTurns - median) / (EFFICIENCY.maxTurns - EFFICIENCY.idealTurns));
  const p95s = runs.filter((r) => r.e2e.length).map((r) => nearestRank(r.e2e, 0.95));
  const p95 = p95s.length ? quantile(p95s, 0.5) : null;
  const latency = p95 == null ? null : clamp((EFFICIENCY.maxP95 - p95) / (EFFICIENCY.maxP95 - EFFICIENCY.targetP95));
  const parts = [[turns, EFFICIENCY.turns], [latency, EFFICIENCY.latency]].filter(([v]) => v != null);
  const weight = parts.reduce((a, [, w]) => a + w, 0);
  return {
    protocol: null,
    quality: completed.length ? mean(completed.map((r) => r.anchors[0] / r.anchors[1])) : null,
    completion: tracked.length ? completed.length / tracked.length : null,
    efficiency: weight ? parts.reduce((a, [v, w]) => a + v * w, 0) / weight : null,
    detail: { tracked: tracked.length, completed: completed.length, median, turns, p95, latency },
  };
}
