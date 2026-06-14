---
name: outreach-write
description: Write hyper-personalized outreach copy (subject, body, and video prompt) for one contact by applying the active client's positioning, template, and approved assets. Pure instruction-application — the worker IS the generator and the linter. Use when a contact needs copy written for a given touch and variant.
version: 1.0.0
tags: [outreach, jobworld, stage:write, instruction-only]
---

# outreach-write

Write the copy for ONE contact. There is no connector verb here on purpose:
generating and self-checking copy is something the LLM does by emitting tokens.
You are the generator AND the linter — the rules are instructions, not code.

## Inputs

- A contact (brand, name, title, email, domain, context) from the run DB.
- `touch` (1–4) and `variant` (`text_only` | `video`).
- `$JW_CLIENT_DIR` → read `positioning.md`, `template.md`, `assets.md`.

## Procedure

1. **Load instructions:** read `positioning.md` (locked language — do not
   reinvent), `template.md` (the four-part anatomy, the hard rules, the cadence
   row for this `touch`, subject options, the video-prompt rules), and
   `assets.md` (proof links, the ONLY approved facts, colors, show bible,
   honesty framing).
2. **Write** subject + body for this `touch`, following the anatomy and obeying
   EVERY hard rule. Use only approved facts; if none are provided, use no stats.
   First body line = the recipient's email. Sign with the full Mason block.
3. **If `variant == video`,** also write the ~9s teaser generation prompt per the
   video-prompt rules (real brand + real product, matches the scene's show-world,
   navy/chartreuse when branding appears).
4. **Tracked CTA link (for click measurement):** mint a unique token for this
   contact+touch (any random hex string, e.g. `tok_<12 hex>`). Use the bare
   tracked URL `${HOST_BASE_URL}/c/<token>` in the body wherever the calendar CTA
   appears — do NOT put the calendar URL in the link as a query param. The
   destination is stored on the send row at deliver time (`--click-dest`), so the
   redirect target cannot be tampered with. (If `HOST_BASE_URL` is not set, use the
   raw calendar link and skip the token — clicks just won't be tracked.)
5. **Append the CAN-SPAM footer** from `client.json.compliance`: a blank line,
   then the client's `postal_address`, then an unsubscribe line pointing at
   `unsubscribe_url`. Both are legally required on cold mail. If either is null
   (NEEDS-FROM-<client>), DO NOT fabricate one — leave the body without a footer;
   the deliver step will correctly refuse to send it. Example footer:
   ```
   <blank line>
   B6 Studios, <postal_address>
   Unsubscribe: <unsubscribe_url>
   ```
6. **Self-check (you are the linter):** re-read the hard rules and verify the
   draft obeys all of them (length, no em/en dashes, no emojis, no fake urgency,
   approved facts only, email-on-line-1, custom subject naming the brand, **and
   the CAN-SPAM footer is present**). Fix in place. Do NOT call any tool to do this.
7. **Emit** the subject on the first line and the body after, written to
   `copy/<contact-email>.touch<touch>.txt`; the video prompt (if any) to
   `copy/<contact-email>.touch<touch>.vprompt.txt`; and the click token (if
   minted) to `copy/<contact-email>.touch<touch>.token` for the deliver step.

## Output

A copy file (subject + body) and, for the video variant, a video-prompt file —
both consumed by `outreach-teaser` / `outreach-deliver`.

## Layer notes

No code. If you reach for a "lint" or "validate" command, you are violating the
one law — the check is you re-reading the rules and obeying them.
