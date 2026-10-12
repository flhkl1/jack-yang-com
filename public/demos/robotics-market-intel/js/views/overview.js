import { api } from "../api.js";
import { fmtDate, h, issueList, mount, pageHead, plural, section } from "../dom.js";
import { harvestSummary, runHarvestButton, watchHarvest } from "../harvest.js";

function phaseTable(rows) {
  return h("div", { class: "table-wrap" }, h("table", {},
    h("thead", {}, h("tr", {}, ["Phase", "Runs", "Depends on", "Now"].map((t) => h("th", {}, t)))),
    h("tbody", {}, rows.map(({ phase, href, runs, dependsOn, now, tone }) => h("tr", {},
      h("td", {}, h("a", { href }, phase)),
      h("td", { class: "small" }, runs),
      h("td", { class: "small muted" }, dependsOn),
      h("td", {}, h("span", { class: `pill ${tone}` }, now)))))));
}

export default async function renderOverview(root) {
  const [stats, status, runs, interviews, taxonomy, vectors, matrix, versions, preflight] = await Promise.all([
    api.get("/api/corpus/stats"),
    api.get("/api/harvest/status"),
    api.get("/api/harvest/runs", { limit: 1 }),
    api.get("/api/interviews"),
    api.get("/api/taxonomy"),
    api.get("/api/vectors", { include_inactive: false }),
    api.get("/api/matrix"),
    api.get("/api/versions"),
    api.get("/api/versions/preflight"),
  ]);
  const rerender = () => renderOverview(root);
  if (status.running) watchHarvest(rerender);

  const vectorsInRange = vectors.length >= 4 && vectors.length <= 6;
  const latest = versions[0];

  mount(root,
    pageHead("Pipeline", "How the brief gets made: a passive harvester feeds the corpus, and each later phase must cite it."),
    preflight.publishable ? null : section("Blocking the next version", issueList(preflight.issues, "warn")),
    section("Harvest engine", h("div", { class: "card" }, harvestSummary(status, runs[0])),
      runHarvestButton(null, () => watchHarvest(rerender))),
    section("What runs when", phaseTable([
      { phase: "0 — Passive harvesting", href: "#/corpus", runs: "Continuously, weekly background job", dependsOn: "Nothing",
        now: status.running ? "harvesting" : plural(stats.total, "record"), tone: status.running ? "accent" : "ok" },
      { phase: "1 — Interviews", href: "#/interviews", runs: "Ongoing weekly cadence", dependsOn: "Loosely informed by Phase 0",
        now: plural(interviews.length, "interview"), tone: interviews.length ? "ok" : "warn" },
      { phase: "2 — Taxonomy", href: "#/taxonomy", runs: "Refreshed each version cycle", dependsOn: "Phases 0 + 1 corpus volume",
        now: plural(taxonomy.rows.length, "row"), tone: taxonomy.sufficient_volume && taxonomy.rows.length ? "ok" : "warn" },
      { phase: "3 — Vectors", href: "#/vectors", runs: "Refreshed each version cycle", dependsOn: "Phase 2",
        now: `${vectors.length} of 4–6`, tone: vectorsInRange ? "ok" : "warn" },
      { phase: "4 — Matrix & gaps", href: "#/matrix", runs: "Refreshed each version cycle", dependsOn: "Phase 3",
        now: `${plural(matrix.scores.length, "score")} · ${plural(matrix.gaps.length, "gap")}`,
        tone: matrix.scores.length ? "ok" : "warn" },
      { phase: "5 — Versioning", href: "#/versions", runs: "Fixed cadence, after each scheduled harvest", dependsOn: "All of the above",
        now: latest ? `v${latest.id} · ${fmtDate(latest.created_at)}` : "no versions yet", tone: latest?.publishable ? "ok" : "warn" },
    ])),
  );
}
