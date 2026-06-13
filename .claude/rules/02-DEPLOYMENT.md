# Rule 02 — Deployment (how the worker layer reaches a running instance)

**Dirs this governs:** `Dockerfile.sdk`, `deploy/`, and how `connectors/`,
`clients/`, `skills/`, `agents/` flow into a live JW instance.

## Build chain

```
jobworld-cave:latest  (JW's own image: cave stack + JW server)
        │  Dockerfile.sdk adds:
        ▼
  1. claude_agent_sdk + mcp pins (SDK CEO)
  2. transplant: jobworld_agent.py + p_main_agent.py + convo_registry.py
  3. worker layer:  COPY connectors/ clients/ agents/  ;  pip install connectors/outreach  → `jwout` on PATH
  4. entrypoint-sdk.sh  (drops to non-root `ceo`, sets HOME, runs JW's entrypoint)
```

Build: `docker build -f Dockerfile.sdk -t avi-jw:latest .`
(`.dockerignore` keeps venvs / __pycache__ / data / *.db out of the context.)

## How each layer reaches the instance

| layer | path in image | reaches instance via |
|---|---|---|
| connector | `/agent/connectors/outreach` (+ `jwout` on PATH) | global install — available to every worker |
| skills | `/agent/skills/*/` | entrypoint copies each into `$INSTANCE_DIR/.claude/skills/` |
| clients | `/agent/clients/` | read at run time; worker sets `JW_CLIENT_DIR` |
| agents | `/agent/agents/` | CEO registers departments (`/api/agents`) at bootstrap |

The entrypoint's skill-copy loop iterates `skills/*/` (directories only), so the
loose `skills/_OUTREACH-SKILLS.md` rule is correctly skipped.

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
