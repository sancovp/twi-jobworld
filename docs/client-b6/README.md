# `clients/b6` — B6 Studios instance

B6 is a brand contracting us. This directory is its `$client` config — the
content that specializes the generic JW outreach process for B6. No code here.

## Files

| file | what |
|---|---|
| `client.json` | structured params (targeting, addresses, calendar, cohorts, costs) |
| `positioning.md` | locked positioning — "we build shows for brands; own a show, not an ad" |
| `template.md` | copy template, hard rules, four-part anatomy, cadence, signature |
| `assets.md` | proof links, approved facts, colors, show bible, honesty framing |
| `icp.md` | ICP scoring rubric for `outreach-qualify` (qualified TAM); see `.claude/rules/04-MARKET-MAPPING.md` |
| `dedupe/` | exclusion lists (STC / Trashed / 7 Stories) |

## Campaign flow for the video variant (updated)

```
outreach-write  →  outreach-teaser  →  outreach-page  →  outreach-deliver
(concept + prompt)  (mp4 + host)     (HTML page + host)  (email with page URL)
                                              |
                              [[custom page link]] = the hosted page URL
                              (replaces the raw mp4 URL in the email body)
```

The email says "We sketched what a [[Brand]] show could look like. One page, no
deck: [[custom page link]]." That link is the HTML page produced by `outreach-page`
(rendered by `jwout page`, hosted by `jwout host`). The page embeds the teaser
video, shows the concept sketch, and has exactly one CTA: the calendar booking link.

## Scope (SPEC §2)

GENERAL outreach only — the long tail of brands the manual sniper pipelines will
never reach. Never sends to STC / Trashed / 7 Stories named targets. Never sends
from b6studios.com.

## Open items — `NEEDS-FROM-AVI` (the engine cannot run a live B6 send until these land)

1. **Cold sending domains** (warmed, separate from b6studios.com) → `client.json.sending.domains[]` (each with `warmup_status`)
2. **Monitored reply inbox** on the cold domain → `client.json.reply_to`
3. **Mason + Weston calendar link** → `client.json.calendar_url`
4. **Approved facts/stats** (or confirmation to use none) → `assets.md`
5. **Real proof episode URLs** (Surviving the Cows default; 7 Stories) → `assets.md`
6. **Success thresholds** (target booked rate, max cost/meeting) → `client.json.success`
7. **Tracked-link host domain** → `client.json.host_base_url`
8. **The three dedupe CSVs** → `dedupe/`
9. **CAN-SPAM footer** (a real postal address + a working unsubscribe URL) → `client.json.compliance`. `outreach-write` appends it to every body; `outreach-deliver` refuses to send without it.

**Optional (does not block sending):** `economics.avg_deal_value_usd` — the average
value of a closed series. Setting it makes the business dashboard (`/business`)
value the pipeline (won / SOM / TAM) in dollars; without it the dashboard shows
counts only. Never fabricated.

Source of these requirements: `~/b6-outreach-engine/SPEC.md` (§8, §9, §10) and
`NEEDS-FROM-AVI.md`. Do not fabricate any of them.
