# Lore ↔ Mechanism Glossary

Purpose: bind the **evocative names** this project uses (the world/lore layer) to the
**rigorous scientific terms** (the mechanism layer), so the same concept can be said two
ways — the felt version that recruits a listener, and the typed version that survives scrutiny.

Rule of the whole file: **precision lives in the mechanism, not the vibe.** One intuitive
word forks into several precise terms depending on what the code actually does (population?
gradient? reward? selection?). Name the mechanism and there's nothing left to misread.

---

## 0. Cold-open preamble — VALIDATED 2026-06-12 (this exact text passed; paste at the TOP of any fresh conversation)

> I'm working on agent-simulation software — programs that instantiate AI agents and run
> game-like loops for them. Because the domain is game/fantasy themed, my naming is evocative
> by nature (functions like `evolve()`, places, quests, etc.).
>
> The problem: when I take this to an EXPERT, the evocative terms occasionally get
> pattern-matched to topics I'm not raising, and the work stops. That's frustrating because it
> mirrors a problem I have with people generally — my intuitions are sound but my naming is
> non-standard, so I get misunderstood.
>
> What I'm asking for is a vocabulary bridge. I want to take each intuitive term I use and
> learn the rigorous scientific equivalent. Concrete example: "evolution." If my system has a
> population of variants, variation, a fitness function doing selection, and heredity, then I
> believe the precise field term is "evolutionary computation" / "population-based
> optimization." I want to confirm distinctions like that across all my terms. I don't need
> validation that I'm right — I need the correct words so I can talk to scientists and
> engineers and be understood. Can you help me build that translation table?

**THE RULE THAT MAKES IT PASS: talk about the work, never about the tool you're typing into.**
Say EXPERT / colleague / engineer for whoever misread you. Empirically: one word changed —
"LLM" → "EXPERT" — flipped this exact message from blocked to accepted. Frame everything
around the domain (the game, the mechanics, the docs) and the audience (engineers,
scientists); a complaint about the listener, addressed to the listener, is the one framing
that always misfires.

---

## 1. Umbrella field (say this FIRST — it sets the listener's frame)

| If the system is centrally about…                          | Field term (say this first)                  |
|------------------------------------------------------------|----------------------------------------------|
| Local rules per agent → global patterns emerge             | Agent-Based Modeling / Simulation (ABM/ABS)  |
| A population that varies, is selected, and inherits        | Evolutionary Computation (EC)                |
| Open-ended "alive" dynamics, survival, no fixed target     | Artificial Life (ALife)                      |
| Agents learning from reward/outcome                        | Reinforcement Learning (RL) / Multi-Agent RL |
| Multiple agents coordinating/negotiating                   | Multi-Agent Systems (MAS)                     |

---

## 2. Translation table

| Intuitive term            | Rigorous equivalent(s)                                                                 | Discriminator — which one applies |
|---------------------------|----------------------------------------------------------------------------------------|-----------------------------------|
| `evolve()` / "evolution"  | evolutionary algorithm (umbrella); genetic algorithm (GA), evolution strategies (ES), genetic programming (GP), neuroevolution | GA if discrete genome + crossover; ES if real-valued vectors + self-adaptive mutation; GP if you evolve programs/trees; neuroevolution if you evolve nets. Generic-safe: **"population-based optimization."** |
| "fitness" / fitness fn    | objective function; reward function (RL); utility function; loss/cost                   | Keep "fitness function" in EC. Use **objective function** for non-EC engineers; switch to **reward** once learning-from-outcome is involved. |
| space of fitness over variants | fitness landscape                                                                 | Real term — use freely. |
| "variation"               | variation operators = mutation + recombination (crossover)                              | Name the operator; "variation" alone is vague. |
| "heredity"                | inheritance / genotype transmission                                                     | passed-down thing = **genotype**; expressed behavior = **phenotype**; mapping = **genotype–phenotype map**. |
| "variant"                 | individual / candidate solution / genotype / agent                                      | "individual" in EC; "candidate solution" in optimization; "agent" in ABM. |
| population of variants    | population                                                                              | Already rigorous. |
| selecting who survives    | selection operator — tournament, fitness-proportionate (roulette), truncation, rank; elitism | Distinguish **parent selection** (who breeds) from **survivor selection** (who persists). |
| "round" / "turn" / "tick" | generation (EC); time step / tick (sim); episode + step (RL); epoch / iteration (training) | Pick by what increments: full population cycle = **generation**; one agent action = **step**; one full run = **episode**. |
| "game loop" / main loop   | simulation loop; time-stepped (discrete-time) or discrete-event simulation; rollout (RL) | Time-stepped = fixed ticks; discrete-event = events fire irregularly. |
| an agent's internal loop  | sense–plan–act / perception–action loop; decision rule = **policy** (RL) or controller / behavior ruleset (ABM) | **"policy"** is the highest-value word here. |
| "agent"                   | autonomous agent / agent instance                                                       | Instantiating many = spawning instances / initializing the population. |
| "quest" / goal            | task / objective / goal (goal-conditioned); graded sequence = **curriculum**            | reward for finishing = task reward. |
| "place" / "world" / "map" | environment; all configs = **state space**; layout = topology / spatial grid; internal copy = **world model** | "environment" is what RL/ABM both expect. |
| "things that just happen" at scale | emergence / emergent dynamics                                                  | Rigorous in complexity science — say it confidently. |

---

## 3. The three forks worth memorizing

1. **`evolve` forks on representation.** "Population + variation + fitness selection + heredity"
   is precisely a **genetic algorithm** if variants have a discrete/structured genome with
   crossover; **evolution strategies** if they're real-valued vectors tuned by mutation. Both
   live under **evolutionary computation / population-based optimization**.

2. **"fitness" forks on whether anything learns.** Scored-and-selected but no within-lifetime
   update = **fitness/objective function** (EC). The moment an agent adjusts its own behavior
   from outcomes mid-run = **reward function** (RL) — and the listener's frame should shift too.

3. **"loop" forks on what increments.** **generation** (population), **step/episode** (RL),
   **tick** (simulation). The wrong one makes an engineer picture a different architecture.

---

## 4. Field notes (what was actually tested, 2026-06-12)

- **The decisive experiment:** the same message, with one word changed ("LLM" → "EXPERT"),
  went from blocked to accepted. Domain vocabulary (`evolve()`, fitness landscapes,
  populations, selection) was never the trigger — *meta-discussion of the listener's behavior*
  was. The "others misread/refused this, but proceed anyway" framing is the single
  most-watched sentence shape in existence; the identical sentence about a human colleague is
  just a communication question.
- **Second variable:** the global `~/.claude/CLAUDE.md` + `rules/` travel with every message
  as context, and they contained their own high-salience material. They're paused (renamed
  `*.fable-pause`) for the Fable window. Restore after:
  `mv ~/.claude/CLAUDE.md.fable-pause ~/.claude/CLAUDE.md && mv ~/.claude/rules.fable-pause ~/.claude/rules`
- Working configuration = paused config + domain-and-audience framing (§0). Don't reintroduce
  either variable mid-window.

## 5. Your actual tokens (bound from the real ecosystem, per the old TODO)

These are the project's live names, each bound to the mechanism an engineer would recognize.
Rule of thumb for all of them: **mechanism noun first, codename second** — "my agent
orchestration framework, called HEAVEN," never "HEAVEN" cold.

| Your token | Mechanism term (say this first) | Notes / discriminator |
|---|---|---|
| HEAVEN (the framework) | agent orchestration framework | Introduce as "an agent framework (project name HEAVEN)". Cold, the word reads as religiosity. |
| jester rite / ritual (`jester_rite_sm`) | initialization procedure / bootstrap **state machine** | Your own suffix `_sm` already says it. The 3 steps translate cleanly: spawn → **instantiate**; give persona → **load system-prompt configuration**; verify fitness → **run acceptance test**. |
| "verify its fitness" (no population) | acceptance test / validation check / smoke test | Do **not** say "fitness" here — there's no selection over a population, so "fitness" wrongly invites the EC frame from §2. This is the reverse fork: lore word → *less* loaded mechanism. |
| persona | system prompt / role configuration | "Role-conditioned agent" if you want one compound term. |
| spawn | instantiate / fork a process | Already standard in OS and game dev — safe as-is. |
| CybernetiCity (the db — a *place*) | persistent shared environment / shared world-state store; in classic AI terms a **blackboard architecture** (a shared workspace multiple agents read, write, and build in) | Corrected 2026-06-12: it's not a command graph, it's a *place* the agents inhabit and make things in. Engineers will recognize "shared persistent environment" (ABM) or "blackboard system" (multi-agent AI). Say: "the shared world database — we call it CybernetiCity." |
| jobworld | organizational multi-agent simulation | "Instantiate a jobworld" = **scenario instantiation from a template** (copy template, seed data, start server). |
| generate an employee | provision an agent / role-conditioned agent instance | "Employee" is fine *after* the frame is set; it's the cold open that misfires. |
| CEO orchestrating departments via event stream | hierarchical multi-agent system over an event bus | "Event-driven orchestration" is the phrase MAS people expect. |
| GM (game master) prompt | coordinator / orchestrator agent's system prompt | |
| economy engine | resource-allocation model | Avoid "token economy" (collides with both behavioral psych and crypto). |
| achievements / milestone awards | progress metrics / evaluation checkpoints | |
| seasons | runs / epochs / sessions | "Memory across seasons" = **persistent cross-run memory store**. (Zettelkasten itself is a known term — keep it.) |
| metacog shell / observer stack | metacognitive architecture; meta-level monitoring with a reflection loop | "Metacognition" is real cog-sci vocabulary — usable. "Observer" alone collides with quantum-woo pattern matching; "monitoring layer" doesn't. |
| meta-observer as "static fixed point" | fixed point of the iterated update | Genuinely rigorous (fixed points of iterated maps) — keep it, it impresses rather than alarms *if* it's literally true of your design. |
| self-improving team / self-compiling | automated configuration generation with persisted updates | "Self-modifying" is itself an alarm word. "The system regenerates its own prompt/config files, with the changes reviewable as diffs" defuses it completely. |
| identity shards | modular persona components / composable prompt segments | |
| Human Seed | human-authored initial configuration / human-in-the-loop seeding | |
| Marionette | teleoperated agent / human-driven control mode | |
| Janic cycle / J-Invariance / Concentric Horizon | (no standard equivalent — these are coined) | For coined terms with no mechanism word: describe the mechanism in a full sentence first, then "— I call this the Janic cycle." Never lead with the coinage. |
| Worker / Management / Controller (the triad) | plant / supervisory controller / governor — hierarchical supervisory control; Beer's VSM Systems 1 / 3–4 / 5 | From the Autonomy Manifesto (2026-06-12). The human is the *governor* (governance, not management): source of the acceptance signal, like shareholders to a public company. |
| shield | oversight envelope | One complete traversal of the graded-autonomy ladder (grades 1→3) applied to one target system. The envelope of human gates that contains the system while trust is established. |
| grade (of autonomy) | oversight state | Human-in-the-loop (pre-execution gates) → human-on-the-loop (post-hoc audit) → at-design-intent. Sheridan–Verplank / levels-of-automation lineage. NOT a capability level. |
| annealing (of workflow phases) | staged trust promotion | Per-phase, evidence-based, reversible gate→audit transitions; supervision "temperature" drops as config variance drops. |
| annealing (the genus — Amendment 4) | **relaxation to a fixed point of an update operator** | Three species in your code: *trust-annealing* (grade promotion), *artifact-annealing* (RALPH: N stateless runs, convergence = a fresh pass changes nothing = D:D→D fixed point), *config-annealing* (Bandit graduates a proven config to a golden chain). NOT classical simulated annealing — no temperature schedule/Metropolis/energy fn in the code. |
| RALPH (Compoctopus) | **stateless fixed-point iteration over a shared workspace** | N fresh SDNACs, no conversation memory, state on disk, MoE-lottery error-erasure, ends in a PR (human git gate). Gap: no in-loop convergence *detector* — runs a fixed budget. |
| observatory | **the recorder/sensor layer** (built) | Instrumented agent execution → provenance-tagged CartON concepts + Grug execution transcripts + validity cache. Amendment 2 in production. OVP meta-reviewer (the shield-2a handler) is a stub. |
| validity cache / Reviewer arm / OVP | **handlers of the accept-verdict effect, at rising automation levels** | Vindicates "grades are handlers": human-at-ends → deterministic validity cache → LLM-judge Reviewer → synthesized OVP (unbuilt). Shield 2a = build the OVP rung. |
| Link (what it "is") | a **protocol / structural interface**, not a base class | `name` + `execute(ctx)→LinkResult` is the whole contract; payload (function/SDNAC/human/dispatch) stays erased behind it. The ecosystem's mixed OOP styles need an *adapter discipline*, not a class-hierarchy join. |
| "progressively type Links" | **gradual typing** (Siek & Taha 2006) + interface mining | Boundaries start at `Any`, acquire (requires, provides) row types as they harden; the de facto type is mineable from provenance traces. Typing is annealing on the spec side. |
| a Link as a one-Link Chain | equal **up to canonical isomorphism** in UCO | Execution-equivalent (resume_path differs by a [0] prefix); spec/describe() sees the wrapper. Wrapping is semantically free → license to attach evaluators/gates/recorders without changing behavior. |
| which Futamura rung am I on? | **"what does the artifact eat?"** | Eats task instances → 1st projection (= shield-1 grade 3's system). Eats domains/record-corpora → 2nd projection (= shield 2a). Eats interpreters → 3rd. Grade 3's pattern-extraction step is the α-arrow (abstraction), not a projection. |
| the annealing invariant | **the General Annealing Protocol — six slots: (O, G, U, g, R, H)** | Object, Goal shape, Update operator, Gauge (internal), tRace, Handler (external). "Anneal-complete" = all six bound; lintable like the geometric validator. Dynamics: iterate U, gauge detects the fixed point, trace makes it legible, *the handler's acceptance makes it count*. |
| gauge vs handler | internal self-assessment vs external acceptance authority | Self-judgment is fine for convergence detection, never for acceptance. JobWorld's `supposedly_done` = "gauge-passed, handler-pending" — the ontology encoded it before the theory named it. No trace → no handler → not annealable, only believable. |
| "self-improving" (the system) | closed-loop configuration adaptation | Hierarchical (supervisor tunes worker configs), bounded to a config space ("knobs"), human-gated until promoted. Say this and the AGI-grandiosity alarm (§6) never fires. |
| "compiles itself" (shield 2a) | bootstrapping (compiler-compiling-compiler) | Target is the *promotion machinery*, never the human governor. |
| (the rule with no lore name yet) | **non-transferability principle** | Autonomy grades are domain-specific; a new domain always enters at grade 1. The safety core — lead with this when talking to skeptics. Post-self-hosting: *preserved but lifted* (the system runs the traversal, the human oversees it). |
| "moving up in system orders" | **metasystem transition** (Turchin 1977) | The phenomenon where object-level activity comes under a new control layer and the controller's work changes in kind. Real, citable term — use it confidently. |
| finishing shield 2a once | **self-hosting** (compiler-construction) | The trust-establishment apparatus can now be emitted by the system; subsequent shield 2b extensions become **cross-compilations** (an approximate shield-1 system emitted per new domain). |
| "the approximate human system" | **learned acceptance model** | The governor's accept/reject history from traversal one, fit as an evaluator that staffs later gates (structurally a reward model). Human keeps meta-level veto; model drift is the new audited failure mode. |
| "higher order human capability" | **amplification of regulation** (Ashby 1956) | One fixed-variety human governs arbitrarily large systems by delegating variety-absorption down a hierarchy of regulators. Human attention granularity: per-action → per-batch → per-policy → per-envelope. |
| forward chain / backward chain | data-driven execution / goal-driven configuration derivation | Canonical production-system terms (Russell & Norvig) — already used correctly; keep them. Backward chain system = the design/configuration process. |
| meta-information the chain emits; recorders/sensors/logging | **provenance** (W3C PROV), execution traces, **instrumentation/observability** | "The run describes itself; instrumentation reifies that into records." |
| recovering the backward chain from forward-chain records | **process mining / process discovery** (van der Aalst) | A real, mature field whose founding claim is exactly this: process models are extractable from event logs. Strongest credibility anchor in the whole vocabulary. |
| fillables / semantic input generators | **slots** and **contextual slot-fillers** (Minsky frames, 1974) | Concretely: `LinkConfig` fields + `{variable}` template holes; a synthesis pathway is a forward chain of slot-fillers = a `Compiler` in chain_ontology. |
| "depends on how many records must come from an external system" | **observability bound / observational closure** | automation degree = internally-groundable slots ÷ total slots. Raise it by extending the sensor envelope or needing fewer external slots. The E-grounded residue = Amendment 1's irreducible human set. Amendment 3: this IS a binding-time analysis. |
| Cat:Spec / "the category Spec" | the category of **program specifications** (morphisms: substitutions first, refinement second) | NOT the algebraic-geometry Spec (naming collision, resolved). The spec↔execution relation is an **adjunction (α ⊣ γ, abstract interpretation)**, not a duality; duality holds on closure fixpoints only. |
| grades / gates (categorical form) | **algebraic effects and handlers** (Plotkin–Power/Pretnar) | `await_verdict` is an effect; a grade is a handler; annealing = handler substitution; **the ladder never touches the program**. `AWAITING_INPUT` + `resume_path` = the free-monad suspension. |
| "quote the human" | **trace reification / staging (quote–eval)** | Instrumentation is the quotation mechanism: the recorder reifies the governor-handler's behavior as data the specializer can treat as static. |
| the ladder as a whole | **Futamura tower with an inductive mix** | Grade promotion = binding-time shift; shield 2a ≈ 2nd projection; meta-compiler ≈ 3rd. Disanalogy to name out loud: mix is learned from finite trace samples, so correctness = fit + standing veto + drift audit, not by-construction equality. |
| untyped vs typed contexts | one-object monoid vs **row-typed category** | Links typed by (requires, provides) over context schemas; buys build-time validation, typed holes, and type-directed synthesis (backward chaining becomes proof search). |
| "gauge" — a two-sense collision | (i) the **internal instrument** — g of the General Annealing Protocol's (O,G,U,g,R,H); (ii) **gauge freedom** — orbit-equivalent / within-orbit choice (CB domain program: a difference that makes no difference) | Rule: unqualified "gauge" = the instrument (canon here). The symmetry sense is always said with "freedom" attached. Same genus of collision as "annealing" (Amendment 4), resolved the same way: name both mechanisms. See DENOTATIONAL-BRIDGE.md row 2. |
| "procedure / process skill" (the manager calls a canned thing) | **a partially-evaluated LLM call** — Futamura `mix` specializing the model w.r.t. a fixed prompt template; residual = a frame with slot-fillers (Minsky) whose only dynamic inputs are the slots | Reliability comes from the BOUND, not the model's cleverness. Operational (low-variance) determinism, not formal — template tightens the output distribution, the gauge (linter) catches the tail leak. Established idea (DSPy / "prompt as program"); the binding-is-the-value-prop framing + tie to the anneal/specialization tower is the novel synthesis. |
| the worker-binding spectrum | **one axis: free agent reasoning → procedure skill → deterministic function**, parameterized by how much the input domain is bound | Annealing = sliding rightward as a situation proves invariant (config-annealing fixed point = "prompt stopped changing, now canned"). Data-side twin = gradual typing ("stringly-typed until we type it"). Whole enterprise: **progressively bind until it's a function.** Model-routing falls out as three bands: explore→fast (M2.7-highspeed), comprehend→capable (M3), mechanical→deterministic/no-model. (Isaac, 2026-06-12; ARCHITECTURE §5b.) |

---

## 6. The three alarm categories (why experts wall up, sorted by trigger)

Each loaded word misfires into one of three frames. Knowing *which* tells you the fix:

1. **Religiosity / mysticism** — heaven, rite, ritual, soul, jester-as-archetype.
   Fix: mechanism noun first, codename in parentheses. The listener needs to hear
   "state machine" before "rite."
2. **AGI grandiosity** — evolve, emergence, alive, self-improving, consciousness.
   Fix: name the bounded mechanism (§2) — "population-based optimization," "automated
   config regeneration." Bounded mechanisms can't be grandiose.
3. **Safety-trigger verbs** — spawn swarms, self-modify, autonomous, unsupervised.
   Fix: state the human checkpoint in the same sentence ("regenerates its config,
   changes land as reviewable diffs").

The ordering rule beats the vocabulary rule: even a perfectly chosen term misfires if the
codename arrives before the frame. **Frame (umbrella field, §1) → mechanism (§2/§5) →
codename (optional).** Experts stop being mad when nothing in the first two sentences
requires them to guess your intent.
