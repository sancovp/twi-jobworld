#!/bin/bash
# bake_jobworld.sh - Build and manage Jobworld CAVE containers
#
# Usage:
#   ./bake_jobworld.sh build                         Build Jobworld image
#   ./bake_jobworld.sh run <instance> [port]         Run a Jobworld instance
#   ./bake_jobworld.sh attach <instance>             Attach to CEO tmux
#   ./bake_jobworld.sh status <instance>             Check instance status
#   ./bake_jobworld.sh stop <instance>               Stop instance
#   ./bake_jobworld.sh logs <instance>               Show logs
#   ./bake_jobworld.sh list                          List running instances
#
# Data lives at JOBWORLD_DATA_DIR (default: ~/tmp/jobworld)
# Global config at $JOBWORLD_DATA_DIR/.claude/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JW_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGE_TAG="jobworld-cave:latest"
JOBWORLD_DATA_DIR="${JOBWORLD_DATA_DIR:-$HOME/tmp/jobworld}"

usage() {
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  build                      Build Jobworld CAVE image"
    echo "  run <instance> [port]      Run a new Jobworld instance"
    echo "  attach <instance>          Attach to CEO tmux session"
    echo "  status <instance>          Check instance status"
    echo "  stop <instance>            Stop instance container"
    echo "  logs <instance>            Show instance logs"
    echo "  list                       List running Jobworld instances"
    echo "  globals                    Show global config directory"
    exit 1
}

build() {
    echo "Building Jobworld CAVE image..."
    cp -r "$JW_ROOT/server" "$SCRIPT_DIR/server"
    cp -r /home/GOD/gnosys-plugin-v2/application/cave-teams "$SCRIPT_DIR/cave-teams"
    docker build -t "$IMAGE_TAG" -f "$SCRIPT_DIR/Dockerfile.jobworld" "$SCRIPT_DIR"
    rm -rf "$SCRIPT_DIR/server" "$SCRIPT_DIR/cave-teams"
    echo "Image built: $IMAGE_TAG"
}

run_instance() {
    local instance="$1"
    local port="${2:-}"

    if [ -z "$instance" ]; then
        echo "Error: instance name required"
        echo "Usage: $0 run <instance-name> [port]"
        exit 1
    fi

    # Ensure data directory exists
    mkdir -p "$JOBWORLD_DATA_DIR/$instance"
    mkdir -p "$JOBWORLD_DATA_DIR/.claude/rules"
    mkdir -p "$JOBWORLD_DATA_DIR/.claude/skills"

    # Auto-select port if not provided
    if [ -z "$port" ]; then
        port=3847
        while nc -z localhost $port 2>/dev/null; do
            port=$((port + 1))
            if [ $port -gt 3999 ]; then
                echo "Error: No available ports in range 3847-3999"
                exit 1
            fi
        done
    fi

    echo "Starting Jobworld: $instance on port $port"

    # Source API keys for MiniMax/OpenAI workers (NOT Anthropic — use subscription)
    [ -f "$HOME/system_config.sh" ] && source "$HOME/system_config.sh"

    docker run -d \
        --name "jw-$instance" \
        -e "JOBWORLD_INSTANCE=$instance" \
        -e "JOBWORLD_PORT=$port" \
        -e "MINIMAX_API_KEY=${MINIMAX_API_KEY:-}" \
        -e "OPENAI_API_KEY=${OPENAI_API_KEY:-}" \
        -p "$port:$port" \
        -v "$JOBWORLD_DATA_DIR:/jobworld_data" \
        -v "$HOME/.claude/.credentials.json:/root/.claude/.credentials.json:ro" \
        "$IMAGE_TAG"

    echo "Jobworld $instance started"
    echo "  Dashboard: http://localhost:$port"
    echo "  Data: $JOBWORLD_DATA_DIR/$instance/"
    echo "  Globals: $JOBWORLD_DATA_DIR/.claude/"
    echo "  Attach: $0 attach $instance"
}

attach_instance() {
    local instance="$1"
    [ -z "$instance" ] && { echo "Error: instance name required"; exit 1; }
    docker exec -it "jw-$instance" tmux attach -t cave
}

status_instance() {
    local instance="$1"
    [ -z "$instance" ] && { echo "Error: instance name required"; exit 1; }
    local state="$JOBWORLD_DATA_DIR/$instance/agent_state.json"
    if [ -f "$state" ]; then
        cat "$state"
    else
        echo "No state file. Container status:"
        docker inspect "jw-$instance" --format '{{.State.Status}}' 2>/dev/null || echo "Not found"
    fi
}

stop_instance() {
    local instance="$1"
    [ -z "$instance" ] && { echo "Error: instance name required"; exit 1; }
    docker stop "jw-$instance" && docker rm "jw-$instance"
    echo "Stopped: $instance"
}

logs_instance() {
    local instance="$1"
    [ -z "$instance" ] && { echo "Error: instance name required"; exit 1; }
    docker logs -f "jw-$instance"
}

list_instances() {
    echo "Running Jobworld instances:"
    docker ps --filter "name=jw-" --format "  {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

case "${1:-}" in
    build)    build ;;
    run)      run_instance "$2" "$3" ;;
    attach)   attach_instance "$2" ;;
    status)   status_instance "$2" ;;
    stop)     stop_instance "$2" ;;
    logs)     logs_instance "$2" ;;
    list)     list_instances ;;
    *)        usage ;;
esac
