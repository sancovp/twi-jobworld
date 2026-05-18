"""JobworldAgent — CAVEAgent subclass for Jobworld business instances.

Single-agent CAVE: one Claude Code CEO attached via tmux.
Heart provides the heartbeat. Store persists to data.json + events.jsonl.

Usage:
    agent = JobworldAgent(jobworld_dir="/path/to/instance", port=3847)
"""
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from cave.core.cave_agent import CAVEAgent
from cave.core.calendar import Calendar
from cave.core.blockage_store import BlockageStore
from cave.core.config import CAVEConfig
from cave.core.models import MainAgentConfig

logger = logging.getLogger(__name__)

# Business domain enum — general business function buckets
DOMAIN_ENUM = [
    "ops", "sales", "marketing", "engineering", "finance",
    "hr", "legal", "admin", "research", "content",
    "growth", "support", "bi", "product",
]


class JobworldAgent(CAVEAgent):
    """Jobworld implementation of CAVEAgent. Single-agent: main Claude Code CEO."""

    def __init__(
        self,
        jobworld_dir: str,
        port: int = 3847,
        tmux_session: str = "cave",
    ):
        self.jobworld_dir = Path(jobworld_dir)

        # Jobworld store
        self.store: Dict[str, Any] = {
            "company": None,
            "departments": {},
            "agents": {},
            "projects": {},
            "milestones": {},
            "goals": {},
            "tasks": {},
            "day": 1,
            "day_started_at": datetime.now().isoformat(),
            "activeFlows": {},
            "sops": {},
            "sop_patterns": {},
        }

        self._ws_clients: set = set()
        self.last_input_at: float = 0

        config = CAVEConfig(
            port=port,
            main_agent_config=MainAgentConfig(
                agent_id="ceo",
                tmux_session=tmux_session,
                working_dir=str(self.jobworld_dir),
                command="claude",
            ),
        )

        self._load_data()
        super().__init__(config=config)
        self._wire_ceo_heartbeat()

        logger.info(
            "JobworldAgent initialized: dir=%s port=%d tmux=%s",
            self.jobworld_dir, port, tmux_session,
        )

    # ========================================
    # CEO HEARTBEAT
    # ========================================

    def _wire_ceo_heartbeat(self, interval: float = 300.0):
        from cave.core.mixins.anatomy import Tick
        self._last_heartbeat_at = 0

        def _ceo_heartbeat_tick():
            if self.main_agent is None:
                return
            now = time.time()
            idle_time = now - max(self.last_input_at, self._last_heartbeat_at)
            if idle_time < interval:
                return
            hb_path = self.jobworld_dir / "HEARTBEAT.md"
            if hb_path.exists():
                prompt = hb_path.read_text().strip()
            else:
                prompt = self._default_heartbeat_prompt()
            if not prompt:
                return
            self.main_agent.send_keys(prompt)
            time.sleep(0.5)
            self.main_agent.send_keys("Enter")
            time.sleep(0.5)
            self.main_agent.send_keys("Enter")
            self._last_heartbeat_at = time.time()
            logger.info("CEO heartbeat fired (%d chars)", len(prompt))

        self.heart.add_tick(Tick(
            name="ceo_heartbeat",
            callback=_ceo_heartbeat_tick,
            every=30.0,
        ))

    def _default_heartbeat_prompt(self) -> str:
        company_name = self.store["company"]["name"] if self.store.get("company") else "the company"
        port = self.config.port
        supposedly_done = [t for t in self.store["tasks"].values() if t["status"] == "supposedly_done"]
        open_tasks = [t for t in self.store["tasks"].values() if t["status"] == "open"]

        lines = [f"CEO heartbeat for {company_name}. Check status and take action."]
        if supposedly_done:
            lines.append(f"{len(supposedly_done)} tasks pending your review — curl http://localhost:{port}/api/tasks/supposedly-done")
        if open_tasks:
            lines.append(f"{len(open_tasks)} open tasks waiting for agents.")
        if not supposedly_done and not open_tasks:
            lines.append("All clear. Review events and plan next round.")
        lines.append(f"Dashboard: http://localhost:{port}")
        return " ".join(lines)

    # ========================================
    # PERSISTENCE
    # ========================================

    def _data_path(self) -> Path:
        return self.jobworld_dir / "event-stream" / "data.json"

    def _events_path(self) -> Path:
        return self.jobworld_dir / "event-stream" / "events.jsonl"

    def _load_data(self):
        path = self._data_path()
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text())
            for key in self.store:
                if key in data:
                    self.store[key] = data[key]
        except Exception as e:
            logger.error("Failed to load data: %s", e)

    def _save_data(self):
        path = self._data_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.store, indent=2))

    def _append_event(self, event: dict):
        path = self._events_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a") as f:
            f.write(json.dumps(event) + "\n")

    def _load_events(self) -> List[dict]:
        path = self._events_path()
        if not path.exists():
            return []
        events = []
        for line in path.read_text().splitlines():
            if line.strip():
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
        return events

    # ========================================
    # BROADCAST (WebSocket for dashboard)
    # ========================================

    def broadcast(self, message: dict):
        import asyncio
        data = json.dumps(message)
        dead = set()
        for ws in self._ws_clients:
            try:
                asyncio.create_task(ws.send_text(data))
            except Exception:
                dead.add(ws)
        self._ws_clients -= dead

    # ========================================
    # ENTITY CREATION
    # ========================================

    def create_company(self, name: str) -> dict:
        company = {
            "id": f"company-{int(time.time() * 1000)}",
            "name": name,
            "dept_ids": [],
            "project_ids": [],
            "created_at": datetime.now().isoformat(),
        }
        self.store["company"] = company
        self._save_data()
        return company

    def create_department(self, name: str) -> dict:
        dept = {
            "id": f"dept-{int(time.time() * 1000)}",
            "name": name,
            "agents": [],
            "created_at": datetime.now().isoformat(),
        }
        self.store["departments"][dept["id"]] = dept
        if self.store["company"]:
            self.store["company"]["dept_ids"].append(dept["id"])
        self._save_data()
        return dept

    def create_agent(self, dept_id: str, name: str, agent_file_path: str = "") -> dict:
        agent = {
            "id": f"agent-{int(time.time() * 1000)}",
            "dept_id": dept_id,
            "name": name,
            "status": "idle",
            "current_task_id": None,
            "agent_file_path": agent_file_path,
            "created_at": datetime.now().isoformat(),
        }
        self.store["agents"][agent["id"]] = agent
        dept = self.store["departments"].get(dept_id)
        if dept:
            dept["agents"].append(agent["id"])
        self._save_data()
        return agent

    def create_project(self, name: str, description: str = "") -> dict:
        project = {
            "id": f"project-{int(time.time() * 1000)}",
            "name": name,
            "description": description,
            "milestones": [],
            "created_at": datetime.now().isoformat(),
        }
        self.store["projects"][project["id"]] = project
        if self.store["company"]:
            self.store["company"]["project_ids"].append(project["id"])
        self._save_data()
        return project

    def create_milestone(self, project_id: str, description: str, deadline: str = "") -> dict:
        milestone = {
            "id": f"milestone-{int(time.time() * 1000)}",
            "project_id": project_id,
            "description": description,
            "deadline": deadline,
            "status": "pending",
            "goals": [],
            "created_at": datetime.now().isoformat(),
        }
        self.store["milestones"][milestone["id"]] = milestone
        project = self.store["projects"].get(project_id)
        if project:
            project["milestones"].append(milestone["id"])
        self._save_data()
        return milestone

    def create_goal(self, milestone_id: str, description: str) -> dict:
        goal = {
            "id": f"goal-{int(time.time() * 1000)}",
            "milestone_id": milestone_id,
            "description": description,
            "status": "pending",
            "tasks": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        self.store["goals"][goal["id"]] = goal
        milestone = self.store["milestones"].get(milestone_id)
        if milestone:
            milestone["goals"].append(goal["id"])
        self._save_data()
        return goal

    def create_task(self, goal_id: str, dept: str, description: str) -> dict:
        task = {
            "id": f"task-{int(time.time() * 1000)}",
            "goal_id": goal_id,
            "dept": dept,
            "agent_id": None,
            "description": description,
            "status": "open",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        self.store["tasks"][task["id"]] = task
        goal = self.store["goals"].get(goal_id)
        if goal:
            goal["tasks"].append(task["id"])
        self._save_data()
        return task

    # ========================================
    # EVENT PROCESSING
    # ========================================

    def emit_event(self, event: dict) -> dict:
        event["timestamp"] = datetime.now().isoformat()

        # Auto-fill business from company name
        if self.store.get("company"):
            event.setdefault("business", self.store["company"]["name"])

        # Validate domain if provided
        obs = event.get("observation", {}) or {}
        if obs.get("domain") and obs["domain"] not in DOMAIN_ENUM:
            logger.warning("Unknown domain '%s' — expected one of %s", obs["domain"], DOMAIN_ENUM)

        self._append_event(event)

        # Check if legacy SOP flow event (sop_start/sop_end)
        if self._handle_sop_event(event):
            self.broadcast({"type": "event", "data": event})
            return {"success": True}

        # Process observation to update task/goal status
        self._process_observation(event)

        # Accumulate into SOP patterns (emergent, by process name)
        self._accumulate_sop_pattern(event)

        # Record into legacy active flows
        self._record_flow_event(event)

        self.broadcast({"type": "event", "data": event})
        return {"success": True}

    def _process_observation(self, event: dict):
        obs = event.get("observation", {}) or {}
        goal_id = obs.get("goal_id")
        task_id = obs.get("task")
        status = obs.get("status")

        goal = self.store["goals"].get(goal_id)
        task = self.store["tasks"].get(task_id)
        if not goal or not task:
            return

        if status == "completed":
            task["status"] = "supposedly_done"
            task["result"] = obs.get("desc", "")
            task["updated_at"] = datetime.now().isoformat()
        elif status == "blocked":
            task["status"] = "blocked"
            task["blocked_reason"] = obs.get("desc", "")
            task["updated_at"] = datetime.now().isoformat()

        # Recalculate goal status
        goal_tasks = [self.store["tasks"].get(t) for t in goal["tasks"] if self.store["tasks"].get(t)]
        all_done = goal_tasks and all(t["status"] in ("supposedly_done", "complete") for t in goal_tasks)
        any_blocked = any(t["status"] == "blocked" for t in goal_tasks)

        if all_done and not any_blocked:
            goal["status"] = "pending"
        elif any_blocked:
            goal["status"] = "not"
        goal["updated_at"] = datetime.now().isoformat()

        # Free agent if task completed
        if status == "completed" and task.get("agent_id"):
            agent = self.store["agents"].get(task["agent_id"])
            if agent:
                agent["status"] = "idle"
                agent["current_task_id"] = None

        self._save_data()

    # ========================================
    # SOP PATTERN ACCUMULATION (emergent)
    # ========================================

    def _accumulate_sop_pattern(self, event: dict):
        """Group events by process name into SOP patterns.

        Any event with observation.process gets accumulated into a pattern.
        Patterns are raw material — harvest them to create replayable SOPs (skills).
        """
        obs = event.get("observation", {}) or {}
        process = obs.get("process")
        if not process:
            return

        pattern_key = process.lower().replace(" ", "_")
        if pattern_key not in self.store["sop_patterns"]:
            self.store["sop_patterns"][pattern_key] = {
                "process": process,
                "domain": obs.get("domain", ""),
                "subdomain": obs.get("subdomain", ""),
                "first_seen": event["timestamp"],
                "last_seen": event["timestamp"],
                "event_count": 0,
                "agents_involved": [],
                "depts_involved": [],
                "steps": [],
            }

        pattern = self.store["sop_patterns"][pattern_key]
        pattern["last_seen"] = event["timestamp"]
        pattern["event_count"] += 1

        # Track which agents and depts are involved
        source = event.get("source", "")
        if source and source not in pattern["agents_involved"]:
            pattern["agents_involved"].append(source)
        dept = obs.get("dept", "")
        if dept and dept not in pattern["depts_involved"]:
            pattern["depts_involved"].append(dept)

        # Update domain/subdomain if provided (latest wins)
        if obs.get("domain"):
            pattern["domain"] = obs["domain"]
        if obs.get("subdomain"):
            pattern["subdomain"] = obs["subdomain"]

        # Accumulate step
        pattern["steps"].append({
            "order": pattern["event_count"],
            "agent": source,
            "dept": dept,
            "action": obs.get("desc", ""),
            "instructions": obs.get("instructions", ""),
            "type": obs.get("type", "generic"),
            "kv": obs.get("kv", {}),
            "status": obs.get("status", "unknown"),
            "timestamp": event["timestamp"],
        })

        self._save_data()

    # ========================================
    # SOP HARVEST — pattern → skills
    # ========================================

    def harvest_sop(self, pattern_key: str) -> dict:
        """Convert an SOP pattern into skills at the right scope.

        Determines scope from depts_involved:
        - 1 dept, 1 agent → agent-scoped skill
        - 1 dept, N agents → dept-scoped skill (resource under run-dept-{x})
        - N depts → business-scoped skill (under {business}-sops)

        Returns harvest result with paths to created skills.
        """
        pattern = self.store["sop_patterns"].get(pattern_key)
        if not pattern:
            return {"error": f"Pattern '{pattern_key}' not found"}

        company_name = self.store["company"]["name"] if self.store.get("company") else "jobworld"
        slug = pattern_key.replace("_", "-")
        n_depts = len(pattern["depts_involved"])
        n_agents = len(pattern["agents_involved"])

        # Build the skill content from pattern steps
        skill_body = self._build_skill_from_pattern(pattern)

        # Determine scope and place the skill
        created_paths = []

        if n_depts > 1:
            # Business-wide: multi-dept SOP → {business}-sops skill
            sops_dir = self.jobworld_dir / "skills" / f"{company_name.lower().replace(' ', '-')}-sops"
            sops_dir.mkdir(parents=True, exist_ok=True)
            skill_path = sops_dir / f"{slug}.md"
            skill_path.write_text(skill_body)
            created_paths.append(str(skill_path))

            # Ensure top-level SKILL.md exists
            top_skill = sops_dir / "SKILL.md"
            if not top_skill.exists():
                top_skill.write_text(
                    f"---\nname: {company_name.lower().replace(' ', '-')}-sops\n"
                    f"description: Business-wide SOPs for {company_name}\n---\n\n"
                    f"# {company_name} SOPs\n\nBusiness-wide standard operating procedures.\n"
                    f"Check resources/ for individual SOPs.\n"
                )
            created_paths.append(str(top_skill))

        elif n_depts == 1:
            dept = pattern["depts_involved"][0]
            dept_slug = dept.lower().replace(" ", "-")

            if n_agents == 1:
                # Agent-scoped: single agent process
                agent_name = pattern["agents_involved"][0]
                agent_slug = agent_name.lower().replace(" ", "-")
                skill_dir = self.jobworld_dir / "skills" / f"agent-sop-{agent_slug}"
                skill_dir.mkdir(parents=True, exist_ok=True)
                skill_path = skill_dir / "SKILL.md"
                skill_path.write_text(skill_body)
                created_paths.append(str(skill_path))
            else:
                # Dept-scoped: resource under run-dept-{x}
                dept_dir = self.jobworld_dir / "skills" / f"run-dept-{dept_slug}" / "resources"
                dept_dir.mkdir(parents=True, exist_ok=True)
                skill_path = dept_dir / f"dept-sop-{slug}.md"
                skill_path.write_text(skill_body)
                created_paths.append(str(skill_path))
        else:
            # No dept info — default to business-wide
            sops_dir = self.jobworld_dir / "skills" / f"{company_name.lower().replace(' ', '-')}-sops"
            sops_dir.mkdir(parents=True, exist_ok=True)
            skill_path = sops_dir / f"{slug}.md"
            skill_path.write_text(skill_body)
            created_paths.append(str(skill_path))

        # Mark pattern as harvested
        pattern["harvested"] = True
        pattern["harvested_at"] = datetime.now().isoformat()
        pattern["skill_paths"] = created_paths
        self._save_data()

        return {
            "success": True,
            "pattern": pattern_key,
            "scope": "business" if n_depts > 1 else ("agent" if n_agents == 1 else "dept"),
            "created_paths": created_paths,
        }

    def _build_skill_from_pattern(self, pattern: dict) -> str:
        """Build a skill markdown file from an SOP pattern."""
        process = pattern["process"]
        domain = pattern.get("domain", "")
        subdomain = pattern.get("subdomain", "")
        agents = pattern["agents_involved"]
        depts = pattern["depts_involved"]

        header = (
            f"---\nname: sop-{process.lower().replace(' ', '-')}\n"
            f"description: \"Domain: {domain}, Subdomain: {subdomain}. "
            f"Agents: {', '.join(agents)}. Depts: {', '.join(depts)}.\"\n---\n\n"
        )

        body = f"# SOP: {process}\n\n"
        body += f"**Domain:** {domain}  \n"
        body += f"**Subdomain:** {subdomain}  \n"
        body += f"**Agents:** {', '.join(agents)}  \n"
        body += f"**Departments:** {', '.join(depts)}  \n\n"
        body += "## Steps\n\n"

        for step in pattern["steps"]:
            body += f"### Step {step['order']}: [{step['agent']}] {step['action']}\n\n"
            if step.get("instructions"):
                body += f"**How to reproduce:**\n{step['instructions']}\n\n"
            if step.get("kv"):
                body += "**Parameters:**\n"
                for k, v in step["kv"].items():
                    body += f"- `{k}`: {v}\n"
                body += "\n"

        return header + body

    # ========================================
    # LEGACY SOP FLOW TRACKING (sop_start/sop_end)
    # ========================================

    def _handle_sop_event(self, event: dict) -> bool:
        obs = event.get("observation", {}) or {}
        if not obs.get("type"):
            return False

        if obs["type"] == "sop_start":
            flow_id = f"flow-{int(time.time() * 1000)}"
            self.store["activeFlows"][flow_id] = {
                "id": flow_id,
                "domain": obs.get("domain", "General"),
                "subdomain": obs.get("subdomain", "Default"),
                "process": obs.get("process", "Unnamed Process"),
                "tags": obs.get("tags", []),
                "input_kv": obs.get("kv", {}),
                "started_at": event["timestamp"],
                "started_by": event.get("source"),
                "events": [],
            }
            self._save_data()
            self.broadcast({"type": "sop_flow_started", "data": self.store["activeFlows"][flow_id]})
            return True

        if obs["type"] == "sop_end":
            flow_entry = None
            for fid, f in self.store["activeFlows"].items():
                if f["process"] == obs.get("process"):
                    flow_entry = (fid, f)
                    break
            if not flow_entry:
                return True

            flow_id, flow = flow_entry
            sop_id = f"sop-{int(time.time() * 1000)}"
            slug = "".join(c if c.isalnum() else "-" for c in flow["process"].lower()).strip("-")

            input_signature = {}
            for key, value in flow.get("input_kv", {}).items():
                input_signature[key] = {
                    "type": type(value).__name__,
                    "example": value,
                    "required": True,
                }

            sop = {
                "id": sop_id, "slug": slug, "name": flow["process"], "version": 1,
                "domain": flow["domain"], "subdomain": flow["subdomain"],
                "tags": flow["tags"],
                "created_at": flow["started_at"], "completed_at": event["timestamp"],
                "input_signature": input_signature,
                "steps": [
                    {
                        "order": i + 1,
                        "agent": e.get("source", ""),
                        "action": (e.get("observation") or {}).get("desc", "Unknown action"),
                        "type": (e.get("observation") or {}).get("type", "generic"),
                        "kv": (e.get("observation") or {}).get("kv", {}),
                        "status": (e.get("observation") or {}).get("status", "unknown"),
                    }
                    for i, e in enumerate(flow["events"])
                ],
                "goal": obs.get("goal"), "run_count": 1,
            }

            self.store["sops"][sop_id] = sop
            del self.store["activeFlows"][flow_id]
            self._save_data()

            sop_dir = self.jobworld_dir / "sops" / flow["domain"] / flow["subdomain"]
            sop_dir.mkdir(parents=True, exist_ok=True)
            (sop_dir / f"{slug}.json").write_text(json.dumps(sop, indent=2))

            self.broadcast({"type": "sop_extruded", "data": sop})
            return True

        return False

    def _record_flow_event(self, event: dict):
        for flow in self.store["activeFlows"].values():
            flow["events"].append({
                "source": event.get("source"),
                "timestamp": event.get("timestamp"),
                "observation": event.get("observation"),
            })

    # ========================================
    # CALENDAR (delegates to cave.core.calendar.Calendar)
    # ========================================

    def get_calendar(self) -> Calendar:
        if not hasattr(self, '_calendar'):
            self._calendar = Calendar()
            self._calendar.registry.load_all()
        return self._calendar

    def list_automations(self) -> list:
        local = self.get_calendar().list_scheduled()
        for a in local:
            a["source"] = "local"
        sources = self.list_calendar_sources()
        for src in sources:
            if src.get("type") == "http" and src.get("url"):
                try:
                    import urllib.request
                    url = src["url"].rstrip("/")
                    req = urllib.request.Request(url, headers={"Accept": "application/json"})
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        remote = json.loads(resp.read().decode())
                        if isinstance(remote, list):
                            for a in remote:
                                a["source"] = src["name"]
                            local.extend(remote)
                except Exception:
                    local.append({"name": f"[{src['name']}]", "source": src["name"], "status": "offline"})
        return local

    def get_automation(self, name: str) -> Optional[dict]:
        auto = self.get_calendar().registry.get(name)
        if not auto:
            return None
        return auto.schema.to_dict()

    def schedule_automation(self, spec: dict) -> dict:
        return self.get_calendar().schedule_sync(spec)

    def cancel_automation(self, name: str) -> bool:
        return self.get_calendar().cancel(name)

    def toggle_automation(self, name: str) -> Optional[dict]:
        auto = self.get_calendar().registry.get(name)
        if not auto:
            return None
        auto.schema.enabled = not auto.schema.enabled
        self.get_calendar().registry.save_schema(auto.schema)
        return {"name": name, "enabled": auto.schema.enabled}

    def check_automation(self, name: str) -> dict:
        return self.get_calendar().check_deliverables(name)

    def view_calendar(self, days: int = 7) -> str:
        return self.get_calendar().view(days)

    def get_blockages(self, unread_only: bool = True) -> list:
        store = BlockageStore()
        return store.get_unread() if unread_only else store.get_all()

    def mark_blockage_read(self, blockage_id: str) -> int:
        return BlockageStore().mark_read(blockage_id)

    def resolve_blockages(self, automation: str) -> int:
        return BlockageStore().mark_resolved(automation)

    def blockage_summary(self) -> dict:
        return BlockageStore().summary()

    # ========================================
    # CALENDAR SOURCES (multi-instance merge)
    # ========================================

    def _sources_path(self) -> Path:
        return self.jobworld_dir / "calendar_sources.json"

    def list_calendar_sources(self) -> list:
        path = self._sources_path()
        if not path.exists():
            return [{"name": "local", "type": "dir", "path": str(self.get_calendar().registry._dir)}]
        try:
            return json.loads(path.read_text()).get("sources", [])
        except Exception:
            return []

    def add_calendar_source(self, source: dict) -> dict:
        sources = self.list_calendar_sources()
        if any(s["name"] == source.get("name") for s in sources):
            return {"error": f"Source '{source.get('name')}' already exists"}
        sources.append(source)
        self._sources_path().write_text(json.dumps({"sources": sources}, indent=2))
        return {"success": True, "source": source}

    def remove_calendar_source(self, name: str) -> dict:
        sources = self.list_calendar_sources()
        new_sources = [s for s in sources if s["name"] != name]
        if len(new_sources) == len(sources):
            return {"error": f"Source '{name}' not found"}
        self._sources_path().write_text(json.dumps({"sources": new_sources}, indent=2))
        return {"success": True}

    # ========================================
    # CEO REVIEW
    # ========================================

    def ceo_review_task(self, task_id: str, decision: str) -> Optional[dict]:
        task = self.store["tasks"].get(task_id)
        if not task:
            return None

        if decision == "complete":
            task["status"] = "complete"
        else:
            task["status"] = "open"
            task.pop("result", None)
        task["updated_at"] = datetime.now().isoformat()

        goal = self.store["goals"].get(task.get("goal_id"))
        if goal:
            goal_tasks = [self.store["tasks"].get(t) for t in goal["tasks"] if self.store["tasks"].get(t)]
            all_complete = goal_tasks and all(t["status"] == "complete" for t in goal_tasks)
            any_blocked = any(t["status"] == "blocked" for t in goal_tasks)

            if all_complete and not any_blocked:
                goal["status"] = "met"
            elif any_blocked:
                goal["status"] = "not"
            else:
                goal["status"] = "pending"
            goal["updated_at"] = datetime.now().isoformat()

            milestone = self.store["milestones"].get(goal.get("milestone_id"))
            if milestone:
                ms_goals = [self.store["goals"].get(g) for g in milestone["goals"] if self.store["goals"].get(g)]
                if ms_goals and all(g["status"] == "met" for g in ms_goals):
                    milestone["status"] = "true"
                elif any(g["status"] == "not" for g in ms_goals):
                    milestone["status"] = "false"

        self._save_data()
        return task

    # ========================================
    # QUERIES
    # ========================================

    def get_open_tasks(self, agent_id: str = None) -> List[dict]:
        open_tasks = [t for t in self.store["tasks"].values() if t["status"] == "open"]
        if agent_id:
            agent = self.store["agents"].get(agent_id)
            if agent:
                open_tasks = [t for t in open_tasks if t.get("dept") == agent.get("dept_id") or not t.get("agent_id")]
        return sorted(open_tasks, key=lambda t: t["created_at"])[:3]

    def assign_task(self, task_id: str, agent_id: str) -> Optional[dict]:
        task = self.store["tasks"].get(task_id)
        agent = self.store["agents"].get(agent_id)
        if not task or not agent:
            return None
        task["agent_id"] = agent_id
        task["status"] = "open"
        agent["current_task_id"] = task_id
        agent["status"] = "working"
        self._save_data()
        return {"task": task, "agent": agent}

    def close_day(self) -> dict:
        self.store["day"] += 1
        self.store["day_started_at"] = datetime.now().isoformat()
        self._save_data()
        return {"day": self.store["day"], "started_at": self.store["day_started_at"]}

    def get_org_chart(self) -> dict:
        project_color_map = {proj["id"]: i for i, proj in enumerate(self.store["projects"].values())}

        goals_by_dept: Dict[str, list] = {}
        for goal in self.store["goals"].values():
            milestone = self.store["milestones"].get(goal.get("milestone_id"))
            if not milestone:
                continue
            color_idx = project_color_map.get(milestone.get("project_id"), 0)
            goal_tasks = [self.store["tasks"].get(t) for t in goal.get("tasks", []) if self.store["tasks"].get(t)]
            dept_name = goal_tasks[0]["dept"] if goal_tasks else "Unassigned"
            goals_by_dept.setdefault(dept_name, []).append({
                "id": goal["id"], "description": goal["description"],
                "status": goal["status"], "colorIdx": color_idx,
            })

        departments = []
        for dept in self.store["departments"].values():
            agents = [self.store["agents"].get(a) for a in dept.get("agents", []) if self.store["agents"].get(a)]
            departments.append({
                "id": dept["id"], "name": dept["name"],
                "agents": [{"id": a["id"], "name": a["name"], "status": a["status"], "current_task_id": a.get("current_task_id")} for a in agents],
                "goals": goals_by_dept.get(dept["name"], []),
            })

        return {
            "company": {"id": self.store["company"]["id"], "name": self.store["company"]["name"]} if self.store["company"] else None,
            "ceo": {"id": "ceo", "name": "CEO", "active": True},
            "departments": departments,
        }

    def get_projects_tree(self) -> dict:
        projects = []
        for i, proj in enumerate(self.store["projects"].values()):
            milestones = []
            for ms_id in proj.get("milestones", []):
                ms = self.store["milestones"].get(ms_id)
                if not ms:
                    continue
                goals = []
                for g_id in ms.get("goals", []):
                    goal = self.store["goals"].get(g_id)
                    if not goal:
                        continue
                    goal_tasks = [self.store["tasks"].get(t) for t in goal.get("tasks", []) if self.store["tasks"].get(t)]
                    dept_name = goal_tasks[0]["dept"] if goal_tasks else "Unassigned"
                    goals.append({
                        "id": goal["id"], "description": goal["description"],
                        "status": goal["status"], "dept": dept_name, "tasks": goal_tasks,
                    })
                milestones.append({
                    "id": ms["id"], "description": ms["description"],
                    "deadline": ms.get("deadline", ""), "status": ms["status"], "goals": goals,
                })
            projects.append({"id": proj["id"], "name": proj["name"], "colorIdx": i, "milestones": milestones})
        return {"projects": projects}
