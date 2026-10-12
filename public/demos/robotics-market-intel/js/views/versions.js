import { api } from "../api.js";
import { busy, empty, fmtDate, h, issueList, mount, pageHead, plural, section, toast } from "../dom.js";

function hashVersionId() {
  return Number(new URLSearchParams(location.hash.split("?")[1] ?? "").get("v")) || null;
}

function changeSummary(diff) {
  const newRecords = Object.values(diff.corpus_new).reduce((sum, n) => sum + n, 0);
  if (diff.first_version) return `First version · ${plural(newRecords, "corpus record")}`;
  return [
    `+${plural(newRecords, "record")}`,
    diff.tag_moves.length && plural(diff.tag_moves.length, "tag move"),
    diff.vectors_added.length && `${diff.vectors_added.length} vector(s) added`,
    diff.vectors_retired.length && `${diff.vectors_retired.length} vector(s) retired`,
    diff.scores_changed.length && plural(diff.scores_changed.length, "score change"),
  ].filter(Boolean).join(" · ");
}

function versionList(versions, selectedId) {
  if (!versions.length) return empty("No versions yet. Cut the first one to snapshot Phases 0–4.");
  return h("div", { class: "table-wrap" }, h("table", {},
    h("thead", {}, h("tr", {}, ["Version", "Cut", "Status", "Changes"].map((t) => h("th", {}, t)))),
    h("tbody", {}, versions.map((v) => h("tr", { style: v.id === selectedId ? "background:var(--accent-soft)" : null },
      h("td", {}, h("a", { href: `#/versions?v=${v.id}` }, `v${v.id}`)),
      h("td", {}, fmtDate(v.created_at)),
      h("td", {}, v.publishable ? h("span", { class: "pill ok" }, "publishable")
        : h("span", { class: "pill bad" }, `draft · ${plural(v.issues.length, "issue")}`)),
      h("td", { class: "small" }, changeSummary(v.diff)))))));
}

async function versionDetail(id) {
  const version = await api.get(`/api/versions/${id}`);
  const report = h("div", { class: "card prose" });
  // report_html is sanitised server-side with an nh3 allowlist (no scripts, images or unsafe URL schemes).
  report.innerHTML = version.report_html;
  const exportLink = version.publishable
    ? h("a", { class: "button", href: `snapshot/report-v${id}.md`, download: `market-intel-v${id}.md` }, "Export report (.md)")
    : h("a", { class: "button", href: `snapshot/report-v${id}.md`, download: `market-intel-v${id}-DRAFT.md` }, "Export DRAFT (.md)");
  return section(`v${id} report`, h("div", { class: "stack" },
    version.publishable ? null : h("div", { class: "notice bad" },
      "Publishing is blocked until these are resolved — export is available as a draft only.",
      h("ul", { class: "issues" }, version.issues.map((issue) => h("li", {}, issue)))),
    report), exportLink);
}

export default async function renderVersions(root) {
  const [versions, preflight] = await Promise.all([api.get("/api/versions"), api.get("/api/versions/preflight")]);
  const selectedId = hashVersionId() ?? versions[0]?.id ?? null;

  const cut = h("button", { class: "primary" }, "Cut version");
  cut.addEventListener("click", () => busy(cut, async () => {
    const { id } = await api.post("/api/versions");
    toast(`Cut v${id}.`);
    location.hash = `#/versions?v=${id}`;
  }));

  mount(root,
    pageHead("Phase 5 · Review & versioning",
      "Re-issued on a fixed cycle (a version is cut automatically after each scheduled harvest). Each version logs " +
      "corpus changes, tag moves and vector lineage; unsupported entries are flagged rather than carried forward.",
      cut),
    section("Pre-flight for the next version", preflight.publishable
      ? h("div", { class: "notice ok" }, "No blocking issues — the next version will be publishable.")
      : issueList(preflight.issues)),
    section("Versions", versionList(versions, selectedId)),
    selectedId ? await versionDetail(selectedId) : null,
  );
}
