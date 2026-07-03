# b6mock — the MOCK client (S1 fully faked; for topology/system testing ONLY)

**Purpose.** `clients/b6` is the REAL client config — its NEEDS-FROM-AVI gates stay
open until Avi delivers, and the CEO correctly HOLDS delivery on it (verified
2026-07-03: 7 `outreach_gate_blocker` events + `GATES.md`). That honesty is right for
production and wrong for testing: the topology test needs the WHOLE pipeline —
including delivery — to run. This client is the same shape with **every gate filled
with loudly-fake values**, so under `JWOUT_MOCK=1` the full flow runs and nothing is
real anywhere.

- Fake warmed domains (`*.example` — reserved TLD, cannot resolve) + fake female-persona
  from-addresses (matching the kickoff decision: female personal names, 2 per domain).
- Fake CAN-SPAM footer values, fake calendar link, fake success thresholds.
- `host_base_url` = the in-container `jwout serve` sidecar — tracked links actually
  serve + record view/click, so THAT loop is tested for real.
- `dedupe/` HAS the three sniper CSVs, and `drsquatch.com` is planted in
  `trashed.csv` — a correct `outreach-source` run MUST visibly exclude the
  Dr. Squatch mock contact. That's a topology assertion, not decoration.

**Run with:** `JW_CLIENT=b6mock` (deploy/run-mock-instance.sh default).
**Never** point live creds at this client; `env_profile=mock` on purpose.

`icp.md` / `positioning.md` / `template.md` / `assets.md` are copied from b6 so the
content departments exercise the REAL instructions.
