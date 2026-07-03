CEO: first boot, then ONE mock outreach round for the ACTIVE client — read `$JW_CLIENT` / `$JW_CLIENT_DIR` (never hard-code a client). In the mock harness that is `b6mock`, whose gates are ALL filled with fake values so the full pipeline including delivery runs. Follow YOUR OWN designed flow — do not improvise around it.

**Phase 0 — FIRST BOOT (your persona's "Running outreach for a client" section — do it before anything else):**
Register the five departments (`research`, `content`, `production`, `delivery`, `metacog`) and their employees from `/agent/agents/<dept>.md` using the `generate-employee` skill. Confirm all five appear in the org (`GET /api/org-chart`) before assigning any work.

**Phase 1 — ONE ROUND (ceo-bootstrap + run-outreach-campaign):**
Create the project/milestone/goal/tasks through the API, assign tasks to the departments, and **run the departments as your team — each department executes ITS OWN `outreach-*` skill and reports via `jobworld-report-event`.** Then review every supposedly-done task via `POST /api/ceo-review`, and finish with the metacog verdict (`jwout track report`) against the b6 success thresholds.

**Mock mode:** `JWOUT_MOCK=1` is set — `jwout pull/send/video/reply` return canned data; nothing leaves the box. Run the ENTIRE flow for real anyway; the point of this round is to prove the topology runs exactly as designed.

**The one rule for this run: do NOT do a department's work yourself.** Your job is bootstrap, assignment, review, and the verdict. If a department cannot run, report exactly what blocked it instead of doing its task inline.
