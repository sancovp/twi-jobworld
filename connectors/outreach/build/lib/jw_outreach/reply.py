"""`reply` — read replies over IMAP.

External effect: connects to an inbox and pulls messages. Cold sending routes
replies to a monitored mailbox; this reads them so a human (or the LLM) can
see who answered. Defaults to UNSEEN so each call returns only new mail.
    IMAP_HOST IMAP_PORT IMAP_USER IMAP_PASS  (IMAP_SSL=1 by default)
"""

import email
import email.message
import imaplib
import os
from email.header import decode_header


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
