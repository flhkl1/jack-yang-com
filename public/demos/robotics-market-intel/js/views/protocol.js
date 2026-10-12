import { api } from "../api.js";
import { h, mount, pageHead, section, tagBadge } from "../dom.js";

export default async function renderProtocol(root) {
  const protocol = await api.get("/api/protocol");
  const framework = h("div", { class: "card prose" });
  // framework_html is rendered from docs/framework-v2.md and sanitised server-side.
  framework.innerHTML = protocol.framework_html;

  mount(root,
    pageHead("Tagging protocol",
      "Non-negotiable: every substantive claim, score or grouping decision carries exactly one tag. Untagged claims block publishing."),
    section("Tags", h("div", { class: "table-wrap" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", {}, "Tag"), h("th", {}, "Meaning"))),
      h("tbody", {}, protocol.tags.map((t) => h("tr", {}, h("td", {}, tagBadge(`\`[${t.tag}]\``)), h("td", {}, t.meaning))))))),
    section("Framework v2", framework),
  );
}
