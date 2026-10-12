import { api } from "./api.js";

/** Build an element. Children are appended as text nodes unless they are Nodes (no innerHTML). */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  let value;
  for (const [key, attr] of Object.entries(attrs ?? {})) {
    if (attr === null || attr === undefined || attr === false) continue;
    if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), attr);
    else if (key === "class") el.className = attr;
    else if (key === "value") value = attr;
    else el.setAttribute(key, attr === true ? "" : attr);
  }
  el.append(
    ...children
      .flat(Infinity)
      .filter((child) => child !== null && child !== undefined && child !== false)
      .map((child) => (child instanceof Node ? child : document.createTextNode(String(child)))),
  );
  if (value !== undefined) el.value = value; // after children so <select> options exist
  return el;
}

/** Replace a container's content, skipping null/false children (replaceChildren would print "null"). */
export function mount(root, ...children) {
  root.replaceChildren(...children.flat().filter((child) => child !== null && child !== undefined && child !== false));
}

export function toast(message, kind = "info") {
  const el = h("div", { class: `toast ${kind}` }, message);
  document.getElementById("toasts").append(el);
  setTimeout(() => el.remove(), kind === "error" ? 8000 : 3500);
}

/** Run an async action with the button disabled; report errors as toasts. Returns true on success. */
export async function busy(button, action) {
  button.disabled = true;
  try {
    await action();
    return true;
  } catch (error) {
    toast(error.message, "error");
    return false;
  } finally {
    button.disabled = false;
  }
}

export function formValues(form) {
  return Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return date.toLocaleString(undefined, dateOnly
    ? { dateStyle: "medium", timeZone: "UTC" }
    : { dateStyle: "medium", timeStyle: "short" });
}

export function pageHead(title, description, ...actions) {
  return h("header", { class: "page-head" },
    h("div", {}, h("h1", {}, title), description && h("p", {}, description)),
    actions.length ? h("div", { class: "row" }, ...actions) : null);
}

export function section(title, content, ...actions) {
  return h("section", { class: "section" },
    h("div", { class: "section-head" }, h("h2", {}, title), actions.length ? h("div", { class: "row" }, ...actions) : null),
    content);
}

export function field(labelText, input, help) {
  return h("div", { class: "field" }, h("label", {}, labelText, input), help && h("div", { class: "help" }, help));
}

export function empty(text) {
  return h("div", { class: "empty" }, text);
}

export function stat(label, value, hint, tone) {
  return h("div", { class: `card stat ${tone ?? ""}` },
    h("span", { class: "label" }, label), h("span", { class: "value" }, value), hint && h("span", { class: "hint" }, hint));
}

const TAG_CLASSES = { FACT: "fact", PATTERN: "pattern", OPINION: "opinion", METRIC: "metric", GAP: "gap" };

/** Render a server-rendered inline tag such as "`[FACT — sourced: url]`". */
export function tagBadge(rendered) {
  const text = rendered.replaceAll("`", "");
  const kind = Object.entries(TAG_CLASSES).find(([prefix]) => text.includes(`[${prefix}`))?.[1] ?? "untagged";
  return h("span", { class: `tag ${kind}` }, text);
}

export function citationLink(citation) {
  return /^https?:\/\//.test(citation)
    ? h("a", { href: citation, target: "_blank", rel: "noopener noreferrer" }, citation)
    : h("span", { class: "mono" }, citation);
}

export function issueList(issues, tone = "bad") {
  if (!issues?.length) return null;
  return h("div", { class: `notice ${tone}` }, h("ul", { class: "issues" }, issues.map((issue) => h("li", {}, issue))));
}

export const TAGS = ["FACT — sourced", "PATTERN — inferred", "OPINION — analyst", "METRIC — imposed", "GAP — unverified"];

export function tagSelect(name, allowed, selected) {
  return h("select", { name, value: selected }, allowed.map((tag) => h("option", { value: tag }, `[${tag}]`)));
}

/** Search-and-link picker for corpus evidence. */
export function evidencePicker(initial = []) {
  const selected = new Map(initial.map((record) => [record.id, record]));
  const chips = h("div", { class: "chips" });
  const results = h("div", { class: "picker-results" });
  const input = h("input", { type: "search", placeholder: "Search the corpus to link supporting records…" });
  let timer;

  const label = (record) => record.title || record.citation || record.raw_text?.slice(0, 80) || record.id;

  function renderChips() {
    chips.replaceChildren(
      ...(selected.size
        ? [...selected.values()].map((record) => h("span", { class: "chip", title: record.citation },
          h("span", {}, label(record)),
          h("button", { type: "button", "aria-label": "Remove", onclick: () => { selected.delete(record.id); renderChips(); } }, "×")))
        : [h("span", { class: "muted small" }, "No evidence linked yet.")]),
    );
  }

  async function search() {
    const q = input.value.trim();
    if (!q) return results.replaceChildren();
    const { items } = await api.get("/api/records", { q, limit: 8 });
    results.replaceChildren(
      ...(items.length ? items.map((record) => h("button", {
        type: "button",
        class: "picker-item",
        onclick: () => { selected.set(record.id, record); renderChips(); },
      }, h("span", { class: "pill" }, record.source_type), " ", label(record))) : [h("span", { class: "muted small" }, "No matches.")]),
    );
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => search().catch((error) => toast(error.message, "error")), 250);
  });
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") event.preventDefault(); });
  renderChips();
  return { element: h("div", { class: "picker" }, chips, input, results), ids: () => [...selected.keys()] };
}
