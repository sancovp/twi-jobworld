# `connectors/` — external-system connectors (CODE)

**Why this dir exists.** A connector is the ONLY kind of code in the worker
layer. It exists to do something an LLM **cannot do by generating tokens**: call
an external API, open an SMTP/IMAP socket, write persisted state, host a file.

This is the enforcement point for the one law (see
`../.claude/rules/00-WORKER-LAYER-ARCHITECTURE.md`):

> Unless it MUST execute, it is not a function. Templates, copy rules,
> positioning, dedupe-against-a-list → those are **instructions** the LLM
> applies, and they live in `clients/`, never here.

If you are tempted to add a connector verb that just checks or transforms a
string, stop — that belongs in a skill's instructions, not in code.

## What a connector is

- A small, installable package exposing a **CLI** (the worker drives it by
  shelling out; no MCP round-trip needed, no SDK coupling).
- Every verb is one external effect.
- All credentials come from **environment variables** — nothing secret in code,
  nothing client-specific baked in. The `$client` config supplies values at run
  time; the connector only knows the shape of the external system.

## Current connectors

| connector | command | verbs | external systems |
|---|---|---|---|
| `outreach/` | `jwout` | pull · video · send · track · host · serve · dashboard · market · qualify · suppress · reply | Apollo, MiniMax, SMTP, IMAP, static host, SQLite |

## Adding a connector

1. Create `connectors/<name>/` as an installable package with a console script.
2. Each verb = one external effect; creds from env; no client content.
3. Write `connectors/<name>/README.md` documenting every verb, its env-var
   contract, what is run-verified, and any unverified external API shapes.
4. Update the diagrams in `../.claude/rules/00-WORKER-LAYER-ARCHITECTURE.md`.
