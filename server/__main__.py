"""Entry point for Jobworld CAVE server.

Usage:
    python -m server --dir /path/to/instance [--port 3847] [--tmux cave]
    
    JOBWORLD_DIR=/path/to/instance python -m server
"""
import argparse
import logging
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")


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
    args = parser.parse_args()

    from .jobworld_agent import JobworldAgent
    from .jobworld_server import JobworldHTTPServer

    agent = JobworldAgent(
        jobworld_dir=args.dir,
        port=args.port,
        tmux_session=args.tmux,
    )

    server = JobworldHTTPServer(
        cave=agent,
        port=args.port,
        host=args.host,
    )

    print(f"[Jobworld CAVE] Starting at http://{args.host}:{args.port}")
    print(f"[Jobworld CAVE] Instance: {args.dir}")
    print(f"[Jobworld CAVE] tmux session: {args.tmux}")
    server.run()


if __name__ == "__main__":
    main()
