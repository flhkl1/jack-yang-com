import { api } from "../api.js";
import {
  busy, citationLink, empty, evidencePicker, field, formValues, h, issueList, mount, pageHead, section, tagBadge, toast,
} from "../dom.js";

function rubricReference(matrix) {
  if (!matrix.vectors.length) return empty("Create vectors in Phase 3 first.");
  return h("div", { class: "card stack" },
    h("div", {}, "All scores are ", tagBadge(matrix.rendered_score_tag)),
    matrix.vectors.map((v) => h("details", {},
      h("summary", {}, `${v.label} ${v.name} `, h("span", { class: `pill ${v.rubric_complete ? "ok" : "warn"}` },
        v.rubric_complete ? "rubric stated" : "rubric incomplete — edit in Phase 3")),
      h("ol", { class: "issues" }, [1, 2, 3, 4, 5].map((score) => h("li", {}, v.rubric[score] ?? "—"))))));
}

function competitorsCard(competitors, rerender) {
  const form = h("form", { class: "form-grid" },
    field("Name", h("input", { name: "name", required: true })),
    field("Public offering URL (optional)", h("input", { name: "url", type: "url" })),
    h("div", { class: "row" }, h("button", { type: "submit" }, "Add competitor")));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(form.querySelector("button"), async () => {
      const values = formValues(form);
      await api.post("/api/competitors", { name: values.name, url: values.url || null });
      rerender();
    });
  });
  return h("div", { class: "card" },
    competitors.length ? h("div", { class: "row", style: "margin-bottom:12px" }, competitors.map((c) => {
      const remove = h("button", { type: "button", "aria-label": `Remove ${c.name}` }, "×");
      remove.addEventListener("click", () => busy(remove, async () => {
        await api.del(`/api/competitors/${c.id}`);
        rerender();
      }));
      return h("span", { class: "chip" }, h("span", {}, c.name), remove);
    })) : null,
    form);
}

function scoreEditor(matrix, cell, rerender) {
  const vector = matrix.vectors.find((v) => v.id === cell.vector_id);
  const competitor = matrix.competitors.find((c) => c.id === cell.competitor_id);
  const existing = matrix.scores.find((s) => s.vector_id === cell.vector_id && s.competitor_id === cell.competitor_id);
  const picker = evidencePicker([]);
  const form = h("form", { class: "card" },
    h("h3", { style: "margin-bottom:12px" }, `Score ${competitor.name} on ${vector.label} ${vector.name}`),
    vector.rubric_complete ? null : h("div", { class: "notice warn", style: "margin-bottom:12px" },
      "State this vector's full rubric (Phase 3) before scoring."),
    h("div", { class: "form-grid" },
      field("Score", h("select", { name: "score", value: existing?.score ?? 3 },
        [1, 2, 3, 4, 5].map((score) => h("option", { value: score }, `${score} — ${vector.rubric[score] ?? "rubric level not stated"}`)))),
      field("Evidence URL (competitor datasheet, pricing page, filing)", h("input", { name: "evidence_url", type: "url",
        value: existing?.evidence_url ?? "" }))),
    field("…or a corpus record", picker.element,
      existing?.evidence_citation ? `Current: ${existing.evidence_citation}` : "Unsupported scores are flagged for removal."),
    field("Rationale", h("textarea", { name: "rationale", value: existing?.rationale ?? "" })),
    h("div", { class: "row" },
      h("button", { class: "primary", type: "submit", disabled: !vector.rubric_complete }, "Save score"),
      existing && h("button", { type: "button", class: "danger", onclick: (event) => busy(event.currentTarget, async () => {
        await api.del(`/api/scores/${cell.competitor_id}/${cell.vector_id}`);
        rerender();
      }) }, "Remove score")));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(form.querySelector("button[type=submit]"), async () => {
      const values = formValues(form);
      await api.put("/api/scores", {
        competitor_id: cell.competitor_id,
        vector_id: cell.vector_id,
        score: Number(values.score),
        rationale: values.rationale || null,
        evidence_url: values.evidence_url || null,
        evidence_record_id: picker.ids()[0] ?? existing?.evidence_record_id ?? null,
      });
      toast("Score saved.");
      rerender();
    });
  });
  return form;
}

function matrixTable(matrix, onCell) {
  if (!matrix.vectors.length || !matrix.competitors.length) {
    return empty("Add competitors and active vectors to build the matrix.");
  }
  const scores = new Map(matrix.scores.map((s) => [`${s.competitor_id}:${s.vector_id}`, s]));
  return h("div", { class: "table-wrap" }, h("table", {},
    h("thead", {}, h("tr", {}, h("th", {}, "Competitor"), matrix.vectors.map((v) => h("th", {}, `${v.label} ${v.name}`)))),
    h("tbody", {}, matrix.competitors.map((c) => h("tr", {},
      h("td", {}, c.url ? h("a", { href: c.url, target: "_blank", rel: "noopener noreferrer" }, c.name) : c.name),
      matrix.vectors.map((v) => {
        const score = scores.get(`${c.id}:${v.id}`);
        const open = h("button", { type: "button", class: "link", onclick: () => onCell({ competitor_id: c.id, vector_id: v.id }) },
          score ? h("strong", { style: "font-size:18px" }, score.score) : "Score");
        return h("td", {}, open,
          score?.evidence_citation && h("div", { class: "small" }, citationLink(score.evidence_citation)),
          score && issueList(score.violations, "warn"));
      }))))));
}

function gapsCard(matrix, rerender) {
  const form = h("form", { class: "form-grid" },
    field("White-space claim", h("input", { name: "claim", required: true, placeholder: "Nobody offers hour-level integration SLAs" })),
    field("Vector (optional)", h("select", { name: "vector_id" }, h("option", { value: "" }, "—"),
      matrix.vectors.map((v) => h("option", { value: v.id }, `${v.label} ${v.name}`)))),
    h("div", { class: "row" }, h("button", { type: "submit" }, "Log gap")));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(form.querySelector("button"), async () => {
      const values = formValues(form);
      await api.post("/api/gaps", { claim: values.claim, vector_id: values.vector_id ? Number(values.vector_id) : null });
      rerender();
    });
  });

  const gapRow = (gap) => {
    const url = h("input", { type: "url", placeholder: "Competitor source checked", value: gap.source_url ?? "", style: "min-width:220px;flex:1" });
    const setStatus = (status) => (event) => busy(event.currentTarget, async () => {
      await api.put(`/api/gaps/${gap.id}`, { status, source_url: url.value.trim() || null });
      rerender();
    });
    return h("div", { class: "card stack" },
      h("div", { class: "row" }, h("strong", {}, gap.claim), tagBadge(gap.rendered_tag)),
      issueList(gap.violations),
      h("div", { class: "row small" }, url,
        h("button", { type: "button", onclick: setStatus("verified") }, "Verified gap"),
        h("button", { type: "button", onclick: setStatus("served") }, "Served — previously missed"),
        gap.status !== "unverified" && h("button", { type: "button", onclick: setStatus("unverified") }, "Reset"),
        h("button", { type: "button", class: "danger", onclick: (event) => busy(event.currentTarget, async () => {
          await api.del(`/api/gaps/${gap.id}`);
          rerender();
        }) }, "Delete")));
  };

  return h("div", {}, h("div", { class: "card" }, form),
    matrix.gaps.length ? matrix.gaps.map(gapRow) : h("p", { class: "muted" }, "No gap claims logged."));
}

export default async function renderMatrix(root) {
  const matrix = await api.get("/api/matrix");
  const rerender = () => renderMatrix(root);
  const editorSlot = h("div");
  const openCell = (cell) => {
    editorSlot.replaceChildren(scoreEditor(matrix, cell, rerender));
    editorSlot.scrollIntoView({ behavior: "smooth" });
  };

  mount(root,
    pageHead("Phase 4 · Competitor matrix & gaps",
      "State the rubric before the table. Every white-space claim stays [GAP — unverified] until it is checked against a " +
      "competitor's public offering."),
    section("Scoring rubric", rubricReference(matrix)),
    section("Competitors", competitorsCard(matrix.competitors, rerender)),
    section("Matrix", h("div", {}, matrixTable(matrix, openCell), h("div", { style: "margin-top:12px" }, editorSlot))),
    section("White space", gapsCard(matrix, rerender)),
  );
}
