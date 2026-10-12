import { api } from "../api.js";
import {
  busy, citationLink, empty, field, fmtDate, formValues, h, mount, pageHead, section, toast,
} from "../dom.js";
import { harvestSummary, runHarvestButton, runStatusPill, watchHarvest } from "../harvest.js";

const PAGE_SIZE = 25;

function hashParams() {
  return new URLSearchParams(location.hash.split("?")[1] ?? "");
}

function setHashParams(params) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  location.hash = `#/corpus${query ? `?${query}` : ""}`;
}

function recordCard(record) {
  const excerpt = h("p", { class: "excerpt clamped" }, record.raw_text);
  const toggle = h("button", { class: "link small", type: "button" }, "Show more");
  toggle.addEventListener("click", () => {
    toggle.textContent = excerpt.classList.toggle("clamped") ? "Show more" : "Show less";
  });
  const copy = h("button", { class: "link small", type: "button" }, "Copy citation");
  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(`[FACT — sourced: ${record.citation}]`);
    toast("Citation copied.");
  });
  return h("article", { class: "card" },
    h("div", { class: "record-meta" },
      h("span", { class: "pill accent" }, record.source_type),
      h("span", { class: "pill" }, record.surface_symptom_guess),
      h("span", { class: `pill ${record.confidence === "high" ? "ok" : record.confidence === "low" ? "" : "warn"}` },
        `${record.confidence} confidence`),
      h("span", {}, `captured ${fmtDate(record.captured_at)}`)),
    record.title && h("div", { class: "record-title" }, record.title),
    excerpt,
    h("div", { class: "row small", style: "margin-top:8px" }, citationLink(record.citation), h("span", { class: "spacer" }), toggle, copy));
}

function runsTable(runs) {
  if (!runs.length) return empty("No harvest runs yet.");
  return h("div", { class: "table-wrap" }, h("table", {},
    h("thead", {}, h("tr", {}, ["Started", "Trigger", "Status", "Per source"].map((t) => h("th", {}, t)))),
    h("tbody", {}, runs.map((run) => h("tr", {},
      h("td", {}, fmtDate(run.started_at)),
      h("td", {}, run.trigger),
      h("td", {}, runStatusPill(run.status)),
      h("td", {}, h("div", { class: "stack small" }, Object.entries(run.stats).map(([name, s]) => h("div", {},
        h("strong", {}, name), " ", h("span", { class: "pill" }, s.status),
        s.status === "ok" ? ` +${s.new} new of ${s.fetched}` : "",
        s.message && h("div", { class: "muted" }, s.message),
        s.warnings.length ? h("div", { class: "muted" }, `⚠ ${s.warnings.join(" · ")}`) : null)))))))));
}

export default async function renderCorpus(root) {
  const params = hashParams();
  const offset = Number(params.get("offset") ?? 0);
  const filters = Object.fromEntries(["source_type", "symptom", "confidence", "q"].map((k) => [k, params.get(k) ?? ""]));

  const [records, stats, status, runs] = await Promise.all([
    api.get("/api/records", { ...filters, limit: PAGE_SIZE, offset }),
    api.get("/api/corpus/stats"),
    api.get("/api/harvest/status"),
    api.get("/api/harvest/runs", { limit: 10 }),
  ]);
  const rerender = () => renderCorpus(root);
  if (status.running) watchHarvest(rerender);

  const sourceChecks = h("div", { class: "checks" }, status.sources.map((source) => h("label", {},
    h("input", { type: "checkbox", name: "sources", value: source.name, checked: source.enabled }),
    source.name, !source.enabled && h("span", { class: "pill" }, "disabled"))));
  const selectedSources = () => {
    const names = [...sourceChecks.querySelectorAll("input:checked")].map((input) => input.value);
    return names.length === status.sources.length ? null : names;
  };

  const select = (name, options) => h("select", { name, value: filters[name] },
    h("option", { value: "" }, "All"), options.map((option) => h("option", { value: option }, option)));
  const filterForm = h("form", { class: "card form-grid" },
    field("Search text", h("input", { type: "search", name: "q", value: filters.q, placeholder: "e.g. lead time" })),
    field("Source", select("source_type", Object.keys(stats.by_source))),
    field("Surface symptom", select("symptom", Object.keys(stats.by_symptom))),
    field("Confidence", select("confidence", ["high", "medium", "low"])),
    h("div", { class: "row" }, h("button", { class: "primary", type: "submit" }, "Apply"),
      h("button", { type: "button", onclick: () => setHashParams({}) }, "Reset")));
  filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setHashParams(formValues(filterForm));
  });

  const datasheetForm = h("form", { class: "row" },
    h("input", { type: "url", name: "url", required: true, placeholder: "https://vendor.example/datasheet.pdf", style: "flex:1;min-width:220px" }),
    h("button", { type: "submit" }, "Ingest datasheet"));
  datasheetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(datasheetForm.querySelector("button"), async () => {
      const result = await api.post("/api/datasheets", formValues(datasheetForm));
      toast(`Datasheet ingested: ${result.new} new of ${result.fetched} pages/sections.`);
      rerender();
    });
  });

  const pager = h("div", { class: "row", style: "margin-top:12px" },
    h("span", { class: "muted small" }, records.total
      ? `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, records.total)} of ${records.total}` : ""),
    h("span", { class: "spacer" }),
    h("button", { disabled: offset === 0, onclick: () => setHashParams({ ...filters, offset: Math.max(0, offset - PAGE_SIZE) }) }, "← Newer"),
    h("button", { disabled: offset + PAGE_SIZE >= records.total, onclick: () => setHashParams({ ...filters, offset: offset + PAGE_SIZE }) }, "Older →"));

  mount(root,
    pageHead("Evidence", "Every post the harvester has collected, with its source. The labels are keyword sorting aids, not conclusions.",
      h("a", { class: "button", href: "snapshot/corpus.jsonl", download: "corpus.jsonl" }, "Export JSONL")),
    filterForm,
    h("p", { class: "muted small" }, `${records.total} of ${stats.total} posts`),
    h("div", {}, records.items.length ? records.items.map(recordCard) : empty("No records match.")),
    pager,
    h("details", { class: "section fold" }, h("summary", {}, "Harvest engine"),
      section("Sources", h("div", { class: "card stack" }, harvestSummary(status, runs[0]), sourceChecks,
        h("div", { class: "help small muted" }, "Sources without credentials are skipped with a warning (see .env).")),
      runHarvestButton(selectedSources, () => watchHarvest(rerender))),
      section("Datasheets", h("div", { class: "card" }, datasheetForm)),
      section("Harvest runs", runsTable(runs))),
  );
}
