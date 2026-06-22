---
name: outreach-teaser
description: Generate the ~9s AI teaser for one contact from its video prompt and host it at a unique tracked URL. Use when a video-variant contact has a written video prompt and needs a hostable, per-brand teaser link.
version: 1.0.0
tags: [outreach, jobworld, connector:outreach, stage:teaser]
---

# outreach-teaser

Turn a written video prompt into a hosted, per-brand teaser link.

## Inputs

- The video-prompt file from `outreach-write` (`copy/<email>.touch<n>.vprompt.txt`).
- `$JW_CLIENT_DIR` (for the host base url in `client.json.host_base_url`, set via
  `HOST_BASE_URL`/`HOST_DIR` env at deploy time).

## Procedure

1. **Generate** (CONNECTOR — external Kling/fal.ai call, costs money):
   ```bash
   jwout video "$(cat copy/<email>.touch<n>.vprompt.txt)" --out teasers/<email>.mp4
   ```
2. **Host** (CONNECTOR — places the file at a unique served path):
   ```bash
   jwout host teasers/<email>.mp4
   # prints the unique URL, e.g. https://<host_base_url>/<uid>/<email>.mp4
   ```
3. **Capture** the printed URL; pass it to `outreach-deliver` as `--asset-url`.
   The unique path is the per-brand view-tracking handle: a GET on it becomes a
   `view` event (recorded by the host's serving layer via `jwout track event`).

## Output

A hosted teaser URL for this contact, handed to the deliver step.

## Layer notes

Both steps are connector verbs (real external effects). Honesty framing — that
the teaser is a mockup — was already baked into the copy by `outreach-write`;
this skill only produces and hosts the file.

## Gate

If `client.json.host_base_url` is null (NEEDS-FROM-AVI), the hosted link cannot
be real — do not send a teaser variant until the host domain is provisioned.
