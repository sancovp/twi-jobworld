# Rule 02 — Deployment (how the worker layer reaches a running instance)

**Dirs this governs:** `Dockerfile.sdk`, `deploy/`, and how `connectors/`,
`clients/`, `skills/`, `agents/` flow into a live JW instance.

## Build chain

```mermaid
flowchart TB
  subgraph base["jobworld-cave:latest (base image)"]
    CAVE["cave stack + JW server + ink-ceo"]
  end
  subgraph sdk["Dockerfile.sdk additions"]
    PINS["claude_agent_sdk + mcp pins (SDK CEO)"]
    XPLANT["transplant: jobworld_agent.py + p_main_agent.py + convo_registry.py"]
    subgraph worker["worker layer"]
      CONN["connectors/ → pip install → jwout on PATH"]
      CL["clients/ ($content, read at run time)"]
      AG["agents/ (CEO + 5 depts)"]
      SK["skills/ (outreach-* + run-outreach-campaign)"]
    end
    EP["entrypoint-sdk.sh (root setup → drop to ceo)"]
  end
  base --> sdk
  classDef b fill:#555,color:#fff; classDef w fill:#1b4,color:#fff
  class base,CAVE b; class worker,CONN,CL,AG,SK w
```

Build: `docker build -f Dockerfile.sdk -t avi-jw:latest .`
(`.dockerignore` keeps venvs / __pycache__ / data / *.db out of the context.)

Image deps added on top of the Debian base: **`jq`** (the `outreach-*` skills read
`client.json` with it) and the SDK pip pins. Verified in-image: `jq` resolves and
the skills' actual `jq` queries run against `clients/b6/client.json`.

Run: `deploy/run-instance.sh <client> [instance] [port]` — loads
`deploy/secrets.<client>.env` (gitignored), wires `JW_CLIENT`/`JW_CLIENT_DIR`/
`JWOUT_DB`, and `docker run`s the image on a named data volume. Warns and runs
dry if no secrets file is present.

## How each layer reaches the instance

| layer | path in image | reaches instance via |
|---|---|---|
| connector | `/agent/connectors/outreach` (+ `jwout` on PATH) | global install — available to every worker |
| skills | `/agent/skills/*/` | entrypoint copies each into `$INSTANCE_DIR/.claude/skills/` |
| clients | `/agent/clients/` | read at run time; worker sets `JW_CLIENT_DIR` |
| agents | `/agent/agents/` | CEO registers departments (`/api/agents`) at bootstrap |

The entrypoint's skill-copy loop iterates `skills/*/` (directories only), so the
loose `skills/_OUTREACH-SKILLS.md` rule is correctly skipped.

## Entrypoint boot — container start → ready instance (execution boundary)

```mermaid
sequenceDiagram
  participant D as docker run / run-instance.sh
  participant EP as entrypoint-sdk.sh (root)
  participant JE as entrypoint-jobworld.sh (ceo)
  participant SRV as JW server
  participant CEO as SDK CEO (ClaudePMainAgent)
  D->>EP: start (JOBWORLD_INSTANCE, JW_CLIENT, secret bundle)
  EP->>EP: mkdir + chown /jobworld_data, /home/ceo
  EP->>JE: su -m ceo, HOME=/home/ceo, exec JW entrypoint
  JE->>JE: init instance dir; copy /agent/skills/* → instance .claude/skills
  JE->>SRV: python -m server --dir INSTANCE --port
  SRV->>CEO: swap main_agent → ClaudePMainAgent (plugins=[]); create_session()
  CEO-->>SRV: CEO ready (loads agents/CEO.md persona)
  Note over CEO: heartbeat + run-outreach-campaign drive the departments
```

## Runtime env (per instance / per client)

| env | meaning |
|---|---|
| `JOBWORLD_INSTANCE`, `JOBWORLD_PORT` | which instance (JW) |
| `JW_CLIENT`, `JW_CLIENT_DIR` | active client, e.g. `b6` / `/agent/clients/b6` |
| `JWOUT_DB` | the run DB, e.g. `$INSTANCE_DIR/outreach.db` |
| `MINIMAX_API_KEY`, `MINIMAX_BASE_URL` | CEO model redirect + `jwout video` |
| secret bundle per `client.json.env_profile` | the connector credentials below |

## Secret bundle (per `env_profile`) — see `deploy/secrets.example.env`

`APOLLO_API_KEY` · `SMTP_HOST/PORT/USER/PASS` · `IMAP_HOST/PORT/USER/PASS` ·
`HOST_DIR` / `HOST_BASE_URL`. Never commit real secrets; `deploy/secrets.*.env`
is gitignored (only `secrets.example.env` is tracked).

## What is still infra/verification, not image (the honest gaps)

- A real **cold SMTP host** on warmed dedicated domains (the mailserver decision).
- Run **`jwout serve`** behind TLS on the asset domain (view-tracking is now code,
  not a gap; it just needs to be running and reachable).
- **Open/click** tracking on the email itself needs an ESP pixel / link-rewrite —
  ESP-dependent, not yet built (view-tracking on the teaser link IS built).
- Verified **Apollo** field names and **MiniMax video** endpoints (see
  `connectors/outreach/README.md`).
These are provisioning/verification, gated on client sign-off — not more code.
