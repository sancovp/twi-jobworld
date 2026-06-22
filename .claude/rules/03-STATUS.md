# Rule 03 — Status (deployed state + the "ready for any answer" matrix)

Snapshot of where the worker layer stands. Update this whenever state changes.

## Built + verified (as of this build)

| piece | state | how verified |
|---|---|---|
| `connectors/outreach` (`jwout`) | 11 verbs | imports clean; in-image |
| `host` / `send` / `track` / `serve` | ✅ run-verified | host (URL), send (local SMTP, send_id), track (events+report), serve (view 200, click 302+recorded, traversal 404) |
| `pull` (Apollo search→enrich) | ✅ doc-verified, real client | two-step confirmed vs docs; needs key for live call |
| `video` (Kling via fal.ai) | ✅ wired + dry-run; minimax fallback | fal queue API (submit/poll/fetch); confirm Kling slug live; needs `FAL_KEY` |
| `reply` (IMAP) | real client | needs creds |
| 6 stage skills + `run-outreach-campaign` | ✅ in image | rebuilt + listed in `/agent/skills` |
| 5 dept agents + CEO wired | ✅ | CEO.md references campaign skill (grep) |
| `clients/_schema` + `clients/b6` | ✅ | schema + B6 extracted, all gaps gated |
| `avi-jw:latest` image | ✅ builds | `jwout` on PATH, clients/agents/skills baked, verbs run in-image |
| end-to-end pipeline (B6 config) | ✅ dry-run | source-arg construction + host + send + track + report with B6 values |
| git | ✅ | branch `worker-layer` pushed to origin (4 commits) |

## How to run (once creds + client gaps are in)

```bash
docker build -f Dockerfile.sdk -t avi-jw:latest .
# run an instance with: JOBWORLD_INSTANCE, JW_CLIENT=b6, JW_CLIENT_DIR=/agent/clients/b6,
# JWOUT_DB, the secret bundle (deploy/secrets.b6.env per env_profile: FAL_KEY for video, MINIMAX for CEO model, …).
# the CEO uses run-outreach-campaign to drive research→content→production→delivery→metacog.
# serve the asset domain: jwout serve --port 443-fronted, docroot=$HOST_DIR
```

## Ready-for-any-answer matrix (each Avi answer drops straight in)

| Avi provides | goes to | unblocks |
|---|---|---|
| cold sending domains (warmed) | `client.json.sending.domains[]` (`warmup_status:ready`) + `SMTP_*` | live `send` |
| monitored reply inbox | `client.json.reply_to` + `IMAP_*` | `reply` / `outreach-replies` |
| Mason+Weston calendar link | `client.json.calendar_url` | the CTA in copy |
| approved facts (or "use none") | `clients/b6/assets.md` | stats in copy (else none) |
| real proof episode URLs | `clients/b6/assets.md` | proof line in copy |
| success thresholds | `client.json.success` | metacog verdict |
| tracked-link host domain | `client.json.host_base_url` + `HOST_BASE_URL` | `host`/`serve` real links |
| the 3 dedupe CSVs | `clients/b6/dedupe/*.csv` | `outreach-source` exclusion (required for any live send) |
| postal address + unsubscribe URL | `client.json.compliance.{postal_address,unsubscribe_url}` | CAN-SPAM footer → `outreach-deliver` will not send without it |
| Apollo master key | `APOLLO_API_KEY` | `pull` |
| fal.ai key | `FAL_KEY` | `video` (Kling) |
| MiniMax key | `MINIMAX_API_KEY` | CEO model backend (not video) |

Nothing in this list requires new code — each is a config value or a credential.
That is the design: the build is complete; answers fill slots.

## Remaining engineering (not blocked on Avi)

- Confirm Apollo `bulk_match` response field names on the first live call.
- **Open** tracking (an email pixel) — not built (privacy proxies make it noise);
  **click** tracking IS built (`serve` `/c/<token>` redirect) and **view**
  tracking IS built (`serve` `/<uid>/<file>`).
- A real cold mailserver substrate (Stalwart/docker-mailserver) for `send`.
