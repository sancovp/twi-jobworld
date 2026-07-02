"""`reply` — read inbound replies via a swappable backend.

Backend chosen by REPLY_BACKEND (defaults to SEND_BACKEND, else "imap") — because
replies land wherever you sent from:

  imap      — connect to a monitored mailbox and pull messages (cold SMTP routes
              replies to an inbox you watch). Defaults to UNSEEN so each call
              returns only new mail.
                IMAP_HOST IMAP_PORT IMAP_USER IMAP_PASS   (IMAP_SSL=1 default)

  instantly — when sending via Instantly, replies live in Instantly's Unibox, not
              an IMAP inbox. This pulls them from GET /api/v2/emails (received).
                INSTANTLY_API_KEY  INSTANTLY_CAMPAIGN_ID  (INSTANTLY_DRY_RUN=1 to
                print the request instead of calling)

Both backends return the same shape: [{from, subject, date, snippet}].
"""

import email
import email.message
import imaplib
import json
import os
import sys
import urllib.parse
import urllib.request
from email.header import decode_header

INSTANTLY_EMAILS_URL = "https://api.instantly.ai/api/v2/emails"


# ---- imap backend ---------------------------------------------------------

def _decode(value: str) -> str:
    out = []
    for part, enc in decode_header(value or ""):
        out.append(part.decode(enc or "utf-8", "replace") if isinstance(part, bytes) else part)
    return "".join(out)


def _body_snippet(msg: email.message.Message, limit: int = 500) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True) or b""
                return payload.decode(part.get_content_charset() or "utf-8", "replace")[:limit]
        return ""
    payload = msg.get_payload(decode=True) or b""
    return payload.decode(msg.get_content_charset() or "utf-8", "replace")[:limit]


def fetch(*, folder: str = "INBOX", criterion: str = "UNSEEN", limit: int = 50) -> list[dict]:
    host = os.environ["IMAP_HOST"]
    port = int(os.environ.get("IMAP_PORT", "993"))
    use_ssl = os.environ.get("IMAP_SSL", "1") == "1"
    cls = imaplib.IMAP4_SSL if use_ssl else imaplib.IMAP4

    conn = cls(host, port)
    try:
        conn.login(os.environ["IMAP_USER"], os.environ["IMAP_PASS"])
        conn.select(folder)
        _, data = conn.search(None, criterion)
        ids = data[0].split()[:limit]
        out = []
        for mid in ids:
            _, raw = conn.fetch(mid, "(RFC822)")
            msg = email.message_from_bytes(raw[0][1])
            out.append({
                "from": _decode(msg.get("From", "")),
                "subject": _decode(msg.get("Subject", "")),
                "date": msg.get("Date", ""),
                "snippet": _body_snippet(msg),
            })
        return out
    finally:
        try:
            conn.logout()
        except Exception:
            pass


# ---- instantly backend (Unibox replies) -----------------------------------

def _instantly_body(e: dict, limit: int = 500) -> str:
    body = e.get("body")
    if isinstance(body, dict):
        body = body.get("text") or body.get("html") or ""
    if not body:
        body = e.get("text") or e.get("content") or e.get("preview") or ""
    return str(body)[:limit]


def instantly_fetch_replies(*, limit: int = 50) -> list[dict]:
    """Pull received replies from Instantly's Unibox for our campaign."""
    api_key = os.environ["INSTANTLY_API_KEY"]
    campaign = os.environ.get("INSTANTLY_CAMPAIGN_ID", "")
    # NOTE: confirm the exact v2 filter param on first live run — public docs are
    # partial with v1↔v2 drift. 'email_type=received' is the documented filter;
    # the defensive parsing below tolerates field-name differences either way.
    params = {"email_type": "received", "preview_only": "false", "limit": str(limit)}
    if campaign:
        params["campaign_id"] = campaign
    url = INSTANTLY_EMAILS_URL + "?" + urllib.parse.urlencode(params)

    if os.environ.get("INSTANTLY_DRY_RUN") == "1":
        print(f"[dry-run] GET {url}  (Authorization: Bearer ***)", file=sys.stderr)
        return []

    req = urllib.request.Request(url, method="GET",
                                 headers={"Authorization": f"Bearer {api_key}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read() or b"{}")
    items = data.get("items") or data.get("data") or (data if isinstance(data, list) else [])
    out = []
    for e in items[:limit]:
        out.append({
            # field-name drift tolerance: v2 Unibox emails have been observed to
            # carry the sender under different keys; from_address_email is the
            # likely v2 name — confirm on the first live pull.
            "from": (e.get("from") or e.get("from_address") or
                     e.get("from_address_email") or e.get("lead") or ""),
            "subject": e.get("subject", ""),
            "date": e.get("timestamp") or e.get("timestamp_created") or e.get("date") or "",
            "snippet": _instantly_body(e),
        })
    return out


# ---- dispatcher -----------------------------------------------------------

def read(*, folder: str = "INBOX", criterion: str = "UNSEEN", limit: int = 50) -> list[dict]:
    """Route to the configured backend. Replies land wherever you sent from, so
    REPLY_BACKEND defaults to SEND_BACKEND.

    `or`-chained (not .get defaults) because env-file loaders (docker --env-file,
    `set -a; . secrets.env`) set EMPTY strings for blank template lines — an empty
    var must fall through exactly like an unset one, or a blank REPLY_BACKEND=
    silently forces the IMAP branch under SEND_BACKEND=instantly."""
    backend = (os.environ.get("REPLY_BACKEND") or os.environ.get("SEND_BACKEND") or "imap").strip().lower()
    if backend == "instantly":
        return instantly_fetch_replies(limit=limit)
    if backend == "imap":
        return fetch(folder=folder, criterion=criterion, limit=limit)
    raise RuntimeError(f"unknown REPLY_BACKEND: {backend!r} (use imap | instantly)")
