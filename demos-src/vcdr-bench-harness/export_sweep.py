"""Export one vCDR-bench sweep as numbers and labels only, for the static demo.

Usage: python export_sweep.py <analysis.json> <out-dir> [--journal <sweep>.journal.jsonl] [--db benchmarks.sqlite]

<analysis.json> is what the bench's own analyzer writes for a sweep:
    node scripts/analyze_cascade_sweep.mjs <sweep-id> --json <analysis.json>

This keeps what the demo needs: per-run outcome and per-turn stage latencies.
With --journal it adds the sweep's event log (what was launched, what failed and
why, as categories). With --db it adds how many checkpoints each run carried
through to the end, read from the completion report. The database is opened
read-only. Run ids, prompt names, error text and anything from a transcript are
dropped, so no interview content leaves the lab repo.
"""
import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path

# Display names and sizes, as given in the sweep's own report.
STT = {
    "base": ("whisper-base", "74M"),
    "turbo": ("whisper-large-v3-turbo", "809M"),
    "largev3": ("whisper-large-v3", "1.5B"),
    "parakeet": ("parakeet-tdt", "1.1B"),
}
LLM = {"4omini": "gpt-4o-mini", "4o": "gpt-4o"}
TTS = {"kokoro": "kokoro", "qwentts": "qwen3-tts"}

# Journal error text reduced to a cause. First match wins.
CAUSES = [
    ("network", ("ENOTFOUND", "ECONNREFUSED")),
    ("quota", ("Rate limit",)),
    ("refused", ("Unexpected server response",)),
    ("pipeline", ("S2SAgent", "s2s process")),
]


def order(label):
    stt, llm, tts = label.split("__")
    return (list(TTS).index(tts), list(LLM).index(llm), list(STT).index(stt))


def describe(label):
    stt, llm, tts = label.split("__")
    return {"key": label, "stt": STT[stt][0], "params": STT[stt][1], "llm": LLM[llm], "tts": TTS[tts]}


def read_journal(path):
    rows = [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]
    labels = sorted({r["label"] for r in rows}, key=order)
    start = datetime.fromisoformat(rows[0]["at"].replace("Z", "+00:00"))
    events = []
    for r in rows:
        minutes = round((datetime.fromisoformat(r["at"].replace("Z", "+00:00")) - start).total_seconds() / 60, 1)
        if r["event"] == "run_start":
            code = "start"
        elif r["event"] == "run_complete":
            # "aborted" is a run cut off by its time limit before an outcome was recorded.
            code = "recorded" if r.get("reason") == "complete" else "timeout"
        else:
            text = r.get("error") or r.get("reason") or ""
            code = next((cause for cause, needles in CAUSES if any(n in text for n in needles)), "other")
        events.append([minutes, labels.index(r["label"]), code])
    return {"planned": [describe(label) for label in labels], "events": events}


def read_terminal_counts(path):
    db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    out = {}
    for run_id, report in db.execute("select run_id, completion_report_json from benchmark_runs where completion_report_json is not null"):
        out[run_id] = json.loads(report).get("anchors_completed")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("analysis")
    ap.add_argument("out_dir")
    ap.add_argument("--journal")
    ap.add_argument("--db")
    args = ap.parse_args()

    analysis = json.loads(Path(args.analysis).read_text())
    terminal = read_terminal_counts(args.db) if args.db else {}
    runs = []
    for r in analysis["runs"]:
        tracked = r["anchors_total"] is not None
        runs.append({
            "config": r["label"],
            # The bench reports untracked runs as "unknown".
            "status": r["completion_status"] or "untracked",
            "anchors": [r["anchors_reached"], r["anchors_total"]] if tracked else None,
            # Checkpoints carried through to their last scripted response.
            "finished": terminal.get(r["run_id"]) if tracked else None,
            "ended_by": r["ended_by"],
            "turns": r["agent_turns"],
            "stt": r["stages"]["stt"],
            "llm": r["stages"]["llm"],
            "tts": r["stages"]["tts"],
            "e2e": r["stages"]["e2e"],
        })
    labels = sorted({r["config"] for r in runs}, key=order)
    out = {
        "sweep": "vCDR-bench cascade sweep, July 2026",
        "planned_runs": 120,
        "fixed": {"tts": "kokoro", "replicates": 10, "budget_s": 300},
        "configs": [describe(label) for label in labels],
        "runs": runs,
    }
    if args.journal:
        out["journal"] = read_journal(args.journal)
    dest = Path(args.out_dir) / "sweep.json"
    dest.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {dest}: {len(runs)} runs, {sum(len(r['e2e']) for r in runs)} turns"
          + (f", {len(out['journal']['events'])} journal events" if args.journal else ""))


if __name__ == "__main__":
    main()
