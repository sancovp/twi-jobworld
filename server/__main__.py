"""Entry point for Jobworld CAVE server.

Usage:
    python -m server --dir /path/to/instance [--port 3847] [--tmux cave]
    
    JOBWORLD_DIR=/path/to/instance python -m server
"""
import argparse
import json
import logging
import os
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")


def _instance_runtime(instance_dir: str) -> str:
    """Read config.runtime (the frontend-selectable CEO runtime). Default: tmux-anthropic."""
    for name in ("config.json", "config.example.json"):
        p = Path(instance_dir) / name
        if p.exists():
            try:
                return json.loads(p.read_text()).get("runtime", "tmux-anthropic")
            except Exception:
                pass
    return "tmux-anthropic"


def _attach_sdk_ceo(agent, instance_dir: str):
    """0e — the sdk-minimax runtime: replace the tmux CodeAgent main_agent with the SDK CEO
    (claude_agent_sdk on MiniMax-M3, OAuth fallback). Loud-fails if the SDK isn't installed rather than
    silently falling back — so 'sdk-minimax' selected never quietly runs on the wrong runtime."""
    try:
        from .sdk_ceo import ClaudePMainAgent  # needs `pip install claude-agent-sdk`
    except ImportError as e:
        raise SystemExit(
            "runtime 'sdk-minimax' selected but claude_agent_sdk is not installed. "
            "Install it (`pip install claude-agent-sdk`) or set config.runtime to 'tmux-anthropic'. "
            f"(import error: {e})"
        )
    persona_path = Path(instance_dir) / "agents" / "CEO.md"
    append = persona_path.read_text() if persona_path.exists() else None
    agent.main_agent = ClaudePMainAgent(
        alias="ceo",
        cwd=str(instance_dir),
        setting_sources=["project"],
        append_system_prompt=append,
    )
    return agent


def main():
    parser = argparse.ArgumentParser(description="Jobworld CAVE Server")
    parser.add_argument("--dir", type=str, default=os.environ.get("JOBWORLD_DIR", "."),
                        help="Jobworld instance directory")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "3847")),
                        help="Server port")
    parser.add_argument("--host", type=str, default="0.0.0.0",
                        help="Server host")
    parser.add_argument("--tmux", type=str, default=os.environ.get("JOBWORLD_TMUX", "cave"),
                        help="tmux session name to attach to")
    parser.add_argument("--runtime", type=str, default=None,
                        help="CEO runtime: tmux-anthropic | sdk-minimax (default: config.runtime)")
    args = parser.parse_args()

    from .jobworld_agent import JobworldAgent
    from .jobworld_server import JobworldHTTPServer

    runtime = args.runtime or _instance_runtime(args.dir)

    agent = JobworldAgent(
        jobworld_dir=args.dir,
        port=args.port,
        tmux_session=args.tmux,
    )
    if runtime == "sdk-minimax":
        agent = _attach_sdk_ceo(agent, args.dir)

    server = JobworldHTTPServer(
        cave=agent,
        port=args.port,
        host=args.host,
    )

    print(f"[Jobworld CAVE] Starting at http://{args.host}:{args.port}")
    print(f"[Jobworld CAVE] Instance: {args.dir}")
    print(f"[Jobworld CAVE] Runtime: {runtime}")
    print(f"[Jobworld CAVE] tmux session: {args.tmux}")
    server.run()


if __name__ == "__main__":
    main()
