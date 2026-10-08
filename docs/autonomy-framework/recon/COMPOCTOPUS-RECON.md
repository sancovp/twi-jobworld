# Compoctopus Recon Report (Opus agent, 2026-06-12)

Read-only recon of `mind_of_god:/home/GOD/gnosys-plugin-v2/application/compoctopus/` and the
live dev clone `/tmp/compoctopus_repo/` (the one CAVE invokes; the only copy with `scripts/`).
Full agent report, lightly compressed (verbatim quotes preserved).

**Upfront clarification from the agent: "annealing" in Compoctopus means two distinct things:**
- **(A) Compile-time annealing** — `annealer.py`: deterministically unwrapping pseudocode-stub
  markers in `.🐙`/`.octo` files into executable code. The "bootstrap kernel."
- **(B) Run-time annealing** — the **RALPH loop** (`compoctopus/agents/ralph/`) + the
  **Bandit + golden-chain** layer: N stochastic agent runs over a shared workspace so the
  artifact stabilizes ("fold-over-fold"), with high-reward configs frozen/promoted across runs.

## 1. Purpose

Compoctopus is a **self-compiling agent compiler** ("compiler-compiler") that, given a
domain/task description, emits *geometrically aligned* agent systems — agents whose system
prompt, input prompt, tool surface, skills, MCP config, and state machine all reference exactly
what exists. Organizing principle: a fixed-point endomorphism **D:D→D**. From `DESIGN.md`
(labeled **Status: ASPIRATIONAL**):
> The Compoctopus is a **compiler-compiler** that produces geometrically aligned agent systems. … The pipeline is a fixed-point endomorphism **D:D→D**. The compiler can compile itself. The agents it produces can produce more agents through the same pipeline.

## 2. Key components

| Component | Path | Role |
|---|---|---|
| Annealer (compile-time) | `compoctopus/annealer.py` | Unwraps `#>> STUB / #\| code / #<< STUB` markers into executable code |
| RALPH core | `compoctopus/agents/ralph/core.py` | `launch_ralph_compoctopus(...)`: builds implementation plan, calls N-run loop |
| RALPH factory (the loop) | `compoctopus/agents/ralph/factory.py` | `run_ralph(...)`: N independent fresh-SDNAC runs over one workspace |
| RALPH prompts | `compoctopus/agents/ralph/prompts.py` | Invariant TDD agent contract |
| Launch script | `scripts/run_ralph.sh` | CA-cache gate → git worktree → launch (the file CAVE invokes) |
| Bandit | `compoctopus/bandit.py` | SELECT/CONSTRUCT with reward table — cross-run scoring/promotion |
| Golden chains | `compoctopus/golden_chains.py` | Store of graduated high-reward configs — freeze/promote |
| Geometric validator | `compoctopus/alignment.py` | Deterministic check of the 5 invariants — anti-"compound-garbage" gate |
| Reviewer arm | `compoctopus/arms/reviewer/factory.py` | LLM judge emitting PASS/FAIL |
| Chain ontology | `compoctopus/chain_ontology.py` | Chain/EvalChain/Link/ConfigLink |

External deps: `codenose` (deterministic ~1s code-smell scanner), SDNA/SDNAC, Heaven backend
(default model minimax m2.7-highspeed), `dependency_analyzer` (callgraph), `dragonbones` MCP
(skill/rule "emanation" writer). Outer scheduler: CAVE `cave/core/ralph_scheduler.py`
(confirmed: `RALPH_SCRIPT = /tmp/compoctopus_repo/scripts/run_ralph.sh`, invoked with
`[repo, code_target, requirements, n_runs]`).

## 3. The annealing loop, step by step

### 3B. RALPH fold-over-fold (the run-time mechanism)

**N independent, stateless (fresh-conversation) runs over a shared, persistent workspace.**
State accumulates only on disk (files, git), never in conversation history. Factory docstring
verbatim:
> "NOT an EvalChain. NOT a loop on history. Each run is a FRESH conversation that reads the plan + whatever exists on disk from previous runs.
> The trick: MoE lottery means some runs catch things others miss. Run 1 might code it wrong. Run 3 catches it. Run 5 says 'nothing to do'. Run 7 finds something else. The fold-over-fold erases pattern violations."

Steps in `run_ralph()`:
1. **Isolation:** `_check_git_current` (clean, not behind remote, fail-loud) → `_create_worktree` (`ralph-<timestamp>` branch under `/tmp/ralph-worktrees/`).
2. **Loop** `for i in range(n_runs)` (default 8): `_make_fresh_sdnac(...)` — brand-new SDNAC each iteration (tests assert freshness) → `await sdnac.execute({})` with EMPTY context. Everything known comes from the invariant plan file + current disk. Exceptions caught per-run.
3. **Invariant prompt:** "The prompt is INVARIANT — same every time. The workspace files on disk are what change between runs." (`_make_fresh_sdnac` docstring.)
4. **Evaluation is inside each run** (no central judge between runs): READ plan → CHECK what exists → "If work is already done and correct, say DONE and stop" → TDD (tests first, red→green, patterns only from callgraph) → run `codenose`, fix smells → "When all tests pass and codenose is clean, say DONE."
5. **Mutable state = files on disk.** No explicit freeze flag; a region is *effectively frozen* once fresh runs read it, judge it correct, and leave it alone.
6. **Convergence (behavioral):** a fresh run finds work complete and terminates DONE without changes. Final productive run: `git add/commit`, `push`, `gh pr create` — convergence materializes as **a PR on the ralph branch**.
7. **Returns** `{total_runs, results, workspace, plan_path, branch, pr_url}`; warns if no PR.
8. **Emanations:** after green, before PR, the agent writes skills/rules back into the target repo via `dragonbones` ("an understand skill for the component you worked on … Use what you learned during THIS coding session").

Note: `max_cycles` param is rebound — `n_runs = max_cycles  # reuse param name, means N independent runs`. `run_ralph.sh` defaults 8; `launch_ralph_compoctopus` defaults 5.

### 3C. Bandit + golden chains (cross-run scoring/promotion — separate axis)

`BanditRuntime.run` (`bandit.py`): LLM emits `<SELECT>arm</SELECT>` or `<SELECT>CONSTRUCT</SELECT>`.
On CONSTRUCT: pick candidate arm with max reward → run it → run **Reviewer** (LLM judge).
If `review.passed`: `rewards[arm] += 1` and result stored to `golden_chains[task_key]`;
else `rewards[arm] -= 1`. On SELECT: return cached golden chain. `golden_chains.py` verbatim:
> "When the bandit has enough evidence that a compilation config works well, it gets 'graduated' to a golden chain. Future similar tasks can then Select the golden chain instead of Constructing a new pipeline."
(LRU/TTL-bounded: `DEFAULT_MAX_CHAINS=500`, 30-day TTL.)

**Two annealing axes:** (i) RALPH stabilizes *one artifact* via N stochastic passes;
(ii) Bandit stabilizes *the choice of pipeline/config* via reward accumulation + graduation.

## 4. run_ralph.sh end-to-end

1. **CA-cache gate (hard precondition):** `/tmp/heaven_data/ca_cache/<code_target>.json` must exist ("GNOSYS must run context-alignment BEFORE launching ralph") AND its `git_commit` must equal repo HEAD ("ERROR: CA cache is stale"). Exported as `RALPH_CA_CACHE`.
2. Worktree creation (git repos) or run-in-place.
3. Source API keys; vendored `dependency_analyzer` on PYTHONPATH; call `launch_ralph_compoctopus(...)`.
4. Inside: load dependency context (CA cache preferred) → read requirements (fail-loud if empty) → **build implementation plan**: ONE markdown doc = requirements + dependency graph + full source of every file in the dependency chain in dependency order → `/tmp/ralph_runs/implementation_plan_<ts>.md`. Prompt says "Do NOT search for code — everything you need is in the plan."
5. Run the §3B loop; log to `/tmp/ralph_runs/ralph_<ts>.log`; print inspect/merge/discard instructions.

Outer accumulation (CAVE tier): file-queue jobs with cron recurrence (`every`, `not_before`, `run_count`), max 1 running.

## 5. Evaluation/acceptance machinery (layered)

- **Deterministic:** geometric validator (5 invariants: Dual Description, Capability Surface, Trust Boundary, Phase↔Template, Polymorphic Dispatch — "prevents compound garbage"); `codenose` smells; TDD tests ("Tests must be meaningful — they test real behavior, not structure").
- **LLM judge:** Reviewer arm — `passed = "PASS" in review_text.upper() and "FAIL" not in review_text.upper()` (factory line 172).
- **Reward/promotion:** Bandit ±1; golden-chain graduation.
- **Human/git gates:** CA-cache gate; git-clean preconditions; worktree+branch+PR model (RALPH never merges — human runs `git diff main..ralph-<ts>` and decides); CAVE auto-dev "gated by PR acceptance."
- **Theory framing** (`docs/02_theoretical_foundations.md`, "Thermodynamic Stability"): "Violating invariants creates compound garbage … Compound garbage eventually catastrophes … Catastrophe forces witness production that restores invariants … The only alternative to restoring invariants is system death."

## 6. Verbatim quotes

(See §3B/3C above for factory, golden-chains quotes.) Plus:
- `annealer.py`: "This is the core of the Annealing Protocol. A .🐙 file is target-language code with annealing markers that delineate stub/pseudocode regions. The annealer unwraps these markers into executable code."
- `alignment.py`: "Checks the 5 invariants that every compilation output must satisfy. This is the core safety mechanism of Compoctopus — it prevents compound garbage by catching misalignment between compilation stages."
- `run_ralph.sh` header: "1. Creates a git worktree from the starsystem repo / 2. Runs ralph N times (fresh SDNAC each, Heaven/minimax backend) / 3. Logs output to /tmp/ralph_runs/ / 4. When done, inspect: git diff main..ralph-<timestamp> / 5. If good: git merge / 6. If bad: git worktree remove"

## 7. Gaps / uncertainties (agent's own flags — important)

- **No numeric convergence threshold or freeze flag in RALPH.** Convergence is behavioral ("fresh run says DONE without changes"), no run-vs-run comparison, no diff-size stopping criterion, no early exit — always runs full n_runs. The "fold-over-fold erases violations" claim is asserted, **not verified by any in-loop check**.
- **Not literal simulated annealing.** No temperature schedule, no Metropolis acceptance, no energy function (grepped). Actual mechanism: N stateless retries + reward-based graduation.
- SDNA/Heaven internals out of scope (call sites confirmed, internals not read).
- `codenose`/`dependency_analyzer` external; smell list not inspected.
- **Bandit is NOT wired into run_ralph** — reward/golden-chain scoring is a separate subsystem; no code found where a RALPH run's outcome feeds the Bandit table. Two independent annealing mechanisms, not one integrated pipeline.
- `DESIGN.md` explicitly ASPIRATIONAL (D:D→D bootstrap, SCSPL tower = design intent).
- Two copies with minor drift; `/tmp/compoctopus_repo` is the live, CAVE-referenced clone.
