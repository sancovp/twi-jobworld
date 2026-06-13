---
name: run-outreach-campaign
description: CEO-level orchestration of a full outreach campaign for one client — sequences the research, content, production, delivery, and metacog departments across a batch of contacts, respecting the client's gates. Use when the CEO is told to run or continue outreach for a client.
version: 1.0.0
tags: [outreach, jobworld, ceo, orchestration]
---

# run-outreach-campaign

The CEO's playbook for running outreach for one `$client`. This is a procedure,
not code — it tells you which departments to run, in what order. Each department
runs its own `outreach-*` skill (see `_OUTREACH-SKILLS.md` and
`../.claude/rules/01-DEPARTMENTS.md`).

## Preconditions (check the client's gates first)

Read `$JW_CLIENT_DIR/client.json` and `README.md`. For a LIVE send, every
`NEEDS-FROM-<client>` item must be resolved: `sending.domains[]` with at least
one `warmup_status: ready`, `reply_to`, `calendar_url`, `host_base_url` (if running the video
variant), the `dedupe/` CSVs, and a CAN-SPAM footer (postal + unsubscribe). If
any are missing, run in **dry mode** (assemble copy, no live send) and tell the
client which items are blocking.

## The loop

1. **research** → `outreach-source`: pull a batch for the client's targeting,
   dedupe, land contacts in `JWOUT_DB`. Review the pulled/excluded/remaining
   counts before proceeding.
2. For each remaining contact, and each touch in the cadence:
   a. **content** → `outreach-write`: write subject + body (+ video prompt for
      the video arm), applying the client's positioning/template/assets.
   b. **production** (video arm only) → `outreach-teaser`: generate + host the
      ~9s teaser; capture the tracked URL.
   c. **delivery** → `outreach-deliver`: send + record; capture `send_id`.
3. **delivery** → `outreach-replies` on a cadence: read, classify, record
   reply/booked events, route human-worthy replies, honor opt-outs into dedupe.
4. **metacog** → `outreach-report`: funnel by variant + cohort, judged against
   the client's `success` thresholds; recommend continue / adjust / stop.

## A/B and control (so month-one proves something — SPEC §9)

- Split the batch across `variants` (`text_only` vs `video`) to measure video lift.
- Tag a `manual_control` cohort comparable to the client's manual baseline.
- Keep these tags on every `outreach-deliver` call so the report is a GROUP BY.

## CEO review

After each round, review supposedly-done department tasks via the JW review API
(see `ceo-bootstrap`), confirm or send back, then decide the next batch size from
the metacog verdict and the client's cost cap.

## The one law (do not violate)

Only `jwout` executes. Copy, rules, dedupe, classification, the go/no-go on a
gate — those are judgments you and the departments apply from the client config,
never new code.
