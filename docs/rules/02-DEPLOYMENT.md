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

Run: `deploy/run-instance.sh <client> [instance] [dashboard-port]` — loads
`deploy/secrets.<client>.env` (gitignored), wires `JW_CLIENT`/`JW_CLIENT_DIR`/
`JWOUT_DB`, and `docker run`s the image on a named data volume. Warns and runs
dry if no secrets file is present.

Four ports, all distinct and published: **JW dashboard** (8501), **API** (3847),
**`jwout serve`** (8000, recipient-facing — view/click/unsubscribe), and the
**`jwout dashboard`** (8787, operator funnel/contacts/replies/gates — published on
host **loopback only**). The entrypoint starts both `serve` and `dashboard` in the
background; their logs are `/jobworld_data/jwout-{serve,dashboard}.log`.

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
| `MINIMAX_API_KEY`, `MINIMAX_BASE_URL` | CEO model backend (the agent's LLM) |
| `FAL_KEY`, `VIDEO_BACKEND` | `jwout video` (Kling via fal.ai) |
| secret bundle per `client.json.env_profile` | the connector credentials below |

## Secret bundle (per `env_profile`) — see `deploy/secrets.example.env`

`APOLLO_API_KEY` · `CENSUS_API_KEY` (free) · `FAL_KEY` (Kling video) · `SEND_BACKEND`/`INSTANTLY_API_KEY`/`INSTANTLY_CAMPAIGN_ID` · `SMTP_HOST/PORT/USER/PASS` ·
`IMAP_HOST/PORT/USER/PASS` ·
`HOST_DIR` / `HOST_BASE_URL`. Never commit real secrets; `deploy/secrets.*.env`
is gitignored (only `secrets.example.env` is tracked).

## What is still infra/verification, not image (the honest gaps)

- A real **cold SMTP host** on warmed dedicated domains (the mailserver decision).
- Run **`jwout serve`** behind TLS on the asset domain (view-tracking is now code,
  not a gap; it just needs to be running and reachable).
- **View** (teaser GET) and **click** (tracked `/c/<token>` redirect to the
  stored destination) tracking ARE built in `jwout serve`. Only **open**-pixel
  tracking is not — it needs an ESP pixel and is ESP-dependent.
- Verified **Apollo** field names; **video** runs on **fal.ai Kling** (queue API) with
  **Instantly** as the send/reply backend — confirm the Kling slug + Instantly filter
  params on the first live call (see `connectors/outreach/README.md`).
These are provisioning/verification, gated on client sign-off — not more code.

## The business/deployment model (CORRECTED 2026-06-27 — the agency model)

**JobWorld instances are SOLD AND HANDED OVER, not operated by us.** The chain:
**us (vendor: build · maintain · update-channel · host)** → **agencies (configure +
operate + sell; Avi's SCG first — the instance's USER is Avi or his hire, never
Isaac)** → **end client (B6)**. The system operates itself; the agency user
supervises via the readouts (`/ops`, `/business`, Slack, Unibox) and escalates to
us only on breakage. Revenue: build fee + **maintenance/update subscription
(= GHCR pull access)** + **VPS resale** + success upside. We are also the first
agency (dogfooding) — a metamarketing business with its own software.

**Consequence: the image IS the deliverable, so CI/CD + registry + auto-update
are REQUIRED product infrastructure** — and they're BUILT (2026-06-27):

| stage | file | what |
|---|---|---|
| base publish | `deploy/push-base.sh` | tag+push local `jobworld-cave` → `ghcr.io/sancovp/jobworld-cave`. **The one human-gated step** (needs `gh auth refresh -s write:packages,read:packages` + `docker login ghcr.io` once). |
| app CI | `.github/workflows/image.yml` | push to main/worker-layer → build `Dockerfile.sdk` (parameterized `ARG BASE_IMAGE`, defaults to the GHCR base) → push `ghcr.io/<owner>/avi-jw:{latest,sha}` via `GITHUB_TOKEN` (`packages: write` — no personal scope needed). **This IS the paid update channel.** |
| buyer stack | `deploy/client/{docker-compose.yml,install.sh,update.sh,env.example,secrets.env.example,RUNBOOK.md}` | the instance + **watchtower** (label-scoped auto-update) on THEIR VPS. State in named volumes (`jw-data` = DB+hosted, `jw-claude` = their Max login) survives every pull. `.env`/`secrets.env` gitignored. |

`Dockerfile.sdk` FROM is now `ARG BASE_IMAGE` (CI → GHCR base; local →
`--build-arg BASE_IMAGE=jobworld-cave:latest`, verified still builds). Blocker
before CI can run green: `push-base.sh` must run once (base is local-only today).

| piece | file | what |
|---|---|---|
| dev container | `deploy/Dockerfile.dev` + `deploy/dev-shell.sh` | Claude Code shell logged into the INSTANCE-OWNER's account (named volume `avi-jw-client-claude` at `~/.claude`) + the repo bind-mounted at `/workspace` — build/test AS the instance owner, then hand the seat over. Host login never mounted; both accounts run simultaneously. No GitHub creds inside. First run: `claude login` in an INCOGNITO window with the instance-owner account. |
| instance update | `deploy/update-prod.sh <client>` | today: pull→preflight→build→detached swap→health (build-based, runs where the repo is). BECOMES the buyer-side `update.sh` (docker pull from GHCR → swap) once the registry pipeline exists; volumes persist either way; preflight failure leaves the old container running. |

Instance home = a small VPS **we sell them** (runs the engine container +
`jwout serve` 24/7 — tracked links + unsubscribe must never sleep).
