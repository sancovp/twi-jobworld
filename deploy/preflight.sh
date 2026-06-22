#!/usr/bin/env bash
# preflight.sh — executable go-live gate (the runnable form of docs/GO-LIVE-RUNBOOK.md).
# Checks every key + config slot + content file a live B6 send requires, and tells you
# exactly what's still missing. Exit 0 = READY (no hard blockers); 1 = NOT READY.
#
#   ./deploy/preflight.sh [secrets.env] [client.json]
#       secrets.env  default: deploy/secrets.b6.env   (sourced if present)
#       client.json  default: clients/b6/client.json
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS="${1:-$ROOT/deploy/secrets.b6.env}"
CLIENT="${2:-$ROOT/clients/b6/client.json}"

if [ -f "$SECRETS" ]; then set -a; . "$SECRETS"; set +a; echo "· secrets: $SECRETS"
else echo "· no secrets file ($SECRETS) — checking current shell env only"; fi
[ -f "$CLIENT" ] || { echo "FATAL: client.json not found: $CLIENT"; exit 2; }
echo "· client:  $CLIENT"; echo

blockers=0
env_set(){ [ -n "${!1:-}" ]; }
J(){ jq -e "$1" "$CLIENT" >/dev/null 2>&1; }
ok(){   printf '  \033[32m✅ %s\033[0m\n' "$1"; }
bad(){  printf '  \033[31m❌ %s\033[0m — %s\n' "$1" "$2"; blockers=$((blockers+1)); }
warn(){ printf '  \033[33m⚠️  %s\033[0m — %s\n' "$1" "$2"; }

backend="${SEND_BACKEND:-smtp}"
echo "SEND_BACKEND = $backend"; echo

echo "PHASE B — keys (env)"
env_set APOLLO_API_KEY && ok "APOLLO_API_KEY" || bad "APOLLO_API_KEY" "no prospects (pull) without it"
if [ "$backend" = "instantly" ]; then
  env_set INSTANTLY_API_KEY     && ok "INSTANTLY_API_KEY"     || bad "INSTANTLY_API_KEY" "sending backend"
  env_set INSTANTLY_CAMPAIGN_ID && ok "INSTANTLY_CAMPAIGN_ID" || bad "INSTANTLY_CAMPAIGN_ID" "create a campaign w/ {{subject}}/{{body}}"
else
  { env_set SMTP_HOST && env_set SMTP_USER && env_set SMTP_PASS; } \
    && ok "SMTP_* (dumb relay — warmup UNPROVEN, docs/WARMUP-RND.md)" \
    || bad "SMTP_HOST/USER/PASS" "fill them, or switch SEND_BACKEND=instantly (recommended)"
fi
env_set HOST_BASE_URL  && ok "HOST_BASE_URL (tracked links)" || bad "HOST_BASE_URL" "serves /c/<token> + teaser pages"
if [ "${VIDEO_BACKEND:-fal_kling}" = "minimax" ]; then
  env_set MINIMAX_API_KEY && ok "MINIMAX_API_KEY (video fallback)" || warn "MINIMAX_API_KEY" "optional — video via minimax fallback"
else
  env_set FAL_KEY && ok "FAL_KEY (Kling video)" || warn "FAL_KEY" "optional — only if using the video variant (text_only needs none)"
fi
env_set CENSUS_API_KEY  && ok "CENSUS_API_KEY (market)"      || warn "CENSUS_API_KEY" "optional — market cross-check only (free key)"
echo

echo "PHASE A/C — client config + content"
J '(.sending.domains|length)>0'                                   && ok "sending.domains present"        || bad "sending.domains" "buy + connect cold domains (PHASE A)"
J '[.sending.domains[]?|select(.warmup_status=="ready")]|length>0' && ok "≥1 domain warmup_status=ready" || bad "no warmed domain" "warm in Instantly (~2–4 wks) — the long pole"
J '.reply_to != null'                       && ok "reply_to"                  || bad "reply_to" "monitored reply inbox"
J '.calendar_url != null'                   && ok "calendar_url"              || bad "calendar_url" "Mason+Weston booking link"
J '.compliance.unsubscribe_url != null'     && ok "compliance.unsubscribe_url"|| bad "unsubscribe_url" "CAN-SPAM hard block"
J '.compliance.postal_address != null'      && ok "compliance.postal_address" || bad "postal_address" "CAN-SPAM hard block"
J '.success.target_booked_rate != null'     && ok "success criteria"          || bad "success criteria" "target booked rate + max cost/meeting"
J '.economics.avg_deal_value_usd != null'   && ok "economics.avg_deal_value_usd" || warn "avg_deal_value_usd" "optional — \$ pipeline valuation"
n=$(ls "$ROOT"/clients/b6/dedupe/*.csv "$ROOT"/data/dedupe/*.csv 2>/dev/null | wc -l | tr -d ' ')
[ "${n:-0}" -gt 0 ] && ok "dedupe CSVs ($n found)" || bad "dedupe CSVs" "STC/Trashed/7 Stories — engine refuses to send without them"
echo

if [ "$blockers" -eq 0 ]; then
  echo "── PREFLIGHT: ✅ READY TO GO LIVE ──"; exit 0
else
  echo "── PREFLIGHT: ❌ NOT READY — $blockers blocker(s) above ──"; exit 1
fi
