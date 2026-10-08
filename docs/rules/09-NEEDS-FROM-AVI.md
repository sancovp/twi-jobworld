# Rule 09 — Needs from Avi (the open asks ledger)

Everything B6 must supply comes **through Avi** — he gets it from B6 or provisions it
for them (see `/agent/CLAUDE.md` for the relationship structure). This ledger is the
single place those asks are tracked. Update the Status column the moment an answer
lands; each answer drops straight into the slot listed (rule 03 has the full matrix).

## A. Purchases / accounts (from `docs/PURCHASE-LIST.md`)

| # | Item | Fills | Status |
|---|---|---|---|
| 1 | Instantly account → **API key + campaign ID** (campaign template must be `{{subject}}` / `{{body}}`) | `INSTANTLY_API_KEY`, `INSTANTLY_CAMPAIGN_ID`, SMTP/IMAP creds, `reply_to`, `from_addresses[]` | ⏳ account pending |
| 1a | Cold domains bought + **warming started** (Instantly DFY) | `sending.domains[]` | ✅ warming confirmed 2026-07-10 — **`warmup_status: ready` expected ~2–4 weeks later; the long pole** |
| 2 | Tracked-link host domain (+ TLS-fronted `jwout serve`) | `host_base_url`, `HOST_BASE_URL`, `HOST_DIR` | ⏳ |
| 3 | fal.ai key — **only if video variant**; text-only launch skips it | `FAL_KEY` | ⏳ optional |
| 4 | Apollo access (lead sourcing) | `APOLLO_API_KEY` | ⏳ (not on the purchase list — confirm who provides) |

## B. Non-purchase config (from B6, via Avi)

| Item | Fills | Status |
|---|---|---|
| CAN-SPAM postal address + unsubscribe URL | `compliance.*` — **hard block: deliver refuses without both** | ⏳ |
| Monitored reply inbox | `reply_to` + IMAP creds | ⏳ (likely arrives with Instantly) |
| Mason+Weston booking calendar link | `calendar_url` | ⏳ |
| Dedupe/exclusion CSVs (surviving-the-cows, trashed, 7-stories) | `clients/b6/dedupe/` — engine refuses live send without | ⏳ |
| Approved facts + real proof episode URLs | `clients/b6/assets.md` — no stats in copy until approved | ⏳ |
| Show/world bible (Surviving the Cows, 7 Stories) | `clients/b6/assets.md` | ⏳ |
| Success thresholds (target booked rate, max $/meeting) | `success.*` — metacog verdict needs them | ⏳ |
| Avg deal value (optional) | `economics.avg_deal_value_usd` | ⏳ optional |

## What is NOT blocked meanwhile

Dry runs and mock runs (`JWOUT_MOCK=1`), copy drafting, page/teaser rendering,
qualification, market sizing (Census key is free), and all engine dev.
