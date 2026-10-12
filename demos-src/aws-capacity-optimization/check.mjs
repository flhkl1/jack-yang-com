// Checks the capacity demo: the served files match the seeded generator, and every proposal
// the resolver makes for the queued tickets adds up against the raw stores.
// Usage: node check.mjs
import { readFileSync } from "node:fs";
import { build } from "./build_sim.mjs";
import { BUFFER, makeStores, makeTools, resolve } from "../../public/demos/aws-capacity-optimization/engine.js";

const read = (name) => JSON.parse(readFileSync(new URL(`../../public/demos/aws-capacity-optimization/sim/${name}`, import.meta.url), "utf8"));
const live = read("live.json"), snapshot = read("snapshot.json");

let failed = 0;
function check(label, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
}

const fresh = build();
check("live.json matches the generator", JSON.stringify(fresh.live) === JSON.stringify(live));
check("snapshot.json matches the generator", JSON.stringify(fresh.snapshot) === JSON.stringify(snapshot));

// Written separately from engine.js on purpose, straight off the raw files.
const stores = makeStores(live, snapshot), tools = makeTools(stores);
const all = () => [...stores.rows.values()];
const cap = (region, model) => snapshot.objects[`pools/${region}/${model}.json`].capacity;
const allocated = (region, model) => all().filter((r) => r.region === region && r.model === model).reduce((a, r) => a + r.allocated, 0);
const total = () => all().reduce((a, r) => a + r.allocated, 0);
const pools = () => snapshot.objects["index.json"].regions.flatMap((r) => snapshot.objects["index.json"].models.map((m) => [r, m]));

check("no pool starts over capacity", pools().every(([r, m]) => allocated(r, m) <= cap(r, m)));
check("no row uses more than it holds", all().every((r) => r.used <= r.allocated));

for (const t of live.tickets) {
  const row = stores.rows.get(`${t.account}|${t.region}`);
  const free = cap(t.region, row.model) - allocated(t.region, row.model);
  const before = total();
  const { proposal: p } = resolve(t, tools);
  console.log(`\n${t.id} ${t.account} ${t.region} +${t.units} ${row.model} (free ${free}) -> ${p.action}: ${p.summary}`);

  check(`${t.id} grants exactly when free capacity covers it`, (p.action === "grant") === (free >= t.units));
  if (p.action === "escalate") { check(`${t.id} escalation changes nothing`, p.moves.length === 0); continue; }

  const gain = p.moves.filter((m) => m.account === t.account).reduce((a, m) => a + m.delta, 0);
  const taken = -p.moves.filter((m) => m.delta < 0).reduce((a, m) => a + m.delta, 0);
  check(`${t.id} requester gains the requested units`, gain === t.units, `${gain} of ${t.units}`);
  if (p.action === "reclaim") check(`${t.id} reclaim plus free equals the request`, taken + free === t.units, `${taken} + ${free}`);
  else check(`${t.id} takes nothing from other accounts`, taken === 0);
  if (p.action === "redirect") check(`${t.id} redirects to a different region`, p.moves[0].region !== t.region);

  tools["live.apply_moves"]({ moves: p.moves });
  check(`${t.id} total allocation moves by request minus reclaimed`, total() - before === t.units - taken);
  check(`${t.id} leaves every pool within capacity`, pools().every(([r, m]) => allocated(r, m) <= cap(r, m)));
  check(`${t.id} leaves donors above their floor`, p.moves.filter((m) => m.delta < 0).every((m) => {
    const d = stores.rows.get(`${m.account}|${m.region}`);
    const peak = snapshot.objects[`peaks/${m.region}/${m.model}.json`][m.account];
    return d.allocated >= Math.ceil(Math.max(d.used, peak) * BUFFER);
  }));
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
