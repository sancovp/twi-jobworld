# `connectors/outreach` — component + execution-boundary flows

The internal structure of the `jwout` package and a sequence diagram for every
non-trivial verb boundary. (Trivial verbs — `host` = copy file → return URL;
`track event` = one INSERT; `track report` = one SELECT — are covered by the
data-flow diagram in `README.md` and need no sequence.)

## Component diagram (module dependencies)

```mermaid
flowchart TB
  subgraph pkg["jw_outreach package"]
    CLI["cli.py — verb wiring / argparse"]
    SRC["source.py — pull (Apollo 2-step)"]
    VID["video.py — video (Kling via fal.ai; minimax fallback)"]
    PGE["page.py — page (per-brand landing page renderer)"]
    SND["send.py — send (SMTP)"]
    HST["host.py — host (unique URL)"]
    SRV["serve.py — serve (view + click + /u unsubscribe)"]
    DSH["dashboard.py — dashboard (ops / business read views)"]
    MKT["market.py — market (TAM/SAM/cube + business metrics)"]
    CEN["census.py — CBP cross-check (independent denominator)"]
    RPL["reply.py — reply (IMAP)"]
    DBM["db.py — track + suppressions + market + fit + state"]
    MOD["models.py — Contact"]
  end
  CLI --> SRC & VID & PGE & SND & HST & SRV & DSH & MKT & RPL & DBM
  SRC --> MOD
  DBM --> MOD
  SRV --> DBM
  DSH --> DBM & MKT
  MKT --> DBM & SRC & CEN
  classDef code fill:#1b4,color:#fff
  class CLI,SRC,VID,PGE,SND,HST,SRV,DSH,MKT,CEN,RPL,DBM,MOD code
```

`send`, `host`, `video`, `reply` have no internal deps (stdlib/requests only);
`serve` and `dashboard` reach state through `db` (serve is recipient-facing on
the public host; dashboard is operator-facing on localhost); `market` sizes TAM/SAM
via `source` (free Apollo) and is read by `dashboard`'s business view; `source`
and `db` share the `Contact` shape.

## `market refresh` — TAM/SAM sizing boundary (free)

```mermaid
sequenceDiagram
  participant W as Operator
  participant CLI as jwout market refresh
  participant AP as Apollo
  participant DB as SQLite
  participant CB as Census CBP
  W->>CLI: market refresh (reads whole $client)
  CLI->>AP: search_total(titles+seniorities)         %% TAM — all ICP decision-makers
  AP-->>CLI: pagination.total_entries (FREE, no credits)
  CLI->>AP: search_total(+ verified email status)    %% SAM — reachable subset
  CLI->>AP: search_total ×(per seniority / employee-band / industry)  %% the cube, FREE
  CLI->>AP: org_total(firmographics)                 %% account-level Apollo TAM
  CLI->>CB: establishment_count(NAICS × size)        %% independent denominator (needs free key)
  CB-->>CLI: establishments
  CLI->>DB: record_market(tam, sam, breakdown JSON)
  Note over DB: /business shows qualified TAM (×fit-rate), account TAM RANGE (Apollo vs Census), the cube; SOM = SAM × live booked-rate
```

## `pull` — Apollo two-step execution boundary

```mermaid
sequenceDiagram
  participant W as Worker
  participant CLI as jwout pull
  participant AP as Apollo
  participant DB as SQLite
  W->>CLI: pull --titles.. --seniorities.. --status.. [--no-enrich]
  CLI->>AP: POST /mixed_people/api_search (filters)
  AP-->>CLI: person stubs (NO email) — FREE
  alt --no-enrich (preview)
    CLI-->>W: print matches (NOT saved; empty email is the PK)
  else enrich
    loop batches of 10
      CLI->>AP: POST /people/bulk_match (details[])
      AP-->>CLI: matches (email) — 1 credit per matched record
    end
    CLI->>DB: save_contact per matched person
    CLI-->>W: "pulled + enriched: N contacts"
  end
```

## `video` — async submit/poll/fetch boundary (fal.ai Kling default; MiniMax shape shown as the fallback)

```mermaid
sequenceDiagram
  participant W as Worker
  participant CLI as jwout video
  participant MM as video API (fal.ai Kling default / MiniMax fallback)
  W->>CLI: video "<prompt>" --out f.mp4
  CLI->>MM: POST /v1/video_generation {model,prompt,duration,resolution}
  MM-->>CLI: task_id
  loop poll every interval until terminal
    CLI->>MM: GET /v1/query/video_generation?task_id
    MM-->>CLI: status (Processing | Success | Fail)
  end
  CLI->>MM: GET /v1/files/retrieve?file_id
  MM-->>CLI: file.download_url (valid 9h)
  CLI->>MM: GET download_url
  MM-->>CLI: video bytes
  CLI-->>W: out path
```

## `page` — render landing page → write file boundary

```mermaid
sequenceDiagram
  participant W as Worker (production dept)
  participant CLI as jwout page
  participant FS as Local filesystem
  participant HOST as jwout host
  participant SRV as jwout serve
  participant DB as SQLite
  W->>CLI: page --brand B --concept-file F --calendar-url U --out page.html [--video-url V] [--honesty-note H]
  Note over CLI: stdlib-only HTML renderer: concept + video embed + one CTA; B6 navy+chartreuse defaults
  CLI->>FS: write page.html (deterministic, no network)
  CLI-->>W: resolved path to page.html
  W->>HOST: jwout host page.html
  HOST->>FS: copy to HOST_DIR/<uid>/page.html
  HOST-->>W: https://<base>/<uid>/page.html  (the [[custom page link]])
  Note over W: pass page URL to outreach-deliver as --asset-url
  Note over W: later -- recipient browser visits the page URL
  SRV->>DB: SELECT send WHERE asset_url LIKE %/<uid>/%
  SRV->>DB: record_event(send_id, "view")
  Note over DB: same view-tracking loop as teaser mp4 -- uid path is the handle
```

## `send` — build → SMTP → record boundary

```mermaid
sequenceDiagram
  participant W as Worker
  participant CLI as jwout send
  participant MX as SMTP host
  participant DB as SQLite
  W->>CLI: send --to --subject --body-file --from --variant --cohort --asset-url --click-token
  CLI->>CLI: build_message (EmailMessage)
  CLI->>MX: SMTP (STARTTLS/SSL, optional login, send_message)
  MX-->>CLI: accepted (else raises → nonzero exit)
  alt --no-record
    CLI-->>W: "sent (not recorded)"
  else
    CLI->>DB: record_send (stores variant/cohort/asset_url/click_token)
    CLI-->>W: "send_id=N"
  end
```

## `serve` view — GET asset → record view boundary

```mermaid
sequenceDiagram
  participant R as Recipient browser
  participant SV as jwout serve
  participant DB as SQLite
  R->>SV: GET /<uid>/<file>
  SV->>DB: SELECT id FROM sends WHERE asset_url LIKE %/uid/%
  DB-->>SV: send_id (if any)
  SV->>DB: record_event(send_id, "view")
  SV-->>R: 200 + file bytes  (traversal → 404)
```

## `serve` click — tracked link → record click → redirect boundary

```mermaid
sequenceDiagram
  participant R as Recipient browser
  participant SV as jwout serve
  participant DB as SQLite
  R->>SV: GET /c/<token>   (no query param trusted)
  SV->>DB: SELECT id, click_dest FROM sends WHERE click_token=token
  DB-->>SV: send_id + stored dest (if any)
  SV->>DB: record_event(send_id, "click")
  SV-->>R: 302 Location: <stored dest>  (unknown token / no dest → 404)
```

## `serve` /u + `suppress` — opt-out boundary (CAN-SPAM)

```mermaid
sequenceDiagram
  participant R as Recipient browser
  participant SV as jwout serve
  participant DB as SQLite
  R->>SV: GET /u/<token>   (one-click unsubscribe from the footer)
  SV->>DB: SELECT to_email FROM sends WHERE unsub_token=token
  DB-->>SV: email (if any)
  SV->>DB: INSERT suppressions(email, reason=unsubscribe)
  SV-->>R: 200 "You're unsubscribed" (page shown even for unknown token — no leak)
  Note over DB: deliver gate runs `jwout suppress check <email>` (exit 2 = skip);<br/>replies skill runs `jwout suppress add` for "remove me" / hostile
```

## `reply` — IMAP read → classify → track boundary

```mermaid
sequenceDiagram
  participant W as Worker (delivery dept)
  participant CLI as jwout reply
  participant IM as IMAP inbox
  participant DB as SQLite
  W->>CLI: reply --json
  CLI->>IM: login, select INBOX, search UNSEEN, fetch RFC822
  IM-->>CLI: [{from, subject, date, snippet}]
  CLI-->>W: JSON
  Note over W: classify each (LLM judgment — instruction, not code)
  W->>CLI: track event <send_id> reply  [+ booked]
  CLI->>DB: record_event
  Note over W: opt-outs / hostile → append to clients/<c>/dedupe/
```

## Mock mode (`JWOUT_MOCK=1`) — added 2026-07-03

The S1 boundary faked at the connector, so the agent layer runs unchanged:

```mermaid
sequenceDiagram
  participant A as any agent (skill unchanged)
  participant CLI as jwout cli.py
  participant MK as mock.py (deterministic fixtures)
  participant DB as outreach.db (REAL)
  A->>CLI: pull / send / video / reply (the 4 external verbs)
  CLI->>CLI: JWOUT_MOCK=1?
  alt mock ON
    CLI->>MK: canned contacts / fake send_id / placeholder clip / scripted replies
    MK->>DB: RECORDS for real (unlike dry-run, which records nothing)
    Note over MK,DB: the funnel fills, dashboards light up, zero creds, nothing leaves the box
  else mock OFF
    CLI->>CLI: real backends (Apollo / SMTP·Instantly / fal·MiniMax / IMAP·Instantly)
  end
```

All other verbs (`track host serve page dashboard qualify suppress market`) are
already local (SQLite/filesystem/localhost HTTP) and never need mocking.
