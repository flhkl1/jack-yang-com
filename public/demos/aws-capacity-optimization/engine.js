// Capacity demo logic, kept free of the DOM so demos-src/aws-capacity-optimization/check.mjs
// can run it too: two simulated stores, the tool server in front of them, and the resolver.
//
// Live store:   one row per account and region -> { model, allocated, used }.
// Cached store: a snapshot of objects addressed by path, holding the slow-moving data
//               (pool sizes and each account's 7-day peak use).

export const BUFFER = 1.1; // an account keeps 10% above its recent peak before anything is reclaimed
export const key = (account, region) => `${account}|${region}`;
export const floorFor = (row, peak) => Math.ceil(Math.max(row.used, peak ?? row.used) * BUFFER);

export function makeStores(live, snapshot) {
  return { rows: new Map(live.rows.map((r) => [key(r.account, r.region), { ...r }])), snap: snapshot };
}

// The only way the resolver touches either store.
export function makeTools(stores) {
  return {
    "live.get_allocation": ({ account, region }) => stores.rows.get(key(account, region)) ?? null,
    "live.list_allocations": ({ region, model }) =>
      [...stores.rows.values()]
        .filter((r) => r.region === region && r.model === model)
        .map(({ account, allocated, used }) => ({ account, allocated, used })),
    "cache.get_object": ({ path }) => stores.snap.objects[path] ?? null,
    "live.apply_moves": ({ moves }) => {
      for (const m of moves) {
        const k = key(m.account, m.region);
        const row = stores.rows.get(k) ?? { account: m.account, region: m.region, model: m.model, allocated: 0, used: 0 };
        row.allocated += m.delta;
        stores.rows.set(k, row);
      }
      return { applied: moves.length };
    },
  };
}

// Works one ticket and returns every step it took plus a proposal. It never writes.
export function resolve(ticket, tools) {
  const trace = [];
  const call = (tool, args) => {
    const result = tools[tool](args);
    trace.push({ kind: "tool", tool, args, result: structuredClone(result) });
    return result;
  };
  const think = (text) => trace.push({ kind: "think", text });
  const done = (proposal) => ({ trace, proposal });
  const { account, region, units } = ticket;

  const pool = (r, model) => {
    const capacity = call("cache.get_object", { path: `pools/${r}/${model}.json` })?.capacity ?? 0;
    const rows = call("live.list_allocations", { region: r, model });
    const allocated = rows.reduce((a, x) => a + x.allocated, 0);
    return { capacity, rows, allocated, free: Math.max(0, capacity - allocated) };
  };

  const mine = call("live.get_allocation", { account, region });
  if (!mine) {
    think(`${account} has no allocation in ${region}, so there is no model to size this against.`);
    return done({ action: "escalate", summary: `No existing allocation for ${account} in ${region}. A person needs to pick the model.`, moves: [] });
  }
  const model = mine.model;
  think(`${account} runs ${model} in ${region}: ${mine.allocated} units allocated, ${mine.used} in use. The request is for ${units} more.`);

  const here = pool(region, model);
  think(`The ${region} pool for ${model} holds ${here.capacity} units (cached) and ${here.allocated} are allocated (live), which leaves ${here.free} free.`);
  if (here.free >= units) {
    think(`${here.free} free covers ${units}. No other account is affected.`);
    return done({
      action: "grant",
      summary: `Grant ${units} units from free capacity in ${region}.`,
      moves: [{ account, region, model, delta: units }],
    });
  }

  // Not enough free capacity: look for allocation that other accounts are not using.
  let short = units - here.free;
  think(`That is ${short} short. Check whether other accounts in this pool hold capacity they are not using.`);
  const peaks = call("cache.get_object", { path: `peaks/${region}/${model}.json` }) ?? {};
  const donors = here.rows
    .filter((r) => r.account !== account)
    .map((r) => ({ ...r, keep: floorFor(r, peaks[r.account]) }))
    .map((r) => ({ ...r, spare: Math.max(0, r.allocated - r.keep) }))
    .filter((r) => r.spare > 0)
    .sort((a, b) => b.spare - a.spare || a.account.localeCompare(b.account));
  const spare = donors.reduce((a, r) => a + r.spare, 0);
  think(
    donors.length
      ? `Each account keeps 10% above the higher of its current use and its 7-day peak. Above that line: ${donors.map((d) => `${d.account} ${d.spare}`).join(", ")}. Total ${spare}.`
      : "Each account keeps 10% above the higher of its current use and its 7-day peak. Nobody is above that line."
  );
  if (spare >= short) {
    const moves = [];
    for (const d of donors) {
      if (!short) break;
      const take = Math.min(d.spare, short);
      moves.push({ account: d.account, region, model, delta: -take });
      short -= take;
    }
    moves.push({ account, region, model, delta: units });
    const taken = moves.slice(0, -1).map((m) => `${-m.delta} from ${m.account}`).join(", ");
    think(`Reclaiming ${taken}${here.free ? `, plus the ${here.free} free,` : ""} covers the request.`);
    return done({ action: "reclaim", summary: `Reclaim ${taken}${here.free ? ` and use ${here.free} free` : ""}, then grant ${units} in ${region}.`, moves });
  }

  // Still short: the same model may have room in another region.
  think(`Free plus reclaimable is ${here.free + spare}, still short of ${units}. Look at the same model in other regions.`);
  const regions = call("cache.get_object", { path: "index.json" })?.regions ?? [];
  let best = null;
  for (const r of regions) {
    if (r === region) continue;
    const there = call("live.get_allocation", { account, region: r });
    if (there && there.model !== model) continue;
    const p = pool(r, model);
    if (p.free >= units && (!best || p.free > best.free)) best = { region: r, free: p.free };
  }
  if (best) {
    think(`${best.region} has ${best.free} free for ${model}, the most of any region that can take the whole request.`);
    return done({
      action: "redirect",
      summary: `${region} cannot cover this. Offer ${units} units in ${best.region} instead, where ${best.free} are free.`,
      moves: [{ account, region: best.region, model, delta: units }],
    });
  }
  think("No region has enough free capacity for this model.");
  return done({
    action: "escalate",
    summary: `Cannot place ${units} units of ${model}. ${region} has ${here.free} free and ${spare} reclaimable. This needs a person.`,
    moves: [],
  });
}
