// Generates the capacity demo's two simulated stores and its ticket queue from a fixed seed.
// Everything it writes is invented: no account, region, model or number comes from AWS.
// Usage: node build_sim.mjs public/demos/aws-capacity-optimization/sim
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SEED = 29;
const REGIONS = ["north-1", "east-1", "south-1", "west-1"];
const MODELS = ["model-s", "model-m", "model-l"];
const SLACK = [1, 1.05, 1.15, 1.4]; // how much larger than its allocations a pool is
const ASKS = [10, 20, 30, 40, 60, 90, 150];
const SEVERITIES = [2, 3, 3, 4, 4, 5];
const REASONS = [
  "ahead of a planned launch",
  "to cover a traffic increase",
  "for a batch evaluation job",
  "after repeated throttling at peak",
  "for a workload that is moving over",
  "to restore headroom after growth",
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function build(seed = SEED) {
  const rand = mulberry32(seed);
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];

  const rows = [];
  for (let i = 1; i <= 18; i++) {
    const account = `acct-${String(i).padStart(2, "0")}`;
    const order = REGIONS.map((r) => [rand(), r]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    for (const region of order.slice(0, 1 + Math.floor(rand() * 3))) {
      const allocated = 20 + 10 * Math.floor(rand() * 15);
      const used = Math.round(allocated * (0.35 + 0.6 * rand()));
      const peak = Math.min(allocated, Math.round(used * (1 + 0.3 * rand())));
      rows.push({ account, region, model: pick(MODELS), allocated, used, peak });
    }
  }
  rows.sort((a, b) => a.region.localeCompare(b.region) || a.account.localeCompare(b.account));

  const objects = { "index.json": { regions: REGIONS, models: MODELS } };
  for (const region of REGIONS) {
    for (const model of MODELS) {
      const inPool = rows.filter((r) => r.region === region && r.model === model);
      const total = inPool.reduce((a, r) => a + r.allocated, 0);
      objects[`pools/${region}/${model}.json`] = { capacity: total ? Math.ceil((total * pick(SLACK)) / 10) * 10 : 60 };
      objects[`peaks/${region}/${model}.json`] = Object.fromEntries(inPool.map((r) => [r.account, r.peak]));
    }
  }

  const tickets = [];
  const taken = new Set();
  while (tickets.length < 10) {
    const row = pick(rows);
    if (taken.has(row)) continue;
    taken.add(row);
    tickets.push({ id: `T-${101 + tickets.length}`, account: row.account, region: row.region, model: row.model, units: pick(ASKS), held: row.allocated });
  }
  // What a ticket tool shows around the request. Drawn after the requests so they stay put.
  tickets.forEach((t, i) => {
    const opened = 8 * 60 + 10 + i * 19;
    t.title = `Capacity increase: ${t.model} in ${t.region} (+${t.units})`;
    t.body = `${t.account} needs ${t.units} more units of ${t.model} in ${t.region} ${pick(REASONS)}. Current allocation is ${t.held} units.`;
    t.severity = pick(SEVERITIES);
    t.requester = `30${String(Math.floor(rand() * 1e10)).padStart(10, "0")}`; // made up, shaped like a 12-digit account id
    t.opened = `${String(Math.floor(opened / 60)).padStart(2, "0")}:${String(opened % 60).padStart(2, "0")}`;
    delete t.held;
  });

  return {
    live: { seed, clock: "11:42", rows: rows.map(({ peak, ...r }) => r), tickets },
    snapshot: { seed, clock: "06:00", objects },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: node build_sim.mjs <output-folder>");
  const { live, snapshot } = build();
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/live.json`, JSON.stringify(live, null, 1) + "\n");
  writeFileSync(`${out}/snapshot.json`, JSON.stringify(snapshot, null, 1) + "\n");
  console.log(`wrote ${live.rows.length} live rows, ${Object.keys(snapshot.objects).length} cached objects, ${live.tickets.length} tickets`);
}
