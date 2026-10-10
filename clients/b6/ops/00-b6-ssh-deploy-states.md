# B6 SSH deploy — live state (the CEO keeps this current)

> This rule is the progressive state machine for finishing the B6 Hetzner deploy. As you complete a step
> (via the `b6-ssh-deploy` skill), flip its status and add a dated note. Work WITH Isaac on the interactive
> rows. Never mark a row done unless it is verified by run/output — not by assumption.

## Setup states
| # | step | status | note |
|---|------|--------|------|
| 1 | box provisioned + reachable (`ssh -i /root/.ssh/hetzner_b6 root@46.62.150.23`) | DONE | 2026-07-23 · container `b6` up |
| 2 | image built on box + container running + `/api/health` ok | DONE | `jobworld-b6:box`, restart unless-stopped |
| 3 | B6 compiled from config (CLAUDE.md + 2 workers + 2 dept skills + `.mcp.json`) | DONE | entrypoint renders on start |
| 4 | Instantly API key set + in `.mcp.json` | DONE | 2026-07-23 |
| 5 | **box B6 CEO authed** (`docker exec -it b6 claude setup-token`, Mason's account) | PENDING | interactive — Isaac/Mason, waiting on Mason's Claude codes |
| 6 | **Apollo API key** written to box `.secrets` + re-rendered | PENDING | waiting on Mason (Apollo key on his email) |
| 7 | Instantly `campaign_id` set in config + re-rendered | PENDING | waiting on the campaign id |
| 8 | CEO-driven dry-run on the box PASSES (producer ≠ asserter) | PENDING | after 5 |
| 9 | live: real rounds (Apollo→qualify→personalize→Instantly) | PENDING | after 5–8 |

## Blockers (who owns them)
| blocker | owner | detail |
|---------|-------|--------|
| Mason's Claude access codes (for setup-token) | Mason → Isaac | all on Mason's email/2FA |
| Apollo API key | Mason → Isaac | on Mason's email |
| Instantly campaign id | Isaac | which campaign to load/start |

## Log (append as you work)
- 2026-07-23 — box up, image built, container running, B6 compiled, Instantly key in. Operator wired (this container, Mason quota). Blocked on Mason's codes for steps 5–7.
