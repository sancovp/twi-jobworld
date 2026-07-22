"""render.py — THE render step (config COMPILES the instance).

THE PATTERN (DESIGN.md §2): one config file drives everything. This is the single
deterministic step that reads an instance's `config.json` + `.secrets/mcp_state.json` and
COMPILES them into the Claude-Code component layout the CEO + workers actually run on:

    config.json + .secrets/mcp_state.json
        │  render_instance()
        ▼
    CLAUDE.md                         global business context + how-work-flows (CEO + all workers see it)
    agents/CEO.md                     the CEO persona (SDK append_system_prompt / tmux role)
    .claude/agents/<worker>.md        one worker persona per department agent (Task-spawned, isolated)
    .claude/rules/00-business-context.md   business context detail (loads for workers too)
    .claude/rules/01-scope-guardrails.md   hard guardrails
    skills/run-dept-<dept>/SKILL.md   the department process skill (MCPs-in-skills)
    .mcp.json                         the MCP servers this config references, env injected from .secrets

This is NOT a magic renderer and it does NOT parametrize a frozen machine — it is a small
deterministic formatter that code-generates the system from the config, mirroring the existing
`skills/instantiate-jobworld/instantiate.sh` (company → CLAUDE.md) and
`skills/generate-employee/generate.sh` (config → agent .md + dept skill + slugify). The
business/department *procedure* is prompt-plane (the CEO reads the skills this emits); this step
only formats.

Secrets law: keys come ONLY from `.secrets/mcp_state.json` and are injected ONLY into each MCP
server's `env` in `.mcp.json`. They are NEVER written into CLAUDE.md, a rule, a skill, or an
agent file — so no LLM ever reads a key.

Stdlib only — importable by the server (frontend calls it on config-save) AND runnable standalone
(the dry-run test renders a fixture with it):

    python -m server.render --dir /path/to/instance
    python server/render.py /path/to/instance
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


# ============================================================================
# MCP server templates — how each MCP `type` launches, and which env keys it
# pulls from its .secrets block. Verified 2026-07-22:
#   instantly → official instantly-cli MCP (env INSTANTLY_API_KEY)
#   apollo    → community apollo-io-mcp-server (env APOLLO_API_KEY), headless, api-key (no OAuth expiry)
# To add an MCP type: add a template here + a block in .secrets/mcp_state.json. Nothing else changes.
# ============================================================================
RENDER_MCP_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "instantly": {
        "command": "npx",
        "args": ["instantly-cli", "mcp"],
        "env_keys": ["INSTANTLY_API_KEY"],
    },
    "apollo": {
        "command": "npx",
        "args": ["apollo-io-mcp-server@latest"],
        "env_keys": ["APOLLO_API_KEY"],
    },
}


def slugify(s: str) -> str:
    """Same slug rule generate.sh uses: non-alnum → '-', lowercased, collapsed, trimmed."""
    s = re.sub(r"[^a-zA-Z0-9]", "-", s).lower()
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ============================================================================
# LOAD
# ============================================================================

def load_config(instance_dir: Path) -> dict:
    """Load config.json, falling back to config.example.json (the base ships only the example)."""
    live = instance_dir / "config.json"
    example = instance_dir / "config.example.json"
    path = live if live.exists() else example
    if not path.exists():
        raise FileNotFoundError(f"No config.json or config.example.json in {instance_dir}")
    return json.loads(path.read_text())


def load_secrets(instance_dir: Path) -> dict:
    """Load .secrets/mcp_state.json (or the example). Empty dict if neither exists (render still runs;
    .mcp.json gets empty env values, which the frontend fills later)."""
    for name in ("mcp_state.json", "mcp_state.example.json"):
        p = instance_dir / ".secrets" / name
        if p.exists():
            return json.loads(p.read_text())
    return {}


# ============================================================================
# TEMPLATE BUILDERS (pure str -> str; no I/O)
# ============================================================================

def _dept_roster_lines(departments: List[dict]) -> str:
    lines = []
    for d in departments:
        agents = ", ".join(a.get("name", "?") for a in d.get("agents", []))
        skill = f"skills/run-dept-{slugify(d['name'])}/SKILL.md"
        lines.append(
            f"- **{d['name']}** — {d.get('purpose','')}"
            + (f"  _(agents: {agents})_" if agents else "")
            + f"  · skill: `{skill}`"
        )
    return "\n".join(lines)


def _ceo_role_block(company: dict, departments: List[dict]) -> str:
    """The CEO operating role — inlined in CLAUDE.md (tmux main-agent path) AND written to
    agents/CEO.md verbatim (SDK append_system_prompt path). ONE source, two outputs."""
    return f"""You are the **CEO of {company.get('name','the company')}**. You run the company; you do not do the departments' work yourself.

Every heartbeat / round, in order:
1. Review work waiting on you — `GET /api/tasks/supposedly-done`. Mark each `complete` or send it back (`POST /api/ceo-review`).
2. Look at open work — `GET /api/tasks/open`. Assign or create tasks toward the current goals.
3. Run a department by reading its skill (the exact path is on each department's roster line below). Follow it; the department's worker agents and MCP tools are wired for you.
4. Report any blocker with the *specific missing input* (an API key, a compliance value, a decision). Never fabricate a value to get past a blocker.
5. Use `supposedly_done` only when a task is genuinely finished and ready for your review.

Departments:
{_dept_roster_lines(departments)}"""


def build_claude_md(config: dict) -> str:
    company = config.get("company", {})
    departments = config.get("departments", [])
    return f"""# {company.get('name','Company')}

{company.get('mission','')}

> This file is COMPILED from `config.json` by `server/render.py`. Do not hand-edit — edit the config (or the frontend config panel) and re-render.

## Business context
{company.get('context','')}

See `.claude/rules/00-business-context.md` for the full context and `.claude/rules/01-scope-guardrails.md` for the hard guardrails — both load for every agent, including Task-spawned workers.

## Your role (CEO)
{_ceo_role_block(company, departments)}

## How work flows
- The CEO drives rounds; departments execute. Each department has a skill at `skills/run-dept-<dept>/SKILL.md` that explains its process and the MCP tools it uses (tools = MCPs wrapped in skills — the worker follows a directed skill, never raw tools ad-hoc).
- Worker agents live in `.claude/agents/` and run in isolated context (Task-spawned). Their MCPs are declared per-agent.
- Ground truth is the Jobworld store (the `/api/*` surface). Treat it as authoritative.
"""


def build_ceo_persona(config: dict) -> str:
    company = config.get("company", {})
    departments = config.get("departments", [])
    return f"""---
name: {slugify(company.get('name','company'))}-ceo
description: CEO of {company.get('name','the company')} — drives rounds, reviews work, runs departments.
agentType: general-purpose
model: claude-sonnet-4-6
---

# CEO — {company.get('name','Company')}

{_ceo_role_block(company, departments)}
"""


def build_worker_agent(company: dict, dept: dict, agent: dict) -> str:
    """One worker persona. Mirrors generate.sh's agent template + declares the dept's MCPs."""
    company_slug = slugify(company.get("name", "company"))
    dept_slug = slugify(dept["name"])
    agent_slug = slugify(agent.get("name", "agent"))
    caps = agent.get("capabilities", [])
    mcps = dept.get("mcps", [])
    cfg = agent.get("config", {})

    mcp_yaml = ""
    if mcps:
        mcp_yaml = "mcpServers:\n" + "".join(f"  - {m}\n" for m in mcps)
    caps_md = "\n".join(f"- {c}" for c in caps) or "- (none declared)"
    cfg_block = json.dumps(cfg, indent=2) if cfg else "{}"

    return f"""---
name: {company_slug}-{dept_slug}-{agent_slug}
description: {', '.join(caps) if caps else 'worker'} for {company.get('name','')} {dept['name']}
version: 1.0.0
tags: [{dept_slug}, {company_slug}]
agentType: {agent.get('agentType','general-purpose')}
model: claude-sonnet-4-6
{mcp_yaml}---

# {company.get('name','Company')} · {dept['name']} — {agent.get('name','Agent')}

## Role
{agent.get('name','Agent')} for the **{dept['name']}** department. {dept.get('purpose','')}

## Capabilities
{caps_md}

## Your config (from the one config file)
```json
{cfg_block}
```

## Operating contract
- **Read `skills/run-dept-{dept_slug}/SKILL.md` before doing work** — it is your directed procedure.
- Use your MCP tools ({', '.join(mcps) if mcps else 'none'}) only as the department skill directs — never raw/ad-hoc.
- Treat the Jobworld store as authoritative. Write evidence for completed work.
- Use `supposedly_done` only when ready for CEO verification. Never claim done without evidence.
- Report blockers explicitly with the missing input (key, value, decision). Never fabricate a value.

_Compiled by render.py at {_now()}._
"""


def build_dept_skill(company: dict, dept: dict) -> str:
    """The department process skill (MCPs-in-skills). Explains the process + the MCP tools, and wires
    the DRY-RUN TEST: in test mode the MCP tools return a typed TEST signal — the worker just reports
    that the step works, and the test asserts the type/values independently (producer ≠ asserter)."""
    dept_slug = slugify(dept["name"])
    agents = dept.get("agents", [])
    mcps = dept.get("mcps", [])
    agent_lines = "\n".join(
        f"- `{a.get('name','Agent')}` — {', '.join(a.get('capabilities', [])) or 'worker'}"
        for a in agents
    ) or "- (no agents configured)"
    mcp_line = ", ".join(mcps) if mcps else "none"

    return f"""---
name: run-dept-{dept_slug}
description: How the CEO runs the {dept['name']} department for {company.get('name','the company')}.
---

# {company.get('name','Company')} · {dept['name']}

{dept.get('purpose','')}

## Agents
{agent_lines}

## MCP tools available
{mcp_line} — these are wired in `.mcp.json`. Tools = MCPs wrapped in this skill: call them ONLY as the process below directs.

## Process
1. Read this department's agents' config (their `.claude/agents/*.md`) for the targeting / copy / compliance values.
2. Drive the department's step(s) using the MCP tools above.
3. Record evidence to the Jobworld store; mark the task `supposedly_done` for CEO review.

## DRY-RUN (test) mode
When a file `.test/jwtest.py` exists in this instance, the department is in **dry-run test mode**: a
test CLI stands in for the real MCP RPC. Do NOT call the real MCP tools — instead:
1. Run `python3 .test/jwtest.py --list` to get the ordered steps.
2. For THIS department (MCPs: {mcp_line}), call each of its steps exactly once, in order, via
   `python3 .test/jwtest.py <step>` (pass `--campaign-id <id>` for the instantly steps, reusing the id
   the create step returns).
3. Each call prints a **typed TEST signal** `{{"_test": true, "step": ..., "type": ..., "message": "THIS IS A TEST — <step> works", "value": ...}}`. Report each one back — do NOT invent values.
The test harness reads the trace these calls append and asserts the types/values INDEPENDENTLY
(producer ≠ asserter). This proves the whole flow end-to-end without sending anything real.
"""


def build_business_rules(config: dict) -> Dict[str, str]:
    company = config.get("company", {})
    return {
        "00-business-context.md": f"""# Business context — {company.get('name','')}

{company.get('context','')}

_(Compiled from config.json. Loads for the CEO and every Task-spawned worker.)_
""",
        "01-scope-guardrails.md": f"""# Scope guardrails — {company.get('name','')} (obey always)

{company.get('scope_rules','(none specified)')}

_(Compiled from config.json. These are hard limits on the whole company.)_
""",
    }


def build_mcp_json(config: dict, secrets: dict) -> dict:
    """Build .mcp.json for exactly the MCP servers this config's departments reference. Env values are
    injected from .secrets; a missing/empty secret renders as "" (the frontend fills it, then re-renders)."""
    referenced: List[str] = []
    for dept in config.get("departments", []):
        for m in dept.get("mcps", []):
            if m not in referenced:
                referenced.append(m)

    servers_cfg = config.get("mcp_servers", {})
    out: Dict[str, Any] = {}
    for name in referenced:
        spec = servers_cfg.get(name, {"type": name, "secret_ref": name})
        mtype = spec.get("type", name)
        template = RENDER_MCP_TEMPLATES.get(mtype)
        if not template:
            # Unknown MCP type — skip with a marker rather than fabricate a launch command.
            out[name] = {"_error": f"no render template for MCP type '{mtype}'"}
            continue
        secret_block = secrets.get(spec.get("secret_ref", name), {})
        env = {k: str(secret_block.get(k, "")) for k in template["env_keys"]}
        out[name] = {
            "command": template["command"],
            "args": list(template["args"]),
            "env": env,
        }
    return {"mcpServers": out}


# ============================================================================
# RENDER (the one step)
# ============================================================================

def render_instance(instance_dir: str | Path) -> dict:
    """Compile config.json + .secrets/mcp_state.json → the full instance layout. Returns a manifest of
    written paths (relative to instance_dir). Idempotent: re-running with the same config reproduces the
    same files. Called by the server on config-save and standalone by the dry-run test."""
    instance_dir = Path(instance_dir)
    config = load_config(instance_dir)
    secrets = load_secrets(instance_dir)
    company = config.get("company", {})
    written: List[str] = []

    def _write(rel: str, content: str):
        p = instance_dir / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)
        written.append(rel)

    # 1. CLAUDE.md — global business context + CEO role + how-work-flows
    _write("CLAUDE.md", build_claude_md(config))

    # 2. agents/CEO.md — CEO persona (SDK append / tmux role)
    _write("agents/CEO.md", build_ceo_persona(config))

    # 3. business-context rules (load for workers too)
    for name, body in build_business_rules(config).items():
        _write(f".claude/rules/{name}", body)

    # 4. per-department: worker personas + the dept process skill
    for dept in config.get("departments", []):
        dept_slug = slugify(dept["name"])
        _write(f"skills/run-dept-{dept_slug}/SKILL.md", build_dept_skill(company, dept))
        for agent in dept.get("agents", []):
            company_slug = slugify(company.get("name", "company"))
            agent_slug = slugify(agent.get("name", "agent"))
            fname = f"{company_slug}-{dept_slug}-{agent_slug}.md"
            _write(f".claude/agents/{fname}", build_worker_agent(company, dept, agent))

    # 5. .mcp.json — env injected from .secrets
    mcp_json = build_mcp_json(config, secrets)
    _write(".mcp.json", json.dumps(mcp_json, indent=2) + "\n")

    return {
        "instance_dir": str(instance_dir),
        "company": company.get("name", ""),
        "runtime": config.get("runtime", "tmux-anthropic"),
        "departments": [d["name"] for d in config.get("departments", [])],
        "mcp_servers": list(mcp_json["mcpServers"].keys()),
        "written": written,
        "rendered_at": _now(),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Compile a jobworld instance from its config.")
    ap.add_argument("dir", nargs="?", help="instance directory (positional)")
    ap.add_argument("--dir", dest="dir_opt", help="instance directory (flag form)")
    args = ap.parse_args(argv)
    instance_dir = args.dir_opt or args.dir
    if not instance_dir:
        ap.error("instance directory required (positional or --dir)")
    manifest = render_instance(instance_dir)
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
