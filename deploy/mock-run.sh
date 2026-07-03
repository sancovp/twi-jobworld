#!/usr/bin/env bash
# mock-run.sh — drive the WHOLE outreach funnel with mocked external effects.
#
# This is the PLUMBING demo: it exercises every `jwout` verb the departments call
# (pull → qualify → market → video → send → reply → track → report → suppress)
# with JWOUT_MOCK=1, so the funnel fills and the dashboards light up WITHOUT any
# credential (no Apollo / SMTP / fal.ai / IMAP). It is NOT the agent loop — it is
# the deterministic proof that the connector + DB + funnel flow end to end. To
# watch the real CEO agents drive these same mocked verbs, build the image with
# this code and run an instance with -e JWOUT_MOCK=1 (see run-instance.sh).
#
#   deploy/mock-run.sh [db_path]        # run the funnel, print the report
#   DASH=1 deploy/mock-run.sh [db_path] # then serve the ops dashboard on :8787
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${1:-${TMPDIR:-/tmp}/avi-jw-mock/outreach.db}"
mkdir -p "$(dirname "$DB")"
rm -f "$DB"

# Prefer an installed `jwout`; fall back to running the source module in place.
if command -v jwout >/dev/null 2>&1; then
  JWOUT=(jwout)
else
  PY="${PYTHON:-python3}"
  export PYTHONPATH="${ROOT}/connectors/outreach/src:${PYTHONPATH:-}"
  JWOUT=("$PY" -m jw_outreach.cli)
fi

export JWOUT_MOCK=1 JWOUT_DB="$DB"
j(){ echo "  jwout $*"; "${JWOUT[@]}" "$@"; }

echo "== 1. research: pull a batch (mocked Apollo) =="
j pull --titles "VP Marketing,Director of Marketing" --seniorities director,vp --limit 6

echo; echo "== 1b. research: qualify (LLM ICP score, stored) =="
j qualify set jordan.bennett@oatly.com     --tier A --score 88 --reason "DTC, social-first, exact ICP"
j qualify set casey.carter@liquiddeath.com --tier B --score 74 --reason "good fit, timing unknown"
j qualify set morgan.delgado@magicspoon.com --tier C --score 41 --reason "off-ICP category"
j qualify summary

echo; echo "== research: market size (mocked free Apollo totals) =="
j market refresh --client-dir "${ROOT}/clients/b6" || true

echo; echo "== 2b. production: teaser (mocked video) =="
j video "9s teaser — Oatly as an Adult-Swim-style comedy short" --out "$(dirname "$DB")/teaser.mp4"

echo; echo "== 2c. delivery: send across A/B variants (mocked, recorded) =="
j send --to jordan.bennett@oatly.com   --subject "a show for Oatly"           --body "Hi Jordan..." --from hello@b6.show --variant text_only --cohort engine --brand Oatly
j send --to avery.foster@ruggable.com  --subject "what a Ruggable show looks like" --body "Hi Avery..."  --from hello@b6.show --variant video     --cohort engine --brand Ruggable

echo; echo "== 3. delivery: read + classify replies (mocked inbound) =="
j reply --all --limit 5

echo; echo "== record the funnel events the classifier would emit =="
for e in delivered open reply booked;        do j track event 1 "$e" >/dev/null; done
for e in delivered view click reply booked;  do j track event 2 "$e" >/dev/null; done
j suppress add morgan.delgado@magicspoon.com --reason unsubscribe --source reply >/dev/null
echo "  (events recorded; opt-out honored)"

echo; echo "== 4. metacog: the report (funnel by variant/cohort) =="
"${JWOUT[@]}" track report --cost 0.35

echo; echo "DB: $DB"
if [ "${DASH:-0}" = "1" ]; then
  echo "== serving ops dashboard on http://127.0.0.1:8787 (Ctrl-C to stop) =="
  exec "${JWOUT[@]}" dashboard --host 127.0.0.1 --port 8787 --client-dir "${ROOT}/clients/b6"
fi
