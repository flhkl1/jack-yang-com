import { api } from "./api.js";
import { busy, fmtDate, h, toast } from "./dom.js";

const STATUS_TONE = { completed: "ok", running: "accent", completed_with_errors: "warn", failed: "bad", interrupted: "bad" };

export function runStatusPill(status) {
  return h("span", { class: `pill ${STATUS_TONE[status] ?? ""}` }, status.replaceAll("_", " "));
}

/** Poll until the running harvest finishes, then call onDone (if the user is still on the same page). */
export function watchHarvest(onDone) {
  const startedOn = location.hash;
  const timer = setInterval(async () => {
    if (location.hash !== startedOn) return clearInterval(timer);
    const status = await api.get("/api/harvest/status").catch(() => null);
    if (status && !status.running) {
      clearInterval(timer);
      toast("Harvest finished.");
      onDone();
    }
  }, 4000);
}

export function runHarvestButton(sources, onStarted) {
  const button = h("button", { class: "primary" }, "Run harvest now");
  button.addEventListener("click", () => busy(button, async () => {
    const selected = sources?.();
    await api.post("/api/harvest/run", selected ? { sources: selected } : {});
    toast("Harvest started — records append as each source finishes.");
    onStarted();
  }));
  return button;
}

export function harvestSummary(status, lastRun) {
  let next;
  if (status.running) next = h("span", { class: "pill accent" }, "running now");
  else if (status.next_run_at) next = h("span", {}, "next scheduled ", h("strong", {}, fmtDate(status.next_run_at)));
  else next = h("span", { class: "pill warn" }, "demo snapshot: the weekly scheduler runs on the local install");
  return h("div", { class: "stack" },
    h("div", { class: "row" }, next, h("span", { class: "muted small" }, `· every ${status.interval_days} days`)),
    lastRun
      ? h("div", { class: "row small" }, "Last run", runStatusPill(lastRun.status), h("span", { class: "muted" },
        `${fmtDate(lastRun.started_at)} · ${lastRun.trigger} · +${Object.values(lastRun.stats).reduce((n, s) => n + s.new, 0)} records`))
      : h("div", { class: "muted small" }, "No harvest has run yet."));
}
