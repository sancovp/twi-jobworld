# `clients/` — `$client` configs (CONTENT, not code)

**Why this dir exists.** A client config is the bundle of **instructions and
assets** that specializes a generic outreach process for one company. It is the
`$client` argument. **B6 is just one instance** — a brand contracting us, no
more special than any other directory here.

Nothing in here executes. It is the strings the LLM reads to write copy, plus
the structured params the connector verbs consume (targeting, addresses,
calendar, costs). The split is deliberate (see
`../.claude/rules/00-WORKER-LAYER-ARCHITECTURE.md`):

- **structured params** (`client.json`) → consumed by connector verbs / worker logic
- **instructions** (`positioning.md`, `template.md`, `assets.md`) → handed to the LLM
- **data** (`dedupe/`) → lists the LLM is told to honor (or a connector looks up if huge)

## Contents

| entry | what |
|---|---|
| `_schema/` | the `$client` contract — what every client config must provide |
| `b6/` | the B6 instance |

## To onboard a new client

Copy the shape defined in `_schema/`, fill every required field, mark anything
not yet provided as `NEEDS-FROM-<client>` (do not invent values — e.g. never
fabricate stats or a calendar link). Write the client's `README.md` with its
status and open items. No new code is needed to add a client — that is the whole
point of the layer.
