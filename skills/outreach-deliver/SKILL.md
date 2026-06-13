---
name: outreach-deliver
description: Send one written outreach email over the client's cold infrastructure and record the send, with variant/cohort tagging for the A/B and control. Use when a contact has clean copy (and, for the video variant, a hosted teaser URL) and is cleared to send.
version: 1.0.0
tags: [outreach, jobworld, connector:outreach, stage:deliver]
---

# outreach-deliver

Deliver one email and record it. The send path is deliberately dumb — it sends
exactly the subject and body it is given.

## Inputs

- The copy file from `outreach-write` (subject on line 1, body after).
- For the video variant: the hosted teaser URL from `outreach-teaser`.
- `$JW_CLIENT_DIR/client.json` → `from_addresses` (rotate), `from_name`,
  `reply_to`, `variants`, `cohorts`.

## Pre-send gates (instructions you enforce, not code)

1. The contact survived `outreach-source` dedupe (not on any exclusion list, not
   the primary domain).
2. The body already contains the CAN-SPAM footer (a real postal address and a
   working unsubscribe line). If the client has not provided those, do not send.
3. `from_addresses` is non-empty and is NOT the client's primary domain. If
   empty (NEEDS-FROM-AVI), STOP — no cold domain is provisioned.

## Procedure

1. **Pick** the next `from` address (rotate across `from_addresses` for spread).
2. **Send + record** (CONNECTOR — real SMTP):
   ```bash
   jwout send \
     --to "<contact-email>" \
     --subject "<line 1 of copy file>" \
     --body-file copy/<email>.touch<n>.txt \
     --from "<rotated from address>" \
     --from-name "$(jq -r .from_name $JW_CLIENT_DIR/client.json)" \
     --reply-to "$(jq -r .reply_to $JW_CLIENT_DIR/client.json)" \
     --brand "<brand>" --touch <n> --variant "<variant>" --cohort "<cohort>" \
     --asset-url "<hosted teaser URL or empty>" \
     --click-token "<contents of copy/<email>.touch<n>.token, if any>"
   # prints: send_id=<N>
   ```
   The `--click-token` must match the token embedded in the body's tracked CTA
   link (from `outreach-write`) so `serve`'s `/c/<token>` redirect records a click
   against this send.
3. **Capture** `send_id` for tracking. Webhook/IMAP-driven events
   (delivered/open/click/view/reply) are recorded later via `jwout track event
   <send_id> <type>` by the tracking layer and `outreach-replies`.

## Output

A delivered email and a `send_id` recorded in `JWOUT_DB`.

## Layer notes

`jwout send` is the only code. Footer composition, address rotation choice, and
the gates are instructions you apply.
