import { api } from "../api.js";
import {
  busy, citationLink, empty, field, fmtDate, h, mount, pageHead, plural, section, toast,
} from "../dom.js";

function guideList(guide, rerender) {
  const add = h("form", { class: "row", style: "margin-top:10px" },
    h("input", { name: "question", required: true, minlength: 5, placeholder: "Add a question to the guide…", style: "flex:1;min-width:220px" }),
    h("button", { type: "submit" }, "Add"));
  add.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(add.querySelector("button"), async () => {
      await api.post("/api/interview-guide", { question: add.question.value.trim() });
      rerender();
    });
  });

  return h("div", { class: "card" },
    h("div", { class: "stack" }, guide.map((q) => {
      const toggle = h("button", { class: "link small", type: "button" }, q.active ? "Retire" : "Restore");
      toggle.addEventListener("click", () => busy(toggle, async () => {
        await api.patch(`/api/interview-guide/${q.id}`, { active: !q.active });
        rerender();
      }));
      return h("div", { class: "row" },
        h("span", { class: `pill ${q.origin === "corpus" ? "accent" : ""}` }, q.origin),
        h("span", { class: q.active ? "" : "muted", style: `flex:1;${q.active ? "" : "text-decoration:line-through"}` }, q.question),
        toggle);
    })),
    add);
}

function suggestionList(suggestions, rerender) {
  if (!suggestions.length) return empty("Nothing new surfacing in the last 30 days of harvested records.");
  return h("div", { class: "stack" }, suggestions.map((s) => {
    const adopt = h("button", { type: "button" }, "Add to guide");
    adopt.addEventListener("click", () => busy(adopt, async () => {
      await api.post("/api/interview-guide", { question: s.question, origin: "corpus" });
      toast("Question added to the guide.");
      rerender();
    }));
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("span", { class: "pill accent" }, s.label), h("span", { class: "muted small" }, plural(s.count, "record")),
        h("span", { class: "spacer" }), adopt),
      h("p", { style: "margin:8px 0 4px" }, s.question),
      h("div", { class: "small muted" }, "e.g. ", s.examples.map((c, i) => [i ? " · " : "", citationLink(c)])));
  }));
}

function logForm(guide, rerender) {
  const active = guide.filter((q) => q.active);
  const answers = h("div", {}, active.map((q) => field(q.question, h("textarea", { "data-question": q.question, rows: 3 }))));
  const addCustom = h("button", { type: "button", class: "link small" }, "+ Add an unscripted question");
  addCustom.addEventListener("click", () => {
    const question = h("input", { placeholder: "Question asked" });
    const answer = h("textarea", { rows: 3, placeholder: "Answer (verbatim where possible)" });
    answer.addEventListener("input", () => { answer.dataset.question = question.value.trim(); });
    question.addEventListener("input", () => { answer.dataset.question = question.value.trim(); });
    answers.append(h("div", { class: "field" }, question, answer));
  });

  const form = h("form", { class: "card" },
    h("div", { class: "form-grid" },
      field("Interviewee role", h("input", { name: "role", required: true, placeholder: "Hardware Integration Lead" })),
      field("Organization (optional)", h("input", { name: "organization" })),
      field("Conducted on", h("input", { name: "conducted_at", type: "date", required: true, value: new Date().toISOString().slice(0, 10) }))),
    answers, addCustom,
    field("Notes (not added to the corpus)", h("textarea", { name: "notes", rows: 2 })),
    h("button", { class: "primary", type: "submit" }, "Log interview"));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    busy(form.querySelector("button[type=submit]"), async () => {
      const body = {
        role: form.role.value.trim(),
        organization: form.organization.value.trim() || null,
        conducted_at: form.conducted_at.value,
        notes: form.notes.value.trim() || null,
        answers: [...answers.querySelectorAll("textarea")]
          .filter((t) => t.dataset.question && t.value.trim())
          .map((t) => ({ question: t.dataset.question, answer: t.value.trim() })),
      };
      const result = await api.post("/api/interviews", body);
      toast(`Logged ${result.citation} — ${plural(result.record_ids.length, "answer")} added to the corpus.`);
      rerender();
    });
  });
  return form;
}

export default async function renderInterviews(root) {
  const [guide, suggestions, interviews] = await Promise.all([
    api.get("/api/interview-guide"),
    api.get("/api/interview-guide/suggestions"),
    api.get("/api/interviews"),
  ]);
  const rerender = () => renderInterviews(root);

  mount(root,
    pageHead("Phase 1 · Interviews",
      "Primary research informed by the corpus, not fixed at project start. Every logged answer becomes a corpus record " +
      "citable as [FACT — sourced: interview #NN]. Recommended cadence: 3–5 interviews a week."),
    section("Surfacing from the corpus", suggestionList(suggestions, rerender)),
    section("Interview guide", guideList(guide, rerender)),
    section("Log an interview", logForm(guide, rerender)),
    section(`Logged interviews (${interviews.length})`, interviews.length
      ? h("div", {}, interviews.map((iv) => h("details", { class: "card" },
        h("summary", {}, `${iv.citation} — ${iv.role}${iv.organization ? `, ${iv.organization}` : ""}`,
          h("span", { class: "muted small" }, ` · ${fmtDate(iv.conducted_at)} · ${plural(iv.answers.length, "answer")}`)),
        iv.answers.map((a) => h("div", { class: "card" },
          h("span", { class: "pill" }, a.surface_symptom_guess), h("p", { class: "excerpt" }, a.raw_text))),
        iv.notes && h("p", { class: "muted" }, `Notes: ${iv.notes}`))))
      : empty("No interviews logged yet.")),
  );
}
