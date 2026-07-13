# avi-jw — project docs (context for the CEO agent)

**From now on this instance works on ITSELF — the avi-jw cold-outreach engine.**
These are the CURRENT project docs (mirrored from the repo) so you have full context
when improving the codebase you run on.

## Read first
- `rules/00-WORKER-LAYER-ARCHITECTURE.md` — the architecture + THE ONE LAW (code only
  for external effects; everything else is instructions to an LLM).
- `rules/03-STATUS.md` — current build state.
- `rules/02-DEPLOYMENT.md` — how instances ship (the vendor→agency→client model, CI/CD).

## The rest
- `rules/01-DEPARTMENTS.md`, `rules/04-MARKET-MAPPING.md` — dept + market design.
- `runbooks/GO-LIVE-RUNBOOK.md` — what's still needed to launch B6.
- `runbooks/WARMUP-RND.md` — deliverability (outsourced to Instantly; the R&D track).
- `connector/outreach-README.md` + `outreach-FLOWS.md` — the `jwout` connector spec
  (the ONLY code; 12 verbs, each one external effect).
- `client-b6/` — the B6 client config docs (template, icp, positioning, assets).

## The code you operate + may improve
Under `/agent/connectors` (jwout), `/agent/skills` (the outreach-* procedures),
`/agent/clients` ($client config). Obey THE ONE LAW when you change anything.
