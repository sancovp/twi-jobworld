# `clients/_schema` — the `$client` contract

Every `clients/<name>/` directory provides these. A skill loads the relevant
pieces; the worker never hard-codes any of it.

## Files

| file | layer | consumed by | required |
|---|---|---|---|
| `client.json` | structured params | connector verbs + worker logic | yes |
| `positioning.md` | instruction | the write-copy step (LLM) | yes |
| `template.md` | instruction | the write-copy step (LLM) | yes |
| `assets.md` | instruction + data | the write-copy + teaser steps (LLM) | yes |
| `dedupe/` | data | the source/deliver steps (skip-list) | if the client has exclusion lists |
| `icp.md` | instruction | the `outreach-qualify` step (LLM ICP scoring) | recommended (enables qualified TAM) |
| `README.md` | doc | humans / future sessions | yes |

## `client.json` fields

See `client.schema.json` for the formal contract. Summary:

| field | type | used by | meaning |
|---|---|---|---|
| `name` | string | all | client display name |
| `targeting.titles` | string[] | `jwout pull --titles` | decision-maker titles |
| `targeting.seniorities` | string[] | `jwout pull --seniorities` | e.g. director, vp, c_suite |
| `targeting.email_statuses` | string[] | `jwout pull --status` | e.g. verified |
| `targeting.domains` | string[] | `jwout pull --domains` | seed brand domains (optional) |
| `targeting.notes` | string | LLM | who qualifies (TAM logic) |
| `sending.domains[]` | object[] | `jwout send --from` (deliver step) | cold sending-domain **objects** — see below |
| `from_name` | string | `jwout send --from-name` | display name on the From line |
| `reply_to` | string | `jwout send --reply-to` | monitored reply address |
| `calendar_url` | string | LLM (CTA) | the booking link |
| `variants` | string[] | `jwout send --variant` | A/B arms, e.g. ["text_only","video"] |
| `cohorts` | string[] | `jwout send --cohort` | e.g. ["engine","manual_control"] |
| `cost_per_send_usd` | number | `jwout track report --cost` | for cost/booked |
| `success` | object | reporting | target booked-rate, max cost/meeting |
| `host_base_url` | string | `HOST_DIR`/`HOST_BASE_URL` for `jwout host` | where assets are served |
| `compliance` | object | `outreach-write`/`-deliver` | `{postal_address, unsubscribe_url}` — CAN-SPAM footer (deliver gates on it) |
| `economics` | object | dashboard `/business` | `{avg_deal_value_usd}` — values the pipeline in $ (optional; counts only if null) |
| `env_profile` | string | deployment | which secret bundle (SMTP/IMAP/API keys) to load |

### `sending.domains[]` — the cold-domain config object

Each is `{domain, spf, dkim, dmarc, warmup_status, warmup_started_at,
from_addresses[], daily_cap}`. A domain is a data object like any other; **"warmed"
is the `warmup_status` field** (`not_started | warming | ready`), not a separate
kind of thing. The deliver step sends only from domains whose `warmup_status` is
`ready`, and rotates across their `from_addresses` respecting `daily_cap`. That
the value takes ~2–4 weeks and money to reach `ready` is acquisition cost — it is
still a config field, exactly like a paid API key.

Anything not yet provided by the client is set to `null`/`[]` and documented as
`NEEDS-FROM-<client>` in their `README.md`. Never fabricate a value.

## Instruction files

- **`positioning.md`** — the locked positioning language. Do not reinvent it.
- **`template.md`** — the copy template, the hard rules the LLM must obey, the
  message anatomy, the signature block. This is what makes "write the email" a
  filled template, not a guess.
- **`assets.md`** — proof links, the ONLY approved facts/stats the LLM may use,
  brand colors, the show/world bible for scene-writing, honesty framing.
