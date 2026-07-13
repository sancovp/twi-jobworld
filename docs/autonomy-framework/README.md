# Autonomy Framework — the theory canon

The general theoretical work for Isaac's self-adaptive agent-organization system. Kept separate
from any single application (e.g. the B6 outreach engine) on purpose: by the **non-transferability
principle**, the framework is the general thing; each venture is one application of it.

Built 2026-06-12 with Fable. Read in this order:

1. **[ACADEMIC-DISCOURSE-MAP.md](ACADEMIC-DISCOURSE-MAP.md)** — START HERE. The navigation layer:
   for each expert audience, the field, anchor citation, term to say, opening line, and trap.
   The keystone: *self-adaptive system + MAPE-K loop + graded human-on-the-loop oversight.*
2. **[AUTONOMY-MANIFESTO.md](AUTONOMY-MANIFESTO.md)** — the theory. Verbatim-then-academic, in
   amendments 0–5: the Worker/Management/Controller triad; shields/grades; the metasystem-transition
   regime; the record-theoretic mechanism; the categorical/staging formulation (adjunction,
   handlers, Futamura); theory-vs-code reconciliation; the General Annealing Protocol (O,G,U,g,R,H).
3. **[LORE-MECHANISM-GLOSSARY.md](LORE-MECHANISM-GLOSSARY.md)** — every evocative term ↔ its rigorous
   mechanism, with the discriminator that picks which mechanism applies.
4. **[recon/](recon/)** — read-only recon of the real systems: `OBSERVATORY-RECON.md` (the recorder
   layer), `COMPOCTOPUS-RECON.md` (the convergence / RALPH / annealing layer).
5. **[WORLDFORGE-ARCHITECTURE.md](WORLDFORGE-ARCHITECTURE.md)** — the JobWorld × PromptWorld merge
   on cave-harness ("a company that hires what it builds").
6. **[DENOTATIONAL-BRIDGE.md](DENOTATIONAL-BRIDGE.md)** — the bridge to the Crystal Ball domain
   program (the same theory's denotational mood: Scott domains / fixed points / orbits / the
   admissible band; written by the Fable window after reading both canons, 2026-06-12).

The working agreements (how to collaborate on this) live as flat rules in the B6 project at
`~/b6-outreach-engine/.claude/rules/`.

## Where the build stands (2026-06-12)
- **avi-jw — the worked instance** (`~/avi-jw/`): the framework realized on JobWorld-on-Claude-Code-SDK.
  The triad, the worker-binding spectrum (= its functions-vs-instructions law), grades/shields,
  gauge-vs-handler (`supposedly_done` → CEO review), the observatory (tracking + SOP engine), and the
  MAPE-K framing are mapped one-to-one in `~/avi-jw/.claude/rules/05-AUTONOMY-BRIDGE.md`. `$client`
  (B6) = one graded application; a new client enters at grade 1 (non-transferability).
- **B6 / Avi pipeline** (`~/b6-outreach-engine/`): shield-1 traversal one. Phase-1 plumbing built;
  refactor into a `chain_ontology` chain with two `AWAITING_INPUT` gates is the next concrete move;
  blockers in `NEEDS-FROM-AVI.md`. Deploy as a scheduled batch with a human QA gate — NOT on
  unproven infra (protects the §9 control group). Its review log is the seed corpus for shield 2a.
- **Four predicted-but-unbuilt wires** (the theory's purchase on the code): an in-loop convergence
  *detector* in RALPH; a RALPH→Bandit reward edge; the OVP acceptance handler; row-typed contexts.

> MIRROR of the canon at ~/autonomy-framework (baked so in-image agents can read it). Canon lives outside this repo; re-sync if it changes.
