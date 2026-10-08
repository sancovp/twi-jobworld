---
name: outreach-page
description: Render and host a per-brand landing page for one contact. The page embeds the teaser video, the show concept, and exactly one CTA (the calendar booking link). The hosted page URL replaces the raw mp4 URL as the [[custom page link]] in the email body. Use when a video-variant contact has a written concept and a hosted teaser URL and needs the "one page, no deck" link for the email.
version: 1.0.0
tags: [outreach, jobworld, connector:outreach, stage:page]
---

# outreach-page

Turn a written show concept and a hosted teaser into a single, per-brand landing
page that is the "one page, no deck" link in the email body.

## Where this fits in the campaign flow

```
outreach-write  ->  outreach-teaser  ->  outreach-page  ->  outreach-deliver
                                               |
                           (page URL = [[custom page link]] in the email body)
```

The email promises: "We sketched what a [[Brand]] show could look like. One page,
no deck: [[custom page link]]." This skill produces that page.

## Inputs

- The concept from `outreach-write` (`copy/<email>.touch<n>.concept.txt` -- the
  show-concept paragraphs the LLM wrote as part of the four-part anatomy). Write
  the concept to a separate file if needed; it is the content that goes on the page.
- The hosted teaser URL from `outreach-teaser` (e.g. `https://<host>/<uid>/<email>.mp4`).
  If the video variant was skipped, pass no `--video-url`; the page renders
  text-only without a video block.
- `client.json.calendar_url` (the Mason+Weston 15-min booking link).
- Brand name, from the contact record.

## Procedure

1. **Write the concept to a file** (if not already in `copy/<email>.touch<n>.concept.txt`).
   The concept is what `outreach-write` placed in part (b) of the four-part anatomy.
   Pull it out and write it to its own file.

2. **Render the page** (CONNECTOR -- writes a local .html file):
   ```bash
   jwout page \
     --brand "Oatly" \
     --concept-file copy/<email>.touch1.concept.txt \
     --calendar-url "https://cal.example.com/mason-weston" \
     --out pages/<email>.touch1.html \
     --video-url "https://<host>/<uid>/<email>.mp4" \
     --honesty-note "We mocked this up to show the idea. Our artists do the real production."
   # prints the resolved path to the written .html file
   ```
   B6 defaults (navy + chartreuse, Mason Collins signature) are built-in. No flags
   needed for brand colors unless another client overrides them.

3. **Host the page** (CONNECTOR -- places the .html at a unique served URL):
   ```bash
   jwout host pages/<email>.touch1.html
   # prints the unique URL, e.g. https://<host>/<uid>/<email>.touch1.html
   ```
   The unique uid path is the per-brand view-tracking handle: a GET on the page
   URL records a `view` event (served by `jwout serve`, which detects `text/html`
   and serves it correctly with no special configuration).

4. **Capture** the printed page URL. This is the `[[custom page link]]` that goes
   into the email body in step (d) of `outreach-write`. Pass it to
   `outreach-deliver` as `--asset-url`. The send row stores this URL so the serve
   layer can match view events to the correct send.

## Output

A hosted page URL for this contact. Replace `[[custom page link]]` in the email
body with this URL before the deliver step.

## Content rules (applied upstream -- not enforced here in code)

The concept text written by `outreach-write` and handed to this skill must already
comply with the `template.md` hard rules: no em dashes, no en dashes, no emojis,
short and direct. The page renderer HTML-escapes and emits the concept verbatim; it
does not modify or check it.

The `--honesty-note` must match the framing in `template.md` part (c): the reader
must know this is an AI mockup, never imply brand involvement or finished work.
Example: "We mocked this up to show the idea. Our artists do the real production."

## Gate

If `client.json.calendar_url` is null (NEEDS-FROM-AVI), the CTA button has no
valid destination. Do not send a page variant until the calendar link is provided.

If `client.json.host_base_url` is null, the page cannot be hosted and the email
link breaks. Same gate as `outreach-teaser`.

## Layer notes

- `jwout page` is CONNECTOR code (deterministic renderer + file write, an external
  effect to disk). The concept it renders was written by the LLM upstream.
- `jwout host` is CONNECTOR code (file copy + unique URL).
- The page design (HTML/CSS) is generic. It renders whatever concept + brand name
  it is handed. No B6 copy is baked into the connector; the content is always
  caller-supplied.
