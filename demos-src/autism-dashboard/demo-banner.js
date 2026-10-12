// A small fixed note so nobody mistakes the demo for a real person's finances.
const note = document.createElement("div");
note.setAttribute("role", "note");
note.innerHTML =
  '<strong>Demo</strong> · every name, number and account here is made up · ' +
  '<a href="/projects">jack-yang.com</a> · <a href="https://github.com/flhkl1/autism" target="_blank" rel="noopener noreferrer">repo</a>';
Object.assign(note.style, {
  position: "fixed", left: "68px", bottom: "12px", zIndex: 9999, maxWidth: "calc(100vw - 80px)",
  font: "12px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  background: "rgba(20,20,22,0.92)", color: "#e8e8ea", border: "1px solid #333",
  borderRadius: "999px", padding: "6px 14px", boxShadow: "0 2px 10px rgba(0,0,0,.3)",
});
for (const a of note.querySelectorAll("a")) Object.assign(a.style, { color: "#e8e8ea" });
document.addEventListener("DOMContentLoaded", () => document.body.append(note));
if (document.readyState !== "loading") document.body.append(note);
