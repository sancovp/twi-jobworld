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
- `$JW_CLIENT_DIR/client.json` → `sending.domains[]` (rotate across the `ready`
  ones), `from_name`, `reply_to`, `variants`, `cohorts`.

## Pre-send gates (instructions you enforce, not code)

1. The contact survived `outreach-source` dedupe (not on any exclusion list, not
   the primary domain).
1b. **The contact is not suppressed** (CONNECTOR — checks the opt-out list):
   ```bash
   jwout suppress check "<contact-email>"   # exit 2 => suppressed, SKIP this contact
   ```
   Never email anyone who has unsubscribed or been marked hostile.
2. The body already contains the CAN-SPAM footer (a real postal address and a
   working unsubscribe line). If the client has not provided those, do not send.
3. At least one `sending.domains[]` entry has `warmup_status == "ready"` and is
   NOT the client's primary domain. If none are `ready` (NEEDS-FROM-AVI / still
   warming), STOP — sending from an unwarmed domain torches deliverability.

## Procedure

1. **Pick** the next `from` address: choose a `ready` domain (respecting its
   `daily_cap`), then rotate across that domain's `from_addresses` for spread.
   ```bash
   jq -r '.sending.domains[] | select(.warmup_status=="ready") | .from_addresses[]' \
     $JW_CLIENT_DIR/client.json   # the eligible identities to rotate
   ```
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
     --click-token "<contents of copy/<email>.touch<n>.token, if any>" \
     --click-dest "$(jq -r .calendar_url "$JW_CLIENT_DIR/client.json")" \
     --unsub-token "<contents of copy/<email>.touch<n>.unsub>"
   # prints: send_id=<N>
   ```
   The `--unsub-token` must match the token in the body's `/u/<token>` unsubscribe
   link so serve can suppress this exact recipient on one click.
   The `--click-token` must match the token in the body's tracked CTA link
   (`${HOST_BASE_URL}/c/<token>`, from `outreach-write`); `--click-dest` is the URL
   `serve` redirects that token to (the calendar link). The destination is stored
   on the send, never read from the request, so the tracked link cannot be turned
   into an open redirect.
3. **Capture** `send_id` for tracking. Webhook/IMAP-driven events
   (delivered/open/click/view/reply) are recorded later via `jwout track event
   <send_id> <type>` by the tracking layer and `outreach-replies`.

## Output

A delivered email and a `send_id` recorded in `JWOUT_DB`.

## Layer notes

`jwout send` is the only code. Footer composition, address rotation choice, and
the gates are instructions you apply.
