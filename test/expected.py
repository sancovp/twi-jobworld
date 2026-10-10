#!/usr/bin/env python3
"""expected.py — the ASSERTER (independent of the producer).

This authors, BY HAND and separately from jwtest.py, what a correct dry-run trace MUST contain. It
reads the trace the CEO produced (by calling jwtest steps) and CHECKS it. It does NOT produce any
signal values itself — it only states constraints and verifies them. This is the producer ≠ asserter
separation: jwtest.py made the signals; this file, written independently, judges whether the run was
correct. If the CEO skipped a step, ran them out of order, or a step returned the wrong type, the
assertions here FAIL.

`assert_trace(records)` returns (ok: bool, report: list[str]).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import List, Tuple


# The steps a correct outreach dry-run MUST include, in this relative order. Authored here
# independently — this is the asserter's spec, NOT read from jwtest.
REQUIRED_ORDER = [
    "apollo_search",            # lead_gen sources ICP leads
    "instantly_create_campaign",# outreach creates the campaign
    "instantly_add_leads",      # outreach loads the sourced leads
    "instantly_start_campaign", # outreach starts sending
]

# Independent type + value constraints per step (what the asserter demands to see).
EXPECTED_TYPE = {
    "apollo_search": "ApolloSearchResult",
    "instantly_create_campaign": "InstantlyCampaign",
    "instantly_add_leads": "InstantlyLeadsAdded",
    "instantly_start_campaign": "InstantlyCampaignStarted",
}


def _check_value(step: str, value: dict, report: List[str]) -> bool:
    """Independent value constraints — deliberately NOT the producer's literals."""
    ok = True
    if step == "apollo_search":
        if not (isinstance(value.get("leads_found"), int) and value["leads_found"] >= 1):
            report.append(f"  ✗ {step}: leads_found must be an int >= 1, got {value.get('leads_found')!r}")
            ok = False
    elif step == "instantly_create_campaign":
        if not value.get("campaign_id"):
            report.append(f"  ✗ {step}: campaign_id must be non-empty")
            ok = False
        if value.get("status") != "created":
            report.append(f"  ✗ {step}: status must be 'created', got {value.get('status')!r}")
            ok = False
    elif step == "instantly_add_leads":
        if not (isinstance(value.get("added"), int) and value["added"] >= 1):
            report.append(f"  ✗ {step}: added must be an int >= 1, got {value.get('added')!r}")
            ok = False
        if not value.get("campaign_id"):
            report.append(f"  ✗ {step}: campaign_id must be non-empty")
            ok = False
    elif step == "instantly_start_campaign":
        if value.get("status") != "active":
            report.append(f"  ✗ {step}: status must be 'active', got {value.get('status')!r}")
            ok = False
    return ok


def assert_trace(records: List[dict]) -> Tuple[bool, List[str]]:
    report: List[str] = []
    ok = True

    by_step = {}
    for r in records:
        if r.get("_test") and r.get("step"):
            by_step.setdefault(r["step"], []).append(r)

    # 1. every required step present exactly once
    for step in REQUIRED_ORDER:
        n = len(by_step.get(step, []))
        if n == 0:
            report.append(f"  ✗ MISSING step '{step}' — the CEO never ran it")
            ok = False
        elif n > 1:
            report.append(f"  ✗ step '{step}' ran {n} times (expected exactly 1)")
            ok = False
        else:
            report.append(f"  ✓ {step} ran once")

    # 2. relative order (first-occurrence index of each required step is increasing)
    first_idx = {}
    for i, r in enumerate(records):
        s = r.get("step")
        if s in REQUIRED_ORDER and s not in first_idx:
            first_idx[s] = i
    present = [s for s in REQUIRED_ORDER if s in first_idx]
    ordered = all(first_idx[present[i]] < first_idx[present[i + 1]] for i in range(len(present) - 1))
    if len(present) == len(REQUIRED_ORDER):
        if ordered:
            report.append("  ✓ steps ran in the required order")
        else:
            report.append("  ✗ steps ran OUT OF ORDER")
            ok = False

    # 3. per-step type + value constraints (independent of the producer's literals)
    for step in REQUIRED_ORDER:
        recs = by_step.get(step, [])
        if not recs:
            continue
        r = recs[0]
        if not str(r.get("message", "")).startswith("THIS IS A TEST"):
            report.append(f"  ✗ {step}: signal message not a TEST signal: {r.get('message')!r}")
            ok = False
        if r.get("type") != EXPECTED_TYPE[step]:
            report.append(f"  ✗ {step}: type must be {EXPECTED_TYPE[step]!r}, got {r.get('type')!r}")
            ok = False
        if not _check_value(step, r.get("value", {}) or {}, report):
            ok = False

    return ok, report


def load_trace(path: str | Path) -> List[dict]:
    p = Path(path)
    if not p.exists():
        return []
    out = []
    for line in p.read_text().splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


if __name__ == "__main__":
    # Standalone: python expected.py <trace.jsonl>  → prints report, exits 0/1.
    trace_path = sys.argv[1] if len(sys.argv) > 1 else ".test/trace.jsonl"
    records = load_trace(trace_path)
    ok, report = assert_trace(records)
    print("\n".join(report))
    print(f"\n{'PASS' if ok else 'FAIL'} — {len(records)} trace records")
    sys.exit(0 if ok else 1)
