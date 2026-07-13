# Observatory Recon Report (Opus agent, 2026-06-12)

Read-only recon of `mind_of_god:/home/GOD/gnosys-plugin-v2/integration/observatory-sdna/`
(dev clone `/tmp/observatory-sdna/`). Full agent report, verbatim.

---

## 1. Purpose (one paragraph)

The **observatory** (package `observatory-sdna`, v0.2.0) is an autonomous, queue-driven **research system built on the SDNA substrate** (running LLM agents via the Heaven framework against MiniMax/Anthropic-compatible APIs). It instantiates the **scientific method as a hard-coded 5-phase pipeline** — `observe → hypothesize → propose → experiment → analyze` — embodied by a research-scientist persona ("Dr. Randy BrainBrane"). The researcher does not run code itself; in the EXPERIMENT phase it dispatches a self-contained task prompt to **"Grug" (SmartGrug)**, a separate code-execution LLM agent living in an isolated Docker-in-Docker container (`repo-lord`), which performs real work (bash/python/git/pip) and calls back with a durable execution transcript. Every phase's findings are written as **typed, named concepts into CartON** (a Neo4j-backed wiki/knowledge graph), so the whole investigation — observations, hypotheses, proposals, experiment dispatches, and final analysis — becomes a **mined, queryable, provenance-tagged record**. In the project's own conceptual language (the `_meta_observatory.md` vision doc), the "meta-observatory" is the Sanctuary System that lets the larger GNOSYS process "compile" an explanation of how it reached its own state "without context decay" — i.e., the recorder/sensor layer that turns instrumented agent execution into durable, re-mineable knowledge.

Package docstring (`observatory/__init__.py`):
> "Observatory-SDNA: Research system on MiniMax/Heaven. Researcher = SDNAC agent with tools (CartON + bash for docker exec into Grug container). Processes a research queue. Conductor/user review results externally. Grug = separate SDNAC in repo-lord container. Researcher reaches it via docker exec."

## 2. Architecture — components, paths, data flow

Canonical source: `/home/GOD/gnosys-plugin-v2/integration/observatory-sdna/` (dev clone: `/tmp/observatory-sdna/`; near-identical, dev clone lacks `connector.py`).

| File | Role |
|---|---|
| `observatory/__init__.py` | Exports `make_researcher_sdnac`, `make_researcher_compoctopus`, `PHASES`, `DEFAULT_MODEL`. |
| `observatory/config.py` | `PHASES = ["observe","hypothesize","proposal","experiment","analyze"]`; `DEFAULT_MODEL = "MiniMax-M2.7-highspeed"`. |
| `observatory/agents.py` | Researcher factory. `make_researcher_compoctopus()` builds a `CompoctopusAgent` whose `ResearcherChain` is a chain of 5 `SDNAC`s (one per phase). "Dr. Randy BrainBrane" persona. The chain IS the state machine. |
| `observatory/researcher_mcp.py` | **The recorder/sensor MCP** (`researcher-mcp`). Tools: `record_observation` (write CartON), `query_knowledge` (read CartON), `run_experiment` (dispatch Grug). Owns tag-mapping + validity cache. |
| `observatory/runner.py` | Queue runtime. `run_research()` processes the JSON research queue (START/RESUME), crash recovery, Grug-callback resume. DI'd into CAVE. |
| `observatory/grug_server.py` | Grug's FastAPI server (in `repo-lord`, port 8081). `/execute`, `/dispatch` (async + callback), `/health`. Fresh `make_grug_sdnac()` per task. |
| `observatory/grug_agent.py` | `GrugAgent(ChatAgent)` — worker agent with Heaven `BaseHeavenAgent` + `BashTool`. "NOT a PAIA." |
| `observatory/connector.py` | `GrugConnector` ABC: `SDNACConnector` (blocking) and `ClaudePConnector` (tmux bridge into `claude -p` container, polls `GRUG_DONE`). |
| `observatory/relay_position.py` | `RelayPosition` — DUO position relaying tasks to remote containerized agents via sancrev `/agents/{id}/execute`. |
| `observatory/state_machine.py` | Lightweight `StateMachine` (legacy Runner path). |
| `mcp_server.py` | Orchestration MCP for Conductor: `queue_research`, `get_research_queue`, `research_status`, `run_next_research`. |
| `container/` | Dockerfile/compose/entrypoint for `repo-lord` DinD (privileged, dockerd + tmux + grug_server, port 8081, `PARENT_URL=http://mind_of_god:8080`). |

**CAVE/sancrev integration** (`application/sanctuary-revolution/`):
- `agents/researcher_agent.py` — `ResearcherAgent(ServiceAgent)`: "Thin CAVE shell. ALL logic lives in observatory.runner."
- `harness/server/sancrev_routes.py` — `POST /research/run` (dispatch OR `write_resume` on grug_history_path), `GET /research/status`; auto-resume on startup.
- `harness/server/waking_dreamer.py` — `_wire_researcher_runtime()` registers ResearcherAgent (Discord notify channel).

**End-to-end flow:** enqueue (`queue_research` → `/tmp/heaven_data/observatory/research_queue.json`) → dispatch (`POST /research/run`, single global asyncio.Lock) → 5-phase chain, each phase a **fresh memoryless LLM conversation**, CartON the only inter-phase memory; each phase calls `record_observation` then `TaskSystemTool(goal_accomplished)` → EXPERIMENT writes proposal to `/tmp/experiment.md` in repo-lord and POSTs `/dispatch` with `callback_url` → Grug runs, writes Heaven history JSON, calls back → chain pauses after EXPERIMENT; callback marks queue `resume`; ANALYZE reads Grug's transcript via `NetworkEditTool(target_container='repo-lord')`, synthesizes, records conclusions → humans review via `research_status`/Discord.

## 3. Sensors → durable records → storage

**Sensors:** researcher's per-phase reasoning (via `record_observation`); Grug's execution (Heaven history JSON at `repo-lord:/tmp/heaven_data/agents/grug/memories/histories/{date}/{id}.json`); turn-by-turn `EventBroadcaster` → Discord (live, not durable).

**Forced invariant tag mapping** (verbatim, `researcher_mcp.py` header):
> "Tag mapping (forced, invariant): insight_moment → observation (what was found); struggle_point → uncertain_aspects (what's unknown); daily_action → phase (observe/hypothesize/propose/experiment/analyze); implementation → occurred_when_i_was (what the researcher was doing); emotional_state → confidence (Researcher_Confidence_{Level}_{date}_{score})."

Each concept carries provenance edges: `is_a`, `instantiates` (`Scientific_Method_{Phase}`), `has_actual_domain`/`has_domain`, `part_of` the investigation. Records tagged by who/phase/investigation/when/confidence (0–100).

**Storage:** CartON graph (async observation queue → background daemon → Neo4j; 15s/30s lag absorbers); per-investigation **validity cache** `/tmp/heaven_data/observatory/validity/{investigation}.json` (`valid_at`/`invalid_at`/`revalidated_at` — live files confirm real runs); research queue JSON; researcher memory bridge (`researcher_memory.md`, `researcher_prior_concepts.md` — injected via `prompt_suffix_blocks`); Grug transcripts.

## 4. Connection to SDNA / CAVE / chain ontology

- **SDNA:** phases are `sdna.sdna.SDNAC` (HermesConfig/HeavenInputs); Grug is an SDNAC; `RelayPosition` is a DUO position.
- **Chain ontology:** `agents.py` imports `from sdna.chain_ontology import Chain, LinkResult, LinkStatus`; `ResearcherChain(Chain)`; "The Chain IS the state machine — Python controls phase transitions." Grug dispatch (older variant) is a `compoctopus.chain_ontology.FunctionLink`.
- **CAVE:** observatory = logic; CAVE = host (ServiceAgent, HTTP routes, channels, EventBroadcaster).

## 5. Evaluation / acceptance / review

- **Confidence scoring:** every record requires confidence level + 0–100 score (`Researcher_Confidence` concepts).
- **Validity/acceptance gate:** `mark_valid` on creation; `invalidate_investigation` at new-run start; `revalidate_concept`; `query_knowledge` filters invalid; pre-validity-era concepts rejected.
- **Phase acceptance:** `TaskSystemTool(goal_accomplished)` required; chain advances only on SUCCESS, else stops with `resume_path`. Runner handles `awaiting_grug`/`error`/`completed`/`busy`/`empty` + crash recovery.
- **Human loop at the ends:** enqueue + external review ("Conductor/user review results externally").
- **Planned, unimplemented:** `run_autoresearch` — a DUO that "meta-researches the Researcher itself," with **OVP as meta-reviewer that evaluates research quality and tunes the Researcher.** Stub only.

## 6. Verbatim quotes

1. `researcher_mcp.py`: "Researcher MCP — typed scientific method tools for the researcher agent. Write: record_observation — persist phase results to CartON. Read: query_knowledge — query CartON wiki graph (researcher + grug collections). The researcher agent gets THIS MCP. Nobody else."
2. `agents.py`: "Phase sequencing controlled by Chain, not by LLM state machine. CartON carries context between phases via researcher_mcp tools. … Each SDNAC is a fresh LLM conversation. No KeywordBasedStateMachine. The Chain IS the state machine — Python controls phase transitions. Between PROPOSE and EXPERIMENT, the FunctionLink dispatches work to Grug."
3. `runner.py`: "Observatory research queue runner. The missing piece between the factory (make_researcher_compoctopus) and CAVE. This module owns ALL queue logic. CAVE's ResearcherAgent DIs this as its runtime."
4. `grug_agent.py`: "GrugAgent is NOT a PAIA. It's a worker agent inside the Observatory. But it uses the same container communication primitives that PAIAs will use."
5. `doc-mirror-system/docs/vision/_meta_observatory.md` (marked VERBATIM/immutable): "GNOSYS is the self-knowing reflective state of crowning within a helming process which is a meta-control generation process over a blanket closing during forward chaining operations… such that it knows how it is towering due to its chaining. In which case, it is able to predict how to predict its own future states such as to tower the stabilizer and compile its meta-observatory, which is a 'Sanctuary System' that explains to it, through progressive disclosure, how to continue the compound operations that got it there, without context decay."
6. `mcp_server.py` (future work): "run_autoresearch will be a DUO that meta-researches the Researcher itself… OVP = meta-reviewer that evaluates research quality and tunes Researcher."

## 7. Gaps / uncertainties (agent's own flags)

- Two meanings of "observatory": the shipped research system vs. the `_meta_observatory.md` "Sanctuary System" vision; the link is conceptual/aspirational.
- **Stale tests**: `tests/test_agents.py`, `test_runner.py` import symbols that no longer exist (`Runner`, `make_grug_sdnac` from agents, `GRUG_MODEL`, etc.) — suite not updated after the CompoctopusAgent refactor.
- Legacy dual paths: `KeywordBasedStateMachine` + FunctionLink/httpx dispatch present but inactive; active path = CompoctopusAgent + `run_experiment` MCP tool.
- `run_autoresearch`/OVP meta-review unimplemented.
- CartON ingestion daemon not traced end-to-end.
- `repo-lord` runtime status not verified (read-only recon).
- `connector.py`/`relay_position.py` appear to be alternative/older exec backends, not on the default path.
