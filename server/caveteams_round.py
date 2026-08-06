"""
caveteams_round.py — the cave-mode executor for the Workday round (ceo-bootstrap STEP 4).

One round = one cave-teams leader-driven run:
  - the 5 departments are MiniMax agents (TOOLED: BashTool + NetworkEditTool), personas compiled
    from agents/<dept>.md + that dept's outreach-* skill(s) + the jobworld-report-event contract —
    inlined at BUILD TIME from the canonical files (never forked copies);
  - the pipeline order research→content→production→delivery→metacog is the guardrail (seq edges);
  - the leader is a COD (deterministic) pipeline leader: dispatch each dept in order, hand the
    previous dept's response artifact forward as the message file, end with a round report. The
    CEO stays OUTSIDE as reviewer (STEP 2/5 of the workday skill) — the store is the authority;
  - the workers SELF-REPORT observations via jobworld-report-event (they have Bash → curl), so
    task state flips through the same two write contracts the whole system already uses. The
    on_event bridge posts round TELEMETRY events (dispatch/response, no task field) so the
    dashboard sees the round live without double-flipping tasks.

Usage (from the workday skill):
    python3 -m server.caveteams_round --task "<round assignment>" \
        --depts research,content,production,delivery,metacog [--dry-run]

Env: MINIMAX_API_KEY (workers) · HEAVEN_DATA_DIR · JOBWORLD_URL (default http://localhost:3847)
     JW_INSTANCE_DIR (persona/skill sources; default /agent) · cave-teams + heaven installed.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

JOBWORLD_URL = os.environ.get("JOBWORLD_URL", "http://localhost:3847")
SRC_DIR = Path(os.environ.get("JW_INSTANCE_DIR", "/agent"))

# dept -> the outreach skills whose procedures get inlined into its persona
DEPT_SKILLS = {
    "research": ["outreach-source", "outreach-qualify"],
    "content": ["outreach-write"],
    "production": ["outreach-teaser"],
    "delivery": ["outreach-deliver", "outreach-replies"],
    "metacog": ["outreach-report"],
}
PIPELINE = ["research", "content", "production", "delivery", "metacog"]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def compile_persona(dept: str) -> str:
    """MiniMax system prompt = persona body + inlined skill procedures + the report contract.
    Generated from the canonical files at build time — no forked copies on disk."""
    parts = [f"You are the {dept} department of this company (a tooled coding agent: you have "
             f"Bash and file-edit; `jwout` is on PATH for external effects).",
             _read(SRC_DIR / "agents" / f"{dept}.md") or f"(persona file agents/{dept}.md missing)"]
    for s in DEPT_SKILLS.get(dept, []):
        body = _read(SRC_DIR / "skills" / s / "SKILL.md")
        if body:
            parts.append(f"\n--- YOUR PROCEDURE: {s} ---\n{body}")
    report = _read(SRC_DIR / "skills" / "jobworld-report-event" / "SKILL.md")
    if report:
        parts.append(f"\n--- HOW YOU REPORT (mandatory) ---\n{report}")
    parts.append("\nWhen dispatched: do the work per your procedure, REPORT the observation via "
                 "curl per the report contract, then reply with a concise result summary "
                 "(include file paths / IDs so the leader can hand your output forward).")
    return "\n\n".join(parts)


def build_team(depts):
    """The round team: seq guardrail in pipeline order over AgentRefs (leader-driven leaves)."""
    from cave_teams import algebra
    from cave_teams.team import Team
    from cave_teams.wiring import AgentRef
    order = [d for d in PIPELINE if d in depts]

    class WorkdayRound(Team):
        op = "workday_round"

        def build(self):
            return algebra.seq(*[AgentRef(d) for d in order])

    return WorkdayRound({}), order


def build_runtimes(depts):
    from cave_teams.examples import MiniMaxRuntime
    return {d: MiniMaxRuntime(d, tools=None, system_prompt=compile_persona(d)) for d in depts}


def pipeline_leader(order):
    """COD leader: walk the guardrail order, handing each dept the previous response artifact.
    Deterministic — the round ALWAYS traverses the whole pipeline; review happens in the store."""
    from cave_teams.runner import Proposal
    state = {"i": 0}

    def leader(ctx):
        alert = ctx.get("alert")
        i = state["i"]
        if i >= len(order):
            done = [m["frm"] for m in ctx.get("log", []) if m.get("kind") == "response"]
            return Proposal(end=True, report=f"workday round complete; responded in order: {done}")
        dept = order[i]
        state["i"] += 1
        path = (alert or {}).get("message_path") or ctx.get("task_path", "")
        return Proposal(to=dept,
                        prompt=f"Round task: {ctx['task']}. You are the {dept} step of the "
                               f"pipeline. The file at the attached path is the task (or the "
                               f"previous department's output) — use it, do your procedure, "
                               f"report your observation, reply with your result summary.",
                        path=path,
                        one_liner=f"{dept} is working")
    return leader


def telemetry_bridge(round_no):
    """Post round telemetry into the event stream (NO task field → informational only;
    task state flips via the workers' own jobworld-report-event observations)."""
    def on_event(ev):
        try:
            payload = json.dumps({
                "round": round_no, "source": "caveteams-round",
                "observation": {"dept": "ceo", "agent": "caveteams-round",
                                "status": "completed",
                                "desc": f"[round telemetry] {ev.get('kind')}: "
                                        f"{json.dumps(ev.get('data', {}), default=str)[:300]}",
                                "domain": "ops", "subdomain": "workday-round",
                                "process": "workday round telemetry",
                                "instructions": "", "kv": ev.get("data", {})},
                "who_cares": []}).encode()
            req = urllib.request.Request(f"{JOBWORLD_URL}/api/emit-event", data=payload,
                                         headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=3).close()
        except Exception:
            pass  # telemetry must never break the round
    return on_event


def main():
    ap = argparse.ArgumentParser(description="Run one Workday round via cave-teams (mode=cave)")
    ap.add_argument("--task", required=True)
    ap.add_argument("--depts", default=",".join(PIPELINE))
    ap.add_argument("--round", type=int, default=0)
    ap.add_argument("--team-dir", default=os.environ.get("JW_ROUND_DIR", "/tmp/jw_workday_round"))
    ap.add_argument("--max-steps", type=int, default=30)
    ap.add_argument("--dry-run", action="store_true",
                    help="build the team + personas and print them; run nothing")
    args = ap.parse_args()

    depts = [d.strip() for d in args.depts.split(",") if d.strip()]
    unknown = [d for d in depts if d not in PIPELINE]
    if unknown:
        sys.exit(f"unknown departments: {unknown} (known: {PIPELINE})")

    try:
        import cave_teams  # noqa: F401
    except ImportError:
        sys.exit("cave-teams is not installed in this environment. "
                 "pip install cave-teams (plus heaven for the MiniMax runtimes), or run inside "
                 "the harness venv. The native executor (JW_ROUND_EXECUTOR=native) needs neither.")

    team, order = build_team(depts)
    if args.dry_run:
        print(f"pipeline order: {order}")
        for d in order:
            p = compile_persona(d)
            print(f"\n===== {d} persona ({len(p)} chars) =====\n{p[:800]}\n...")
        return

    from cave_teams.runner import run_team
    runtimes = build_runtimes(order)
    res = run_team(team, args.task, pipeline_leader(order), runtimes, args.team_dir,
                   on_event=telemetry_bridge(args.round), max_steps=args.max_steps)
    print(json.dumps({"ok": res.get("ok"), "report": res.get("report", res.get("error")),
                      "responders": [m["frm"] for m in res.get("messages", [])
                                     if m.get("kind") == "response"],
                      "team_dir": args.team_dir}, indent=2))
    if not res.get("ok"):
        sys.exit(1)


if __name__ == "__main__":
    main()
