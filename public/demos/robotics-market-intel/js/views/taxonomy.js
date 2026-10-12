import { api } from "../api.js";
import {
  busy, citationLink, empty, evidencePicker, field, h, issueList, mount, pageHead, plural, section, tagBadge, tagSelect,
  toast,
} from "../dom.js";

const TAXONOMY_TAGS = ["PATTERN — inferred", "FACT — sourced", "OPINION — analyst"];

function rowForm(row, onSaved, onCancel) {
  const picker = evidencePicker(row?.evidence ?? []);
  const form = h("form", { class: "card" },
    h("h3", { style: "margin-bottom:12px" }, row ? `Edit taxonomy #${row.id}` : "New taxonomy row"),
    h("div", { class: "form-grid" },
      field("Raw symptom", h("input", { name: "raw_symptom", required: true, value: row?.raw_symptom ?? "" })),
      field("Normalized sub-category", h("input", { name: "sub_category", required: true, value: row?.sub_category ?? "" })),
      field("Root operational cause", h("input", { name: "root_cause", required: true, value: row?.root_cause ?? "" }))),
    h("div", { class: "form-grid" },
      field("Tag", tagSelect("tag", TAXONOMY_TAGS, row?.tag ?? TAXONOMY_TAGS[0]),
        "PATTERN unless a linked source states the root cause explicitly (then FACT)."),
      field("Tag detail (optional)", h("input", { name: "tag_detail", value: row?.tag_detail ?? "" }),
        "FACT defaults to the linked records' citations.")),
    field("Supporting corpus records", picker.element, "Rows must be built from the corpus — link at least one record."),
    h("div", { class: "row" },
      h("button", { class: "primary", type: "submit" }, row ? "Save changes" : "Add row"),
      onCancel && h("button", { type: "button", onclick: onCancel }, "Cancel")));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(form.querySelector("button[type=submit]"), async () => {
      const body = {
        raw_symptom: form.raw_symptom.value.trim(),
        sub_category: form.sub_category.value.trim(),
        root_cause: form.root_cause.value.trim(),
        tag: form.tag.value,
        tag_detail: form.tag_detail.value.trim() || null,
        evidence_ids: picker.ids(),
      };
      if (row) await api.put(`/api/taxonomy/${row.id}`, body);
      else await api.post("/api/taxonomy", body);
      toast(row ? "Row updated." : "Row added.");
      onSaved();
    });
  });
  return form;
}

function rowsTable(rows, onEdit, rerender) {
  return h("div", { class: "table-wrap" }, h("table", {},
    h("thead", {}, h("tr", {}, ["Raw symptom (source)", "Sub-category", "Root operational cause", "Tag", ""].map((t) => h("th", {}, t)))),
    h("tbody", {}, rows.map((row) => {
      const remove = h("button", { class: "link small danger", type: "button" }, "Delete");
      remove.addEventListener("click", () => busy(remove, async () => {
        await api.del(`/api/taxonomy/${row.id}`);
        rerender();
      }));
      return h("tr", {},
        h("td", {}, h("div", {}, row.raw_symptom),
          h("details", { class: "small" }, h("summary", { class: "muted" }, plural(row.evidence.length, "source")),
            h("ul", { class: "issues" }, row.evidence.map((e) => h("li", {}, citationLink(e.citation)))))),
        h("td", {}, row.sub_category),
        h("td", {}, row.root_cause),
        h("td", {}, tagBadge(row.rendered_tag), issueList(row.violations)),
        h("td", {}, h("div", { class: "row" },
          h("button", { class: "link small", type: "button", onclick: () => onEdit(row) }, "Edit"), remove)));
    }))));
}

export default async function renderTaxonomy(root) {
  const data = await api.get("/api/taxonomy");
  const rerender = () => renderTaxonomy(root);
  const formSlot = h("div");
  const showForm = (row) => {
    formSlot.replaceChildren(rowForm(row, rerender, row ? () => showForm(null) : null));
    if (row) formSlot.scrollIntoView({ behavior: "smooth" });
  };
  showForm(null);

  const volume = data.sufficient_volume
    ? null
    : h("div", { class: "notice warn" },
      `Insufficient corpus volume: ${data.corpus_total} records (threshold ${data.min_corpus}). ` +
      "Rows can be drafted, but versions stay blocked — do not fill this table with plausible placeholders.");

  mount(root,
    pageHead("Phase 2 · Taxonomy normalization",
      "Normalize raw symptoms into sub-categories and root causes, built from the accumulating corpus rather than drafted speculatively."),
    volume,
    section(`Rows (${data.rows.length})`, data.rows.length ? rowsTable(data.rows, showForm, rerender)
      : empty("No taxonomy rows yet. Link corpus records to create the first one.")),
    section("Add or edit", formSlot),
  );
}
