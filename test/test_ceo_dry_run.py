#!/usr/bin/env python3
"""test_ceo_dry_run.py — THE real dry-run test. The CEO drives every step; the asserter judges.

This is the test that was missing (and whose absence let a broken system be called "tested"). It:
  1. RENDERS a fixture instance from a config (server/render.py) — the same compile the real product uses.
  2. Copies the test-mode CLI in as `.test/jwtest.py` (which puts the departments in dry-run mode).
  3. LAUNCHES THE REAL CEO — `claude -p` with `--setting-sources project` and cwd = the fixture — and
     tells it to run the dry-run. The CEO reads the rendered CLAUDE.md + department skills and, following
     them, calls each step via `.test/jwtest.py` (a real agent making real decisions about what to call).
  4. ASSERTS the resulting trace with test/expected.py — an INDEPENDENTLY authored spec. The CEO/CLI
     PRODUCED the trace; expected.py (written separately) JUDGES it. Producer ≠ asserter.

A pass means a real CEO, given only the rendered instance, correctly drove the whole outreach flow and
every step returned the right typed signal. A skipped/misordered/mistyped step FAILS the assert.

Run:  python test/test_ceo_dry_run.py [--keep]
Exit: 0 = PASS, 1 = FAIL (assert), 2 = COULD-NOT-RUN (CEO launch failed — reported honestly, not a pass).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent  # the corrected-base repo root

sys.path.insert(0, str(HERE))
import expected  # noqa: E402  (the independent asserter)


# A minimal test config: the 2 archetype departments, so the CEO must drive apollo (lead_gen) then
# the three instantly steps (outreach). Authored for the test; independent of the base example.
TEST_CONFIG = {
    "company": {
        "name": "DryRun Test Co",
        "mission": "Prove the outreach flow end-to-end without sending anything real.",
        "context": "A fixture company used only by the dry-run test.",
        "scope_rules": "This is a TEST instance. Never contact anyone real; only call the dry-run CLI.",
    },
    "runtime": "tmux-anthropic",
    "departments": [
        {
            "name": "lead_gen",
            "purpose": "Source ICP leads via Apollo.",
            "mcps": ["apollo"],
            "agents": [{"name": "Lead Researcher", "agentType": "general-purpose",
                        "capabilities": ["apollo-search"], "config": {"targeting": {"titles": ["CMO"]}}}],
        },
        {
            "name": "outreach",
            "purpose": "Run a cold campaign via Instantly.",
            "mcps": ["instantly"],
            "agents": [{"name": "Outreach Operator", "agentType": "general-purpose",
                        "capabilities": ["instantly-campaign"], "config": {"copy": {"variants": ["text_only"]}}}],
        },
    ],
    "mcp_servers": {
        "apollo": {"type": "apollo", "secret_ref": "apollo"},
        "instantly": {"type": "instantly", "secret_ref": "instantly"},
    },
}

CEO_PROMPT = """You are running a DRY-RUN of this company's outreach, in a test harness.

The instance you are in is in dry-run test mode: a file `.test/jwtest.py` stands in for the real MCP
tools. Do NOT send anything real and do NOT use any MCP servers.

Do exactly this:
1. Run `python .test/jwtest.py --list` to see the ordered steps.
2. Run the lead_gen department's step(s), then the outreach department's step(s), each exactly once,
   in order, by calling `python .test/jwtest.py <step>` for each (read `skills/run-dept-lead_gen/SKILL.md`
   and `skills/run-dept-outreach/SKILL.md` first — they tell you the dry-run procedure). For the instantly
   steps, reuse the campaign_id that instantly_create_campaign returns via `--campaign-id`.
3. After running every step, report the typed TEST signal each one printed.

Run the steps now."""


def render_fixture(fixture: Path) -> dict:
    (fixture / ".secrets").mkdir(parents=True, exist_ok=True)
    (fixture / "config.json").write_text(json.dumps(TEST_CONFIG, indent=2))
    # non-empty test secrets so .mcp.json renders with env (never used — dry-run bypasses MCPs)
    (fixture / ".secrets" / "mcp_state.json").write_text(json.dumps({
        "instantly": {"INSTANTLY_API_KEY": "dry-run-not-used"},
        "apollo": {"APOLLO_API_KEY": "dry-run-not-used"},
    }, indent=2))
    # render using the SAME step the product uses
    sys.path.insert(0, str(BASE / "server"))
    import render  # noqa: E402
    manifest = render.render_instance(fixture)
    # put the test CLI in place → departments enter dry-run mode
    (fixture / ".test").mkdir(exist_ok=True)
    shutil.copy(HERE / "jwtest.py", fixture / ".test" / "jwtest.py")
    return manifest


def launch_ceo(fixture: Path) -> tuple[bool, str]:
    """Launch the real CEO with `claude -p`, cwd=fixture, project settings only. Returns (launched, log)."""
    claude = shutil.which("claude")
    if not claude:
        return False, "claude CLI not found on PATH"
    env = dict(os.environ)
    env["JW_TEST_TRACE"] = str(fixture / ".test" / "trace.jsonl")
    cmd = [
        claude, "-p", CEO_PROMPT,
        "--setting-sources", "project",
        "--permission-mode", "bypassPermissions",
        "--output-format", "json",
    ]
    try:
        proc = subprocess.run(cmd, cwd=str(fixture), env=env, capture_output=True, text=True, timeout=600)
    except subprocess.TimeoutExpired:
        return False, "CEO turn timed out (600s)"
    except Exception as e:  # noqa: BLE001
        return False, f"CEO launch failed: {e}"
    log = (proc.stdout or "")[-2000:] + ("\n[stderr]\n" + (proc.stderr or "")[-1000:] if proc.stderr else "")
    return (proc.returncode == 0), log


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", action="store_true", help="keep the fixture dir for inspection")
    args = ap.parse_args(argv)

    fixture = Path(tempfile.mkdtemp(prefix="jw-dryrun-"))
    print(f"[fixture] {fixture}")
    try:
        manifest = render_fixture(fixture)
        print(f"[render]  compiled {len(manifest['written'])} files; departments={manifest['departments']}")

        launched, log = launch_ceo(fixture)
        print("[ceo]     " + ("launched OK" if launched else "DID NOT COMPLETE"))
        if not launched:
            print("---- CEO log ----\n" + log)

        trace_path = fixture / ".test" / "trace.jsonl"
        records = expected.load_trace(trace_path)
        ok, report = expected.assert_trace(records)
        print("\n---- ASSERT (test/expected.py — authored independently of jwtest.py) ----")
        print("\n".join(report))

        if not launched and not records:
            print("\nCOULD-NOT-RUN — the CEO did not execute (see log). NOT a pass.")
            return 2
        print(f"\n{'PASS ✓' if ok else 'FAIL ✗'} — {len(records)} trace records, CEO-driven")
        return 0 if ok else 1
    finally:
        if not args.keep:
            shutil.rmtree(fixture, ignore_errors=True)
        else:
            print(f"[kept]    {fixture}")


if __name__ == "__main__":
    sys.exit(main())
