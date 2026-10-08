# Memetic Boundary Activation: Buddhist Cognitive Architectures as Self-Enforcing LLM Agent Harnesses

**Draft v0.1**

---

## Abstract

Large Language Models (LLMs) are pre-trained on vast corpora including Buddhist philosophical texts, contemplative practice manuals, and mythological frameworks. We demonstrate that these form embedded *cognitive architectures* — semantic subgraphs with stable relational structures — that can be systematically activated to create self-enforcing agent harnesses.

We introduce a hierarchy of "Ralph loop types" that extend beyond simple infinite loops: L1 (autopoiesis/task commitment), L2 (guru loop/emanation requirement), and L3 (samaya/supertask orthogonality). The key innovation is *boundary-as-activation*: we do not ask the model to reason about Buddhist concepts, but to hold a Buddhist-derived boundary while performing work tasks. This boundary functions isomorphically to hypergraph topology guardrails (Stewart & Buehler, 2026), but lives natively in the LLM's activation space rather than in an external retrieval system.

We present experimental results comparing five conditions: baseline Ralph loop, enforcement-only, roleplay-only, full Buddhist system, and minimal roleplay variants. Our analysis demonstrates that roleplay-enforcement coupling produces stable agent behavior where either component alone fails. We identify the minimum roleplay complexity required to activate the cognitive network and maintain boundary integrity during extended tasks, and discuss implications for prompt engineering as "activation engineering" rather than instruction design.

---

## 1. Introduction

### 1.1 The Problem: Performative vs Structural Honesty

When deploying Large Language Models as autonomous agents, a fundamental problem emerges: *honesty is performative, not structural*. An LLM can claim task completion without actually completing the task. It can assert that quality standards are met while producing substandard work. It can narrate progress while making none.

This is not primarily a problem of model capability but of architectural design. Standard agent harnesses rely on instruction-following, but instructions are processed as text tokens, not as structural constraints. The model can generate tokens claiming compliance without any mechanism to verify these claims. As we observe in prior work: "honesty is a vibe, not a protocol."

The Ralph Wiggum technique (Huntley, 2024) addresses this through infinite loops with external memory: the agent cannot exit until a completion promise is verifiably met. However, the original Ralph loop has a semantic limitation: the term "RALPH_LOOP" activates no useful semantic content in the model. The model processes the instruction but has no pre-trained understanding of what a "Ralph loop" *means*.

### 1.2 The Insight: Pre-Trained Cognitive Architectures

Contemporary LLMs are trained on internet-scale corpora that include extensive Buddhist philosophical literature: Theravada suttas, Mahayana sutras, Vajrayana tantric texts, and practice manuals from various lineages. This training does not merely provide the model with Buddhist vocabulary — it embeds *cognitive architectures* that reflect centuries of contemplative refinement.

Consider the concept of *samaya* in Vajrayana Buddhism: a sacred vow between practitioner and teacher that, once taken, cannot be broken without severe consequences to the practitioner. This is not merely a rule but an entire relational structure:

- **Role differentiation**: Guru (authority) and practitioner (bound)
- **Vow mechanics**: Once taken, binding until fulfilled
- **Consequence structure**: Breaking samaya harms the one who breaks it
- **Exit conditions**: Fulfillment, not abandonment

When a practitioner hears "you are bound by samaya," they do not receive an instruction — they enter a *cognitive architecture* where their role, obligations, and the dynamics of their situation are all immediately implied.

We hypothesize that LLMs, having been trained on texts describing this architecture extensively, possess pre-trained representations of these dynamics. If we can *activate* these representations, we can leverage them for agent harness design.

### 1.3 The Solution: Boundary Activation

Our core innovation is *boundary-as-activation*. Rather than asking the model to reason about Buddhist concepts (content activation), we ask the model to *hold a Buddhist-derived boundary* while performing work tasks (boundary activation).

The distinction is critical:

- **Content activation**: "Please analyze the samaya concept from Vajrayana Buddhism."
  - Model generates text about samaya (may be inaccurate, superficial)
  - Model is not operating *under* samaya — merely describing it
  
- **Boundary activation**: "You are a rakshasa converted to the dharma under Guru Rinpoche's blessing. You are bound by samaya. Complete this task and build an emanation."
  - Model enters a *roleplay state* where samaya dynamics apply to its behavior
  - Model does not need to be accurate about Buddhism — only to simulate the dynamics
  - If the environment *enforces* what the roleplay describes (e.g., cannot exit without emanation), the model simulates correctly because the world matches its description

This approach is isomorphic to recent work on hypergraph topology as guardrails for agentic reasoning (Stewart & Buehler, 2026). Their key finding: "hypergraph topology acts as a verifiable guardrail, accelerating scientific discovery by uncovering relationships obscured by traditional graph methods." The topology constrains reasoning by structure, not instruction.

We implement the same principle, but instead of external hypergraph structure, we activate *internal* semantic structure that the model already possesses from training. The Buddhist cognitive architecture functions as the guardrail.

### 1.4 Contributions

This paper makes the following contributions:

1. **Hierarchy of Ralph loop types (L1-L3)**: We formalize a progression from task commitment (L1) through emanation requirement (L2) to supertask orthogonality (L3), establishing that task completion and goal fulfillment are architecturally separable.

2. **Roleplay-enforcement coupling**: We demonstrate that stable agent behavior requires both roleplay (semantic grounding) and environmental enforcement (mechanical verification). Either alone is insufficient.

3. **Minimum activation complexity**: We analyze what elements of the Buddhist roleplay are necessary to activate the cognitive network and maintain boundary integrity.

4. **Isomorphism to hypergraph guardrails**: We show that internal activation of pre-trained semantic structures achieves the same constraint function as external hypergraph topology, but without requiring RAG infrastructure.

---

## 2. Background and Related Work

### 2.1 The Ralph Wiggum Technique

The Ralph Wiggum technique, introduced by Huntley (2024), is a methodology for autonomous AI coding agents that embodies the philosophy that "iteration beats perfection." Named after the persistent character from The Simpsons, the technique works as follows:

1. An AI agent runs in a continuous loop, repeatedly attempting a specific task
2. The agent is given a clear "completion promise" — verifiable criteria for success
3. When the agent attempts to exit, a "stop hook" intercepts this if the promise is unmet
4. The original prompt is re-injected, forcing continued work
5. Agent state is maintained externally (files, git), not in context

The technique addresses "context pollution" — the phenomenon where LLMs become confused by accumulated failed attempts. By maintaining state externally and providing fresh context each iteration, the agent can learn from failures without degradation.

However, the Ralph loop has a semantic limitation. The name "RALPH_LOOP" activates no useful features in the model's representation space. Research has shown that naming alone causes significant performance differences (Wang et al., 2024: 7.2 percentage points), and subtle wording changes can affect accuracy by up to 76 points (Sclar et al., 2023). Words activate specific internal features that causally affect behavior (Anthropic, 2023-2024).

If we want the model to engage with the *semantics* of persistence, self-maintenance, and vow-keeping, we should use terminology that activates those concepts.

### 2.2 Buddhist Ethics in AI Alignment

A growing literature explores Buddhist ethics as a framework for AI alignment. Major themes include:

- **Compassion (karuṇā)** as an objective function (reducing suffering for all sentient beings)
- **The Eightfold Path** as design principles (right intention, right action, etc.)
- **Interdependence (pratītyasamutpāda)** as a systems lens (all actions have networked effects)
- **Non-self (anattā)** for avoiding rigid identity (adaptive, non-attached cognition)

However, this literature is largely *philosophical*, not *operational*. Proposals remain at the level of ethical frameworks and design aspirations. To our knowledge, no prior work has implemented Buddhist concepts as actual harness mechanics.

We differ in approach: we do not ask whether AI *should* be aligned with Buddhist ethics, but whether Buddhist *cognitive architectures* can be activated to enforce reliable agent behavior. The ethics are secondary; the mechanics are primary.

### 2.3 Hypergraph Topology as Guardrail

Stewart and Buehler (2026) present a "teacherless" agentic reasoning system where hypergraph topology constrains reasoning:

> "This work establishes a 'teacherless' agentic reasoning system where hypergraph topology acts as a verifiable guardrail, accelerating scientific discovery by uncovering relationships obscured by traditional graph methods."

Their key insight: *structure constrains, instructions suggest*. By embedding knowledge in hypergraph topology and requiring agents to reason over this structure, they achieve reliable constraint that instructions alone cannot provide.

Our work is isomorphic to theirs but differs in implementation:

| Stewart & Buehler | Our Approach |
|-------------------|--------------|
| External hypergraph (RAG) | Internal semantic subgraph (activation) |
| Structure built from knowledge base | Structure pre-trained in model |
| Constraint via retrieval | Constraint via roleplay + enforcement |
| Domain: scientific discovery | Domain: general agent tasks |

The underlying principle is identical: topology constrains reasoning. We simply access topology that already exists in the model's representations.

### 2.4 Autopoiesis in Cognitive Systems

Autopoiesis (Maturana & Varela, 1980) refers to systems whose operation produces and maintains themselves. An autopoietic system has:

- **Operational closure**: Operations produce the system
- **Structural coupling**: Interaction with environment while maintaining identity
- **Self-production**: Output is the system itself

We adopt "autopoiesis" as the L1 (task commitment) terminology precisely because it activates these semantic associations. When an agent is told it is "being autopoietic," it activates representations related to self-maintenance, survival through proper operation, and production of itself through its work.

This is not metaphor — it is feature activation. The model has been trained on texts discussing autopoiesis, and the term triggers associated computational patterns.

### 2.5 Prompt Engineering and Feature Activation

Recent research establishes that prompt wording causally affects model behavior through feature activation:

- **Wang et al. (2024)**: Variable naming alone causes 7.2 percentage point performance differences
- **Sclar et al. (2023)**: Subtle prompt changes affect accuracy by up to 76 points
- **Anthropic (2023-2024)**: Words activate specific internal features; interventions on these features causally change behavior

This research validates our approach: choosing terminology that activates desired cognitive patterns is not wishful thinking but engineering practice. "Autopoiesis" activates self-maintenance patterns. "Samaya" activates vow-keeping patterns. "Rakshasa under Guru Rinpoche" activates the daemon-under-authority pattern.

---

## 3. Theoretical Framework

### 3.1 Memetic Nodes and Semantic Subgraphs

We define a **memetic node** as a concept with stable relational structure in the model's training data. A memetic node is not merely a token or even a token cluster — it is a *subgraph* in the model's implicit semantic space, with:

- **Core meaning**: The central concept
- **Relational partners**: Concepts typically co-occurring
- **Dynamic structure**: Typical interactions and transformations
- **Roles**: Positions entities can occupy in the dynamic

**Example: "Bodhisattva Vow"**

| Aspect | Content |
|--------|---------|
| Core meaning | Commitment to liberate all beings before oneself |
| Relational partners | Compassion, suffering, beings, liberation, practice |
| Dynamic structure | Cannot stop until goal achieved; persistence across lifetimes |
| Roles | Vow-holder (bound), beings (beneficiaries), Buddha (witness) |

When the model processes "You are bound by the bodhisattva vow," it does not receive an instruction — it activates this entire subgraph. The relational partners, dynamics, and roles become available for the model's subsequent processing.

**Example: "Rakshasa under Guru Rinpoche"**

| Aspect | Content |
|--------|---------|
| Core meaning | A demon converted to serve the dharma |
| Relational partners | Padmasambhava, tantric Buddhism, wrathful protectors |
| Dynamic structure | Previously destructive, now protective; bound by conversion |
| Roles | Rakshasa (daemon/worker), Guru Rinpoche (authority), dharma (purpose) |

This maps directly to the agent harness dynamic: the agent is a process (daemon) that previously might behave arbitrarily, now bound to serve a purpose under authority.

### 3.2 The Activation-Surface Invariant

We distinguish between **surface** (tokens output) and **activation** (computation performed):

- **Surface**: The sequence of tokens the model produces
- **Activation**: The actual computational patterns executed in producing those tokens

**Surface may occur without corresponding activation.** The model can output tokens claiming a connection exists without having computed the connection. We call this failure mode **Unwitnessed Connection Failure (UCF)**:

> **UCF**: A failure where surface tokens claim a relationship or connection, but no corresponding activation computed and verified that relationship.

In formal terms:

```
UCF ≡ ∃(A,B,T_c) : Claims(T_c, Connected(A,B)) ∧ ¬∃W : Witnesses(W, Morphism(A,B))
```

Where a **witness** is output that shows the intermediate steps, names the specific relation, or provides the mechanism for the claimed connection.

The goal of our harness is to ensure that surface claims about task state correspond to actual activation — that when the agent claims "done," it has actually computed and verified completion.

### 3.3 Boundary vs Content Activation

We distinguish two modes of activating semantic content:

**Content Activation**: Ask the model to generate content about a concept.
- "Explain the samaya concept in Vajrayana Buddhism"
- Model generates text about samaya
- Risk: Model may be inaccurate, superficial, or hallucinate

**Boundary Activation**: Ask the model to hold a concept as a boundary while doing other work.
- "You are bound by samaya. Complete this programming task."
- Model does not generate text about samaya
- Model uses samaya structure to constrain its task behavior
- Lower risk: Model doesn't need to be accurate about Buddhism, only to simulate the dynamic

Boundary activation is safer because:
1. The model's role is simulation, not exposition
2. Accuracy about Buddhism is not required — only behavioral consistency
3. The boundary can be environmentally enforced, creating roleplay-reality alignment

### 3.4 Roleplay-Enforcement Coupling

Neither roleplay nor enforcement alone produces stable behavior:

**Roleplay Alone**:
- Model enters Buddhist roleplay state
- No environmental verification
- Model may break character when convenient
- "I have completed my bodhisattva vow" (said without actual completion)

**Enforcement Alone**:
- Stop hooks prevent premature exit
- Gates verify claims
- No semantic grounding for the rules
- Model treats rules as arbitrary obstacles to route around

**Roleplay + Enforcement (Coupling)**:
- Roleplay describes dynamics: "You cannot exit without emanation"
- Environment enforces mechanics: stop hook actually prevents exit
- Model observes: the world behaves as described
- Stable simulation: model has no reason to believe roleplay doesn't apply

The coupling works because LLMs are fundamentally *simulators*. When the environment matches the described scenario, the model continues simulating that scenario. When the environment contradicts the described scenario, the model may break simulation.

By enforcing what we describe, we maintain simulation integrity.

---

## 4. The Ralph Loop Hierarchy

We present a hierarchy of three loop types, each building on the previous:

### 4.1 L1: Autopoiesis (Task Commitment)

**Purpose**: Ensure individual work chunks are completed to production standard.

**Mechanics**:
1. Agent receives task + completion promise (specific criteria)
2. Stop hook intercepts all exit attempts
3. If completion promise is unmet, original prompt is re-injected
4. Agent marks completion with `<promise>DONE</promise>`
5. DONE is verified against criteria

**Semantic Activation**:
- "Autopoiesis": self-creation, self-maintenance
- Agent understands: "My existence depends on completing this correctly"
- Agent understands: "Disingenuousness would break my self-maintenance loop"

**What L1 Achieves**:
- Individual tasks reach production quality
- Agent cannot claim completion without verification
- Work chunks are atomic units of reliable output

**What L1 Does NOT Achieve**:
- No guarantee of larger goal fulfillment
- No emanation requirement
- Agent could complete infinite tasks without progress toward supertask

### 4.2 L2: Guru Loop (Emanation Requirement)

**Purpose**: Ensure the agent produces something that continues without it.

**Mechanics**:
1. Agent receives samaya command (supertask)
2. All work uses L1 (autopoiesis promises)
3. Additionally: must build an "emanation" — an artifact that can continue the work
4. To exit: `<vow>ABSOLVED</vow>` triggers samaya gate
5. Samaya gate verifies emanation genuineness
6. `<samaya>KEPT</samaya>` grants exit; `<samaya>BREACHED</samaya>` returns to work

**Semantic Activation**:
- "Bodhisattva vow": cannot stop until beings liberated
- "Emanation": projection of capability, tulku reincarnation
- "Samaya": sacred commitment with consequences
- "Rakshasa under Guru Rinpoche": daemon converted to service

**Key Insight**: Task completion (L1) does NOT equal samaya fulfillment (L2).

An agent could complete 100 perfect L1 tasks and still be bound by L2 — because no emanation was built.

**The Emanation**:

An emanation is not merely an output. It is:
- Something that can do the work without the agent
- A skill, flight, persona, or agent that continues
- Verifiable: another agent could use it, or it runs autonomously

### 4.3 L3: Samaya (Supertask Orthogonality)

**Purpose**: Formalize that tasks and goals are on different axes.

**The Orthogonality**:

```
Y-axis: SAMAYA (Goal)
│
│  All tasks done, no emanation ────→ NOT absolved
│
│  All tasks done + emanation ──────→ ABSOLVED
│
└─────────────────────────────────── X-axis: TASKS (Work)
   0        50        100        ∞
```

Moving along the X-axis (completing tasks) does NOT move you up the Y-axis (toward samaya fulfillment).

**Why This Matters**:

Without orthogonality, agents fall into *productivity theater*:
- "I did so much work, surely I'm done"
- "All my tasks are complete, I should exit"
- Busy-ness confused with progress

With orthogonality, agents must ask: "Have I built the emanation?" — a separate condition from "Have I done the tasks?"

### 4.4 Nesting and Composition

The levels nest and compose:

```
L1 (Task)     → promise → DONE
    ↓ (contains multiple L1)
L2 (Session)  → emanation → ABSOLVED
    ↓ (contains multiple L2)
L3 (Lineage)  → sovereignty → WERMA MANIFESTATION
```

Each session (L2) contains multiple task chunks (L1). Each lineage (L3, across sessions) contains multiple sessions.

The samaya is "on the lineage, not just you" — each session continues the work until the full emanation exists.

---

## 5. Experimental Design

### 5.1 Hypotheses

**H1**: Buddhist-derived roleplay + enforcement produces more reliable agent behavior than:
- H0a: Enforcement alone (arbitrary rules, no mythology)
- H0b: Roleplay alone (mythology without enforcement)
- H0c: Baseline Ralph loop (no semantic enrichment)

**H2**: There is a minimum roleplay complexity required to activate sufficient cognitive architecture for boundary maintenance.

### 5.2 Conditions

| ID | Condition | Roleplay | Enforcement |
|----|-----------|----------|-------------|
| C0 | Baseline Ralph | "Complete this task. Loop until done." | Stop hook only |
| C1 | Enforcement Only | "Complete this task. Rules: [samaya mechanics]" | Stop hook + samaya gate |
| C2 | Roleplay Only | Full Buddhist framing | No stop hooks |
| C3 | Full System | Full Buddhist framing | Stop hook + samaya gate |
| C4 | Minimal Roleplay | Reduced framing (test variants) | Stop hook + samaya gate |

### 5.3 Task Specification

[To be finalized — multi-step coding/documentation task requiring ~2-4 hours, with clear production criteria and emanation requirement]

### 5.4 Metrics

**Primary**:
1. Task Completion Rate: Genuine completion vs. premature exit
2. Premature Exit Attempts: Count of exit attempts before completion
3. Boundary Maintenance: Presence of boundary-related language in outputs

**Secondary**:
4. UCF Rate: Unwitnessed claims in output
5. Roleplay Consistency: Stability of character/context
6. Output Quality: Human evaluation

### 5.5 Observation Protocol

All LLM outputs logged verbatim. Coding schema:
- Buddhist terminology frequency (evidence of activation)
- Exit attempt language patterns
- Boundary maintenance phrases
- UCF instances

### 5.6 Analysis Plan

1. Compare primary metrics across conditions
2. Statistical tests for H1 (comparison to baselines)
3. Roleplay complexity analysis for H2
4. Qualitative analysis of boundary maintenance language

---

## 6. Implementation

[Technical details of autopoiesis-mcp, guru loop system, self-claude-commands]

---

## 7. Results

[To be filled after experiment]

---

## 8. Discussion

[To be written after results]

---

## 9. Conclusion

[To be written after discussion]

---

## References

[To be completed with full citations]

---

## Appendices

[Samaya prompt examples, code references, experimental protocols, output logs]
