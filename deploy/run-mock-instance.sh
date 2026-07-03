#!/usr/bin/env bash
# run-mock-instance.sh — boot a REAL avi-jw CEO instance with every external
# effect MOCKED (JWOUT_MOCK=1), then trigger one outreach round so you can WATCH
# the agent loop drive the (mocked) jwout verbs end to end.
#
# The agents are real (SDK CEO on MiniMax-M3); only pull/send/video/reply are
# faked, so NO credential is needed except the MiniMax key that powers the CEO's
# brain. Put it in deploy/secrets.mock.env (or `export MINIMAX_API_KEY=...`).
#
#   deploy/run-mock-instance.sh                 # boot + auto-trigger the b6 campaign
#   TRIGGER=0 deploy/run-mock-instance.sh       # boot only (trigger later by hand)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# b6mock = the S1-fully-faked client (every gate filled with fake values) so the
# WHOLE pipeline incl. delivery runs. clients/b6 is the REAL config — the CEO
# correctly HOLDS delivery on its open gates (verified 2026-07-03).
CLIENT="${JW_CLIENT:-b6mock}"
INSTANCE="${INSTANCE:-b6-mock}"
IMAGE="${IMAGE:-avi-jw:latest}"
# Host-port picks avoid Isaac's standing containers (mind_of_god holds 8501,
# cyberneticircus_app holds 8000).
DASH_PORT="${DASH_PORT:-8511}"; API_PORT=3847; SERVE_PORT=8000; SERVE_HOST_PORT="${SERVE_HOST_PORT:-8010}"; OUTREACH_DASH_PORT=8787
SECRETS="${ROOT}/deploy/secrets.mock.env"

# The MiniMax key powers the CEO's LLM (MiniMax-M3). Canonical home is
# ~/system_config.sh (heaven auto-sources it — same mechanism as onionmorph);
# fall back to an already-exported env var or a filled secrets.mock.env line.
if [ -z "${MINIMAX_API_KEY:-}" ] && [ -f "$HOME/system_config.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/system_config.sh"
fi
KEY_IN_FILE="$(grep -E '^MINIMAX_API_KEY=.+' "$SECRETS" 2>/dev/null || true)"
if [ -z "${MINIMAX_API_KEY:-}" ] && [ -z "$KEY_IN_FILE" ]; then
  echo "ERROR: no MiniMax key. The CEO's LLM (MiniMax-M3) needs it to run."
  echo "  Expected in ~/system_config.sh (canonical), or export MINIMAX_API_KEY=..., or fill deploy/secrets.mock.env"
  exit 1
fi

docker rm -f "$INSTANCE" >/dev/null 2>&1 || true
echo "booting $INSTANCE (MOCK) — JW http://localhost:$DASH_PORT · outreach funnel http://127.0.0.1:$OUTREACH_DASH_PORT · API $API_PORT"

docker run -d --name "$INSTANCE" \
  -p "${DASH_PORT}:${DASH_PORT}" \
  -p "${API_PORT}:${API_PORT}" \
  -p "127.0.0.1:${SERVE_HOST_PORT}:${SERVE_PORT}" \
  -p "127.0.0.1:${OUTREACH_DASH_PORT}:${OUTREACH_DASH_PORT}" \
  -v "${INSTANCE}-data:/jobworld_data" \
  -v "${ROOT}/clients:/agent/clients:ro" \
  --env-file "$SECRETS" \
  ${MINIMAX_API_KEY:+-e MINIMAX_API_KEY="$MINIMAX_API_KEY"} \
  -e JOBWORLD_INSTANCE="$INSTANCE" \
  -e JOBWORLD_PORT="$DASH_PORT" \
  -e JW_CLIENT="$CLIENT" \
  -e JW_CLIENT_DIR="/agent/clients/${CLIENT}" \
  -e JWOUT_DB="/jobworld_data/${INSTANCE}/outreach.db" \
  -e HOST_DIR="/jobworld_data/hosted" \
  -e JWOUT_SERVE_PORT="$SERVE_PORT" \
  -e JWOUT_DASHBOARD_PORT="$OUTREACH_DASH_PORT" \
  "$IMAGE"

echo "waiting for the API to come up..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${API_PORT}/api/health" >/dev/null 2>&1; then echo "  API up."; break; fi
  sleep 2
done

if [ "${TRIGGER:-1}" = "1" ]; then
  echo "triggering the b6 campaign (POST /input)..."
  TEXT="$(cat "${ROOT}/deploy/campaign-trigger.md")"
  curl -s -X POST "http://localhost:${API_PORT}/input" \
    -H 'Content-Type: application/json' \
    --data "$(TEXT="$TEXT" python3 -c 'import json,os;print(json.dumps({"text":os.environ["TEXT"]}))')" \
    && echo " …sent."
fi

echo
echo "WATCH the agents flow:"
echo "  docker logs -f $INSTANCE          # CEO reasoning + the jwout calls"
echo "  open http://127.0.0.1:${OUTREACH_DASH_PORT}   # the funnel fills as it runs"
echo "  open http://localhost:${DASH_PORT}            # JW org/tasks dashboard"
echo "  docker exec $INSTANCE sh -lc 'JWOUT_DB=/jobworld_data/${INSTANCE}/outreach.db jwout track report'"
