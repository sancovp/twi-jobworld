---
name: outreach-replies
description: Read new replies from the client's monitored inbox, classify each (interested / not / booked / out-of-office / unsubscribe / hostile), and record the outcome against the matching send. Use on a cadence to keep reply state current and route human-worthy replies up.
version: 1.0.0
tags: [outreach, jobworld, connector:outreach, stage:replies]
---

# outreach-replies

Pull new replies, classify them (you, the LLM, do the classifying — no code),
and record the outcome.

## Inputs

- IMAP creds for the client's monitored inbox (env, per `env_profile`).
- `JWOUT_DB` to match replies to sends and record events.

## Procedure

1. **Read** new replies (CONNECTOR — IMAP):
   ```bash
   jwout reply --json   # unseen by default; returns [{from, subject, date, snippet}]
   ```
2. **Classify** each reply (INSTRUCTION — you read it and decide):
   interested · not-interested · booked · out-of-office · unsubscribe · hostile ·
   auto-reply. Match it to the originating send by the from-address / brand
   (look up the `sends` table in `JWOUT_DB`).
3. **Record** (CONNECTOR — DB write):
   ```bash
   jwout track event <send_id> reply        # always, for any human reply
   jwout track event <send_id> booked       # additionally, if they booked
   ```
4. **Honor opt-outs immediately** (CONNECTOR — the opt-out list): for any
   unsubscribe or hostile reply, suppress the sender so no future touch reaches
   them:
   ```bash
   jwout suppress add "<reply-from-email>" --reason unsubscribe --source reply
   # or --reason hostile
   ```
   (A self-service `/u/<token>` click already suppresses automatically; this
   covers people who reply "remove me" in words instead.)
5. **Route** anything human-worthy (interested, booked, hostile, unsubscribe) to
   the manager / human queue.

## Output

Reply events recorded against sends; opt-outs suppressed; a routed list of
human-worthy replies.

## Layer notes

`jwout reply` and `jwout track event` are code. The classification is your
judgment applied to the text — not a function.
