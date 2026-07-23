---
name: b6-ssh-deploy
description: PRIVATE ops skill. How to finish + operate the B6 JobWorld deployment on the Hetzner SSH box from this container. Use when asked to set up, check, or advance the B6 box deploy.
---

# B6 SSH deploy — operator runbook

You are operating from the **b6-outreach container** (running on Mason's Claude quota). Your job is to
SSH into the **Hetzner box** and finish setting up the real B6 JobWorld instance there, working WITH
Isaac for anything interactive (auth codes, API keys). Keep the state rule
`.claude/rules/00-b6-ssh-deploy-states.md` current as you go — flip steps to done and note what happened.

## The box
- **SSH:** `ssh -i /root/.ssh/hetzner_b6 -o StrictHostKeyChecking=accept-new root@46.62.150.23`
  (the private key is already in this container at `/root/.ssh/hetzner_b6`, chmod 600 — never print it, never commit it.)
- On the box: container **`b6`** (image `jobworld-b6:box`, `--restart unless-stopped`), dashboard bound to
  `127.0.0.1:3847`, volumes `b6-claude:/home/ceo/.claude` + `b6-data:/jobworld_data`.
- The live B6 instance inside that container: **`/jobworld_data/b6`** (CLAUDE.md, agents, skills, `.mcp.json`,
  `.secrets/mcp_state.json` — all COMPILED from `/agent/clients/b6/config.json` by the render step).
- Repo on the box: `/root/twi-jobworld` (branch `b6`).

Run box commands by nesting: `ssh -i /root/.ssh/hetzner_b6 root@46.62.150.23 'docker exec b6 <cmd>'`.

## What is already DONE (do not redo)
- Image built on the box, container `b6` running, `/api/health` ok.
- Entrypoint COMPILES B6 from config on start (CLAUDE.md + 2 workers [lead_gen/outreach] + 2 dept skills + `.mcp.json`).
- **Instantly API key is set** in `/jobworld_data/b6/.secrets/mcp_state.json` and injected into `.mcp.json`.

## What is LEFT — the steps to drive
1. **Auth the box's B6 CEO** (INTERACTIVE — Isaac/Mason step, you coordinate). On the box:
   `docker exec -it b6 claude setup-token` → authorize in a browser with Mason's Claude account → token
   persists in the `b6-claude` volume. You cannot do the browser part; prep everything else and tell Isaac
   when it's the only thing left.
2. **Apollo key + Instantly campaign id** (Isaac supplies the values). Write them into the box instance secrets,
   then RE-RENDER so they flow into `.mcp.json`:
   ```
   ssh -i /root/.ssh/hetzner_b6 root@46.62.150.23 'docker exec -e AKEY="<apollo-key>" b6 \
     python3 -c "import json,os;p=\"/jobworld_data/b6/.secrets/mcp_state.json\";d=json.load(open(p));d.setdefault(\"apollo\",{})[\"APOLLO_API_KEY\"]=os.environ[\"AKEY\"];json.dump(d,open(p,\"w\"),indent=2)"'
   ssh -i /root/.ssh/hetzner_b6 root@46.62.150.23 'docker exec b6 sh -c "cd /agent && python3 -m server.render --dir /jobworld_data/b6"'
   ```
   Put the Instantly `campaign_id` into the instance `config.json` (`outreach` agent's `instantly_campaign_ref`)
   then re-render. NEVER echo a key back; confirm by masked prefix only.
3. **CEO-driven dry-run on the box** (after step 1). Copy the test CLI in and have the box CEO drive it:
   `docker exec b6 sh -c 'mkdir -p /jobworld_data/b6/.test && cp /agent/test/jwtest.py /jobworld_data/b6/.test/'`
   then drive the flow (apollo_search → instantly_create_campaign → add_leads → start_campaign) and assert with
   `/agent/test/expected.py` against `/jobworld_data/b6/.test/trace.jsonl`. Producer ≠ asserter — the test must PASS by run.
4. **Go live.** With CEO authed + both keys in + dry-run green, the box CEO runs real rounds: Apollo sources →
   lead_gen scores (the ICP rubric, active-in-social near-gate) + dedupes vs STC/Trashed/7 Stories → outreach
   writes the 4-part personalized copy → pushes to Instantly (warmed SDR accounts) via the MCP.

## Laws
- Work WITH Isaac; never fabricate an API key, campaign id, or compliance value — ask.
- Never print or commit the SSH key or any API key. Confirm secrets by masked prefix only.
- The old jwout/SMTP context of THIS container is legacy — you are only borrowing this container's Claude
  quota to operate the box. The real B6 that sends is the `b6` container on the box.
- Update `.claude/rules/00-b6-ssh-deploy-states.md` every time a step's state changes.
