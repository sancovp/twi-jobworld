# Rule 00 — Worker-Layer Architecture (the canon for THIS build)

**Dir this governs:** `~/avi-jw/` (THE deliverable). The JW-on-Claude-Code-SDK
pattern is DONE (`server/jobworld_agent.py` swaps the CEO to `ClaudePMainAgent`,
the PromptWorld pattern). What we build NOW is the **worker layer**: the skills
and connectors that let JW workers run real outreach processes, specialized per
client.

> If you are a future session and read nothing else, read this file and
> `MEMORY.md`. This is what is happening and where.

---

## The one law (everything follows from it)

> **A thing is CODE only if it MUST execute something an LLM cannot do by
> generating tokens — an external system, an external effect, or real persisted
> state. Everything else is an INSTRUCTION handed to the LLM, not a function.**

Corollary that was learned the hard way: do **not** build a string linter, a
template filler, a copy-rule checker, or a "draft gate" as code. You tell an LLM
the template and the rules; it fills and obeys them. A linter-CLI-for-strings is
the canonical mistake. Code is for SMTP, HTTP APIs, IMAP, the DB, file hosting —
never for "check that this string has no em-dashes."

---

## Three layers

```
CLIENT ($content)   ── instructions: template, rules, positioning, assets, dedupe lists, targeting, calendar, from-addresses
      │  read by
      ▼
SKILL (procedure)   ── tells a worker: which CONNECTOR verbs to run, in what order, applying which CLIENT instructions
      │  calls
      ▼
CONNECTOR (code)    ── the ONLY functions: external-effect verbs (pull · video · send · track · host · serve · dashboard · market · qualify · suppress · reply)
```

- **CONNECTOR** = code, external effects only. Lives in `connectors/`.
- **SKILL** = a partially-evaluated LLM call: deterministic steps are connector
  verbs; generative steps are the LLM applying client instructions. Lives in
  `skills/`.
- **CLIENT** = the strings/assets that specialize a generic process for one
  company. B6 is one instance. Lives in `clients/`. **B6 is just `$client` args.**

### The bijection (general ↔ specific ↔ code)

| GENERAL (what the process is) | SPECIFIC (B6 instance) | CODE (what executes) |
|---|---|---|
| source decision-makers | B6 targeting: consumer $20M+, director+, those titles | `connectors/outreach` → `jwout pull` |
| write personalized copy | B6 template + locked positioning + four-part anatomy | *(no code — LLM applies `clients/b6` instructions)* |
| make a teaser clip | B6 show-world + brand product, navy/chartreuse | `jwout video` + `jwout host` |
| build the landing page | one page, no deck — concept + teaser embed + calendar CTA | `jwout page` + `jwout host` |
| deliver + record | B6 cold domains, from-addresses, cohorts | `jwout send` + `jwout track` |
| read + classify replies | B6 monitored inbox | `jwout reply` + `jwout track event … reply` |
| measure | B6 success thresholds, cost cap | `jwout track report` |

The same bijection as the three-column diagram (rule 23.4 — every concept appears
in all three columns; the columns interlock):

```mermaid
flowchart LR
  subgraph G["GENERAL — the process"]
    g1[source decision-makers]; g2[write personalized copy]; g3[make a teaser]
    g4[deliver + record]; g5[read + classify replies]; g6[measure]
  end
  subgraph S["SPECIFIC — B6 instance"]
    s1["consumer $20M+, director+, titles"]; s2["locked positioning + 4-part anatomy"]
    s3["show-world + product, navy/chartreuse"]; s4["cold domains, from-addrs, cohorts"]
    s5["monitored inbox"]; s6["success thresholds, cost cap"]
  end
  subgraph C["CODE — what executes"]
    c1["jwout pull"]; c2["(none — LLM applies instructions)"]; c3["jwout video + host"]
    c4["jwout send + track"]; c5["jwout reply + track event"]; c6["jwout track report"]
  end
  g1 --- s1 --- c1
  g2 --- s2 --- c2
  g3 --- s3 --- c3
  g4 --- s4 --- c4
  g5 --- s5 --- c5
  g6 --- s6 --- c6
  classDef gen fill:#fff3cd,color:#000; classDef spec fill:#48f,color:#fff; classDef code fill:#1b4,color:#fff
  class g1,g2,g3,g4,g5,g6 gen; class s1,s2,s3,s4,s5,s6 spec; class c1,c2,c3,c4,c5,c6 code
```

---

## Component diagram

```mermaid
flowchart TB
  subgraph client["clients/ (CONTENT — instructions)"]
    SCHEMA["_schema/ — the $client contract"]
    B6["b6/ — one instance"]
  end
  subgraph skill["skills/ (PROCEDURES)"]
    SRC["outreach-source"]; WRT["outreach-write"]; TSR["outreach-teaser"]
    DLV["outreach-deliver"]; RPL["outreach-replies"]; RPT["outreach-report"]
  end
  subgraph conn["connectors/ (CODE — external effects)"]
    OUT["outreach (jwout): pull·video·page·send·track·host·serve·dashboard·market·qualify·suppress·reply"]
  end
  subgraph ext["EXTERNAL SYSTEMS"]
    APOLLO["Apollo API"]; MINIMAX["fal.ai Kling (video)"]; SMTP["SMTP / cold mailserver"]
    IMAP["IMAP"]; STATIC["static host (view tracking)"]; DB["(SQLite state)"]
  end
  B6 -. read by .-> skill
  SRC --> OUT; WRT -. applies instructions only .-> client; TSR --> OUT
  DLV --> OUT; RPL --> OUT; RPT --> OUT
  OUT --> APOLLO & MINIMAX & SMTP & IMAP & STATIC & DB
  classDef code fill:#1b4,color:#fff; classDef content fill:#48f,color:#fff
  class conn,OUT code; class client,SCHEMA,B6 content
```

## Activity (one outreach run, per contact)

```mermaid
sequenceDiagram
  participant CEO
  participant W as Worker (runs a SKILL)
  participant C as Connector (jwout)
  participant X as External system
  Note over CEO,W: CEO assigns dept work; worker loads $client + the skill
  W->>C: jwout pull --titles … --domains …   (CONNECTOR, external)
  C->>X: Apollo API
  X-->>W: contacts in DB
  Note over W: WRITE copy — LLM applies clients/b6 template+rules (NO function)
  W->>C: jwout video "<prompt>"  ; jwout host teaser.mp4
  C->>X: MiniMax ; static host
  W->>C: jwout send --to … --body-file copy.txt
  C->>X: SMTP
  W->>C: jwout track event <id> delivered
  Note over W: later — jwout reply ; jwout track event <id> reply ; jwout track report
```

---

## Directory map (the dirs the goal says to never forget)

| dir | layer | rule file |
|---|---|---|
| `~/avi-jw/` | the deliverable (JW fork, SDK CEO done) | this file |
| `~/avi-jw/connectors/` | CODE — external-effect connectors | `connectors/README.md` |
| `~/avi-jw/connectors/outreach/` | the outreach connector (`jwout`, 11 verbs) | `connectors/outreach/README.md` |
| `~/avi-jw/skills/` | PROCEDURES — worker skills | `skills/_OUTREACH-SKILLS.md` |
| `~/avi-jw/clients/` | CONTENT — `$client` configs | `clients/README.md` |
| `~/avi-jw/clients/_schema/` | the `$client` contract | `clients/_schema/README.md` |
| `~/avi-jw/clients/b6/` | B6 instance | `clients/b6/README.md` |

Sources reused (do not re-derive): `~/b6-outreach-engine` (the original engine
with B6 welded in — the code came from here, B6 content lives here), the
universal connector was first built at `~/jw-outreach` and **relocated into
`connectors/outreach`**. `~/mog-mirror` holds PromptWorld + twi-jobworld refs.

## Maintenance rule (enforced by the goal)

Every time code or structure changes here: update THIS file's diagrams and the
local dir `README.md`. No loose files. No dir without a rule explaining why it
exists. Code without an updated diagram is an incomplete change.
