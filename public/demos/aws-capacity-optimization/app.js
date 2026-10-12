// Ticketee, the capacity demo's ticket tool. Loads the two simulated stores and a queue
// of tickets. Opening a ticket has the agent work it and reply in the comments; the
// visitor answers there too. The address hash holds the open ticket.

import { floorFor, key, makeStores, makeTools, resolve } from "./engine.js";

const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STATUS = { open: "Open", proposed: "Pending approval", approved: "Resolved", rejected: "Rejected", escalated: "Escalated" };
const ACTION = { grant: "Grant", reclaim: "Reclaim and grant", redirect: "Offer another region", escalate: "Escalate to a person" };
const AGENT = "capacity-agent";
const HELP = "I only understand a few replies here: <b>approve</b>, <b>reject</b>, <b>why</b>, <b>pool</b>, or a number of units to try instead, such as <b>20</b>.";

let stores, tools, tickets;

async function load() {
  const get = async (name) => {
    const res = await fetch(new URL(`sim/${name}`, import.meta.url));
    if (!res.ok) throw new Error(`${name}: ${res.status}`);
    return res.json();
  };
  const [live, snapshot] = await Promise.all([get("live.json"), get("snapshot.json")]);
  stores = makeStores(live, snapshot);
  stores.liveClock = live.clock;
  tools = makeTools(stores);
  tickets = live.tickets.map((t) => ({ ...t, status: "open", comments: [{ who: t.requester, html: esc(t.body) }] }));
  // The two oldest tickets start out already worked and approved by their requester.
  for (const t of tickets.slice(0, 2)) {
    propose(t);
    say(t, t.requester, "approve");
    reply(t, "approve");
  }
}

const current = () => tickets.find((t) => t.id === location.hash.slice(1));
const row = (t) => stores.rows.get(key(t.account, t.region));
const say = (t, who, html) => t.comments.push({ who, html });

// ---------------------------------------------------------------- the agent's side
function poolNow(t) {
  const { region } = t, { model } = row(t);
  const capacity = stores.snap.objects[`pools/${region}/${model}.json`].capacity;
  const rows = tools["live.list_allocations"]({ region, model });
  const allocated = rows.reduce((a, r) => a + r.allocated, 0);
  return { region, model, capacity, rows, allocated, free: Math.max(0, capacity - allocated), peaks: stores.snap.objects[`peaks/${region}/${model}.json`] };
}

function traceList(trace) {
  return `<ol class="cp-trace">${trace.map((s) => {
    if (s.kind === "think") return `<li><span>${esc(s.text)}</span></li>`;
    const [store, name] = s.tool.split(".");
    const args = Object.entries(s.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
    return `<li><span class="cp-call demo-mono"><span class="store">${esc(store)}.</span>${esc(name)}(${esc(args)})
      <span class="result">→ ${esc(JSON.stringify(s.result))}</span></span></li>`;
  }).join("")}</ol>`;
}

function movesTable(moves) {
  if (!moves.length) return "";
  return `<div class="demo-table-wrap cp-moves"><table class="demo-kv">
    <thead><tr><th>Account</th><th>Region</th><th>Model</th><th class="num">Change</th></tr></thead>
    <tbody>${moves.map((m) => `<tr><td>${esc(m.account)}</td><td>${esc(m.region)}</td><td>${esc(m.model)}</td>
      <td class="num">${m.delta > 0 ? "+" : "−"}${Math.abs(m.delta)}</td></tr>`).join("")}</tbody></table></div>`;
}

// Works the ticket against the stores as they are now and posts the result as a comment.
function propose(t, lead = "") {
  Object.assign(t, resolve(t, tools));
  const p = t.proposal;
  t.status = p.action === "escalate" ? "escalated" : "proposed";
  const ask = p.action === "escalate"
    ? "I have not changed anything. Reply with a smaller number of units if you want me to try again."
    : "Reply <b>approve</b> to apply this, <b>reject</b> to close the ticket, or a number of units to try instead.";
  say(t, AGENT, `${lead ? `<p>${lead}</p>` : ""}<p><b>${ACTION[p.action]}.</b> ${esc(p.summary)}</p>
    <details class="tk-log"><summary>Reasoning</summary>${movesTable(p.moves)}${traceList(t.trace)}${poolPanel(t)}</details><p>${ask}</p>`);
}

// The visitor's comment, matched on a few keywords. Nothing here is a language model.
function reply(t, text) {
  const has = (re) => re.test(text), closed = t.status === "approved" || t.status === "rejected";
  const n = Number((text.match(/\d+/) || [])[0]);
  if (has(/\b(approve|approved|apply|yes|lgtm|ship)\b/i)) {
    if (t.status !== "proposed") return say(t, AGENT, closed ? `This ticket is already ${STATUS[t.status].toLowerCase()}.` : "There is no proposal to approve on this ticket.");
    // Another ticket may have been approved since this proposal was made.
    const moves = JSON.stringify(t.proposal.moves);
    const fresh = resolve(t, tools).proposal;
    if (JSON.stringify(fresh.moves) !== moves) return propose(t, "The live store changed since my last comment, so I ran this again before applying anything.");
    tools["live.apply_moves"]({ moves: t.proposal.moves });
    t.status = "approved";
    const m = t.proposal.moves.at(-1), now = stores.rows.get(key(m.account, m.region));
    return say(t, AGENT, `Applied to the live store. ${esc(m.account)} now holds ${now.allocated} units of ${esc(m.model)} in ${esc(m.region)}. Resolving the ticket.`);
  }
  if (has(/\b(reject|rejected|no|cancel|close)\b/i)) {
    if (closed) return say(t, AGENT, `This ticket is already ${STATUS[t.status].toLowerCase()}.`);
    t.status = "rejected";
    return say(t, AGENT, "Closed without changing anything.");
  }
  if (has(/\b(why|explain|steps|trace|reason)\b/i)) {
    return say(t, AGENT, `<p>Here is each step I took.</p>${traceList(t.trace)}`);
  }
  if (has(/\b(pool|free|capacity|headroom|status)\b/i)) {
    const p = poolNow(t);
    return say(t, AGENT, `The ${esc(p.region)} pool for ${esc(p.model)} holds ${p.capacity} units (cached at ${esc(stores.snap.clock)}). ${p.allocated} are allocated across ${p.rows.length} account${p.rows.length === 1 ? "" : "s"} (live), which leaves ${p.free} free.`);
  }
  if (n >= 1 && n <= 500) {
    if (closed) return say(t, AGENT, `This ticket is already ${STATUS[t.status].toLowerCase()}.`);
    t.units = n;
    return propose(t, `Trying ${n} units instead.`);
  }
  say(t, AGENT, HELP);
}

// ---------------------------------------------------------------- views
const tag = (t) => `<span class="demo-tag tk-status" data-status="${t.status}">${STATUS[t.status]}</span>`;
const sev = (t) => `<span class="tk-sev" data-sev="${t.severity}">Sev ${t.severity}</span>`;
const frame = (crumb, body) => `<div class="tk-app"><div class="tk-bar"><a href="#">bedstone-capacity-tickets</a>${crumb ? `<span>${crumb}</span>` : ""}</div><div class="tk-body">${body}</div></div>`;

function listView() {
  const rows = tickets.map((t) => `<tr><td class="demo-mono">${esc(t.id)}</td><td><a href="#${esc(t.id)}">${esc(t.title)}</a></td>
    <td>${sev(t)}</td><td>${tag(t)}</td><td>${esc(t.requester)}</td><td class="num">${esc(t.opened)}</td></tr>`).join("");
  return frame("", `<div class="demo-table-wrap"><table class="demo-kv tk-list">
      <thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Requester</th><th class="num">Opened</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`);
}

function poolPanel(t) {
  const p = poolNow(t), scale = Math.max(...p.rows.map((r) => r.allocated));
  const w = (v) => `${((100 * v) / scale).toFixed(1)}%`;
  const body = p.rows.map((r) => {
    const peak = p.peaks[r.account], keep = Math.min(r.allocated, floorFor(r, peak));
    return `<tr class="${r.account === t.account ? "me" : ""}"><td>${esc(r.account)}</td>
      <td><div class="cp-alloc"><span class="held" style="width:${w(r.allocated)}"></span><span class="used" style="width:${w(r.used)}"></span><span class="keep" style="left:${w(keep)}"></span></div></td>
      <td class="num">${r.allocated}</td><td class="num">${r.used}</td><td class="num">${peak ?? "n/a"}</td></tr>`;
  }).join("");
  return `<h2 class="tk-h">The two stores when this ran <span class="demo-muted">${esc(p.model)} in ${esc(p.region)}</span></h2>
    <div class="demo-grid" style="margin-bottom:16px">
      <div class="demo-card"><h3>Live store · read at ${esc(stores.liveClock)}</h3>
        <p><span class="demo-hero">${p.allocated}</span> units allocated across ${p.rows.length} account${p.rows.length === 1 ? "" : "s"}</p></div>
      <div class="demo-card"><h3>Cached store · snapshot from ${esc(stores.snap.clock)}</h3>
        <p><span class="demo-hero">${p.capacity}</span> units in the pool, so ${p.free} free</p></div>
    </div>
    <div class="demo-table-wrap"><table class="demo-kv cp-stores">
      <thead><tr><th>Account</th><th></th><th class="num">Allocated (live)</th><th class="num">In use (live)</th><th class="num">7-day peak (cached)</th></tr></thead>
      <tbody>${body}</tbody></table></div>
    <p class="cp-legend"><span><i class="used"></i>In use</span><span><i class="held"></i>Allocated, not in use</span><span><i class="keep"></i>Kept: 10% above the higher of use and peak</span></p>`;
}

function ticketView(t) {
  if (!t.trace) propose(t);
  const comments = t.comments.map((c, i) => `<li class="tk-comment${c.who === AGENT ? " agent" : ""}">
    <p class="tk-who"><b>${esc(c.who)}</b>${c.who === AGENT ? '<span class="demo-tag">rule-based agent</span>' : ""}<span class="demo-muted">#${i + 1}</span></p>
    <div class="tk-text">${c.html}</div></li>`).join("");
  const quick = (t.status === "proposed" ? ["approve", "reject", "why", "pool", "20"] : ["why", "pool", "20"])
    .map((q) => `<button type="button" class="demo-btn" data-say="${q}">${q}</button>`).join("");
  const facts = [["Status", tag(t)], ["Severity", sev(t)], ["Assigned to", AGENT], ["Requester", esc(t.requester)],
    ["Account", esc(t.account)], ["Region", esc(t.region)], ["Model", esc(t.model)], ["Units asked", t.units], ["Opened", esc(t.opened)]]
    .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
  return frame(`/ ${esc(t.id)}`, `<h2 class="tk-title">${esc(t.title)}</h2>
    <div class="tk-cols">
      <div>
        <h2 class="tk-h">Comments</h2>
        <ol class="tk-thread">${comments}</ol>
        <form class="tk-reply" id="reply">
          <input class="demo-input" name="text" maxlength="200" autocomplete="off" placeholder="Reply to the agent" aria-label="Reply to the agent">
          <button type="submit" class="demo-btn">Comment</button>
        </form>
        <div class="demo-row tk-quick">${quick}</div>
      </div>
      <aside><h2 class="tk-h">Details</h2><table class="demo-kv">${facts}</table></aside>
    </div>`);
}

function render() {
  const t = current();
  app.innerHTML = t ? ticketView(t) : listView();
}

// ---------------------------------------------------------------- actions
function comment(text) {
  const t = current();
  text = text.trim();
  if (!t || !text) return;
  say(t, "you", esc(text));
  reply(t, text);
  render();
  $(".tk-thread > li:last-child").scrollIntoView({ block: "nearest" });
}

app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-say]");
  if (b) comment(b.dataset.say);
});

app.addEventListener("submit", (e) => {
  e.preventDefault();
  comment(String(new FormData(e.target).get("text")));
});


window.addEventListener("hashchange", () => { render(); window.scrollTo({ top: 0 }); });

load().then(render).catch((err) => {
  app.innerHTML = `<p class="demo-muted">The demo could not load its data (${esc(err.message)}).</p>`;
});
