---
name: outreach-source
description: Source decision-maker contacts for the active client via the outreach connector (jwout pull), then exclude anyone on the client's dedupe lists. Use when a worker needs to build or top up the contact list for an outreach run.
version: 1.0.0
tags: [outreach, jobworld, connector:outreach, stage:source]
---

# outreach-source

Find leads for the active `$client` and load them into the run DB, excluding the
client's manual-pipeline targets.

## Inputs

- `JW_CLIENT_DIR` (the client config), `JWOUT_DB` (the run DB).
- Optional override: `--limit`, extra `--domains`.

## Procedure

1. **Read targeting** from `$JW_CLIENT_DIR/client.json` → `targeting.titles`,
   `targeting.seniorities`, `targeting.email_statuses`, `targeting.domains`.
2. **Pull** (CONNECTOR — external Apollo call, costs credits):
   ```bash
   jwout pull \
     --titles "$(jq -r '.targeting.titles|join(",")' $JW_CLIENT_DIR/client.json)" \
     --seniorities "$(jq -r '.targeting.seniorities|join(",")' $JW_CLIENT_DIR/client.json)" \
     --status "$(jq -r '.targeting.email_statuses|join(",")' $JW_CLIENT_DIR/client.json)" \
     --domains "$(jq -r '.targeting.domains|join(",")' $JW_CLIENT_DIR/client.json)" \
     --limit ${LIMIT:-25}
   ```
3. **Apply dedupe** (INSTRUCTION — not a connector verb): read every CSV in
   `$JW_CLIENT_DIR/dedupe/`. For each pulled contact, if its brand or domain
   appears in any list, mark it excluded and do not pass it downstream. Also
   exclude the client's own primary domain. If `dedupe/` has no CSVs yet, STOP —
   per the client README the engine must not run a live send without them.
4. **Report** how many were pulled, how many excluded, how many remain.

## Output

Contacts in `JWOUT_DB` (the `contacts` table). A short summary of pulled /
excluded / remaining for the manager.

## Layer notes

`jwout pull` is the only code here. Dedupe is instruction data applied by you,
the worker — not a string-linter CLI.
