---
name: outreach-report
description: Produce the outreach funnel report for the active client — deliverability, open, click, view, reply, booked, and cost per booked meeting, split by variant so the video-lift A/B and the manual control read directly. Use to measure a run against the client's success thresholds.
version: 1.0.0
tags: [outreach, jobworld, connector:outreach, stage:report]
---

# outreach-report

Read the run's funnel and judge it against the client's targets.

## Inputs

- `JWOUT_DB` (the run state).
- `$JW_CLIENT_DIR/client.json` → `cost_per_send_usd`, `success`.

## Procedure

1. **Report** (CONNECTOR — DB read):
   ```bash
   jwout track report --cost "$(jq -r '.cost_per_send_usd' $JW_CLIENT_DIR/client.json)"
   ```
   Output is per-variant: sends, delivered, bounced, open, click, view, reply,
   booked, and cost/booked.
2. **Judge** (INSTRUCTION): compare to `success.target_booked_rate` and
   `success.max_cost_per_meeting_usd`. State plainly whether the run is hitting
   target, and whether the `video` variant beats `text_only` (the lift question),
   and how the `engine` cohort compares to `manual_control`.
3. **Recommend**: continue, adjust, or stop — with the reason.

## Output

The funnel table plus a plain verdict (on target / not, video lift yes / no,
engine vs control) and a recommendation.

## Layer notes

`jwout track report` is code. The judgment against thresholds is yours.
If `success` thresholds are null (NEEDS-FROM-AVI), say so — a number with nothing
to compare it to proves nothing (SPEC §9).
