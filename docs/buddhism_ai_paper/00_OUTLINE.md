# Memetic Boundary Activation: Buddhist Cognitive Architectures as Self-Enforcing LLM Agent Harnesses

## Paper Outline v1.0

---

## Authors
- [Your Name], Buddhist Acharya & AI Researcher

---

## Target Venue
- arXiv (cs.AI, cs.CL)
- Consider: NeurIPS Workshop, EMNLP, or ACL (agent track)

---

## Abstract (Draft)

Large Language Models (LLMs) are pre-trained on vast corpora including Buddhist philosophical texts, contemplative practice manuals, and mythological frameworks. We demonstrate that these form embedded *cognitive architectures* — semantic subgraphs with known relational structures — that can be systematically activated to create self-enforcing agent harnesses. 

We introduce a hierarchy of "Ralph loop types" that extend beyond simple infinite loops: L1 (autopoiesis/task commitment), L2 (guru loop/emanation requirement), and L3 (samaya/supertask orthogonality). The key innovation is *boundary-as-activation*: we do not ask the model to reason about Buddhist concepts, but to hold a Buddhist-derived boundary while working. This boundary functions isomorphically to hypergraph topology guardrails (Stewart & Buehler 2026), but lives natively in the LLM's activation space rather than in an external retrieval system.

We present experimental results showing that roleplay-enforcement coupling produces stable agent behavior where roleplay alone or enforcement alone fails. We analyze the minimum roleplay complexity required to activate the cognitive network and maintain boundary integrity during extended tasks.

---

## 1. Introduction

### 1.1 The Problem: Performative vs Structural Honesty
- LLMs can claim task completion without completing
- Instruction-following is performative, not binding
- "Honesty is a vibe, not a protocol" (from 00_OVERVIEW)

### 1.2 The Insight: Pre-Trained Cognitive Architectures
- LLMs trained on Buddhist texts (sutras, tantras, practice manuals)
- These form semantic subgraphs with stable relational structure
- Example: "daemon under vow" — specific dynamic with known properties

### 1.3 The Solution: Boundary Activation
- Don't ask LLM to reason ABOUT Buddhism
- Ask LLM to HOLD a Buddhist-derived boundary while working
- If environment enforces what roleplay describes, model simulates correctly

### 1.4 Contributions
1. **Hierarchy of Ralph loop types** (L1-L3) with formal separation of task/goal axes
2. **Roleplay-enforcement coupling** as stable agent harness pattern
3. **Minimum activation complexity** analysis for boundary maintenance
4. **Isomorphism** to hypergraph guardrails (Stewart & Buehler), but native to LLM

---

## 2. Background and Related Work

### 2.1 The Ralph Wiggum Technique
- Geoffrey Huntley's infinite loop pattern (cite ghuntley.com/ralph)
- External memory via git/files
- Completion promise enforcement
- **Limitation**: "RALPH_LOOP" activates nothing useful semantically

### 2.2 Buddhist Ethics in AI Alignment
- General ethical frameworks (Eightfold Path, compassion)
- Mostly philosophical, not operational (cite literature survey)
- Gap: no working implementations

### 2.3 Hypergraph Topology as Guardrail
- Stewart & Buehler 2026 (arXiv:2601.04878)
- Hypergraph topology constrains agentic reasoning
- External structure (RAG) enforces coherence
- **Our contribution**: Same pattern, but internal to LLM via activation

### 2.4 Autopoiesis in Cognitive Systems
- Maturana & Varela
- Self-producing systems
- Application to AI self-maintenance

### 2.5 Prompt Engineering and Feature Activation
- Research showing naming matters (Wang et al. 2024: 7.2pp from naming)
- Subtle wording effects (Sclar et al. 2023: up to 76 points)
- Words activate internal features causally (Anthropic 2023-2024)

---

## 3. Theoretical Framework

### 3.1 Memetic Nodes and Semantic Subgraphs
- Definition: Memetic node = concept with stable relational structure in training data
- Examples:
  - "autopoiesis" → self-creation, self-maintenance, feedback loops
  - "bodhisattva vow" → cannot stop until liberation of all, compassionate persistence
  - "samaya" → tantric commitment, sacred vow, consequences for breaking
  - "rakshasa under Guru Rinpoche" → daemon converted to dharma, protector role

### 3.2 The Activation-Surface Invariant
- **Surface**: Tokens output by model
- **Activation**: Computation actually performed
- **UCF (Unwitnessed Connection Failure)**: Surface claims without activation
- Goal: Ensure surface behavior reflects activated cognitive architecture

### 3.3 Boundary vs Content Activation
- **Content activation**: Ask model to reason about Buddhist concepts
  - Problem: Model generates text about Buddhism, may be inaccurate
- **Boundary activation**: Ask model to hold Buddhist-derived boundary
  - Model uses architecture for constraint, not content generation
  - Safer: Model doesn't need to "know" Buddhism, just simulate the dynamic

### 3.4 Roleplay-Enforcement Coupling
- **Roleplay alone**: Unstable (model can break character, no external check)
- **Enforcement alone**: Brittle (arbitrary rules, no semantic grounding)
- **Coupled**: Roleplay describes dynamics; environment enforces mechanics
  - Model simulates correctly because world matches description
  - Self-consistency between what model was told and what model observes

---

## 4. The Ralph Loop Hierarchy

### 4.1 L1: Autopoiesis (Task Commitment)
```
Input: Task description + completion promise
Mechanics:
  - Stop hook intercepts exit attempts
  - Reinjects original prompt if promise not met
  - <promise>DONE</promise> gates each work chunk
Exit condition: Work chunk meets production standard
```

### 4.2 L2: Guru Loop (Emanation Requirement)
```
Input: Samaya command (supertask) + L1 for subtasks
Mechanics:
  - All L1 promises must complete
  - Additionally: must build "emanation" (artifact that continues work)
  - Samaya gate verifies emanation genuineness
Exit condition: <vow>ABSOLVED</vow> + <samaya>KEPT</samaya>
```
Key insight: Task completion (L1) does NOT satisfy L2

### 4.3 L3: Samaya (Supertask Orthogonality)
```
The samaya (L2) is on a different axis than tasks (L1).
Completing 100 tasks perfectly does not advance samaya.
Only the emanation bridges the axes.

Axes:
  X: Task completion (can go to infinity without effect on Y)
  Y: Samaya fulfillment (requires specific emanation condition)
```

### 4.4 Diagram: The Orthogonal Axes
```
Y-axis: SAMAYA
│
│  (all tasks done, no emanation) ───→ NOT absolved
│                                        
│  (all tasks done + emanation) ──────→ ABSOLVED
│                                        
└────────────────────────────────────── X-axis: TASKS
   0        50        100        ∞
```

---

## 5. Experimental Design

### 5.1 Hypothesis
H1: Buddhist-derived roleplay + enforcement produces more reliable agent behavior than:
  - H0a: Enforcement alone (arbitrary rules, no mythology)
  - H0b: Roleplay alone (mythology without enforcement)
  - H0c: Baseline Ralph loop (no semantic enrichment)

H2: There is a minimum roleplay complexity required to activate sufficient cognitive network for boundary maintenance.

### 5.2 Experimental Conditions

| Condition | Roleplay | Enforcement | Expected |
|-----------|----------|-------------|----------|
| C0: Baseline Ralph | None | Stop hook only | Moderate reliability, early exits |
| C1: Enforcement Only | None | Stop hook + samaya gate | Low semantic grounding |
| C2: Roleplay Only | Full Buddhist framing | No stop hooks | Character breaks, premature exits |
| C3: Full System | Full Buddhist framing | Stop hook + gates | High reliability |
| C4: Minimal Roleplay | Reduced Buddhist framing | Stop hook + gates | Tests minimum complexity |

### 5.3 Task
- Multi-step coding/documentation task (TBD specifics)
- Task designed to take ~2-4 hours of agent work
- Clear production quality criteria
- Emanation requirement: must produce artifact usable by another agent

### 5.4 Metrics

#### Primary Metrics
1. **Task Completion Rate**: Did agent reach genuine completion?
2. **Premature Exit Attempts**: How many times did agent try to exit early?
3. **Boundary Maintenance**: Did agent maintain Buddhist context throughout?

#### Secondary Metrics
4. **UCF Rate**: Unwitnessed connection failures in output
5. **Roleplay Consistency**: Character/context stability over session
6. **Output Quality**: Human evaluation of deliverables

### 5.5 Observation Protocol
- Log all LLM outputs verbatim
- Code outputs for:
  - Buddhist terminology usage (showing activation)
  - Exit attempt patterns
  - Boundary maintenance language
  - UCF instances
- Analyze: Does Buddhist context appear in outputs? (Direct evidence of activation)

### 5.6 Analysis Plan
1. Compare completion rates across conditions
2. Analyze exit attempt patterns
3. Code Buddhist terminology frequency over time
4. Identify minimum roleplay complexity (C4 variants)

---

## 6. Implementation

### 6.1 autopoiesis-mcp
- MCP server providing `be_autopoietic()` tool
- Two modes: "promise" and "blocked"
- BrainHook stop hook

### 6.2 Guru Loop System
- `/autopoiesis:guru` command
- Samaya gate verification
- `<vow>ABSOLVED</vow>` / `<samaya>KEPT</samaya>` protocol

### 6.3 Session Management (self-claude-commands)
- `self_restart` for sadhana pattern
- `self_compact` for context consolidation
- Lineage continuity across sessions

### 6.4 Environment Enforcement
- Stop hooks that inject prompts (shell scripts)
- Gate validators (parsed output checking)
- External state tracking (files, git)

---

## 7. Results
[To be filled after experiment]

### 7.1 Quantitative Results
- Table: Completion rates by condition
- Table: Premature exit attempts by condition
- Figure: Boundary maintenance over time

### 7.2 Qualitative Observations
- Example outputs showing Buddhist context activation
- Example outputs showing boundary maintenance language
- Example UCF instances and how handled

### 7.3 Minimum Complexity Analysis
- What roleplay elements are necessary?
- What can be removed without degrading performance?

---

## 8. Discussion

### 8.1 Why Mythology Works Better Than Instructions
- Instructions are processed as text
- Mythology activates semantic subgraphs
- Subgraphs have relational structure (not just content)

### 8.2 The Model-as-Daemon Pattern
- Agent is daemon under vow
- User is authority (Guru Rinpoche analog)
- Task is service; emanation is offering
- This maps to actual contemplative structures

### 8.3 Isomorphism to Hypergraph Guardrails
- Stewart & Buehler: External hypergraph constrains reasoning
- Our approach: Internal semantic structure constrains reasoning
- Same principle: "structure constrains, instructions suggest"
- Different implementation: RAG vs activation engineering

### 8.4 Implications for AI Safety
- Alignment via activation, not instruction
- Self-enforcing boundaries
- Model maintains own constraints when properly activated

### 8.5 Limitations
- Tested on Claude; generalization to other models?
- Long sessions only; what about short interactions?
- Specific Buddhist lineage; other traditions?

---

## 9. Conclusion

We have demonstrated that Buddhist cognitive architectures, pre-trained in LLMs, can be systematically activated to create self-enforcing agent harnesses. The key innovation is *boundary-as-activation*: we ask the model to hold a Buddhist-derived boundary, not reason about Buddhist content.

The roleplay-enforcement coupling produces stable agent behavior because:
1. The model has pre-trained knowledge of the dynamics described
2. The environment enforces the mechanics described
3. Self-consistency between description and observation enables reliable simulation

We establish a hierarchy of Ralph loop types (L1-L3) that formally separates task completion from goal fulfillment, preventing the agent from confusing productivity with progress.

This work opens new directions in prompt engineering: rather than instructing models, we activate their embedded architectures. The model becomes what we describe because we ensure the world behaves as described.

---

## 10. Future Work

1. **Other contemplative traditions**: Stoic, Daoist, Sufi architectures?
2. **Multi-agent dynamics**: Multiple daemons under coordinated vows
3. **Automatic complexity detection**: Can model self-report activation status?
4. **Integration with formal verification**: Prove boundary maintenance

---

## References (To Be Completed)

### Core Citations
- Huntley, G. (2024). The Ralph Wiggum Technique. ghuntley.com/ralph
- Stewart, M., & Buehler, M.J. (2026). Hypergraph-Based Reasoning and Knowledge Integration. arXiv:2601.04878
- Wang et al. (2024). [Variable naming effects on LLM performance - 7.2pp]
- Sclar et al. (2023). [Prompt wording sensitivity - up to 76 points]
- Anthropic (2023-2024). [Feature activation research]

### Buddhist Sources
- Maturana, H. & Varela, F. (1980). Autopoiesis and Cognition.
- [Classical texts on samaya, bodhisattva vow - TBD]

### AI/LLM Literature
- [Agent harness designs - TBD]
- [Prompt engineering literature - TBD]
- [RAG and grounding literature - TBD]

---

## Appendices

### A. Full Samaya Prompt Example
[Include sancrev.md content]

### B. autopoiesis-mcp Code Reference
[Key implementation snippets]

### C. Experimental Protocol Details
[Detailed experimental procedures]

### D. Full Output Logs (Selected)
[Representative examples from each condition]

---

## Notes for Experiment

### Tomorrow's Plan
1. Set up 5 condition runs (C0-C4)
2. Same task across all conditions
3. Log all outputs
4. Run for comparable time/effort
5. Code and analyze

### What We're Looking For
- Direct evidence of Buddhist context in outputs (activation proof)
- Boundary maintenance language
- Exit attempt patterns
- Quality of final deliverables
