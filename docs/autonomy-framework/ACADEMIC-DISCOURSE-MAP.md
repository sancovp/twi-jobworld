# Academic Discourse Map

The navigation layer. The [manifesto](AUTONOMY-MANIFESTO.md) is the theory (chronological,
amendments 0–5); the [glossary](LORE-MECHANISM-GLOSSARY.md) is lore↔mechanism word-pairs; **this
file is organized by discourse community** — so for any room of experts you can find which field
owns each idea, the anchor citation, the exact term to say, the line to open with, and the trap
that gets you pattern-matched to something you didn't say.

Rule for using it: **getting lost = saying the right idea in the wrong room's vocabulary.** Find
the room first, then speak its dialect.

---

## 0. The one-sentence anchor (memorize this; it is bulletproof in any technical room)

> A **self-adaptive software system** with a **MAPE-K control loop**, under **graded
> human-on-the-loop oversight**, that drives **agentic execution chains** and **mines its own
> execution records** to adapt their configuration.

Every clause is a real field with a real literature. None of it triggers an AGI-grandiosity
alarm. If you say only this and stop, you have not gotten lost.

---

## 1. THE KEYSTONE — Autonomic computing & self-adaptive systems

This is the field you have been describing all day without naming, and it is the single most
important entry in this file. Your "Management System modifies the Worker System to self-improve"
is **not** a novel concept needing defense — it is the founding premise of a 20-year research
program.

- **Owns:** the Management/Worker relationship; "self-improvement"; the whole grade-2 routine layer.
- **Anchors:** Kephart & Chess (2003), "The Vision of Autonomic Computing," *IEEE Computer* (the
  **MAPE-K** loop). Cheng et al. (2009), "Software Engineering for Self-Adaptive Systems: A
  Research Roadmap" (the SEAMS community). Garlan et al. (2004), Rainbow framework.
- **MAPE-K maps onto your architecture almost exactly:**

  | MAPE-K element | Your system |
  |---|---|
  | **M**onitor | the observatory / recorder layer (sensors → records) |
  | **A**nalyze | process-mining the records; the gauge |
  | **P**lan | backward-chain config synthesis (Management System deciding config deltas) |
  | **E**xecute | applying the config change to the Worker System |
  | **K**nowledge | CartON, the validity cache, the trace |

- **Say:** "self-adaptive system," "MAPE-K feedback loop," "managed/managing subsystem,"
  "self-configuring / self-optimizing / self-healing / self-protecting" (the autonomic "self-*"
  properties — and note they map cleanly: config knobs = self-configuring, annealing =
  self-optimizing, RALPH error-erasure = self-healing, guardrails = self-protecting).
- **Opening line:** "It's a self-adaptive system — a MAPE-K loop where the managing subsystem
  reconfigures the managed subsystem — with a human kept on the loop at a configurable level."
- **Trap:** do **not** say "self-improving" or "self-modifying" cold. To an ML-safety or AGI
  audience those phrases mean *recursive self-improvement* (Good 1965, Yudkowsky seed-AI) and you
  will instantly be discussing something you are not building. "Self-adaptive (MAPE-K)" is the
  same idea with zero alarm. This is the exact "pattern-matched to topics I'm not raising"
  failure from the start of the project — and this row is its cure.

---

## 2. Cybernetics & control theory — the triad and the governor

- **Owns:** Worker / Management / Controller; "the human is the board"; the gate.
- **Anchors:** Beer (1972) *Brain of the Firm* — the Viable System Model (S1 operations / S3–4
  adaptation / S5 policy = your three roles). Fama & Jensen (1983), "Separation of Ownership and
  Control" (governance ≠ management; the human as governor). von Foerster — second-order
  cybernetics (the observer inside the system). Ashby (1956) — requisite variety.
- **Say:** "hierarchical/supervisory control," "the plant" (Worker), "the governor" (human),
  "regulator," "variety."
- **⚠ THE BIGGEST FORK IN THIS WHOLE FILE — "supervisory control" has two rigorous meanings:**
  - **Sheridan (1978+):** a *human* supervises *automation*. This owns your **grades / oversight
    ladder** (§3).
  - **Ramadge–Wonham (1987):** a *supervisor* controls a *discrete-event system* by disabling
    events. This owns your **gate** — an `AWAITING_INPUT` link is precisely a R–W supervisor
    disabling the "proceed" event until enabled.
  - Using one when you mean the other is a classic get-lost. State which: "Sheridan-supervisory
    for the oversight ladder, Ramadge–Wonham-supervisory for the gates."

---

## 3. Human–automation interaction — the grades

- **Owns:** the grade ladder; human-in-the-loop → on-the-loop; "intended degree of autonomy."
- **Anchors:** Sheridan & Verplank (1978) — the original Levels of Automation. Parasuraman,
  Sheridan & Wickens (2000) — types & levels model. SAE J3016 — graded driving autonomy
  (structural analogue). **Adjustable autonomy** (Scerri, Pynadath & Tambe, ~2002) and **sliding
  autonomy** (Sellner, Simmons et al.) — the robotics/MAS terms for *shifting* a system's
  autonomy level at runtime, which is exactly your grade-promotion.
- **Say:** "levels of automation," "human-in-the-loop / on-the-loop," "adjustable autonomy"
  (this is *your* term for grade-shifting — established, use it).
- **Opening line:** "Autonomy here is a level of automation per Sheridan, and grades are
  adjustable-autonomy transitions, earned per-domain."
- **Trap:** "fully autonomous" — your design *intends* a chosen level (grade 3 ≠ full). Say
  "at its intended level of automation," not "autonomous."

---

## 4. Partial evaluation & metaprogramming — the Futamura tower

- **Owns:** the grade→shield→meta ladder as staged specialization; "quote the human"; binding-time.
- **Anchors:** Futamura (1971), the projections. Jones, Gomard & Sestoft (1993), *Partial
  Evaluation and Automatic Program Generation* (`mix`, binding-time analysis). Taha & Sheard
  (1997+), multi-stage programming (quote/eval as staging).
- **Say:** "partial evaluation," "the Futamura projections," "binding-time analysis" (= your
  observability bound: static slots = internally-grounded, dynamic = external).
- **Map (corrected in Amendment 5):** 1st projection = completed shield-1/grade-3 *system*
  (eats task instances); 2nd = shield 2a (eats domains); 3rd = the meta-compiler. The "what does
  the artifact eat?" test disambiguates rungs.
- **Trap — name it before they do:** `mix` is *exact*; your human-specializer is **inductive**
  (learned from finite trace samples). Always say "Futamura with a *learned* mix; correctness is
  fit + standing veto + drift audit, not by-construction equality." Saying this first marks you
  as having understood the projection rather than vibing the analogy. **Status: novel synthesis,
  defensible, not established** — present it as a framing, not a theorem.

---

## 5. Programming languages: effects & types — "grades are handlers"

- **Owns:** gates as effects; annealing as handler substitution; typed Links.
- **Anchors:** Plotkin & Power (2002); Plotkin & Pretnar (2009) — algebraic effects & handlers
  (languages: Eff, Koka, Frank). Siek & Taha (2006) — gradual typing. Moggi (1991) — monads /
  Kleisli composition (your stop-on-failure chain is Kleisli composition in an exception monad).
- **Say:** "algebraic effect" (`await_verdict`), "handler," "free monad / suspension"
  (`AWAITING_INPUT`+`resume_path`), "gradual typing," "row types (requires/provides)," "Kleisli."
- **Opening line:** "The verdict is an algebraic effect; a grade is a handler for it; the ladder
  substitutes handlers and never touches the program."
- **Trap:** Link is a **structural protocol**, not a base class — type the *boundary* (row type
  over context keys), never the *payload* (function/SDNAC/human stay erased behind it). Don't let
  a PL person think you're proposing a class hierarchy. **Status: the effects framing is novel
  synthesis but on very firm ground — handlers-as-policy is a known pattern.**

---

## 6. Abstract interpretation & order theory — Spec ⇄ Exec

- **Owns:** the spec↔execution relation; mining (α) and compilation (γ).
- **Anchors:** Cousot & Cousot (1977), abstract interpretation (the α ⊣ γ Galois connection).
  Standard order theory for Galois connections / closure operators.
- **Say:** "Galois connection," "abstraction α / concretization γ," "adjunction," "closure
  fixpoints." **Not** "duality" (that's a contravariant *equivalence*, which fails: one spec ↔
  many implementations both ways).
- **Trap / honesty flag:** you have *motivation* that α⊣γ holds, not a *proof* that the connection
  laws hold for your actual operators. **Status: conjecture with strong motivation, not a
  theorem.** Say "I claim it's an adjunction; the laws need checking against the real
  mining/compilation maps." Also: "Spec" = *program specifications*, flagged because it collides
  with algebraic-geometry `Spec` (the prime spectrum). Different thing; say "program spec."

---

## 7. Process mining, provenance & BPM — the recorder and the executable SOP

- **Owns:** the observatory; "instrumented execution → mineable records"; "doing work = invoking
  an SOP."
- **Anchors:** van der Aalst (2016), *Process Mining* (discover process models from event logs —
  the founding claim is *exactly* your Amendment 2). W3C PROV-DM (2013), provenance as
  first-class records. van der Aalst on workflow nets / YAWL, and BPMN for "human task" / gated
  workflows.
- **Say:** "process mining / process discovery," "provenance," "event log," "executable business
  process," "human task / worklist" (BPMN's name for your gate), "conformance checking" (comparing
  a run to its spec — your guardrail lint is conformance checking).
- **Opening line:** "Execution is instrumented; the configuration process is recovered from the
  event log by process mining (van der Aalst); records are PROV-style provenance."
- **Trap:** this is your **strongest credibility anchor** — process mining is mature and
  unimpeachable. Lead with it whenever someone bristles at "the system learns to configure
  itself." No over-claim risk here; use it liberally.

---

## 8. Machine learning from feedback — the learned acceptance model

- **Owns:** "the approximate human system"; the OVP; shield 2a's handler.
- **Anchors:** Christiano et al. (2017), deep RL from human preferences (reward modeling).
  RLHF / preference learning broadly. Active learning (Settles, 2009) — which slots to ask the
  human about. LLM-as-a-judge (Zheng et al., 2023, MT-Bench) — your Reviewer arm.
- **Say:** "reward model / preference model," "learned acceptance function," "LLM-as-a-judge,"
  "human-in-the-loop ML," "distribution shift / drift" (the new failure mode).
- **Trap:** call it a **reward/preference model under standing human veto**, not "the AI replacing
  the human." The governor persists; the model approximates the *object-level* verdict only. Drift
  between model and governor is the audited failure mode — say so unprompted.

---

## 9. Optimization & fixed-point theory — the annealing genus (and the trap that names it)

- **Owns:** the General Annealing Protocol; RALPH; Bandit graduation; convergence.
- **Anchors:** Kleene fixed-point / fixed-point iteration (the genus: relaxation to a fixed point
  of an update operator). Generate-and-test / iterative refinement (the honest name for the loop).
  **CEGIS** — counterexample-guided inductive synthesis (Solar-Lezama, 2008): your
  EvalChain/RALPH-with-a-deterministic-gauge is CEGIS-shaped (generate → check → refine on
  counterexample). Multi-armed bandits (your Bandit layer literally). Kirkpatrick et al. (1983),
  simulated annealing — **cited only as a contrast.**
- **Say:** "fixed-point iteration," "iterative refinement," "generate-and-test," "CEGIS,"
  "convergence."
- **⚠ ANTI-SYCOPHANTIC RECOMMENDATION — retire "annealing" in expert rooms.** Your code uses the
  word three ways and *none* of them is Kirkpatrick simulated annealing (no temperature schedule,
  no Metropolis acceptance, no energy function — both recon agents confirmed this). In a room with
  an optimization person, "annealing" is a live trap: they will expect SA and you will look
  imprecise. Keep "annealing" as **internal lore** (it's all over your code, it's evocative, it's
  fine among yourselves). In expert rooms, lead with the mechanism: "iterative refinement to a
  fixed point" or "generate-and-test convergence." This is the glossary's own thesis applied to
  your favorite word: lead with mechanism, keep the lore name in your pocket. (You won't like
  this; it's still right.)

---

## 10. Systems theory & evolutionary epistemology — "moving up in system orders"

- **Owns:** the metasystem transition; "higher-order human capability"; non-transferability.
- **Anchors:** Turchin (1977), *The Phenomenon of Science* — **metasystem transition** (the exact
  name for "what happens when you move up in system orders"). Ashby (1956) — amplification of
  regulation (one regulator governs a larger system via a hierarchy of regulators). Smith (1984)
  — reflective towers (levels that run levels).
- **Say:** "metasystem transition," "amplification of regulation," "reflective tower."
- **Trap:** these are real and citable — say them confidently. The only risk is reaching for them
  *too early* in a conversation; they're the capstone, not the opener. Lead with §1 (MAPE-K),
  arrive here.

---

## 11. The two-meaning forks (the get-lost landmines, collected)

Words that have a rigorous meaning that is **not** yours. Always disambiguate on first use.

| Word you use | Your meaning | The OTHER rigorous meaning (the trap) |
|---|---|---|
| supervisory control | Sheridan: human over automation (grades) | Ramadge–Wonham: supervisor disabling DES events (gates) — *both apply, to different parts* |
| annealing | relaxation to a fixed point (genus) | Kirkpatrick simulated annealing (you are NOT doing this) |
| Spec | program specification | algebraic-geometry prime spectrum |
| self-improving | self-adaptive (MAPE-K) | recursive self-improvement / seed AI |
| agent | autonomous-agent instance / SDNAC | agent in principal–agent theory; agent in ABM |
| duality | (you meant) a structured correspondence | contravariant equivalence (which is the thing that *fails* — you have an adjunction) |
| evolution | population-based optimization | biological evolution (the original §2 case) |

---

## 12. The novelty ledger (anti-sycophancy — what you can claim, and how hard)

Honesty about standing, so you never over- or under-claim in front of someone who can check.

**Established (cite and lean on — these are not yours, they're the field's):**
- Self-adaptive systems / MAPE-K; levels of automation; VSM; partial evaluation & the Futamura
  projections; algebraic effects & handlers; abstract interpretation (α⊣γ); process mining;
  provenance; reward modeling; CEGIS; metasystem transition; requisite variety; gradual typing.

**Novel synthesis (defensible, but they are *your* compositions — present as framings, invite
challenge):**
- "Grades are handlers; the ladder is handler substitution that never touches the program." (Firm.)
- "The autonomy ladder is a Futamura tower with an *inductive* mix." (Defensible; name the
  disanalogy first.)
- "The General Annealing Protocol — six slots (O, G, U, g, R, H) — unifies trust-annealing,
  RALPH, Bandit, stub-unwrapping, and gradual typing as one fixed-point genus." (Strong; it's a
  schema, lintable, and it predicted RALPH's missing gauge-edge — that predictive hit is your
  best evidence.)
- "supposedly_done = gauge-passed, handler-pending." (Clean; the ontology encoded it first.)

**Conjecture / needs work (say so plainly):**
- Spec⇄Exec is a Galois connection — *motivated, not proven* for your real operators.
- The four missing wires (convergence detector, RALPH→Bandit edge, OVP handler, typed contexts)
  are *predicted* by the theory but *unbuilt* — the theory's purchase on them is evidence, not
  proof, until they're built and the prediction holds.

**Lore / internal only (keep, but don't lead with in expert rooms):**
- "annealing" (retire externally — §9), "shield," "GNOSYS," "CybernetiCity," "Grug,"
  "Dr. BrainBrane," the `.🐙` whimsy. Evocative, load-bearing internally, alarm-prone outside.

---

## 13. How to enter each room (the opening lines, collected)

- **Software engineer / systems:** "A self-adaptive system — MAPE-K loop, managing subsystem
  reconfigures the managed subsystem, human on the loop at a configurable level."
- **PL theorist:** "Chains in a universal Link/Chain ontology; gates are algebraic effects,
  grades are handlers; the autonomy ladder is staged partial evaluation."
- **Control theorist:** "Hierarchical supervisory control — Sheridan-supervisory for the human
  ladder, Ramadge–Wonham-supervisory for the gates; the human is the governor, not the manager."
- **ML researcher:** "Agentic execution with instrumented traces; we mine the configuration
  process (process mining) and fit a preference model for acceptance, under standing human veto."
- **Data / process person:** "Executable SOPs with provenance; process discovery over the event
  log recovers the design process; guardrails are conformance checking."
- **Theorist / big-picture:** "Each autonomy promotion is a metasystem transition; the governor's
  variety is amplified through a hierarchy of regulators."

Lead with the room's line. Add lore only after the frame is set. That ordering *is* the whole
anti-getting-lost method.
