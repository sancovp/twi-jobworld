"""JobworldHTTPServer — CAVEHTTPServer with Jobworld routes.

Adds /api/* routes for company, departments, agents, tasks, SOPs, etc.
Dashboard served at /. WebSocket at /ws for live updates.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware

from cave.server.cave_http_server import CAVEHTTPServer

from .jobworld_agent import JobworldAgent

logger = logging.getLogger(__name__)


class JobworldHTTPServer(CAVEHTTPServer):
    """Jobworld CAVE server. Extends CAVEHTTPServer with business routes."""

    def __init__(self, cave: JobworldAgent, port: int = 3847, host: str = "0.0.0.0"):
        super().__init__(cave=cave, port=port, host=host)
        self.jw = cave  # typed reference

        # CORS for dashboard
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )

        self._register_jobworld_routes()
        self._register_websocket()

    def _register_websocket(self):
        jw = self.jw

        @self.app.websocket("/ws")
        async def websocket_endpoint(ws: WebSocket):
            await ws.accept()
            jw._ws_clients.add(ws)
            try:
                while True:
                    await ws.receive_text()  # keep alive
            except WebSocketDisconnect:
                jw._ws_clients.discard(ws)

    def _register_jobworld_routes(self):
        jw = self.jw

        # === Dashboard ===
        @self.app.get("/")
        def serve_dashboard():
            index = jw.jobworld_dir / "index.html"
            if index.exists():
                return FileResponse(str(index))
            # Fallback to template
            template = jw.jobworld_dir / "template" / "twi-jobworld-template" / "index.html"
            if template.exists():
                return FileResponse(str(template))
            return {"error": "No index.html found"}

        # === Health (override with jobworld info) ===
        @self.app.get("/api/health")
        def api_health():
            return {"status": "ok", "type": "jobworld", "dir": str(jw.jobworld_dir)}

        # === Config ===
        @self.app.get("/api/config")
        def api_config():
            return {"jobworldDir": str(jw.jobworld_dir), "serverPort": self.port}

        # === Full State ===
        @self.app.get("/api/state")
        def api_state():
            return jw.store

        # === Company ===
        @self.app.get("/api/company")
        def get_company():
            return jw.store["company"]

        @self.app.post("/api/company")
        def create_company(data: Dict[str, Any]):
            return jw.create_company(data.get("name", "AI Jobworld"))

        # === Departments ===
        @self.app.get("/api/departments")
        def list_departments():
            return list(jw.store["departments"].values())

        @self.app.post("/api/departments")
        def create_department(data: Dict[str, Any]):
            return jw.create_department(data.get("name", "New Department"))

        # === Agents ===
        @self.app.get("/api/agents")
        def list_agents():
            return list(jw.store["agents"].values())

        @self.app.post("/api/agents")
        def create_agent(data: Dict[str, Any]):
            return jw.create_agent(
                data.get("dept_id", ""),
                data.get("name", "New Agent"),
                data.get("agent_file_path", ""),
            )

        # === Projects ===
        @self.app.get("/api/projects")
        def get_projects_tree():
            return jw.get_projects_tree()

        @self.app.get("/api/projects/list")
        def list_projects_raw():
            return list(jw.store["projects"].values())

        @self.app.post("/api/projects")
        def create_project(data: Dict[str, Any]):
            return jw.create_project(data.get("name", "New Project"), data.get("description", ""))

        # === Milestones ===
        @self.app.get("/api/milestones")
        def list_milestones():
            return list(jw.store["milestones"].values())

        @self.app.post("/api/milestones")
        def create_milestone(data: Dict[str, Any]):
            return jw.create_milestone(
                data.get("project_id", ""),
                data.get("description", ""),
                data.get("deadline", ""),
            )

        # === Goals ===
        @self.app.get("/api/goals")
        def list_goals():
            return list(jw.store["goals"].values())

        @self.app.post("/api/goals")
        def create_goal(data: Dict[str, Any]):
            return jw.create_goal(data.get("milestone_id", ""), data.get("description", ""))

        # === Tasks ===
        @self.app.get("/api/tasks")
        def list_tasks():
            return list(jw.store["tasks"].values())

        @self.app.post("/api/tasks")
        def create_task(data: Dict[str, Any]):
            return jw.create_task(
                data.get("goal_id", ""),
                data.get("dept", ""),
                data.get("description", ""),
            )

        @self.app.get("/api/tasks/supposedly-done")
        def get_supposedly_done():
            return [t for t in jw.store["tasks"].values() if t["status"] == "supposedly_done"]

        @self.app.get("/api/tasks/open")
        def get_open_tasks(agent_id: Optional[str] = None):
            return jw.get_open_tasks(agent_id)

        # === Assign Task ===
        @self.app.post("/api/assign-task")
        def assign_task(data: Dict[str, Any]):
            result = jw.assign_task(data.get("task_id", ""), data.get("agent_id", ""))
            if not result:
                return {"error": "Task or agent not found"}
            return result

        # === CEO Review ===
        @self.app.post("/api/ceo-review")
        def ceo_review(data: Dict[str, Any]):
            task_id = data.get("task_id")
            decision = data.get("decision")
            if not task_id or not decision:
                return {"error": "task_id and decision required"}
            if decision not in ("complete", "not_complete"):
                return {"error": "decision must be 'complete' or 'not_complete'"}
            task = jw.ceo_review_task(task_id, decision)
            if not task:
                return {"error": "Task not found"}
            return {"success": True, "task": task}

        # === Events ===
        @self.app.get("/api/events")
        def get_events():
            return jw._load_events()

        @self.app.post("/api/emit-event")
        def emit_event(data: Dict[str, Any]):
            return jw.emit_event(data)

        # === Org Chart ===
        @self.app.get("/api/org-chart")
        def get_org_chart():
            return jw.get_org_chart()

        # === Day ===
        @self.app.get("/api/day")
        def get_day():
            tasks = list(jw.store["tasks"].values())
            events = jw._load_events()
            day_start = jw.store["day_started_at"]
            day_tasks = [t for t in tasks if t["created_at"] >= day_start]
            day_events = [e for e in events if e.get("timestamp", "") >= day_start]
            return {
                "day": jw.store["day"],
                "started_at": day_start,
                "tasks_created": len(day_tasks),
                "tasks_completed": len([t for t in day_tasks if t["status"] == "complete"]),
                "tasks_supposedly_done": len([t for t in day_tasks if t["status"] == "supposedly_done"]),
                "events_today": len(day_events),
            }

        @self.app.post("/api/close-day")
        def close_day():
            return jw.close_day()

        # === Round ===
        @self.app.post("/api/run-round")
        def run_round(data: Dict[str, Any]):
            r = data.get("round")
            jw.broadcast({"type": "round_start", "data": {"round": r}})
            return {"success": True, "round": r}

        # === Ralph Loop ===
        @self.app.get("/api/ralph-loop")
        def get_ralph_loop():
            switch_path = jw.jobworld_dir / ".claude" / "afk-loop-switch"
            if not switch_path.exists():
                return {"on": False, "next": "", "constant": "", "exists": False}
            try:
                data = json.loads(switch_path.read_text())
                return {**data, "exists": True}
            except Exception:
                return {"error": "Failed to parse switch file"}

        @self.app.put("/api/ralph-loop")
        def set_ralph_loop(data: Dict[str, Any]):
            switch_dir = jw.jobworld_dir / ".claude"
            switch_path = switch_dir / "afk-loop-switch"
            current = {"on": False, "next": "", "constant": ""}
            if switch_path.exists():
                try:
                    current = json.loads(switch_path.read_text())
                except Exception:
                    pass
            if "on" in data:
                current["on"] = data["on"]
            if "next" in data:
                current["next"] = data["next"]
            if "constant" in data:
                current["constant"] = data["constant"]
            switch_dir.mkdir(parents=True, exist_ok=True)
            switch_path.write_text(json.dumps(current, indent=2) + "\n")
            return {**current, "exists": True}

        # === SOPs ===
        @self.app.get("/api/sops")
        def list_sops():
            return list(jw.store["sops"].values())

        @self.app.get("/api/sops/search/{query}")
        def search_sops(query: str):
            q = query.lower()
            return [
                sop for sop in jw.store["sops"].values()
                if q in sop.get("name", "").lower()
                or q in sop.get("domain", "").lower()
                or q in sop.get("subdomain", "").lower()
                or any(q in t.lower() for t in sop.get("tags", []))
                or any(q in s.get("action", "").lower() for s in sop.get("steps", []))
            ]

        @self.app.get("/api/sops/{sop_id}")
        def get_sop(sop_id: str):
            sop = jw.store["sops"].get(sop_id)
            if not sop:
                return {"error": "SOP not found"}
            return sop

        @self.app.put("/api/sops/{sop_id}")
        def update_sop(sop_id: str, data: Dict[str, Any]):
            sop = jw.store["sops"].get(sop_id)
            if not sop:
                return {"error": "SOP not found"}
            data["id"] = sop["id"]  # preserve ID
            sop.update(data)
            jw._save_data()
            return sop

        @self.app.delete("/api/sops/{sop_id}")
        def delete_sop(sop_id: str):
            if sop_id not in jw.store["sops"]:
                return {"error": "SOP not found"}
            del jw.store["sops"][sop_id]
            jw._save_data()
            return {"success": True}

        # === Active Flows ===
        @self.app.get("/api/flows")
        def list_flows():
            return list(jw.store["activeFlows"].values())

        # === SOP Patterns (emergent) ===
        @self.app.get("/api/sop-patterns")
        def list_sop_patterns():
            return list(jw.store["sop_patterns"].values())

        @self.app.get("/api/sop-patterns/{pattern_key}")
        def get_sop_pattern(pattern_key: str):
            pattern = jw.store["sop_patterns"].get(pattern_key)
            if not pattern:
                return {"error": "Pattern not found"}
            return pattern

        @self.app.post("/api/sop-patterns/{pattern_key}/harvest")
        def harvest_sop_pattern(pattern_key: str):
            return jw.harvest_sop(pattern_key)

        # === Domain Enum ===
        @self.app.get("/api/domains")
        def list_domains():
            from .jobworld_agent import DOMAIN_ENUM
            return DOMAIN_ENUM

        # === Automations (Calendar) ===
        @self.app.get("/api/automations")
        def list_automations():
            return jw.list_automations()

        @self.app.post("/api/automations")
        def schedule_automation(data: Dict[str, Any]):
            result = jw.schedule_automation(data)
            if result.get("status") == "scheduled":
                jw.broadcast({"type": "automation_scheduled", "data": result})
            return result

        @self.app.get("/api/automations/view/{days}")
        def view_calendar(days: int = 7):
            return {"calendar": jw.view_calendar(days)}

        @self.app.get("/api/automations/{name}")
        def get_automation(name: str):
            auto = jw.get_automation(name)
            if not auto:
                return {"error": f"Automation '{name}' not found"}
            return auto

        @self.app.put("/api/automations/{name}/toggle")
        def toggle_automation(name: str):
            result = jw.toggle_automation(name)
            if not result:
                return {"error": f"Automation '{name}' not found"}
            jw.broadcast({"type": "automation_toggled", "data": result})
            return result

        @self.app.delete("/api/automations/{name}")
        def cancel_automation(name: str):
            ok = jw.cancel_automation(name)
            if ok:
                jw.broadcast({"type": "automation_cancelled", "data": {"name": name}})
            return {"success": ok, "name": name}

        @self.app.get("/api/automations/check/{name}")
        def check_automation(name: str):
            return jw.check_automation(name)

        # === Blockages ===
        @self.app.get("/api/blockages")
        def get_blockages():
            return jw.get_blockages(unread_only=True)

        @self.app.get("/api/blockages/all")
        def get_all_blockages():
            return jw.get_blockages(unread_only=False)

        @self.app.get("/api/blockages/summary")
        def blockage_summary():
            return jw.blockage_summary()

        @self.app.post("/api/blockages/{blockage_id}/read")
        def mark_blockage_read(blockage_id: str):
            count = jw.mark_blockage_read(blockage_id)
            return {"marked": count}

        @self.app.post("/api/blockages/{automation}/resolve")
        def resolve_blockages(automation: str):
            count = jw.resolve_blockages(automation)
            return {"resolved": count}

        # === Calendar Sources ===
        @self.app.get("/api/calendar-sources")
        def list_calendar_sources():
            return jw.list_calendar_sources()

        @self.app.post("/api/calendar-sources")
        def add_calendar_source(data: Dict[str, Any]):
            return jw.add_calendar_source(data)

        @self.app.delete("/api/calendar-sources/{name}")
        def remove_calendar_source(name: str):
            return jw.remove_calendar_source(name)
