#!/usr/bin/env python3
"""jwtest — the DRY-RUN test-mode CLI (the PRODUCER of typed test signals).

In dry-run mode a department skill directs the CEO/worker to call these step commands INSTEAD of
the real MCP RPC. Each step:
  - prints a TYPED test signal to stdout:
      {"_test": true, "step": "<step>", "type": "<TypeName>", "message": "THIS IS A TEST — <step> works", "value": {...}}
  - appends that same record (with a timestamp) to the trace file at $JW_TEST_TRACE
    (default: <cwd>/.test/trace.jsonl).

This file ONLY produces signals + records the trace. It does NOT assert anything. The asserter
(test/expected.py, run by test/test_ceo_dry_run.py) reads the trace and checks it against an
INDEPENDENTLY-authored expectation. Producer (this) ≠ asserter (that). A step that is never called
simply never appears in the trace, and the asserter fails — which is the whole point (the old mock
declared its own values AND was the test; this cannot, by construction).

Discovery: `jwtest.py --list` prints the ordered steps for each MCP type, so the agent can find what
to call without the step list being hard-coded into the skill prose.

Usage:
    python .test/jwtest.py --list
    python .test/jwtest.py <step> [--campaign-id ID]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# The ordered dry-run steps per MCP type. The department skill lists whichever apply to its MCPs.
STEPS_BY_MCP = {
    "apollo": ["apollo_search"],
    "instantly": ["instantly_create_campaign", "instantly_add_leads", "instantly_start_campaign"],
}

# The TYPED signal each step produces. `type` is the asserted type name; `value` is a realistic shape.
# NOTE: these values are the PRODUCER's — the asserter authors its OWN expectations separately.
_FIXED_CAMPAIGN_ID = "test-campaign-0001"

STEP_SIGNALS = {
    "apollo_search": lambda a: {
        "type": "ApolloSearchResult",
        "value": {"leads_found": 3, "sample": ["ceo@example-brand.com", "cmo@example-brand.com"]},
    },
    "instantly_create_campaign": lambda a: {
        "type": "InstantlyCampaign",
        "value": {"campaign_id": _FIXED_CAMPAIGN_ID, "status": "created"},
    },
    "instantly_add_leads": lambda a: {
        "type": "InstantlyLeadsAdded",
        "value": {"campaign_id": a.campaign_id or _FIXED_CAMPAIGN_ID, "added": 3},
    },
    "instantly_start_campaign": lambda a: {
        "type": "InstantlyCampaignStarted",
        "value": {"campaign_id": a.campaign_id or _FIXED_CAMPAIGN_ID, "status": "active"},
    },
}


def _trace_path() -> Path:
    p = os.environ.get("JW_TEST_TRACE")
    if p:
        return Path(p)
    return Path.cwd() / ".test" / "trace.jsonl"


def _emit(step: str, args) -> dict:
    sig = STEP_SIGNALS[step](args)
    record = {
        "_test": True,
        "step": step,
        "type": sig["type"],
        "message": f"THIS IS A TEST — {step} works",
        "value": sig["value"],
        "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
    }
    trace = _trace_path()
    trace.parent.mkdir(parents=True, exist_ok=True)
    with open(trace, "a") as f:
        f.write(json.dumps(record) + "\n")
    return record


def main(argv=None):
    ap = argparse.ArgumentParser(description="Dry-run test-mode step CLI (produces typed test signals).")
    ap.add_argument("step", nargs="?", help="the step to run (see --list)")
    ap.add_argument("--list", action="store_true", help="print the ordered steps per MCP type as JSON")
    ap.add_argument("--campaign-id", dest="campaign_id", default=None)
    args = ap.parse_args(argv)

    if args.list:
        print(json.dumps({"steps_by_mcp": STEPS_BY_MCP, "all_steps": [s for v in STEPS_BY_MCP.values() for s in v]}, indent=2))
        return 0

    if not args.step:
        ap.error("a step is required (or use --list)")
    if args.step not in STEP_SIGNALS:
        print(json.dumps({"_test": True, "error": f"unknown step '{args.step}'", "known": list(STEP_SIGNALS)}))
        return 2

    print(json.dumps(_emit(args.step, args)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
