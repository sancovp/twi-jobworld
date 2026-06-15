#!/bin/sh
# Avi_Jobworld entrypoint wrapper: the SDK CEO runs `claude --dangerously-skip-permissions`,
# which the CLI REFUSES under root. So the whole JW server must run as the non-root `ceo`
# user, with a real HOME (the CLI needs its config there) and a ceo-writable data dir.
# Privileged setup happens here as root, then we drop to ceo and hand off to JW's own
# unmodified entrypoint. (All three facts — root block, HOME requirement, dir ownership —
# were found by actually running the CEO turn and reading the errors.)
set -e
mkdir -p /jobworld_data /home/ceo/.claude
chown -R ceo:ceo /jobworld_data /home/ceo

# --- worker-layer boot wiring (found missing by fan-out review) ---
# 1. Put the department agents (incl. the outreach CEO.md persona) where the
#    server reads them, so the CEO boots knowing it runs outreach. (The server
#    also falls back to the baked /agent/agents, but copying lets the CEO/
#    generate-employee register the departments from the instance.)
INSTANCE_DIR="/jobworld_data/${JOBWORLD_INSTANCE:-default}"
mkdir -p "$INSTANCE_DIR/agents"
cp -r /agent/agents/. "$INSTANCE_DIR/agents/" 2>/dev/null || true

# 2. The asset/view+click tracking server is part of delivery, not a comment.
#    Start it in the background (records to the same run DB and serves HOST_DIR).
HOST_DIR="${HOST_DIR:-/jobworld_data/hosted}"
JWOUT_DB="${JWOUT_DB:-/jobworld_data/${JOBWORLD_INSTANCE:-default}/outreach.db}"
mkdir -p "$HOST_DIR" "$(dirname "$JWOUT_DB")"
chown -R ceo:ceo "$INSTANCE_DIR" "$HOST_DIR"
su -m ceo -s /bin/sh -c "export HOME=/home/ceo; HOST_DIR='$HOST_DIR' JWOUT_DB='$JWOUT_DB' \
  nohup jwout serve --port ${JWOUT_SERVE_PORT:-8000} --docroot '$HOST_DIR' --db '$JWOUT_DB' \
  >/jobworld_data/jwout-serve.log 2>&1 &" || true

# 3. Operator dashboard (read-only funnel/contacts/replies/gates). Bound 0.0.0.0
#    inside the container; run-instance publishes it on HOST loopback only.
su -m ceo -s /bin/sh -c "export HOME=/home/ceo; JW_CLIENT='${JW_CLIENT:-}' \
  nohup jwout dashboard --host 0.0.0.0 --port ${JWOUT_DASHBOARD_PORT:-8787} \
  --db '$JWOUT_DB' --client-dir '${JW_CLIENT_DIR:-}' \
  >/jobworld_data/jwout-dashboard.log 2>&1 &" || true

# su -m preserves the runtime env (JOBWORLD_INSTANCE, MINIMAX_API_KEY, ...); HOME is forced
# to ceo's. JW's real entrypoint is run unchanged, just as the right user.
exec su -m ceo -s /bin/sh -c 'export HOME=/home/ceo; exec /usr/local/bin/entrypoint-jobworld.sh'
