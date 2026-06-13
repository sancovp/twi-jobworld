"""`serve` — the static host that fronts hosted assets AND records views.

External effect + persisted state: an HTTP server that serves files written by
`host` under HOST_DIR, and on each GET of a unique teaser path records a `view`
event against the send whose `asset_url` contains that uid. This closes the
host -> track loop the per-brand unique link exists for.

Mapping: `host` returns HOST_BASE_URL/<uid>/<file> and that URL is stored on the
send row (sends.asset_url) by `send`. A GET on /<uid>/<file> looks the uid up in
sends.asset_url and records the view. The funnel report counts DISTINCT send_id,
so repeat views do not inflate the rate.
    HOST_DIR   (default data/hosted)  — docroot
    JWOUT_DB                          — where view events are recorded
"""

import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import db

_UID_RE = re.compile(r"^/([0-9a-f]{6,})/")


def _record_view(uid: str) -> None:
    conn = db.connect()
    row = conn.execute(
        "SELECT id FROM sends WHERE asset_url LIKE ? ORDER BY id DESC LIMIT 1",
        (f"%/{uid}/%",),
    ).fetchone()
    if row:
        db.record_event(conn, row[0], "view")


def make_handler(docroot: Path):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):  # quiet; events go to the DB
            pass

        def do_GET(self):
            if self.path == "/health":
                self.send_response(200); self.end_headers(); self.wfile.write(b"ok"); return
            m = _UID_RE.match(self.path)
            rel = self.path.lstrip("/").split("?", 1)[0]
            target = (docroot / rel).resolve()
            # path traversal guard: must stay under docroot
            if not str(target).startswith(str(docroot.resolve())) or not target.is_file():
                self.send_response(404); self.end_headers(); return
            if m:
                try:
                    _record_view(m.group(1))
                except Exception:
                    pass  # never let tracking break delivery of the asset
            data = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    return Handler


def serve(host: str = "0.0.0.0", port: int = 8000, docroot: str | None = None) -> None:
    root = Path(docroot or os.environ.get("HOST_DIR", "data/hosted")).resolve()
    root.mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((host, port), make_handler(root))
    print(f"serving {root} on {host}:{port} (GET /<uid>/<file> records a view)")
    httpd.serve_forever()
