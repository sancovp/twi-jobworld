"""`serve` — the static host that fronts hosted assets AND records views.

External effect + persisted state: an HTTP server that serves files written by
`host` under HOST_DIR, and on each GET of a unique teaser path records a `view`
event against the send whose `asset_url` contains that uid. This closes the
host -> track loop the per-brand unique link exists for.

Mapping: `host` returns HOST_BASE_URL/<uid>/<file> and that URL is stored on the
send row (sends.asset_url) by `send`. A GET on /<uid>/<file> looks the uid up in
sends.asset_url and records the view. The funnel report counts DISTINCT send_id,
so repeat views do not inflate the rate.

It also handles tracked-link clicks: GET /c/<token> records a `click` and 302s to
the destination STORED on the send row (sends.click_dest). The destination never
comes from the request, so the link cannot be tampered into an open redirect.

And one-click unsubscribe: GET /u/<token> records a suppression for the recipient
behind that token (sends.unsub_token -> to_email) and shows a confirmation page.
    HOST_DIR   (default data/hosted)  — docroot
    JWOUT_DB                          — where view/click events + suppressions are written
"""

import mimetypes
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from . import db

_UID_RE = re.compile(r"^/([0-9a-f]{6,})/")
_CLICK_RE = re.compile(r"^/c/([A-Za-z0-9._-]+)$")
_UNSUB_RE = re.compile(r"^/u/([A-Za-z0-9._-]+)$")

_UNSUB_PAGE = (b"<!doctype html><meta charset=utf-8><title>Unsubscribed</title>"
               b"<body style='font:16px system-ui;max-width:32rem;margin:4rem auto'>"
               b"<h1>You're unsubscribed.</h1><p>You will not receive further emails "
               b"from this sender. No further action is needed.</p></body>")


def _connect(db_path):
    return db.connect(Path(db_path)) if db_path else db.connect()


def _record_view(uid: str, db_path=None) -> None:
    conn = _connect(db_path)
    try:
        row = conn.execute(
            "SELECT id FROM sends WHERE asset_url LIKE ? ORDER BY id DESC LIMIT 1",
            (f"%/{uid}/%",),
        ).fetchone()
        if row:
            db.record_event(conn, row[0], "view")
    finally:
        conn.close()


def _click_dest(token: str, db_path=None) -> str | None:
    """Record a click for this token and return the STORED destination.

    The redirect target comes only from the send row (sends.click_dest), never
    from the request — so a tampered query param cannot turn a tracking link
    into an open redirect. Unknown token -> None (handler 404s)."""
    conn = _connect(db_path)
    try:
        row = conn.execute(
            "SELECT id, click_dest FROM sends WHERE click_token=? ORDER BY id DESC LIMIT 1",
            (token,),
        ).fetchone()
        if not row:
            return None
        db.record_event(conn, row[0], "click")
        return row[1]
    finally:
        conn.close()


def _unsubscribe(token: str, db_path=None) -> None:
    """Record a suppression for the recipient behind this unsubscribe token.
    Idempotent; unknown token is a silent no-op (the page is shown regardless,
    so we never reveal whether a token is valid)."""
    conn = _connect(db_path)
    try:
        row = conn.execute(
            "SELECT to_email FROM sends WHERE unsub_token=? ORDER BY id DESC LIMIT 1",
            (token,),
        ).fetchone()
        if row and row[0]:
            db.record_suppression(conn, row[0], reason="unsubscribe", source="self-service")
    finally:
        conn.close()


def make_handler(docroot: Path, db_path=None):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):  # quiet; events go to the DB
            pass

        def do_GET(self):
            if self.path == "/health":
                self.send_response(200); self.end_headers(); self.wfile.write(b"ok"); return
            # tracked click: /c/<token> — record a click and 302 to the
            # destination STORED on the send row. No query param is trusted, so
            # this cannot be turned into an open redirect.
            split = urlsplit(self.path)
            cm = _CLICK_RE.match(split.path)
            if cm:
                try:
                    dest = _click_dest(cm.group(1), db_path)
                except Exception:
                    dest = None
                if dest and (dest.startswith("http://") or dest.startswith("https://")):
                    self.send_response(302); self.send_header("Location", dest); self.end_headers()
                else:
                    self.send_response(404); self.end_headers()
                return
            # one-click unsubscribe: /u/<token> -> record suppression, show page
            um = _UNSUB_RE.match(split.path)
            if um:
                try:
                    _unsubscribe(um.group(1), db_path)
                except Exception:
                    pass  # always show the confirmation; never leak token validity
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(_UNSUB_PAGE)))
                self.end_headers()
                self.wfile.write(_UNSUB_PAGE)
                return
            m = _UID_RE.match(self.path)
            rel = self.path.lstrip("/").split("?", 1)[0]
            target = (docroot / rel).resolve()
            # path traversal guard: target must be strictly inside docroot.
            # relative_to raises if it isn't — robust where a startswith prefix
            # compare is not (a sibling dir sharing a name prefix would pass).
            try:
                target.relative_to(docroot)
            except ValueError:
                self.send_response(404); self.end_headers(); return
            if not target.is_file():
                self.send_response(404); self.end_headers(); return
            if m:
                try:
                    _record_view(m.group(1), db_path)
                except Exception:
                    pass  # never let tracking break delivery of the asset
            data = target.read_bytes()
            ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    return Handler


def serve(host: str = "0.0.0.0", port: int = 8000, docroot: str | None = None,
          db_path: str | None = None) -> None:
    root = Path(docroot or os.environ.get("HOST_DIR", "data/hosted")).resolve()
    root.mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((host, port), make_handler(root, db_path))
    print(f"serving {root} on {host}:{port} (GET /<uid>/<file> records a view)")
    httpd.serve_forever()
