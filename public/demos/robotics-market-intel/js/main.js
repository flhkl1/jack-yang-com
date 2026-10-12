import { h } from "./dom.js";
import corpus from "./views/corpus.js";
import interviews from "./views/interviews.js";
import matrix from "./views/matrix.js";
import pipeline from "./views/overview.js";
import protocol from "./views/protocol.js";
import taxonomy from "./views/taxonomy.js";
import today from "./views/today.js";
import vectors from "./views/vectors.js";
import versions from "./views/versions.js";

// Top-level sections. Everything about how the brief gets made lives under Pipeline.
const ROUTES = [
  { path: "today", label: "Today", view: today },
  { path: "corpus", label: "Evidence", view: corpus },
  { path: "pipeline", label: "Pipeline", view: pipeline },
];
const PHASES = [
  { path: "pipeline", label: "Status", view: pipeline },
  { path: "interviews", label: "Interviews", view: interviews },
  { path: "taxonomy", label: "Taxonomy", view: taxonomy },
  { path: "vectors", label: "Vectors", view: vectors },
  { path: "matrix", label: "Matrix & gaps", view: matrix },
  { path: "versions", label: "Versions", view: versions },
  { path: "protocol", label: "Tagging protocol", view: protocol },
];

const views = Object.fromEntries([...ROUTES, ...PHASES].map((r) => [r.path, r]));
const link = (route, active) => h("a", { href: `#/${route.path}`, class: route.path === active ? "active" : "" }, route.label);

function renderNav(active) {
  const inPipeline = PHASES.some((phase) => phase.path === active);
  document.getElementById("nav").replaceChildren(...ROUTES.map((route) => link(route, inPipeline ? "pipeline" : active)));
  document.getElementById("subnav").replaceChildren(...(inPipeline ? PHASES.map((phase) => link(phase, active)) : []));
}

async function render() {
  const path = location.hash.replace(/^#\/?/, "").split("?")[0] || "today";
  const route = views[path] ?? views.today;
  const root = document.getElementById("view");
  renderNav(route.path);
  document.title = `${route.label} · Robotics Market Intel`;
  root.replaceChildren(h("p", { class: "muted" }, "Loading…"));
  try {
    await route.view(root);
  } catch (error) {
    root.replaceChildren(h("div", { class: "notice bad" }, `Could not load this page: ${error.message}`));
  }
}

window.addEventListener("hashchange", render);
render();
