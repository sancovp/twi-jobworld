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
# su -m preserves the runtime env (JOBWORLD_INSTANCE, MINIMAX_API_KEY, ...); HOME is forced
# to ceo's. JW's real entrypoint is run unchanged, just as the right user.
exec su -m ceo -s /bin/sh -c 'export HOME=/home/ceo; exec /usr/local/bin/entrypoint-jobworld.sh'
