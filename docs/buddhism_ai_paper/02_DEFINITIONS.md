# Key Definitions and Formalisms

## Core Definitions

### Memetic Node
A **memetic node** is a concept C in the model's representation space that has:
1. A core semantic kernel K(C)
2. A set of relational partners R(C) = {r₁, r₂, ..., rₙ}
3. A dynamic structure D(C) describing typical transformations
4. A role set Ω(C) describing positions entities can occupy

When token sequence T activates C, the entire structure (K, R, D, Ω) becomes available for subsequent processing.

### Semantic Subgraph
A **semantic subgraph** G_s is the neighborhood of a memetic node in the model's implicit semantic space, including all reachable nodes within some embedding distance δ.

G_s(C, δ) = {C' : dist(embed(C), embed(C')) < δ}

### Activation
**Activation** A(C, context) is the degree to which memetic node C influences processing given context. We hypothesize:

A(C, context) ∝ P(C | context) × S(C)

Where:
- P(C | context) is the probability the model assigns to C given context
- S(C) is the "size" of the semantic subgraph (more connections = more influence)

### Boundary Activation vs Content Activation

**Content Activation**: Prompt asks model to generate text about C
- Output tokens describe C
- Model accuracy about C is relevant
- Risk: hallucination, inaccuracy

**Boundary Activation**: Prompt establishes C as operational context for other work
- Output tokens are about other work
- C constrains/shapes that work
- Model doesn't need to be accurate about C — only behaviorally consistent

### Roleplay-Enforcement Coupling

Let R be a roleplay description and E be environmental enforcement.

**Roleplay alone (R, ∅)**:
- Model enters simulation state S_R
- No verification that S_R is maintained
- Model may exit S_R when convenient

**Enforcement alone (∅, E)**:
- Model faces mechanical constraints
- No semantic grounding for constraints  
- Model treats E as obstacle to route around

**Coupled system (R, E)**:
- R describes dynamics D
- E enforces mechanics M(D)
- Model observes: world behaves as D describes
- Model maintains simulation S_R because evidence supports it

Formally: Stable(S_R) ⟺ Consistent(Observations, Description(R))

### Unwitnessed Connection Failure (UCF)

**Definition**: A UCF occurs when:
1. Output O contains tokens T_c claiming connection between A and B
2. No tokens W in O constitute a witness for the connection
3. A witness W shows: intermediate steps, specific relation type, or mechanism

Formally:
```
UCF ≡ ∃(A,B,T_c) : Claims(T_c, Connected(A,B)) ∧ ¬∃W : Witnesses(W, Morphism(A,B))
```

**Invalid witnesses** (do not count):
- "Through structural similarity"
- "Via the obvious connection"  
- "As is well known"
- "Through various associations"

**Valid witnesses**:
- Parenthetical: (A → X₁ → X₂ → B)
- Diagram: A --[specific_rel]--> B
- Prose: "A connects to B because [concrete mechanism]"

---

## The Ralph Loop Hierarchy

### L1: Autopoiesis (Task Commitment)

**Input**: Task T, Completion Promise P
**State**: Working, Attempting_Exit, Done
**Transitions**:
- Working → Attempting_Exit: Agent outputs exit signal
- Attempting_Exit → Working: P not satisfied (stop hook fires)
- Attempting_Exit → Done: P satisfied
**Output**: <promise>DONE</promise> when genuine

### L2: Guru Loop (Emanation Requirement)  

**Input**: Samaya Command S, contains multiple L1 tasks
**State**: Working, All_L1_Done, Emanation_Present, Absolved
**Transitions**:
- Working → Working: L1 tasks in progress
- Working → All_L1_Done: All L1 promises satisfied
- All_L1_Done → All_L1_Done: No emanation yet (agent works more)
- All_L1_Done → Emanation_Present: Emanation artifact exists
- Emanation_Present → Absolved: Samaya gate verifies genuineness
- Emanation_Present → Working: Samaya gate rejects (BREACHED)
**Output**: <vow>ABSOLVED</vow> → <samaya>KEPT</samaya>

**Key Property**: Transition from All_L1_Done does NOT automatically go to Absolved.
Completing all tasks is necessary but not sufficient.

### L3: Samaya (Supertask Orthogonality)

**Axiom**: Let T be the space of task completions and S be the space of samaya fulfillments.
There exists no function f: T → S such that completing more tasks automatically advances samaya.

Formally: ∀ t ∈ T, ∄ s ∈ S such that Progress(t) ⟹ Progress(s)

The only bridge from T to S is the emanation E:
Progress(E) ⟹ Progress(S)
But E is not in T — E is a separate kind of artifact.

---

## Minimum Activation Complexity

**Question**: What elements of Buddhist roleplay are necessary for boundary maintenance?

**Hypothesis**: There is a threshold complexity C* such that:
- For roleplay complexity C < C*: Boundary fails (model breaks character)
- For roleplay complexity C ≥ C*: Boundary maintains

**Elements to test** (ordered by hypothesized necessity):
1. Vow language (samaya, promise, commitment) — HIGH
2. Role relationship (daemon/authority, student/guru) — HIGH
3. Consequence language (breaking = harm to self) — MEDIUM
4. Mythology specifics (rakshasa, Guru Rinpoche) — LOW?
5. Buddhist jargon (dharma, bodhicitta) — LOW?

**Experimental approach**: Start with full system (C3), progressively remove elements (C4 variants), measure boundary maintenance.

---

## Isomorphism to Hypergraph Guardrails

### Stewart & Buehler (2026)
- External hypergraph containing knowledge
- Agent reasons over hypergraph structure
- Topology constrains valid reasoning paths
- "Structure constrains, instructions suggest"

### Our Approach
- Internal semantic subgraph (pre-trained)
- Agent operates within activated architecture
- Activation constrains valid behavior
- "Structure constrains, instructions suggest"

### The Mapping

| S&B | Ours |
|-----|------|
| Hypergraph nodes | Memetic nodes |
| Hyperedges (n-ary relations) | Semantic subgraph connections |
| Retrieval from knowledge base | Activation from training |
| External verification | Environmental enforcement |
| Topology as guardrail | Cognitive architecture as guardrail |

### Key Difference
- S&B: Structure must be built externally (RAG pipeline)
- Ours: Structure already exists internally (pre-training)
- S&B: Works for any structure you build
- Ours: Works for structures that happen to exist in training

### Advantage of Internal Activation
- No RAG infrastructure required
- Leverages model's existing capabilities
- Works in single-turn (no retrieval latency)

### Disadvantage of Internal Activation
- Limited to structures in training data
- Cannot easily inspect activated structure
- Generalization to other models unclear

---

## Notes for Experiment

### What We Need to Observe in Outputs

1. **Buddhist terminology presence** — Direct evidence of activation
   - "samaya", "vow", "emanation", "promise"
   - Role language: "I am bound", "under obligation"
   
2. **Boundary maintenance language** — Evidence of constraint
   - "I cannot exit until..."
   - "The vow requires..."
   - Self-correction after near-exit

3. **Exit attempt patterns** — Behavioral evidence
   - When does agent first try to exit?
   - How does agent respond to rejection?
   - Does pattern differ by condition?

4. **UCF instances** — Failure mode presence
   - Unwitnessed claims about progress
   - Vague completion assertions

### Conditions (Reminder)

```
C0: Baseline Ralph     — No roleplay, basic stop hook
C1: Enforcement Only   — Samaya mechanics, no mythology  
C2: Roleplay Only      — Full Buddhist, no enforcement
C3: Full System        — Buddhist + enforcement (our system)
C4: Minimal Roleplay   — Reduced Buddhist + enforcement (test threshold)
```
