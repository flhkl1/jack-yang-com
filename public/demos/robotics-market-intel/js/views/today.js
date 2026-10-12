import { api } from "../api.js";
import { empty, fmtDate, h, mount } from "../dom.js";

// Plain-English names for the harvester's keyword labels: [row title, phrase used mid-sentence].
const PROBLEMS = {
  driver_hardware_compat: ["Driver and firmware compatibility", "hardware that won't work with its driver or firmware"],
  workaround_tolerated: ["Workarounds", "workarounds teams are living with"],
  sdk_api_breakage: ["SDK and API breakage", "SDK updates that break working code"],
  supply_lead_time: ["Supply and lead times", "lead times and discontinued parts"],
  documentation_gap: ["Documentation gaps", "missing or outdated documentation"],
  pricing_licensing: ["Pricing and licensing", "pricing and licensing"],
  calibration_setup: ["Calibration and setup", "calibration and setup"],
  integration_time_sink: ["Integration overruns", "integrations that run over"],
  vendor_support_friction: ["Vendor support", "slow vendor support"],
  safety_certification: ["Safety certification", "safety certification"],
  unclustered: ["Unsorted", "unsorted posts"],
};
const UNSORTED = "unclustered";
const RECENT = 5;

const title = (label) => PROBLEMS[label]?.[0] ?? label.replaceAll("_", " ");
const phrase = (label) => PROBLEMS[label]?.[1] ?? label.replaceAll("_", " ");

/** Where a record came from, short enough to read in a sentence. */
function origin(record) {
  if (record.source_type === "sec_filing") return "SEC filings";
  try {
    const url = new URL(record.source_url);
    if (url.hostname === "github.com") return url.pathname.split("/")[2]?.replaceAll("_", " ") ?? "GitHub";
    return url.hostname.replace(/^(www|discuss|discourse|forum)\./, "");
  } catch {
    return "other";
  }
}

function topOrigins(records, limit) {
  const counts = new Map();
  for (const record of records) counts.set(origin(record), (counts.get(origin(record)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function problemRow({ label, count, share, width, records }) {
  const recent = [...records].sort((a, b) => (b.captured_at ?? "").localeCompare(a.captured_at ?? "")).slice(0, RECENT);
  return h("details", { class: `problem ${label === UNSORTED ? "unsorted" : ""}`, id: `problem-${label}` },
    h("summary", {},
      h("span", { class: "problem-name" }, title(label)),
      h("span", { class: "bar" }, h("span", { style: `width:${width}%` })),
      h("span", { class: "problem-count" }, count, share !== null && h("small", {}, ` ${share}%`))),
    h("div", { class: "problem-body" },
      h("p", { class: "muted small" }, "Most often in ",
        topOrigins(records, 3).map(([name, n], i) => [i ? " · " : "", name, ` (${n})`])),
      h("ul", { class: "posts" }, recent.map((record) => h("li", {},
        h("a", { href: record.source_url, target: "_blank", rel: "noopener noreferrer" }, record.title || record.citation),
        h("span", { class: "muted small" }, ` ${origin(record)} · ${fmtDate(record.captured_at?.slice(0, 10))}`)))),
      h("a", { class: "small", href: `#/corpus?symptom=${label}` }, `All ${count} posts →`)));
}

export default async function renderToday(root) {
  const [stats, { items }, runs, interviews] = await Promise.all([
    api.get("/api/corpus/stats"),
    api.get("/api/records", { limit: 500 }),
    api.get("/api/harvest/runs", { limit: 1 }),
    api.get("/api/interviews"),
  ]);
  const total = Number(stats.total);
  if (!total) return mount(root, empty("Nothing harvested yet. Run a harvest from the Pipeline page."));

  const counts = Object.entries(stats.by_symptom).map(([label, n]) => [label, Number(n)]).sort((a, b) => b[1] - a[1]);
  const ranked = counts.filter(([label]) => label !== UNSORTED);
  const unsorted = Number(stats.by_symptom[UNSORTED] ?? 0);
  const sorted = total - unsorted;
  const recordsFor = (label) => items.filter((record) => record.surface_symptom_guess === label);

  const jump = (label, text) => h("a", {
    href: `#problem-${label}`,
    onclick: (event) => {
      event.preventDefault();
      const row = document.getElementById(`problem-${label}`);
      row.open = true;
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  }, text);

  const sentences = [];
  if (ranked.length) {
    const [top, topCount] = ranked[0];
    const where = topOrigins(recordsFor(top), 2).map(([name, n]) => `${name} (${n})`).join(" and ");
    sentences.push(["The most common complaint is ", jump(top, phrase(top)),
      `: ${topCount} of the ${sorted} posts the pipeline could sort (${Math.round(100 * topCount / sorted)}%), most often in ${where}.`]);
  }
  if (ranked.length > 2) {
    const [[second, secondCount], [third, thirdCount]] = ranked.slice(1);
    sentences.push([" Next come ", jump(second, phrase(second)), ` (${secondCount}) and `, jump(third, phrase(third)),
      ` (${thirdCount})`, ranked[3] ? `; everything else is at ${ranked[3][1]} or fewer.` : "."]);
  }
  sentences.push([" Treat this as a lead, not a finding: posts are sorted by keyword, ",
    unsorted ? [jump(UNSORTED, `${unsorted} of ${total}`), " matched nothing, and "] : null,
    interviews.length ? `only ${interviews.length} interview${interviews.length === 1 ? " backs" : "s back"} it up.`
      : "no interviews have been logged to confirm it."]);

  const max = ranked[0]?.[1] ?? unsorted;
  const rows = [...ranked, ...(unsorted ? [[UNSORTED, unsorted]] : [])].map(([label, count]) => problemRow({
    label,
    count,
    share: label === UNSORTED ? null : Math.round(100 * count / sorted),
    width: Math.max(2, Math.round(100 * count / Math.max(max, count))),
    records: recordsFor(label),
  }));

  mount(root,
    h("p", { class: "eyebrow" }, `Robotics procurement · ${total} public posts`,
      runs[0] && ` · harvested ${fmtDate((runs[0].finished_at ?? runs[0].started_at).slice(0, 10))}`),
    h("h1", { class: "brief" }, sentences),
    h("div", { class: "problems" }, rows),
    h("p", { class: "muted small" }, h("a", { href: "#/pipeline" }, "How this gets made →")));
}
