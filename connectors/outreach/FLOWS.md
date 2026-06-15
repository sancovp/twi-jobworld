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
    VID["video.py — video (MiniMax async)"]
    SND["send.py — send (SMTP)"]
    HST["host.py — host (unique URL)"]
    SRV["serve.py — serve (view + click + /u unsubscribe)"]
    DSH["dashboard.py — dashboard (ops / business read views)"]
    MKT["market.py — market (TAM/SAM + business metrics)"]
    RPL["reply.py — reply (IMAP)"]
    DBM["db.py — track + suppressions + market + state"]
    MOD["models.py — Contact"]
  end
  CLI --> SRC & VID & SND & HST & SRV & DSH & MKT & RPL & DBM
  SRC --> MOD
  DBM --> MOD
  SRV --> DBM
  DSH --> DBM & MKT
  MKT --> DBM & SRC
  classDef code fill:#1b4,color:#fff
  class CLI,SRC,VID,SND,HST,SRV,DSH,MKT,RPL,DBM,MOD code
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
  W->>CLI: market refresh (reads $client targeting)
  CLI->>AP: search_total(titles+seniorities)         %% TAM — all ICP decision-makers
  AP-->>CLI: pagination.total_entries (FREE, no credits)
  CLI->>AP: search_total(+ verified email status)    %% SAM — reachable subset
  AP-->>CLI: total_entries
  CLI->>DB: record_market(tam, sam)
  Note over DB: dashboard /business reads the snapshot; SOM = SAM × live booked-rate (sharpens with data)
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

## `video` — MiniMax async create/poll/download boundary

```mermaid
sequenceDiagram
  participant W as Worker
  participant CLI as jwout video
  participant MM as MiniMax API
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
