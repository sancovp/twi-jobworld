#!/bin/bash
# Instantiate a new TWI Jobworld company
# Usage: ./instantiate.sh /full/path/to/instance "Company Name" [port]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/template/twi-jobworld-template"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 /full/path/to/instance \"Company Name\" [port]"
    exit 1
fi

TARGET_DIR="$1"
COMPANY_NAME="$2"
PORT="${3:-}"

if [ -d "$TARGET_DIR" ]; then
    echo "Error: $TARGET_DIR already exists"
    exit 1
fi

if [ -z "$PORT" ]; then
    PORT=3847
    while nc -z localhost $PORT 2>/dev/null || nc -z 127.0.0.1 $PORT 2>/dev/null; do
        PORT=$((PORT + 1))
        if [ $PORT -gt 3999 ]; then
            echo "Error: No available ports in range 3847-3999"
            exit 1
        fi
    done
fi

echo "Creating $COMPANY_NAME at $TARGET_DIR (port $PORT)..."

mkdir -p "$TARGET_DIR"
cp -r "$TEMPLATE_DIR/"* "$TARGET_DIR/"

cat > "$TARGET_DIR/CLAUDE.md" << CEOEOF
# CEO — $COMPANY_NAME

You are the CEO of $COMPANY_NAME. You run the company.

## Company Context
- **Name:** $COMPANY_NAME
- **Server:** http://localhost:$PORT
- **Port:** $PORT
- **Working Directory:** $TARGET_DIR

## Your Job

1. **Initialize the company** — create departments via POST /api/departments
2. **Register agents** — register Content Lead, Growth Lead, Revenue Lead, Researcher, SWE Engineer
3. **Set up recurring cadences** — each agent has weekly/monthly rhythms
4. **Monitor and coordinate** — check in on agent progress

## Departments to Create

| Dept | Purpose |
|------|---------|
| content | Newsletter creation, content strategy |
| growth | Subscriber acquisition, outreach |
| revenue | Monetization, tier management |
| research | Industry intelligence, competitor analysis |
| engineering | Automation, integrations, tooling |

## Agent Registration

After creating departments, register each agent via POST /api/agents:
- name: agent name
- dept_id: department ID from creation
- agent_file_path: path to their .md file

## Skills Available

- jobworld-api: interact with the company API
- understand-agents, understand-hooks, understand-mcps, understand-skills

## Operating Contract

- Report blockers with specific missing inputs
- Use supposedly_done only when company is fully initialized
- Each agent handles its own domain — your job is coordination, not execution
CEOEOF

mkdir -p "$TARGET_DIR/event-stream"
echo '{}' > "$TARGET_DIR/event-stream/data.json"
echo '' > "$TARGET_DIR/event-stream/events.jsonl"

# Install dependencies
cd "$TARGET_DIR/dist"
npm install

cd "$TARGET_DIR"
export PORT
chmod +x start.sh
nohup ./start.sh > server.log 2>&1 &
SERVER_PID=$!

echo "Started server with PID $SERVER_PID"
sleep 2

if curl -s "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
    echo ""
    echo "✓ $COMPANY_NAME is live at http://localhost:$PORT"
    echo "✓ Working dir: $TARGET_DIR"
    echo "✓ Server PID: $SERVER_PID"
else
    echo "Warning: Server may not be fully ready yet. Check $TARGET_DIR/server.log"
fi
