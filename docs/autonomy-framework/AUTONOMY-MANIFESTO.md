# The Autonomy Manifesto

Two layers, per the house rule: the felt version that recruits, the typed version that
survives scrutiny. Part I is Isaac verbatim (2026-06-12, unedited). Part II is the academic
restatement. Part III binds the new terms into the lore↔mechanism glossary and maps the
manifesto onto the current build.

---

## Part I — Verbatim (Isaac, 2026-06-12)

> A) We are envisioning a world where doing work means prompting an SOP that self-improves (in a sense)
>
> * what does self-improvement mean here? It means that there is an *observer/prompter (ie i guess that makes it a manager LOL)* of the system, and that that manager is an LLM -- the highest LLM. The "CEO" or *whatever*. It runs *the system* stepwise with the *execute/Controller/user/"board"*. This is a lot of analogies so let me just explain it fully.
>    * In jobworld there is a CEO agent. Why is it a CEO agent? Because its the personal agent of the CEO who is human. BUT if the human is running a business model that is entirely autonomous (AI) except for legal basically, then that agent pretty much is the CEO and the human is the board. However, an even more general way to talk about this would be to understand that there is a Worker System, a Management System, and a Controller (the human). The human is not necessarily the executive over the entire system, they simply control it. They are an executive in the sense that the public sentiment is an executive in a publicly held company. Not in some more direct way, because the system is highly highly autonomous and "self-modifies" to "self-improve" (the management system modifies the worker system, so it's hierarchical, not literally self-modifying per agent).
>       * These have all jsut been a lot of caveats because I wanna make sure we are able to speak about this correctly with each other.
>    * So, we are envisioning this type of near-future where *we have a program that is this in a box*. And we are envisioning what Avi's running this company will look like and working backwards from there.
>
> B) There are grades of autonomy:
>
> Shield 1:[
> Grade 1 - There are some things Avi wants to review, and he reviews them and accepts/rejects and the management system improves/configures the worker system. (think of improvement as just changing config knobs, we dont need to get hyphy). This looks like "Avi runs this entire workflow just like 2 years ago we wouldve chatted with claude (he 'executive-in-vibes' his business i guess like executive in charge hehe...).  He does most things *but does them by opening the agent system*."
>
> Grade 2 - The agent system is starting to get customized fully (he is completing his annealing of phases of the workflow) and turning into routines/schedules that Avi *reviews* after the fact instead of beforehand as a gate.
>
> Grade 3 - The system is fully booted to the intended degree of autonomy and is ready to be abstracted into a more refined version of the architecture design it came from.
> ]
> ---split actually here---
> Branch 1)
> Shield 2a:[
> Grade 4 - The *same process but now applied to itself*: Can the system compile *itself* getting better by fully replacing the controller system of the first 3 grades, which we can call shield 1?
> ]
> Branch 2)
> Shield 2b:[
> Grade 4 - What else can it be extended into/bridged onto? -> that substrate must travel via shield 1 to reach the target (ie we compile it the same way we did shield 1)
> ]

---

## Part II — The academic restatement

### II.1 Thesis

Work is reorganized as the **invocation of executable standard operating procedures under
graded human oversight**. An SOP here is not a document but a typed, inspectable process
program (concretely: a `Chain` of `Link`s with explicit pause/resume semantics). "Doing work"
means parameterizing and invoking such a procedure; the procedure's quality improves over time
because a supervisory layer adapts its configuration from outcome feedback.

**"Self-improvement" is strictly bounded**, and the bound is the load-bearing claim:

1. Adaptation is **hierarchical, not reflexive at the component level**. A supervisory layer
   modifies the configuration of an execution layer. No component rewrites itself.
2. Adaptation operates over a **bounded configuration space** — prompts, schedules, parameters,
   gate placement ("config knobs") — not open-ended code self-modification. This keeps every
   adaptation auditable, diffable, and reversible.

In control-theoretic terms this is **supervisory/adaptive control** of a plant by a controller,
not self-modifying code. The phrase "self-improving system" is shorthand for *closed-loop
configuration adaptation in a hierarchical control architecture*.

### II.2 The three-role architecture

| Role (manifesto) | Rigorous binding | Function |
|---|---|---|
| **Worker System** | the **plant** (control theory); operations — System 1 in Beer's Viable System Model | Executes tasks: agent steps and deterministic steps composing the SOPs |
| **Management System** | the **supervisory controller** (Sheridan); adaptation/optimization — VSM Systems 3–4 | An LLM-based controller that observes execution, evaluates outcomes against acceptance criteria, and adjusts worker configuration. Runs the system stepwise |
| **Controller (human)** | the **governor / principal**; policy & identity — VSM System 5 | Holds objectives, accept/reject authority, and legal accountability. Exercises *governance*, not *management* |

The governance/management distinction is the classical separation of ownership and control
(Fama & Jensen 1983): the human does not operate the machinery; the human is the source of the
**acceptance signal** — the system's effective objective function — the way shareholder
sentiment governs a public company without managing it. The architecture as a whole is
organizational cybernetics in the lineage of Beer's *Brain of the Firm* (1972), with the
observer-inside-the-system stance of second-order cybernetics (von Foerster).

**Why "CEO agent" is a transitional name.** In JobWorld the CEO agent is the human CEO's
personal agent. As autonomy increases, the agent absorbs the executive function and the human's
role contracts to governance — "the human becomes the board." The role names that survive this
transition are the general ones: worker / management / controller.

**The product thesis.** Package the triad as a deployable unit — *an autonomous-organization
runtime in a box*. **Method: backcasting** (Robinson 1982): fix the concrete end state (Avi
operating his company through this system) and derive the build sequence backwards from it.

### II.3 The autonomy ladder

**Definitions.**

- A **grade** is a *state of oversight*, not a capability level: it specifies where the human
  sits relative to execution (in-the-loop → on-the-loop → at-design-intent).
- A **shield** is one complete **oversight envelope**: a full traversal of grades 1→3 applied
  to exactly one target system. (The name is apt: the envelope of human gates is what contains
  the system while trust is being established.)
- **Annealing** is the staged-trust mechanism: workflow phases are individually "cooled" from
  high-supervision states into stable routines as their configurations stop changing —
  promotion is **per-phase, evidence-based, and reversible**. (The metaphor is from annealing
  schedules in optimization: supervision temperature decreases as configuration variance does.)
  **Generalized in Amendment 4** (after recon found the term used three ways in the code):
  **annealing := relaxation of a system to a fixed point of its own update operator.** This
  manifesto-sense is the *trust-annealing* species (state space = oversight/config); RALPH is
  *artifact-annealing*; Bandit/golden-chains is *config-annealing*. Same genus, "a fresh pass
  changes nothing" is the shared convergence test.

**Shield 1 — the primary traversal.**

| Grade | Oversight state | Rigorous binding | Operational form |
|---|---|---|---|
| **1** | Human-in-the-loop | Pre-execution approval gates (management-by-exception is not yet permitted) | The human operates the workflow *through* the agent system — the chat-as-work pattern. Accept/reject at gates; the management layer converts each verdict into configuration changes. Implementation: `AWAITING_INPUT` links |
| **2** | Human-on-the-loop | Post-hoc audit replaces pre-execution gating, per phase | Annealed phases become scheduled routines (calendar entries); the human reviews outcomes after the fact. The gate→audit promotion is the unit of progress |
| **3** | At design intent | The system runs at its *intended* degree of autonomy (which need not be full autonomy — the intent is a design parameter, set by the governor) | The proven instance is then **abstracted**: its structure is extracted as a refined architecture pattern (instance → pattern), closing the loop back to design |

This ladder is a domain-specific instance of the levels-of-automation tradition (Sheridan &
Verplank 1978; Parasuraman, Sheridan & Wickens 2000; structurally analogous to SAE J3016's
graded driving autonomy): autonomy is not a switch but a sequence of bounded delegations, each
earned by demonstrated performance under the previous level of supervision.

**The grade-4 split — two branches, one rule.** Both branches are "the next traversal"; they
differ in target:

- **Shield 2a (the reflexive branch).** Apply the compilation process *to the oversight
  machinery itself*: can the promotion apparatus of shield 1 — the system that decided when
  phases anneal, what config changes follow an accept/reject, when gates become audits — be
  compiled and operated by the system? This is **bootstrapping in the compiler sense**: the
  compiler compiling itself. Precision note (disambiguating the verbatim): what gets replaced
  is the *promotion machinery* of grades 1–3, **not the human governor** — the governance role
  (objectives, acceptance criteria, legal accountability) persists at every grade by
  construction.
- **Shield 2b (the extension branch).** Bridge the system onto a new substrate — a new domain,
  business function, or external system. Governing rule: **every new substrate must traverse
  shield 1**. Autonomy grades are domain-specific and non-transferable; a system fully
  autonomous in one domain enters a new domain at grade 1.

That last rule is the safety core of the whole manifesto, and it deserves to be stated as a
principle:

> **The non-transferability principle.** Trust is earned per-domain through graded oversight
> and is never inherited across domains. There is no global autonomy level — only a portfolio
> of per-domain grades.
>
> *(Amended same day: the principle is **preserved but lifted** once shield 2a completes —
> see Amendment 1. Domain trust still never transfers; what changes is who executes the
> trust-establishment procedure.)*

### II.4 What this is *not* (boundary claims, for the skeptical reader)

- Not recursive self-improvement in the strong sense: adaptation is hierarchical, bounded to a
  configuration space, and human-gated until promotion.
- Not human replacement: the governor role is structural and persists at every grade; what
  changes is the *granularity* of human attention (per-action → per-batch → per-policy).
- Not a claim of emergent generality: shield 2b explicitly denies cross-domain transfer; each
  extension is recompiled through the full oversight envelope.

---

## Part III — Glossary bindings and the current build

### New lore↔mechanism rows (folded into LORE-MECHANISM-GLOSSARY.md)

| Lore term | Mechanism term |
|---|---|
| Worker / Management / Controller | plant / supervisory controller / governor (hierarchical supervisory control; VSM S1 / S3–4 / S5) |
| shield | oversight envelope — one complete traversal of the graded-autonomy ladder applied to one target system |
| grade | oversight state: human-in-the-loop → human-on-the-loop → at-design-intent (Sheridan–Verplank lineage) |
| annealing (of workflow phases) | staged trust promotion: per-phase, evidence-based, reversible gate→audit transitions |
| "self-improves (in a sense)" | closed-loop configuration adaptation, hierarchical, over a bounded config space |
| "the system compiles itself" (shield 2a) | bootstrapping (compiler-compiling-compiler); target = the promotion machinery, never the governor |

### Mapping onto what we are building right now

| Manifesto element | Concrete artifact |
|---|---|
| The SOP | the B6 chain: `Chain` of `Link`s (plain + SDNAC/claude-agent-sdk agents) |
| Grade 1 gates | the two `AWAITING_INPUT` links (Avi approves target list; Avi approves draft batch) |
| Management System v0 | the `EvalChain` loop (draft → deterministic lint → revise) + the config deltas applied after Avi's verdicts |
| Grade 1→2 promotion | a gate becomes a Calendar `CronAutomation` + a post-hoc dashboard entry (JobWorld day cycle / event log = the audit surface) |
| Grade 3 abstraction | PromptWorld's `compile-a-world`: extract "OutreachWorld" as a named pattern |
| Shield 2a | the meta-compiler pointed at the promotion machinery itself |
| Shield 2b | every next venture (Stillpoint, the JW×PW merge worlds) enters at grade 1 |

### References (anchors, not exhaustive)

- Sheridan, T.B. & Verplank, W.L. (1978). *Human and Computer Control of Undersea
  Teleoperators.* MIT Man-Machine Systems Lab. (The original levels-of-automation ladder.)
- Parasuraman, R., Sheridan, T.B., & Wickens, C.D. (2000). "A Model for Types and Levels of
  Human Interaction with Automation." *IEEE Trans. SMC — Part A*, 30(3).
- Beer, S. (1972). *Brain of the Firm.* (Viable System Model: operations / adaptation / policy.)
- Fama, E. & Jensen, M. (1983). "Separation of Ownership and Control." *J. Law & Economics.*
- von Foerster, H. (1974+). Second-order cybernetics (the observer inside the observed system).
- Robinson, J. (1982). "Energy backcasting." *Energy Policy*, 10(4). (Working backwards from a
  fixed end state.)
- SAE J3016. *Levels of Driving Automation.* (Structural analogue for graded autonomy.)

---

## Amendment 1 — The post-self-hosting regime (Isaac, 2026-06-12, same day)

### A1.I Verbatim

> right well thats true until you finish shield 2a one time though because once that happens
> you open up another adjacent system i think which is able to compile compile the approximate
> human system that trains the shield 1 system.
>
> Because the shield 2 system generalizes and once it does the resultant output of its compiler
> is that it outputs the entire shield 1 system approximately and the human oversees it as a
> shield 1 activity... you see what im saying? it is like... higher order human capability
> (has better AI system), so therefore the way it works for them is entirely different. They
> dont have to keep doing shield 1, they now *oversee shield 1 like they do at shield 2* and
> literally never have to do anything in shield 1 ever again unless it's something an AI
> *cannot conceivably do*.
>
> That's the difference i think. But that's *later*. It's worth getting this straight. I didnt
> explain this well. It's this certain phenomenon that happens when you move up in system orders.

### A1.II Academic restatement

**The trigger: self-hosting.** Completing shield 2a *once* changes the system's kind, not just
its degree. In compiler terms, the system becomes **self-hosting**: the apparatus that
establishes trust (gates, evaluators, promotion rules — the shield-1 machinery) can now be
*emitted by the system* rather than hand-built. From that point, shield 2b extensions stop
being hand traversals and become **cross-compilations**: for each new domain, the compiler
outputs an *approximate* shield-1 system for that domain — gates pre-placed, evaluators
pre-staffed, promotion criteria pre-drafted — and the human oversees that emission and its
early operation from one level up.

**Where the "approximate human system" comes from (the non-mystical reading).** The first
hand-run traversal of shield 1 produces data exhaust: every accept/reject verdict with its
context, every config delta the management system applied in response. That corpus is a
training/specification set for a **learned acceptance model** — an approximation of the
governor's object-level judgment (structurally the same move as a reward model approximating
human preference). "Compile the approximate human system that trains the shield 1 system"
parses cleanly as: *fit the governor's acceptance function from the traversal-one verdict
history, and install the fit as the default gate-staffing for traversal N*. The human retains
meta-level veto over the approximation; the approximation handles the object level.

**The principle survives — lifted, not violated.** Domain trust is *still* earned per-domain
through a full shield-1 traversal; nothing about non-transferability breaks. What changes is
the division of labor inside the traversal:

| | Pre-self-hosting (traversal 1) | Post-self-hosting (traversal N) |
|---|---|---|
| Who builds the shield-1 apparatus | human + management system, by hand | the compiler, emitted per-domain |
| Who runs the gates | the human, verdict by verdict | the learned acceptance model |
| What the human oversees | phases *within* a traversal | traversals *as objects* |
| Human's unit of action | accept/reject a draft | accept/reject a generated oversight envelope |
| Human's residual object-level work | most of it | the irreducible exception set — tasks an AI *cannot conceivably do* (management-by-exception at the frontier) |

What transfers across domains is therefore not *trust* but the **trust-establishment
procedure** — meta-level transfer (learning-to-learn: Thrun & Pratt 1998), which is precisely
the thing the non-transferability principle never prohibited.

**The phenomenon has a canonical name.** "What happens when you move up in system orders" is
Valentin Turchin's **metasystem transition** (*The Phenomenon of Science*, 1977): when
activities that were object-level become integrated under a new layer of control, a genuinely
new level emerges, and the controller's work changes in kind, not merely in quantity. The
human's experience of "higher order capability — the way it works for them is entirely
different" is the standard signature of an MST. Its enabling mechanism is Ashby's
**amplification of regulation** (*An Introduction to Cybernetics*, 1956): a fixed-variety
regulator (one human) can govern arbitrarily large systems only by delegating
variety-absorption down a hierarchy of regulators — which is exactly what emitting shield-1
apparatuses per-domain does.

**Boundary claims, updated.**
- The governor still persists at every grade and every order; what shrinks is the *granularity*
  of object-level attention (per-action → per-batch → per-policy → **per-envelope**).
- The acceptance model is an *approximation* under standing meta-level veto — drift between
  the model and the governor's actual preferences is the new failure mode to instrument
  (the post-self-hosting analogue of a bounced email: an approved thing the human would have
  rejected). Audit the approximator the way grade 2 audits the workers.
- Status: **later** (Isaac's word). This amendment defines the regime so we recognize it when
  we arrive; it changes nothing about shield 1, traversal one, which remains hand-run for Avi.

### A1 references

- Turchin, V. (1977). *The Phenomenon of Science.* (Metasystem transition.)
- Ashby, W.R. (1956). *An Introduction to Cybernetics.* (Requisite variety; amplification of
  regulation.)
- Thrun, S. & Pratt, L. (1998). *Learning to Learn.* (Meta-level transfer.)
- Smith, B.C. (1984). "Reflection and Semantics in a Procedural Language." (Reflective towers —
  levels that run levels.)
- Self-hosting / cross-compilation: standard compiler-construction concepts (a compiler that
  compiles itself; a compiler that emits systems for targets other than its own).

---

## Amendment 2 — The record-theoretic mechanism (why shield 2a is possible at all)

### A2.I Verbatim (Isaac, 2026-06-12)

> the forward chain system (the agent is driving) produces meta-information (just information
> about itself, we can *observe it*) that is detectable and can become record data. Recorders
> detect it with sensors and have a logging system. The backward chain system that makes the
> forward chain configurations is itself automatable during forward chaining if the records are
> sensed and recorded, and forward chains of semantic input generators (detecting fillables and
> filling them contextually) occur for all the processes in the pathway synthesizing the forward
> chain configuration from the backward chain process happening implicitly in the foremost
> forward chain (the one that the agent is actually "chaining" from their perspective/driving).
> The degree to which this can be fully automated depends on how many records must come from an
> external system

### A2.II Academic restatement

**Setting.** "Forward chain" and "backward chain" are used here in their canonical
production-system senses (Russell & Norvig): **forward chaining** is data-driven execution —
running the chain from inputs toward outcomes (the agent driving the SOP); **backward chaining**
is goal-driven derivation — starting from a goal and deriving what configuration would achieve
it (the *design* of the chain). The backward chain system is therefore the configuration
process: the thing that decides which links, which configs, which gates.

**Claim, decomposed into four steps:**

**(1) Execution is self-describing.** A running forward chain emits *meta-information* —
information about itself: which link ran, with what configuration, what context flowed in and
out, what succeeded and failed. The rigorous term is **provenance** (W3C PROV-DM) or the
**execution trace**. This is observable in principle; **instrumentation** (recorders with
sensors + a logging system) reifies it into durable **records**. Concretely in our stack: hook
events, the event log, JSONL transcripts, `LinkResult` contexts.

**(2) The design process is latent in the trace.** While the operator drives the *foremost*
forward chain (the one they experience themselves as driving), they are continuously performing
implicit backward chaining — goal-driven micro-decisions about what comes next and how it
should be configured. Those decisions leave footprints in the records. Recovering an explicit
process model from execution records is an established discipline: **process mining /
process discovery** (van der Aalst) — its founding claim is precisely that workflow models can
be extracted from event logs. So the backward chain system does not need to be specified from
scratch: it can be *mined* from instrumented forward execution.

**(3) Synthesis is contextual slot-filling — and it is itself made of chains.** A chain
configuration is a frame with **slots** ("fillables" — concretely, `LinkConfig` fields and
`{variable}` template holes; the canonical lineage is Minsky's frames-and-slot-fillers, 1974).
A "semantic input generator" is a **contextual slot-filler**: a process that detects an unbound
slot and derives its filler from recorded context. Isaac's claim is that the entire synthesis
pathway — from records to a new forward-chain configuration — is composed of forward chains of
such slot-fillers. This is the homoiconic payoff: the design process, once recovered, is
expressed in the *same ontology* as the work (`chain_ontology` already has the type — a
**`Compiler`** is exactly "a Chain whose output is a Link"). No new kind of machinery is
needed; the tower is chains all the way up.

**(4) The automation ceiling is an observability bound.** Synthesis is fully automatable iff
every slot's filler is derivable from *internal* records. Formally: let a configuration C have
slot set S(C); partition the information sources of fillers into internal records **R**
(captured by the system's sensors) and external sources **E** (uncaptured: the human's head,
third-party systems that emit no records). Then

> **automation degree(C) = |S_R(C)| / |S(C)|** — the fraction of slots groundable in internal
> records.

Full automation requires **observational closure** (every needed filler grounded in R — the
process-mining notion of log completeness; in control terms, Kalman observability: internal
state inferable from outputs). The two levers for raising the ceiling are therefore: extend the
sensor envelope (convert E into R), or redesign configurations to need fewer E-grounded slots.
The E-grounded residue is the same irreducible human set identified in Amendment 1 — this bound
is *why* that set exists.

**Relation to Amendments 0–1.** This is the mechanism underneath shield 2a. Amendment 1's
learned acceptance model is the special case where the mined records are the governor's
accept/reject verdicts; Amendment 2 generalizes: *the entire backward-chain (design) process*
is recoverable from records, to the degree the traversal is instrumented. Practical corollary,
restated from A1 with more force: **shield 1, traversal one, must be instrumented as if the
records were the product — because for shield 2a, they are.**

### A2 references

- van der Aalst, W.M.P. (2016). *Process Mining: Data Science in Action.* (Process discovery
  from event logs.)
- W3C (2013). *PROV-DM: The PROV Data Model.* (Provenance as first-class records.)
- Minsky, M. (1974). "A Framework for Representing Knowledge." (Frames, slots, fillers.)
- Russell, S. & Norvig, P. *AIMA.* (Forward vs. backward chaining in production systems.)
- Kalman, R.E. (1960). (Observability: inferring internal state from outputs.)

---

## Amendment 3 — The categorical/staging formulation (2026-06-12)

Naming correction first: **"Spec" here means the category of program specifications**
(LinkConfigs, chain specs, templates-with-holes) — not the algebraic-geometry `Spec`. The
collision was accidental and changes nothing in the analysis, which targeted program
specifications throughout.

### A3.1 Accepted verdict on the duality question

Not a duality (contravariant equivalence fails structurally: one spec ↔ many implementations,
one execution ↔ many abstractions). It is an **adjunction / Galois connection**:
abstraction α : Exec → Spec (Amendment 2's mining) ⊣ concretization γ : Spec → Exec
(compilation), i.e. abstract interpretation (Cousot). Duality is recovered exactly on the
**closure fixpoints** (γ∘α-closed: specs as tight as their behaviors, behaviors as loose as
their specs). The adjunction is better than the duality anyway: it supplies both maps *plus*
the error term measuring how far any given spec/execution pair is from the fixpoint.

Standing design obligations this imposes:
1. **Type the contexts** (see A3.2) so Exec is a genuine many-object category, not a monoid.
2. **Choose Spec's morphisms** — substitutions (slot-fillings) first; refinements as the second
   axis; possibly a double category if both are needed. Until chosen, "the category Spec" is
   a name, not an object.
3. **Keep compilation functorial**: ⟦S₁;S₂⟧ = ⟦S₁⟧;⟦S₂⟧ — already true by construction in
   `chain_ontology`/`Calendar`; enforce as an invariant.

### A3.2 Typed contexts (answer to "wdym untyped vs typed")

As implemented, `Link.execute(context: Dict[str, Any]) → Dict[str, Any]`: every link maps the
same amorphous type to itself. Consequences: any link composes with any link (nothing is
ill-typed at build time); all errors are runtime errors (KeyError-shaped); categorically there
is **one object**, so Exec degenerates to a monoid.

**Typed** means: each Link declares what its context must contain and what it adds —
`Link : A → B` where A, B are context schemas (concretely pydantic models / TypedDicts; the
`metastack` / pydantic-stack work is the natural substrate). Because contexts *accumulate*
keys, the right discipline is **row typing**: a link is typed by (requires, provides) — "needs
at least these keys, adds these" — with width subtyping. What this buys, in ascending order:

1. **Build-time validation**: a miscomposed chain fails at compile, not mid-run.
2. **Exec becomes a real category**: objects = context schemas, morphisms = links.
3. **Slots become typed holes**: a spec with unfilled slots is literally a morphism awaiting
   precomposition; slot-filling = composition in Spec.
4. **Type-directed synthesis** — the big one: backward chaining becomes *search over typed
   paths* ("find a chain from schema A to schema B"), i.e. the configuration process becomes
   mechanizable as proof search. Typing is what turns Amendment 2's mining from heuristic into
   algorithm.
5. **Typed records**: the provenance stream gets schemas for free, which is what the learned
   acceptance model trains against.

### A3.3 Grades are handlers (the load-bearing theorem-shape)

A chain with human gates is a program in a free monad over two signatures: the links, plus an
algebraic effect `await_verdict : Query ⇝ Verdict` (Plotkin–Power 2002; Plotkin–Pretnar 2009).
The program calls the operation; **a handler answers it**:

| Grade | Handler for `await_verdict` |
|---|---|
| 1 | the human governor, synchronously (blocking gate) |
| 2 | an auto-approve-and-log handler routing to post-hoc audit |
| post-2a | the learned acceptance model, under standing human veto |

**The autonomy ladder never touches the program.** Annealing = handler substitution.
Shield 2a = synthesizing a handler from the operation's recorded call-history.
(`AWAITING_INPUT` + `resume_path` in `chain_ontology` is precisely the free-monad suspension
this requires.)

### A3.4 The ladder is a Futamura tower with an inductive mix (Isaac's identification)

Verbatim (Isaac, 2026-06-12):

> So its a futamura tower of progressively self-automating handlers, when you consider the
> human as part of the program (and you can do this with quoting you just quote the human and
> build this system????? this is all just CS 101...)

Assessment: **correct as structure, with one named disanalogy.**

The mapping. Futamura's projections concern a specializer `mix` (partial evaluator):
specializing a program with respect to the part of its input that is known. Here, the
"dynamic input" being specialized away is the governor-handler's behavior:

- **Quoting the human** = Amendment 2's instrumentation: reifying the handler's behavior
  (query, verdict, context) as record data the specializer can treat as static. You cannot
  specialize on what you cannot represent; the recorder is the quotation mechanism. (This is
  the eval/quote half of homoiconicity doing real work, hence "CS 101" — staging.)
- **1st projection ≈ annealing one phase**: specialize the chain w.r.t. the now-known verdict
  behavior on that phase → the gate's answer becomes a residual decision procedure; the await
  is staticized away. Grade promotion = a **binding-time shift** (runtime → generation time).
- **2nd projection ≈ shield 2a**: apply the specializer to the promotion machinery itself →
  a *compiler* that turns any domain's traversal-records into handlers/envelopes
  (cross-compilation of oversight, per Amendment 1).
- **3rd projection ≈ the meta-compiler** (`compile-a-world` territory): the generator of
  envelope-generators.

And the bound closes the loop: **Amendment 2's observability bound is a binding-time
analysis** (BTA). Slots groundable in internal records = static (specializable); slots
requiring external sources = dynamic (must remain runtime questions — the irreducible human
set). "Automation degree" = the static fraction BTA reports.

**The disanalogy, stated honestly:** Futamura's `mix` is an *exact* program transformation —
the residual program is semantically equal on fixed inputs. The human is not a program we
possess; we quote a finite *sample* of their behavior. So the tower here runs on an
**inductive specializer**: residuals are statistical fits, and semantic equality is replaced by
(a) fit quality plus (b) the governor's standing meta-level veto plus (c) drift auditing
(Amendment 1). The tower is real; its correctness guarantee is empirical-plus-governed rather
than by-construction. This is the precise sense in which the whole manifesto is "CS 101 plus
one substitution": *Futamura with a learned mix, made safe by keeping the quoted party in the
veto seat.*

### A3 references (additions)

- Plotkin, G. & Power, J. (2002). "Notions of Computation Determine Monads." / Plotkin, G. &
  Pretnar, M. (2009). "Handlers of Algebraic Effects."
- Futamura, Y. (1971). "Partial Evaluation of Computation Process — An Approach to a
  Compiler-Compiler."
- Jones, N., Gomard, C. & Sestoft, P. (1993). *Partial Evaluation and Automatic Program
  Generation.* (mix, binding-time analysis, the projections.)
- Cousot, P. & Cousot, R. (1977). "Abstract Interpretation." (α ⊣ γ.)
- Taha, W. & Sheard, T. (1997+). Multi-stage programming (quote/eval as staging).

---

## Amendment 4 — Theory vs. the existing code (recon 2026-06-12)

*(Editorial note, 2026-06-12, Fable window: two drafts of this amendment existed in this file —
this one, complete, and a partial rewrite titled "Empirical reconciliation: what the code says
back" that truncated mid-edit at an empty A4.3 header at end-of-file. Reconciled by merge: the
second draft's two unique refinements are folded into A4.1 and A4.2 below, marked as such; the
truncated duplicate is removed. No other content was changed.)*

Two Opus agents read the monorepo (full reports: `recon/OBSERVATORY-RECON.md`,
`recon/COMPOCTOPUS-RECON.md`). This amendment records what the code **confirms**, what it
**contradicts**, and the **concrete build targets** the theory implies but the code lacks. The
rule here is honesty over tidiness: where the metaphor and the mechanism diverge, say so.

### A4.1 Confirmed — the recorder layer (Amendment 2) is built

The **observatory** is Amendment 2 in production. Instrumented agent execution → durable,
provenance-tagged, mineable records is not aspirational:
- `record_observation` is the sensor; CartON (Neo4j) is the durable store; every concept
  carries provenance edges (`is_a` / `instantiates Scientific_Method_{phase}` / `part_of`
  investigation / confidence 0–100). That is PROV-style provenance, already typed.
- The **forced invariant tag mapping** (a fixed schema every phase must emit) is a partial
  realization of Amendment 3's *typed records* — the provenance stream has a schema by
  construction, which is exactly what a learned acceptance model would train against.
- "The Chain IS the state machine — Python controls phase transitions" confirms `chain_ontology`
  as the execution backbone in real use, and the Grug execution transcripts (Heaven history
  JSON) are the *execution trace* half of the record, distinct from the CartON *design trace*.

Caveat the recon flagged: the `_meta_observatory.md` vision ("compile its meta-observatory …
without context decay") is the aspirational framing; the shipped `observatory-sdna` is the
concrete recorder. Theory is slightly ahead of code, which is the expected direction.

*Folded from the second draft — two refinements to this item:* (i) records pass through an
explicit **validity/acceptance gate** before they are queryable (per-investigation validity
caches; `query_knowledge` filters invalid concepts) — so α (mining) operates on *validated*
records, not raw exhaust: the acceptance machinery reaches one level down, onto the records
themselves. (ii) **Both trace types from A2 are produced as durable records**: the
design-process trace (typed, provenance-tagged CartON concepts per phase, via the forced
invariant tag mapping — typed records, A3.2 item 5, already real) and the execution trace
(Grug's full Heaven history transcripts) — with CartON as the blackboard between memoryless
phases (the same binding as CybernetiCity).

### A4.2 Confirmed — "grades are handlers" (Amendment 3) is vindicated by multiple live handlers

The accept-verdict effect already has **several handler implementations at different automation
levels**, exactly as the handler-substitution thesis predicts:

| Handler (live) | Where | Automation level |
|---|---|---|
| Human reviews at the ends ("Conductor/user review results externally") | observatory | grade-1-shaped |
| **Validity cache** (`valid_at`/`invalid_at`/`revalidated_at`; `query_knowledge` filters invalid) | observatory | deterministic acceptance handler |
| **Reviewer arm** — LLM judge emitting PASS/FAIL | compoctopus `arms/reviewer` | automated-judge handler |
| **OVP meta-reviewer** — "evaluates research quality and tunes the Researcher" | observatory `run_autoresearch` | the learned/synth handler — **STUB, unbuilt** |

The ladder from human → deterministic → LLM-judge → synthesized handler is *already the shape
of the codebase*. Shield 2a is precisely "build the OVP rung." This is strong evidence the
handler formulation is the right spine: the engineers (you) reached for it independently.

*Folded from the second draft — handlers generalize beyond humans:* the ResearcherChain
**pauses after EXPERIMENT awaiting Grug's callback** and resumes via `resume_path` — the same
suspension mechanic as a human gate, but the handler is an **external system**. The handler
table in A3.3 therefore has three handler kinds, not two: *human governor, learned model,
external service*. One effect calculus covers review gates, model gates, and cross-container
dispatch.

### A4.3 Contradiction to resolve — "annealing" is three different mechanisms

The manifesto (Part II.3) defined **annealing** as *staged trust promotion: gate→audit, as a
phase's configuration stops changing*. The code uses "annealing" for two **other** things, and
neither is that. Naming this collision is the point of the amendment.

| Sense | Mechanism | State space | Convergence test |
|---|---|---|---|
| **Manifesto** ("trust annealing") | gate → post-hoc audit as trust is earned | oversight/config space | config stops changing → promote |
| **Compoctopus-A** (`annealer.py`) | deterministic stub-unwrap (pseudocode → executable) | source text | no stub markers remain |
| **Compoctopus-B** (RALPH) | N **stateless** stochastic runs over shared disk; MoE lottery erases errors | artifact (code on disk) | a fresh run reads state and changes nothing → DONE → PR |

**The genus that unifies them (the real reconciliation, not a paper-over):** all three are
**relaxation to a fixed point** — repeated application of an operator until a pass changes
nothing. They differ only in (operator, state space, convergence test). The manifesto's
annealing is fixed-point iteration in **config-trust space**; RALPH is fixed-point iteration in
**artifact space**; the stub-annealer is a one-shot transform with a structural fixed point.
"A fresh pass changes nothing" is literally the **D:D→D fixed point** of `DESIGN.md`, and it is
the *same stopping criterion* the manifesto's annealing uses ("configurations stop changing").

So the revision to the manifesto: **rename the genus, keep the species.** Define **annealing :=
relaxation of a system to a fixed point of its own update operator**; then *trust-annealing*
(grade promotion), *artifact-annealing* (RALPH), and *config-annealing* (Bandit, below) are
species. This removes the collision without losing anything — and it explains why you used one
word for all of them: you were tracking the genus correctly.

Important correction to the working assumption: **RALPH is not the manifesto's annealing.**
RALPH has no human gate, no trust dimension, no promotion — it is pure artifact convergence. The
manifesto's annealing (config promotion / graduation) is implemented elsewhere: the **Bandit +
golden-chains** layer ("a high-reward config is graduated to a permanent Selection candidate")
*is* config-annealing — a proven config stops changing and gets frozen/promoted. That is
gate→audit in config space, exactly.

### A4.4 Where the theory demands what the code lacks (concrete build targets)

These are the gaps the recon surfaced, read as a to-do list the theory implies:

1. **RALPH has no fixed-point *detector*.** It runs a fixed budget (`n_runs`, default 8) and
   never early-exits on "a pass changed nothing" — the convergence criterion is asserted in the
   docstring, not checked in the loop. The theory (and Amendment 2's observability) *requires*
   the detector: convergence must be *sensed* to be promotable. **Build: an in-loop
   no-op-detection / diff-size stop.** Until then, artifact-annealing is open-loop.
2. **Bandit is not wired into RALPH.** Artifact-annealing (RALPH) and config-annealing
   (Bandit/golden-chains) are two disconnected subsystems. The manifesto's loop *is* their
   connection: an artifact run's outcome should feed the config promotion. **Build: route
   RALPH run outcomes into the Bandit reward table.** This single wire turns two convergence
   mechanisms into one annealing system.
3. **OVP meta-reviewer is a stub.** This is the shield-2a handler — synthesize an acceptance
   handler from the recorded verdict history. The recorder feeding it (validity cache + CartON)
   already exists, so this is the highest-leverage unbuilt rung. **Build: the OVP that mines
   the validity/confidence records into a tuned acceptance handler.**
4. **Typed contexts (Amendment 3) are absent.** Observatory's forced tag mapping is a partial
   typed-record schema, but `Link.execute(context: Dict)` is still untyped end to end —
   so backward chaining cannot yet be type-directed search. **Build: row-typed contexts
   (metastack) so synthesis becomes path-finding, not heuristics.**

### A4.5 Net

The architecture you sketched verbally is ~70% built and the missing 30% is exactly four wires:
a convergence detector, a RALPH→Bandit reward edge, the OVP handler, and typed contexts. None
of them are new engines; all four are the theory's named consequences. The theory is not
decorating the code after the fact — it is *predicting the code's own unbuilt edges*, which is
the strongest evidence available that the formalization is real.

(Recon caveats carried forward: both reports flagged stale tests, aspirational `DESIGN.md`
status, and unverified runtime/container state — see the recon files. Compoctopus "annealing"
is metaphorical, not classical simulated annealing: no temperature schedule, no Metropolis
acceptance, no energy function exists in the code.)

---

## Amendment 5 — Three clarifications (2026-06-12, going slowly)

### A5.1 What gets typed: the Link's boundary, never its filling

The tangle: "typed Links" sounded like typing the *payload* (SDNAC? HermesConfig? function?).
Wrong target. The ecosystem's OOP is "not cleanly joined" — Compoctopus is Link-native,
observatory builds SDNACs through factories and `CompoctopusAgent`, CAVE's Calendar uses
`ConfigLink` + code-pointers — and that heterogeneity is **fine**, because Link is not an
inheritance hierarchy. It is a **protocol / structural interface**: anything with
`name` + `execute(ctx) → LinkResult` is a Link (the chain_ontology docstring already says
SDNAC satisfies the contract by accident of its attributes). Three idioms, one contract.

So the typing discipline has two layers, and only one of them is new work:

1. **Payload — keep it erased.** Once a thing is behind the Link contract, the chain does not
   care whether it is a Python function, an SDNAC turn, a Grug dispatch, or a human gate.
   Payload-erasure is the *feature* that makes handlers interchangeable (A3.3). The only
   payload-level cleanup owed is the **adapter discipline**: everything enters the ontology
   through a thin, named adapter (FunctionLink, SDNACLink, GateLink, DispatchLink), never by
   ad-hoc coding style. The OOP doesn't need joining; the adapters do.
2. **Boundary — type it gradually.** The interface type is the (requires, provides) row over
   context keys (A3.2). And "you progressively type Links as they become higher order things"
   has an exact rigorous home: **gradual typing** (Siek & Taha 2006) — every boundary starts
   at the dynamic type (`Any`), and individual links acquire precise row types as they harden.
   Two consequences worth keeping:
   - **Type inference from records:** the de facto interface (which keys a link actually reads
     and writes) is *mineable from the provenance trace*. Run untyped, observe the key-flow,
     propose the row type, freeze it. Typing is itself an annealing process on the spec side —
     the interface relaxes to its fixed point.
   - **The singleton-chain question:** yes — `Chain([L])` is execution-equivalent to `L`
     (same result; `resume_path` differs by a canonical `[0]` prefix), so in UCO they are
     **equal up to canonical isomorphism, not syntactically identical**. The iso is the useful
     part: wrapping is semantically free, so any Link can be promoted to a Chain to attach
     structure (an evaluator, a gate, a recorder) without changing behavior. That is the formal
     license for "progressively type/structure things as they become higher order." One care:
     `describe()`/Spec sees the wrapper — so spec-identity either quotients by the iso or
     deliberately distinguishes structure. Distinguishing is fine (refinement morphisms relate
     them); just don't expect syntactic equality.

### A5.2 Futamura map corrected (the off-by-one was partly mine)

The question: isn't the **2nd projection = shield 1 grade 3**? No — but the confusion was
fed by A3.4's loose phrase "1st projection ≈ annealing one phase." Tightened map:

Set up the roles properly. The "interpreter" is **OversightInt**: the grade-1 runtime that
executes a chain *by consulting the governor at each gate*. Its dynamic input includes the
stream of verdicts.

| Futamura rung | mix applied to… | Output | Manifesto landmark |
|---|---|---|---|
| 1st projection | OversightInt × (one domain's chain + its verdict corpus) | the **residual autonomous workflow** for that domain — gates replaced by fitted decision procedures | **= completing shield 1 (grade 3's *system*)**. Phase-by-phase annealing is *incremental/online* partial evaluation — one gate staticized at a time |
| 2nd projection | mix × OversightInt | a **domain-general transformer**: feed it any domain's records, get that domain's residual system | **= shield 2a** (the envelope cross-compiler) |
| 3rd projection | mix × mix | the generator of such transformers | ≈ the meta-compiler (`compile-a-world` territory) |

So Isaac's instinct was *half* right: grade 3 **is** a Futamura landmark — it is the completed
**first** projection, not the second. The discriminating test, usable forever: **ask what the
artifact eats.** Grade 3's deliverable eats *task instances* (it is the autonomous workflow,
for one domain). Shield 2a's deliverable eats *domains* (record corpora in, residual systems
out). Generality over domains is the signature of the second projection.

One more precision that resolves the residual pull toward "grade 3 produces a compiler":
grade 3 has **two outputs** — the annealed instance (1st-projection residual) *and* the
extracted pattern ("abstracted into a refined architecture"). The pattern-extraction step is
**not a Futamura projection at all** — projections only specialize; instance→pattern is the
**abstraction arrow α from the adjunction** (Amendment 3). Grade 3 = 1st projection (γ-side)
+ one α step. It *feels* compiler-flavored because of the α step, but α produces a *spec*,
not a transformer.

### A5.3 The General Annealing Protocol (the abstract invariant)

What is invariant across trust-annealing, RALPH, the Bandit, stub-unwrapping, and even gradual
typing — "how to orient an agent such that it engages in an annealing process in general":

> A process is an **annealing process** iff six slots are bound:
> 1. **Object** O — the mutable thing being worked (artifact, config, oversight policy, interface type)
> 2. **Goal shape** G — the mold: requirements, rubric, invariants, type, target predicate (may be partial)
> 3. **Update operator** U — what one pass does to O
> 4. **Gauge** g — the *internal* self-assessment of O against G (tests, lint, confidence, or just the agent's own judgment)
> 5. **Trace** R — durable records of (deltas, gauge readings, decisions), externally readable
> 6. **Handler** H — the *external* acceptance authority that consumes R and issues verdicts (merge / reject / revise), with power to stop or promote
>
> Dynamics: iterate U; the gauge detects the fixed point (a pass changes nothing / gauge
> saturates); the trace makes the run legible; **the handler's acceptance is what makes a
> fixed point count** — without H, convergence is indistinguishable from stagnation.

Call a chain **anneal-complete** when all six slots are bound. This is a lintable invariant in
the style of Compoctopus's geometric validator — a 6-point checklist against any chain config.

The two principles the schema enforces:
- **Gauge ≠ Handler.** g is advisory and internal (self-judgment is fine *for convergence
  detection*); H is authoritative and external (self-judgment is never acceptance). JobWorld
  already encodes this in its task ontology: **`supposedly_done` is exactly "gauge-passed,
  handler-pending."** The state machine knew before the theory did.
- **No R, no H.** A handler can only handle what it can read (Amendment 2). An agent without a
  trace cannot be externally annealed — only believed.

Instantiation table:

| Process | O | G | U | g | R | H |
|---|---|---|---|---|---|---|
| RALPH (= the SDLC, as Isaac says: work → PR → review → merge\|reject) | code in worktree | plan/requirements | one fresh SDNAC run | TDD green + codenose clean + "DONE" self-call | git history, run log, the PR diff | human PR review (merge\|reject) |
| Bandit / golden chains | pipeline config choice | task family served well | construct + run an arm | Reviewer arm PASS/FAIL | reward table | graduation rule (→ golden chain) |
| Trust-annealing (the manifesto's) | oversight policy for a phase | "intended degree of autonomy" | one gated execution + config delta | error/drift rate | verdict log (validity cache) | the governor |
| Stub-annealing (`annealer.py`) | source text | no stub markers | unwrap pass | structural scan | file diff | (degenerate: deterministic, H = the type/compile check) |
| Gradual typing of Links (A5.1) | a Link's interface | precise row type | mine observed key-flow, propose row | proposal matches all recorded traffic | provenance trace | maintainer freezes the row |

RALPH's missing wire (A4.4 #1) restated in protocol terms: its g exists per-run but the *loop*
never consumes g — so the fixed point is not detected, only budgeted. Anneal-complete minus
the gauge-to-loop edge.

### A5 references (additions)

- Siek, J. & Taha, W. (2006). "Gradual Typing for Functional Languages." (Progressive typing
  with a dynamic type.)

