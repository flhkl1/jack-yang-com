// Demo backend for the AUTISM dashboard: answers the frontend's /api/* calls in the
// browser, from made-up data. Nothing here is real: the person, contacts, accounts,
// transactions, holdings, meals and Garmin numbers are all generated from a fixed seed
// relative to today's date. Response shapes and the finance summary logic follow
// web/backend/routers/*.py so the unmodified pages render as they do against FastAPI.

// ---------------------------------------------------------------- helpers
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260929);
const between = (a, b) => a + (b - a) * rnd();
const int = (a, b) => Math.floor(between(a, b + 1));
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const round2 = (x) => Math.round(x * 100) / 100;
const iso = (d) => d.toISOString().slice(0, 10);
const TODAY = new Date(); TODAY.setHours(12, 0, 0, 0);
const daysAgo = (n) => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d; };
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------- health config
const HEALTH_CONFIG = {
  targets: { calories: 2600, protein: 170, carbs: 290, fat: 80, fiber: 35 },
  meals: [
    { id: "breakfast", name: "Breakfast", macros: { calories: 620, protein: 42, carbs: 70, fat: 18 },
      foods: ["Oats (80 g)", "Greek yogurt (200 g)", "Blueberries", "Honey (1 tbsp)"], supplements: ["Vitamin D3", "Creatine"], notes: "Within an hour of waking." },
    { id: "lunch", name: "Lunch", macros: { calories: 760, protein: 50, carbs: 85, fat: 22 },
      foods: ["Chicken thigh (180 g)", "Jasmine rice (1.5 cups)", "Broccoli", "Olive oil (1 tbsp)"], supplements: [], notes: "" },
    { id: "snack", name: "Pre-workout", macros: { calories: 380, protein: 28, carbs: 50, fat: 8 },
      foods: ["Banana", "Whey shake", "Rice cakes (2)"], supplements: ["Caffeine (100 mg)"], notes: "60–90 min before training." },
    { id: "dinner", name: "Dinner", macros: { calories: 840, protein: 50, carbs: 85, fat: 32 },
      foods: ["Salmon (170 g)", "Sweet potato", "Mixed greens", "Avocado (½)"], supplements: ["Fish oil", "Magnesium glycinate"], notes: "" },
  ],
  supplements: [
    { name: "Vitamin D3", dose: "2000 IU", timing: "Breakfast", notes: "" },
    { name: "Creatine monohydrate", dose: "5 g", timing: "Breakfast", notes: "Daily, no loading phase." },
    { name: "Caffeine", dose: "100 mg", timing: "Pre-workout", notes: "Skip after 2 pm." },
    { name: "Fish oil", dose: "2 g EPA+DHA", timing: "Dinner", notes: "" },
    { name: "Magnesium glycinate", dose: "300 mg", timing: "Dinner", notes: "" },
  ],
};

// ---------------------------------------------------------------- garmin
const garminDaily = [];
for (let n = 0; n < 365; n++) {
  const d = daysAgo(n);
  const sleepTotal = int(6 * 3600, 8.4 * 3600);
  const deep = Math.round(sleepTotal * between(0.13, 0.22));
  const rem = Math.round(sleepTotal * between(0.18, 0.26));
  const awake = int(300, 2400);
  const start = new Date(d); start.setDate(start.getDate() - 1); start.setHours(23, int(0, 59), 0, 0);
  if (rnd() < 0.3) start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + (sleepTotal + awake) * 1000);
  const score = Math.max(40, Math.min(96, Math.round(52 + (sleepTotal - 6 * 3600) / 360 + deep / 900 + between(-6, 6))));
  garminDaily.push({
    date: iso(d),
    steps: int(4500, 16000), steps_goal: 10000,
    hr_min: int(44, 52), hr_max: int(140, 182), rhr: int(49, 57),
    stress_avg: int(18, 42), bb_min: int(8, 30), bb_max: int(62, 100), floors_up: int(2, 22),
    calories_active: int(350, 1200), calories_total: int(2300, 3300),
    distance: round2(between(3, 12)), spo2_avg: int(94, 98),
    sleep_start: start.toISOString().slice(0, 19), sleep_end: end.toISOString().slice(0, 19),
    sleep_total_s: sleepTotal, sleep_deep_s: deep, sleep_light_s: sleepTotal - deep - rem, sleep_rem_s: rem, sleep_awake_s: awake,
    sleep_score: score, sleep_qualifier: score >= 80 ? "GOOD" : score >= 60 ? "FAIR" : "POOR",
    weight: round2(78.5 + Math.sin(n / 40) * 0.8 + between(-0.4, 0.4)), synced_at: nowIso(),
  });
}
const garminActivities = [];
let actId = 18000000000;
for (let n = 1; n < 365; n++) {
  if (rnd() < 0.35) continue;
  const kind = pick(["run", "run", "strength", "strength", "cycling", "walk"]);
  const start = daysAgo(n); start.setHours(int(6, 19), int(0, 59), 0, 0);
  const secs = kind === "strength" ? int(2400, 4200) : kind === "walk" ? int(1500, 3600) : int(1500, 4800);
  const dist = kind === "run" ? secs * between(2.6, 3.4) : kind === "cycling" ? secs * between(6, 8) : kind === "walk" ? secs * 1.4 : null;
  garminActivities.push({
    activity_id: String(actId++),
    name: { run: "Easy Run", strength: "Strength", cycling: "Road Cycling", walk: "Walk" }[kind],
    sport: { run: "running", strength: "training", cycling: "cycling", walk: "walking" }[kind],
    sub_sport: kind === "strength" ? "strength_training" : "generic",
    start_time: start.toISOString().slice(0, 19),
    elapsed_time_s: secs + int(0, 300), moving_time_s: secs,
    distance_m: dist && Math.round(dist), calories: Math.round(secs / 60 * between(7, 12)),
    avg_hr: int(115, 158), max_hr: int(150, 185), avg_speed: dist ? round2(dist / secs) : null,
    max_speed: dist ? round2(dist / secs * 1.4) : null, ascent_m: dist ? int(10, 300) : null,
    training_effect: round2(between(1.8, 4.2)), training_load: int(40, 220),
  });
}
function sleepDetail(date) {
  const day = garminDaily.find((g) => g.date === date);
  if (!day) return null;
  const r = mulberry32(Number(date.replaceAll("-", "")));
  const start = new Date(day.sleep_start + "Z"), end = new Date(day.sleep_end + "Z");
  const hr = [], hrv = [];
  for (let t = start.getTime(), k = 0; t <= end.getTime(); t += 60000, k++) {
    const phase = Math.sin(k / 45) * 3;
    hr.push({ ts: new Date(t).toISOString().slice(0, 19), hr: Math.round(day.rhr - 3 + phase + (r() - 0.5) * 4 + (k < 30 ? (30 - k) / 4 : 0)) });
    if (k % 5 === 0) hrv.push({ ts: new Date(t).toISOString().slice(0, 19), hrv: Math.round(55 + Math.sin(k / 60) * 12 + (r() - 0.5) * 14) });
  }
  return { date, sleep_start: day.sleep_start, sleep_end: day.sleep_end, hr, hrv };
}

// ---------------------------------------------------------------- CRM
const FIRST = ["Maya", "Leo", "Priya", "Sam", "Ines", "Kenji", "Ada", "Omar", "Lena", "Theo", "Zoe", "Ravi", "Nora", "Felix", "Hana", "Luis", "Iris", "Mateo", "Yuki", "Elena", "Jonah", "Amara", "Wei", "Chloe", "Diego", "Sofia", "Arjun", "Clara", "Tomas", "Mei"];
const LAST = ["Alder", "Brook", "Castell", "Dunmore", "Ellery", "Fairley", "Garland", "Hollis", "Ivers", "Jarrow", "Kestrel", "Lowell", "Marlow", "Norcross", "Oakes", "Pryor", "Quill", "Rowan", "Sayer", "Thorne"];
const PLACES = ["NY", "NY", "NY", "SF", "SF", "SF", "SF", "LA", "LA", "HK", "HK", "LDN", "LDN", "BOS", "BOS", "Shenzhen", "Beijing", "Beijing", "Japan", "Singapore", "Germany", "Canada", "Australia", "South Korea", "France"];
const RELS = ["friend", "friend", "friend", "colleague", "colleague", "family", "mentor", "investor", "other"];
const TAGS = ["climbing", "startups", "ML", "robotics", "design", "running", "finance", "music", "hiring", "coffee"];
const NOTES = ["Met at a hackathon.", "Former teammate; great at infra.", "Introduced through a mutual friend.", "Wants to grab dinner next time in town.", "Working on a hardware startup.", "Ask about their new role.", "Owes me a book recommendation.", null, null];
let people = [];
for (let i = 0; i < 42; i++) {
  const added = daysAgo(int(30, 900));
  people.push({
    id: i + 1, name: `${pick(FIRST)} ${pick(LAST)}`, location: pick(PLACES), relationship_type: pick(RELS),
    notes: pick(NOTES), tags: [...new Set([pick(TAGS), pick(TAGS)])].slice(0, int(0, 2)),
    added_date: iso(added), last_contact_date: rnd() < 0.8 ? iso(daysAgo(int(1, 200))) : null,
    share_token: null, location_source: null, location_updated_at: null,
  });
}
let nextPersonId = people.length + 1;

// ---------------------------------------------------------------- share links and alerts
// Ports of routers/share.py and scripts/alerts.py. Links made in the demo are kept in
// localStorage so one opened in another tab still works; nothing leaves the browser.
const OWNER = "Alex";
const CITIES = ["NY", "SF", "LA", "HK", "LDN", "BOS", "Shenzhen", "Beijing"];
const STORE_KEY = "autism-demo-share";
const stored = (() => {
  try { return { tokens: {}, moved: {}, alerts: [], ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") }; }
  catch { return { tokens: {}, moved: {}, alerts: [] }; }
})();
const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(stored)); } catch { /* demo still works for this tab */ } };

const alerts = [];
let alertId = 1;
const addAlert = (kind, key, title, body, created_at = nowIso()) => {
  if (alerts.some((a) => a.key === key)) return false;
  alerts.push({ id: alertId++, kind, key, title, body, created_at, delivered_at: created_at });
  return true;
};
// Two contacts who have already used their link.
[[people[3], "LDN", 2], [people[11], "SF", 9]].forEach(([person, city, days], i) => {
  const from = person.location === city ? "NY" : person.location;
  const at = daysAgo(days).toISOString();
  Object.assign(person, { location: city, share_token: `demo-link-${i + 1}-${"x".repeat(12)}`, location_source: "shared", location_updated_at: at });
  addAlert("friend_moved", `moved:${person.id}:${at}`, `${person.name} is now in ${city}`, `They updated it from ${from} through their share link.`, at);
});
for (const [token, id] of Object.entries(stored.tokens)) { const person = people.find((x) => x.id === id); if (person) person.share_token = token; }
for (const [id, move] of Object.entries(stored.moved)) { const person = people.find((x) => x.id === Number(id)); if (person) Object.assign(person, { location: move.location, location_source: "shared", location_updated_at: move.at }); }
for (const a of stored.alerts) addAlert(a.kind, a.key, a.title, a.body, a.created_at);

const usd0 = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
function checkOverspending() {
  const day = TODAY.getDate(), daysInMonth = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
  const month = iso(TODAY).slice(0, 7);
  for (const [name, b] of Object.entries(summary().budget_vs_actual)) {
    if (b.limit <= 0) continue;
    const projected = b.spent * daysInMonth / day;
    if (b.spent > b.limit) addAlert("overspend", `overspend:over:${name}:${month}`, `Over budget: ${name}`, `${usd0(b.spent)} spent of ${usd0(b.limit)} this month.`);
    else if (day >= 7 && projected > b.limit * 1.2) addAlert("overspend", `overspend:pace:${name}:${month}`, `On pace to overspend: ${name}`, `${usd0(b.spent)} of ${usd0(b.limit)} spent by day ${day}. On pace for ${usd0(projected)}.`);
  }
}
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_");
}
const sharedView = (person) => ({ name: person.name.split(" ")[0], owner: OWNER, location: person.location, cities: CITIES });

// ---------------------------------------------------------------- finance
let accounts = [
  { id: 1, institution: "Northwind Bank", name: "Everyday Checking", type: "checking", current_balance: 6840.12, last_updated: nowIso() },
  { id: 2, institution: "Northwind Bank", name: "High-Yield Savings", type: "checking", current_balance: 18250.0, last_updated: nowIso() },
  { id: 3, institution: "Harbor Card", name: "Rewards Visa", type: "credit", current_balance: 1284.55, last_updated: nowIso() },
  { id: 4, institution: "Contoso Brokerage", name: "Individual Brokerage", type: "brokerage", current_balance: 0, last_updated: nowIso() },
];
let budgetCategories = [
  { id: 1, name: "Groceries", monthly_limit: 550, color: "#10B981", active: true, sort_order: 1 },
  { id: 2, name: "Eating out", monthly_limit: 250, color: "#F59E0B", active: true, sort_order: 2 },
  { id: 3, name: "Transport", monthly_limit: 160, color: "#3B82F6", active: true, sort_order: 3 },
  { id: 4, name: "Shopping", monthly_limit: 250, color: "#8B5CF6", active: true, sort_order: 4 },
  { id: 5, name: "Fun", monthly_limit: 150, color: "#EC4899", active: true, sort_order: 5 },
];
let fixedExpenses = [
  { id: 1, name: "Rent", amount: 1950, cadence: "monthly", category: "Housing", active: true },
  { id: 2, name: "Phone plan", amount: 45, cadence: "monthly", category: "Utilities", active: true },
  { id: 3, name: "Gym membership", amount: 42, cadence: "monthly", category: "Health", active: true },
  { id: 4, name: "Music streaming", amount: 11.99, cadence: "monthly", category: "Subscriptions", active: true },
  { id: 5, name: "Renter's insurance", amount: 180, cadence: "annual", category: "Insurance", active: true },
  { id: 6, name: "Cloud storage", amount: 29.99, cadence: "annual", category: "Subscriptions", active: false },
];
let nextFixedId = 7, nextBcId = 6;

const transactions = [];
let txId = 1;
function tx(daysBack, account_id, amount, merchant, category, subcategory = null, bc = null) {
  transactions.push({
    id: txId++, account_id, date: iso(daysAgo(daysBack)), amount: round2(amount), merchant_name: merchant,
    category, subcategory, payment_channel: category === "INCOME" ? "other" : "in store",
    source_file: null, budget_category_id: bc, plaid_transaction_id: `demo-${txId}`,
  });
}
for (let n = 0; n < 200; n++) {
  const d = daysAgo(n);
  if (d.getDay() === 5 && Math.floor(n / 7) % 2 === 0) tx(n, 1, 2875.4, "Acme Robotics Payroll", "INCOME", "INCOME_WAGES");
  if (d.getDate() === 1) {
    tx(n, 1, -1950, "Maple Street Apartments", "RENT_AND_UTILITIES", "RENT_AND_UTILITIES_RENT");
    tx(n, 1, -500, "Contoso Brokerage Transfer", "TRANSFER_OUT", "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS");
    tx(n, 1, -250, "Contoso Brokerage investment", "GENERAL_SERVICES", null);
  }
  if (d.getDate() === 3) tx(n, 1, -int(60, 110), "City Power & Light", "RENT_AND_UTILITIES", "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY");
  if (d.getDate() === 5) tx(n, 1, -45, "Mobile Carrier", "RENT_AND_UTILITIES", "RENT_AND_UTILITIES_TELEPHONE");
  if (d.getDate() === 8) { tx(n, 1, -int(900, 1400), "Payment Thank You", "LOAN_PAYMENTS", "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT"); tx(n, 3, 900, "Payment Thank You", "TRANSFER_IN"); }
  if (d.getDate() === 12) tx(n, 3, -42, "Summit Gym", "PERSONAL_CARE", "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS", 5);
  if (d.getDate() === 15) tx(n, 3, -11.99, "Music streaming", "ENTERTAINMENT", "ENTERTAINMENT_MUSIC_AND_AUDIO", 5);
  if (d.getDate() === 20 && n > 30) tx(n, 1, round2(between(2, 9)), "Interest Payment", "INCOME", "INCOME_INTEREST_EARNED");
  if (rnd() < 0.3) tx(n, 3, -between(18, 95), pick(["Trader Joe's", "Safeway", "Whole Foods Market", "Berkeley Bowl"]), "FOOD_AND_DRINK", "FOOD_AND_DRINK_GROCERIES", 1);
  if (rnd() < 0.45) tx(n, 3, -between(9, 48), pick(["Blue Door Cafe", "Noodle Bar", "Chipotle", "Taqueria Sol", "DoorDash", "Starbucks"]), "FOOD_AND_DRINK", "FOOD_AND_DRINK_RESTAURANT", 2);
  if (rnd() < 0.25) tx(n, 3, -between(2.5, 28), pick(["Bay Transit", "Lyft", "City Parking"]), "TRANSPORTATION", "TRANSPORTATION_PUBLIC_TRANSIT", 3);
  if (rnd() < 0.08) tx(n, 3, -between(20, 160), pick(["Target", "Hardware Store", "Bookshop", "Online Retailer"]), "GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE", 4);
  if (rnd() < 0.05) tx(n, 3, -between(15, 90), pick(["Cinema", "Climbing Gym Day Pass", "Concert Tickets"]), "ENTERTAINMENT", "ENTERTAINMENT_OTHER_ENTERTAINMENT", 5);
  if (rnd() < 0.02) tx(n, 3, -between(25, 80), "Pharmacy", "MEDICAL", "MEDICAL_PHARMACIES_AND_SUPPLEMENTS");
}

const HOLDINGS = [
  { ticker: "VTI", name: "Vanguard Total Stock Market ETF", price: 312.4 },
  { ticker: "VXUS", name: "Vanguard Total International Stock ETF", price: 71.85 },
  { ticker: "BND", name: "Vanguard Total Bond Market ETF", price: 74.1 },
  { ticker: "AAPL", name: "Apple Inc.", price: 238.2 },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 176.5 },
];
const holdingTx = [];
const holdings = HOLDINGS.map((h, i) => {
  let qty = 0, cost = 0;
  for (let m = 18; m >= 0; m--) {
    if (rnd() < (h.ticker === "VTI" ? 0.95 : 0.5)) {
      const price = round2(h.price * (1 - m * between(0.004, 0.012)));
      const q = round2(between(1, 250) / price * 10) / 10 || 0.1;
      qty += q; cost += q * price;
      holdingTx.push({ id: holdingTx.length + 1, ticker: h.ticker, date: iso(daysAgo(m * 30 + int(0, 5))), action: "Buy", quantity: q, price, amount: -round2(q * price), account_name: "Individual Brokerage", institution: "Contoso Brokerage" });
    }
  }
  if (h.ticker !== "BND") holdingTx.push({ id: holdingTx.length + 1, ticker: h.ticker, date: iso(daysAgo(int(10, 80))), action: "Reinvest Dividend", quantity: 0.12, price: h.price, amount: -round2(0.12 * h.price), account_name: "Individual Brokerage", institution: "Contoso Brokerage" });
  qty += h.ticker !== "BND" ? 0.12 : 0; cost += h.ticker !== "BND" ? 0.12 * h.price : 0;
  return { id: i + 1, account_id: 4, ticker: h.ticker, name: h.name, quantity: round2(qty * 100) / 100, avg_cost_basis: round2(cost / qty), last_price: h.price, last_price_updated: nowIso() };
});
accounts[3].current_balance = round2(holdings.reduce((s, h) => s + h.quantity * h.last_price, 0));
const plaidItems = [
  { id: 1, item_id: "demo-item-northwind", institution_name: "Northwind Bank", last_synced_at: nowIso() },
  { id: 2, item_id: "demo-item-harbor", institution_name: "Harbor Card", last_synced_at: nowIso() },
];

// Port of routers/finance.py get_summary
const INVESTMENT_KW = ["investment", "brokerage", "securities", "fidelity", "schwab", "vanguard"];
const DEBT_KW = ["credit card", "loan", "mortgage", "payment"];
const TRANSFER_CATS = new Set(["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS", "LOAN_DISBURSEMENTS"]);
const TRANSFER_MERCHANTS = ["payment thank you", "autopay"];
function classify(category, merchant) {
  const hay = [category, merchant].filter(Boolean).join(" ").toLowerCase();
  if (INVESTMENT_KW.some((k) => hay.includes(k))) return "investment";
  if (DEBT_KW.some((k) => hay.includes(k))) return "debt";
  return "spending";
}
function summary(start, end) {
  start ||= iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1, 12));
  end ||= iso(TODAY);
  const brokerage = new Set(accounts.filter((a) => a.type === "brokerage").map((a) => a.id));
  const income = {}, spending = {}, bcSpent = {};
  let inv = 0, debt = 0;
  for (const t of transactions) {
    if (t.date < start || t.date > end || brokerage.has(t.account_id)) continue;
    const category = t.category || "Uncategorized", merchant = t.merchant_name || "";
    if (TRANSFER_CATS.has(category) || TRANSFER_MERCHANTS.some((k) => merchant.toLowerCase().includes(k))) continue;
    if (t.amount >= 0) { income[category] = (income[category] || 0) + t.amount; continue; }
    const bucket = classify(category, merchant), abs = -t.amount;
    if (bucket === "investment") inv += abs;
    else if (bucket === "debt") debt += abs;
    else {
      spending[category] = (spending[category] || 0) + abs;
      const bc = budgetCategories.find((b) => b.id === t.budget_category_id);
      const eff = bc ? bc.name : category;
      bcSpent[eff] = (bcSpent[eff] || 0) + abs;
    }
  }
  const budget_vs_actual = {};
  for (const bc of [...budgetCategories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))) {
    let spent = bcSpent[bc.name] || 0;
    if (!spent) for (const [k, v] of Object.entries(bcSpent)) if (k.toLowerCase() === bc.name.toLowerCase()) { spent = v; break; }
    budget_vs_actual[bc.name] = { limit: bc.monthly_limit, spent, color: bc.color };
  }
  const total_income = Object.values(income).reduce((a, b) => a + b, 0);
  const total_spending = Object.values(spending).reduce((a, b) => a + b, 0) + inv + debt;
  const net_worth = accounts.reduce((s, a) => s + (a.type !== "credit" ? a.current_balance : -Math.abs(a.current_balance)), 0);
  return { income_by_source: income, spending_by_category: spending, investment_outflows: inv, debt_outflows: debt,
    total_income, total_spending, net: total_income - total_spending, net_worth, start, end, budget_vs_actual };
}
function listHoldings() {
  const byValue = holdings.filter((h) => h.quantity > 0).map((h) => ({ ...h, account_name: "Individual Brokerage", institution: "Contoso Brokerage" }))
    .sort((a, b) => b.quantity * b.last_price - a.quantity * a.last_price);
  return byValue.map((h) => {
    const current_value = h.quantity * h.last_price, cost = h.quantity * h.avg_cost_basis;
    return { ...h, current_value, unrealized_gain: current_value - cost, unrealized_gain_pct: cost > 0 ? (current_value - cost) / cost * 100 : null };
  });
}

// ---------------------------------------------------------------- status
const JOBS = ["daily_pipeline", "price_updater", "schwab_reminder"];
function runsFor(job) {
  const r = mulberry32(job.length * 7919);
  return Array.from({ length: 10 }, (_, k) => {
    const s = new Date(); s.setHours(job === "price_updater" ? s.getHours() : 6, job === "price_updater" ? 0 : 30, 0, 0);
    if (job === "price_updater") s.setMinutes(s.getMinutes() - 15 * k); else s.setDate(s.getDate() - k * (job === "schwab_reminder" ? 30 : 1));
    const dur = job === "daily_pipeline" ? 60 + r() * 120 : 1 + r() * 4;
    return { id: 1000 - k, started_at: s.toISOString(), finished_at: new Date(s.getTime() + dur * 1000).toISOString(), status: "success", error: null, duration_s: Math.round(dur * 10) / 10 };
  });
}
function status() {
  const jobs = Object.fromEntries(JOBS.map((j) => { const r = runsFor(j)[0]; return [j, { last_started_at: r.started_at, last_status: r.status, last_error: null, last_duration_s: r.duration_s }]; }));
  return { status: "ok", version: "1.0.7-demo", uptime_s: 86400 * 3, plaid_env: "sandbox",
    db: { reachable: true, user_count: 1, status: "ok" }, backup: { reachable: true, status: "ok" },
    disk: { free_gb: 212.4, status: "ok" }, scheduler: { heartbeat_age_s: 41, jobs } };
}

// ---------------------------------------------------------------- router
const DISABLED = "Bank linking is turned off in this demo. Everything on this page is made-up data.";
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const noContent = () => new Response(null, { status: 204 });
const notFound = (what) => json({ detail: `${what} not found` }, 404);

async function handle(method, url, body) {
  const p = url.pathname, q = url.searchParams;
  let m;
  // status
  if (p === "/api/status") return json(status());
  if ((m = p.match(/^\/api\/scheduler\/jobs\/([^/]+)\/runs$/))) return json(JOBS.includes(m[1]) ? runsFor(m[1]) : []);
  // health
  if (p === "/api/health/config") return json(HEALTH_CONFIG);
  if (p === "/api/health/garmin") return json(garminDaily.slice(0, Math.min(365, Number(q.get("days") || 30))));
  if (p === "/api/health/garmin/activities") {
    const since = iso(daysAgo(Number(q.get("days") || 30)));
    return json(garminActivities.filter((a) => a.start_time >= since));
  }
  if (p === "/api/health/garmin/sync") return json({ status: "idle", started_at: null, finished_at: nowIso(), error: null, days: 1 });
  if (p === "/api/health/garmin/sync/status") return json({ status: "idle", started_at: null, finished_at: nowIso(), error: null, last_date: garminDaily[0].date });
  if ((m = p.match(/^\/api\/health\/garmin\/sleep\/([\d-]+)\/detail$/))) { const d = sleepDetail(m[1]); return d ? json(d) : json({ detail: "No sleep window for this date" }, 404); }
  // crm
  if (p === "/api/crm/people" && method === "GET") {
    const loc = q.get("location");
    return json(people.filter((x) => !loc || x.location === loc).sort((a, b) => a.name.localeCompare(b.name)));
  }
  if (p === "/api/crm/people" && method === "POST") {
    const person = { id: nextPersonId++, notes: null, tags: [], last_contact_date: null, ...body, added_date: iso(TODAY) };
    people.push(person); return json(person, 201);
  }
  if ((m = p.match(/^\/api\/crm\/people\/(\d+)$/))) {
    const i = people.findIndex((x) => x.id === Number(m[1]));
    if (i < 0) return notFound("Person");
    if (method === "GET") return json(people[i]);
    if (method === "PATCH") {
      people[i] = { ...people[i], ...Object.fromEntries(Object.entries(body).filter(([, v]) => v != null)) };
      if (body.location != null) Object.assign(people[i], { location_source: "manual", location_updated_at: nowIso() });
      return json(people[i]);
    }
    if (method === "DELETE") { people.splice(i, 1); return noContent(); }
  }
  if ((m = p.match(/^\/api\/crm\/people\/(\d+)\/share$/))) {
    const person = people.find((x) => x.id === Number(m[1]));
    if (!person) return notFound("Person");
    if (person.share_token) delete stored.tokens[person.share_token];
    if (method === "DELETE") { person.share_token = null; persist(); return noContent(); }
    person.share_token = newToken();
    stored.tokens[person.share_token] = person.id; persist();
    return json({ token: person.share_token, path: `/share/${person.share_token}` });
  }
  if ((m = p.match(/^\/api\/share\/([\w-]+)$/))) {
    const person = people.find((x) => x.share_token === m[1]);
    if (!person) return json({ detail: "This link is no longer active" }, 404);
    if (method === "GET") return json(sharedView(person));
    const location = String(body.location ?? "").trim();
    if (!location || location.length > 100 || /[\x00-\x1f<>]/.test(location)) return json({ detail: "Location required" }, 422);
    const from = person.location, at = nowIso();
    Object.assign(person, { location, location_source: "shared", location_updated_at: at });
    stored.moved[person.id] = { location, at };
    if (location !== from && addAlert("friend_moved", `moved:${person.id}:${at}`, `${person.name} is now in ${location}`, `They updated it from ${from} through their share link.`, at)) {
      stored.alerts.push(alerts.at(-1));
    }
    persist();
    return json(sharedView(person));
  }
  if (p === "/api/notifications") {
    checkOverspending();
    const limit = Math.min(Number(q.get("limit") || 20), 100);
    return json([...alerts].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id)).slice(0, limit)
      .map(({ key, ...a }) => a));
  }
  if ((m = p.match(/^\/api\/crm\/people\/(\d+)\/logs$/))) return json([]);
  // finance
  if (p === "/api/finance/accounts") return json([...accounts].sort((a, b) => a.institution.localeCompare(b.institution) || a.name.localeCompare(b.name)));
  if (p === "/api/finance/transactions" && method === "GET") {
    const start = q.get("start"), end = q.get("end"), cat = q.get("category"), acct = q.get("account_id");
    const limit = Math.min(Number(q.get("limit") || 500), 2000);
    return json(transactions.filter((t) => (!start || t.date >= start) && (!end || t.date <= end) &&
      (cat === null || t.category === cat) && (acct === null || t.account_id === Number(acct)))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id)).slice(0, limit));
  }
  if (p === "/api/finance/transactions" && method === "POST") {
    const t = { id: txId++, account_id: body.account_id, date: body.date, amount: body.amount, merchant_name: body.merchant_name ?? null,
      category: body.category ?? null, subcategory: null, payment_channel: "other", source_file: null, budget_category_id: body.budget_category_id ?? null, plaid_transaction_id: null };
    transactions.push(t); return json(t, 201);
  }
  if ((m = p.match(/^\/api\/finance\/transactions\/(\d+)\/category$/))) {
    const t = transactions.find((x) => x.id === Number(m[1]));
    if (!t) return notFound("Transaction");
    t.budget_category_id = body.budget_category_id ?? null; return json(t);
  }
  if (p === "/api/finance/fixed-expenses" && method === "GET") return json([...fixedExpenses].sort((a, b) => a.name.localeCompare(b.name)));
  if (p === "/api/finance/fixed-expenses" && method === "POST") { const e = { id: nextFixedId++, active: true, category: null, ...body }; fixedExpenses.push(e); return json(e, 201); }
  if ((m = p.match(/^\/api\/finance\/fixed-expenses\/(\d+)$/))) {
    const i = fixedExpenses.findIndex((x) => x.id === Number(m[1]));
    if (i < 0) return notFound("Fixed expense");
    if (method === "PATCH") { fixedExpenses[i] = { ...fixedExpenses[i], ...Object.fromEntries(Object.entries(body).filter(([, v]) => v != null)) }; return json(fixedExpenses[i]); }
    if (method === "DELETE") { fixedExpenses.splice(i, 1); return noContent(); }
  }
  if (p === "/api/finance/budget-categories" && method === "GET") return json([...budgetCategories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
  if (p === "/api/finance/budget-categories" && method === "POST") { const b = { id: nextBcId++, monthly_limit: 0, color: null, active: true, sort_order: 0, ...body }; budgetCategories.push(b); return json(b, 201); }
  if ((m = p.match(/^\/api\/finance\/budget-categories\/(\d+)$/))) {
    const i = budgetCategories.findIndex((x) => x.id === Number(m[1]));
    if (i < 0) return notFound("Budget category");
    if (method === "PATCH") { budgetCategories[i] = { ...budgetCategories[i], ...Object.fromEntries(Object.entries(body).filter(([, v]) => v != null)) }; return json(budgetCategories[i]); }
    if (method === "DELETE") { budgetCategories.splice(i, 1); return noContent(); }
  }
  if (p === "/api/finance/holdings") return json(listHoldings());
  if ((m = p.match(/^\/api\/finance\/holdings\/([^/]+)\/transactions$/))) {
    const t = decodeURIComponent(m[1]).toUpperCase();
    return json(holdingTx.filter((h) => h.ticker === t).sort((a, b) => (a.date < b.date ? 1 : -1)));
  }
  if (p === "/api/finance/summary") return json(summary(q.get("start"), q.get("end")));
  // plaid: reads work, anything that would reach a bank is refused
  if (p === "/api/plaid/items" && method === "GET") return json(plaidItems);
  if (p === "/api/plaid/refresh-balances") return json({ updated: 0 });
  if (p === "/api/plaid/sync") return json({ added: 0, modified: 0, removed: 0, institution_name: "Demo" });
  if (p.startsWith("/api/plaid/")) return json({ detail: DISABLED }, 403);
  return json({ detail: `${p} is not part of the demo` }, 404);
}

// The app builds a share link as <origin>/share/<token> and reads the token from the path.
// The demo has no such route, so the link points back at this page with the token in the
// hash, and the path is swapped in only while the app boots (share-route.js puts it back).
const HERE = location.pathname;
const copyText = navigator.clipboard?.writeText?.bind(navigator.clipboard);
if (copyText) {
  navigator.clipboard.writeText = (text) =>
    copyText(String(text).replace(/^(https?:\/\/[^/]+)\/share\/([\w-]+)$/, (_, origin, token) => `${origin}${HERE}#/share/${token}`));
}
const viaHash = location.hash.match(/^#\/share\/([\w-]+)$/);
if (viaHash) {
  window.__demoShareReturn = HERE + location.hash;
  history.replaceState(null, "", `/share/${viaHash[1]}`);
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return realFetch(input, init);
  const method = (init.method || (typeof input !== "string" && input.method) || "GET").toUpperCase();
  let body = {};
  try { body = init.body ? JSON.parse(init.body) : {}; } catch { body = {}; }
  await new Promise((r) => setTimeout(r, 60 + Math.random() * 120)); // feel like a network
  return handle(method, url, body);
};
