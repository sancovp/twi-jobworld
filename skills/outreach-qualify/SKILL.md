---
name: outreach-qualify
description: LLM-score each pulled account against the client's ICP rubric and store the fit tier/score/reason, turning the raw Apollo count into a QUALIFIED TAM. Use after outreach-source, before writing copy — so effort goes to good-fit accounts first.
version: 1.0.0
tags: [outreach, jobworld, market, stage:qualify, instruction-led]
---

# outreach-qualify

Score the pulled accounts against the client ICP. The scoring is YOUR judgment
(an LLM applying the rubric) — there is no scoring function. The only code is
`jwout qualify set`, which persists the score so the dashboard can compute a
qualified TAM. This is the modern "TAM = a scored list, not a number" practice.

## Inputs

- Pulled contacts in `JWOUT_DB` (the `contacts` table; `jwout` / the manager can
  list them).
- `$JW_CLIENT_DIR/icp.md` — the client's ICP rubric (criteria, weights, tiers,
  anti-pitfall rules). Read it fully first.
- Optional: the client's closed-won accounts — calibrate against these if present.

## Procedure

1. **Load the rubric** from `$JW_CLIENT_DIR/icp.md`. Note the weights, the tier
   thresholds, and the anti-pitfall rules (additive scoring; missing data ≠ 0;
   no invented facts; watch "size counted five times").
2. **Score each contact** using its `brand`, `title`, `seniority`, and `context`
   (and the brand's public identity — do not fabricate). Produce
   `{tier: A|B|C|D, score: 0-100, reason: "<one paragraph>"}`. The reason is the
   audit trail: which criteria earned points, what was missing, the outreach angle.
3. **Persist** (CONNECTOR — the only code here):
   ```bash
   jwout qualify set "<contact-email>" --tier A --score 88 \
     --reason "consumer DTC, ~$40M est, active on Reels, VP Brand (authority), product fits an episodic world; revenue inferred, not verified"
   ```
4. **Roll up:** `jwout qualify summary` → scored count, good-fit rate, by-tier.
   The dashboard's `/business` view reads this to show **qualified TAM = raw Apollo
   count × good-fit rate** — an estimate that SHARPENS as you score more (the raw
   count is only an upper bound).

## Calibrate honestly (do not skip)

- If the client has closed-won accounts, score those too and check they land in
  tier A/B. If your best customers score at the median, the rubric is wrong — say
  so and propose a fix rather than shipping a bad score.
- Treat unknown firmographics as unknown (tier C / review), never a confident D.

## Layer notes

Scoring is instruction (you apply the rubric). `jwout qualify set/summary` is the
only code. The rubric lives in the client config, never here — a different client
scores against a different `icp.md`.
