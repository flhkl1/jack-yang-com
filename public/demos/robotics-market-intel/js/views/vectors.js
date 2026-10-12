import { api } from "../api.js";
import {
  busy, citationLink, empty, evidencePicker, field, h, issueList, mount, pageHead, plural, section, tagBadge, tagSelect,
  toast,
} from "../dom.js";

const ORTHOGONALITY_TAGS = ["OPINION — analyst", "PATTERN — inferred", "FACT — sourced"];
const MIN_VECTORS = 4;
const MAX_VECTORS = 6;

/** A button that asks for a second click before running a destructive action (no blocking dialogs). */
function confirmButton(label, confirmLabel, action) {
  const button = h("button", { type: "button", class: "link small danger" }, label);
  let armed = false;
  button.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      button.textContent = confirmLabel;
      setTimeout(() => { armed = false; button.textContent = label; }, 4000);
      return;
    }
    busy(button, action);
  });
  return button;
}

function rubricEditor(vector, rerender) {
  const form = h("form", { class: "stack" },
    [1, 2, 3, 4, 5].map((score) => h("div", { class: "row" },
      h("span", { class: "pill", style: "min-width:2.2em;text-align:center" }, score),
      h("input", { name: `level${score}`, required: true, value: vector.rubric[score] ?? "", style: "flex:1;min-width:200px",
        placeholder: score === 1 ? "worst — e.g. > 80 engineer-hours" : score === 5 ? "best — e.g. < 4 engineer-hours" : "" }))),
    h("button", { type: "submit" }, "Save rubric"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(form.querySelector("button"), async () => {
      const levels = Object.fromEntries([1, 2, 3, 4, 5].map((score) => [score, form[`level${score}`].value.trim()]));
      await api.put(`/api/vectors/${vector.id}/rubric`, { levels });
      toast(`Rubric saved for ${vector.label}.`);
      rerender();
    });
  });
  return h("details", { open: !vector.rubric_complete },
    h("summary", {}, "Scoring rubric ", h("span", { class: `pill ${vector.rubric_complete ? "ok" : "warn"}` },
      vector.rubric_complete ? "stated" : "incomplete")),
    form);
}

function vectorCard(vector, { onEdit, onSplit, rerender }) {
  return h("article", { class: "card stack" },
    h("div", { class: "row" },
      h("span", { class: "pill accent" }, vector.label), h("h2", {}, vector.name),
      vector.lineage_type && h("span", { class: "pill" }, `${vector.lineage_type} of #${vector.lineage_from.join(", #")}`),
      h("span", { class: "spacer" }),
      h("button", { type: "button", class: "link small", onclick: () => onEdit(vector) }, "Edit"),
      h("button", { type: "button", class: "link small", onclick: () => onSplit(vector) }, "Split"),
      confirmButton("Kill", "Click again to kill", async () => {
        await api.post(`/api/vectors/${vector.id}/kill`);
        toast(`${vector.label} killed.`);
        rerender();
      })),
    h("p", { style: "margin:0" }, vector.concept),
    issueList(vector.violations),
    h("div", {}, h("strong", {}, "Orthogonality: "), vector.orthogonality_justification, " ", tagBadge(vector.rendered_orthogonality_tag),
      vector.orthogonality_detail && h("div", { class: "small muted" }, `Independence test: ${vector.orthogonality_detail}`)),
    h("div", {}, h("strong", {}, "Metric: "), vector.metric_name, " ", tagBadge(vector.rendered_metric_tag)),
    h("details", {}, h("summary", {}, `Aggregated sub-complaints (${plural(vector.evidence.length, "record")})`),
      h("ul", { class: "issues" }, vector.evidence.map((e) => h("li", {}, e.title ? `${e.title} — ` : "", citationLink(e.citation))))),
    rubricEditor(vector, rerender));
}

function vectorForm({ vector, lineage, active, onSaved, onCancel }) {
  const picker = evidencePicker(vector?.evidence ?? []);
  const lineageType = h("select", { name: "lineage_type", value: lineage?.type ?? "" },
    h("option", { value: "" }, "New vector (no lineage)"),
    h("option", { value: "split" }, "Split of an existing vector"),
    h("option", { value: "merge" }, "Merge of existing vectors"));
  const parents = h("div", { class: "checks" }, active.map((v) => h("label", {},
    h("input", { type: "checkbox", value: v.id, checked: lineage?.from?.includes(v.id) }), `${v.label} ${v.name}`)));
  const lineageFields = h("div", { class: "form-grid" }, field("Lineage", lineageType), field("Parent vector(s)", parents));

  const form = h("form", { class: "card" },
    h("h3", { style: "margin-bottom:12px" }, vector ? `Edit ${vector.label} ${vector.name}` : "New vector"),
    h("div", { class: "form-grid" },
      field("Name", h("input", { name: "name", required: true, value: vector?.name ?? "" })),
      field("Metric name", h("input", { name: "metric_name", required: true, value: vector?.metric_name ?? "",
        placeholder: "Time-to-Integration (hours)" }))),
    field("Concept", h("textarea", { name: "concept", required: true, value: vector?.concept ?? "" })),
    field("Metric convention", h("textarea", { name: "metric_convention", required: true, value: vector?.metric_convention ?? "" }),
      "[METRIC — imposed] State the unit, the boundary, and what is excluded — and why."),
    field("Orthogonality justification", h("textarea", { name: "orthogonality_justification", required: true,
      value: vector?.orthogonality_justification ?? "" })),
    h("div", { class: "form-grid" },
      field("Orthogonality tag", tagSelect("orthogonality_tag", ORTHOGONALITY_TAGS, vector?.orthogonality_tag ?? ORTHOGONALITY_TAGS[0]),
        "“Orthogonal” is a structuring heuristic: keep OPINION unless a data-driven independence test backs it."),
      field("Independence test (required for PATTERN/FACT)", h("input", { name: "orthogonality_detail", value: vector?.orthogonality_detail ?? "" }))),
    field("Aggregated sub-complaints", picker.element, "Link the corpus records this vector aggregates."),
    vector ? null : lineageFields,
    h("div", { class: "row" },
      h("button", { class: "primary", type: "submit" }, vector ? "Save changes" : "Create vector"),
      onCancel && h("button", { type: "button", onclick: onCancel }, "Cancel")));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(form.querySelector("button[type=submit]"), async () => {
      const body = {
        name: form.name.value.trim(),
        concept: form.concept.value.trim(),
        orthogonality_justification: form.orthogonality_justification.value.trim(),
        orthogonality_tag: form.orthogonality_tag.value,
        orthogonality_detail: form.orthogonality_detail.value.trim() || null,
        metric_name: form.metric_name.value.trim(),
        metric_convention: form.metric_convention.value.trim(),
        evidence_ids: picker.ids(),
      };
      if (vector) {
        await api.put(`/api/vectors/${vector.id}`, body);
      } else {
        const type = lineageType.value || null;
        const from = type ? [...parents.querySelectorAll("input:checked")].map((input) => Number(input.value)) : [];
        await api.post("/api/vectors", { ...body, lineage_type: type, lineage_from: from });
      }
      toast(vector ? "Vector updated." : "Vector created.");
      onSaved();
    });
  });
  return form;
}

export default async function renderVectors(root) {
  const vectors = await api.get("/api/vectors");
  const active = vectors.filter((v) => v.status === "active");
  const retired = vectors.filter((v) => v.status !== "active");
  const rerender = () => renderVectors(root);

  const formSlot = h("div");
  const showForm = (options = {}) => {
    formSlot.replaceChildren(vectorForm({
      active, onSaved: rerender, onCancel: options.vector || options.lineage ? () => showForm() : null, ...options,
    }));
    if (options.vector || options.lineage) formSlot.scrollIntoView({ behavior: "smooth" });
  };
  showForm();

  const inRange = active.length >= MIN_VECTORS && active.length <= MAX_VECTORS;
  const handlers = {
    onEdit: (vector) => showForm({ vector }),
    onSplit: (vector) => showForm({ lineage: { type: "split", from: [vector.id] } }),
    rerender,
  };

  mount(root,
    pageHead("Phase 3 · Orthogonal vectors",
      "Decompose the taxonomy into 4–6 vectors. Each needs citation-linked sub-complaints, a tagged orthogonality " +
      "justification and an explicitly imposed measurement convention."),
    h("div", { class: `notice ${inRange ? "ok" : "warn"}` },
      `${plural(active.length, "active vector")} — the framework requires ${MIN_VECTORS}–${MAX_VECTORS}.`),
    section("Active vectors", active.length ? h("div", {}, active.map((v) => vectorCard(v, handlers)))
      : empty("No vectors yet. Build them from taxonomy patterns and link their supporting records.")),
    section("Create or edit", formSlot),
    retired.length ? section("Retired (split, merged or killed)", h("div", { class: "table-wrap" }, h("table", {},
      h("thead", {}, h("tr", {}, ["#", "Name", "Status"].map((t) => h("th", {}, t)))),
      h("tbody", {}, retired.map((v) => h("tr", {}, h("td", {}, v.id), h("td", {}, v.name),
        h("td", {}, h("span", { class: "pill" }, v.status)))))))) : null,
  );
}
