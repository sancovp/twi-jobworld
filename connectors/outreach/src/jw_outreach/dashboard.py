"""`dashboard` — an operator-facing read view over the run.

External effect: a long-running HTTP server that renders the campaign state from
the DB (and the client config) as one HTML page. It is READ-ONLY and binds
localhost by default — it is the OPERATOR's view, NOT the recipient-facing
`serve` server. Never expose it publicly; it shows campaign internals.

It unifies what is otherwise scattered across `track report`, the reply CLI, and
the NEEDS-FROM gates:
  - funnel by variant / cohort (deliverability → booked, cost per booked)
  - per-contact pipeline status (furthest stage each contact reached)
  - the reply queue (who answered, needs a human)
  - gate status (which $client config slots still block a live send)

    JWOUT_DB        the run DB to read
    JW_CLIENT_DIR   the client config dir (for the gate panel)
"""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import db

_STAGES = ["delivered", "view", "click", "reply", "booked"]


def _funnel(conn) -> list[dict]:
    rows = []
    for (variant,) in conn.execute("SELECT DISTINCT variant FROM sends ORDER BY variant"):
        total = conn.execute("SELECT COUNT(*) FROM sends WHERE variant=?", (variant,)).fetchone()[0]
        if not total:
            continue

        def n(ev):
            return conn.execute(
                "SELECT COUNT(DISTINCT e.send_id) FROM events e JOIN sends s ON s.id=e.send_id "
                "WHERE s.variant=? AND e.type=?", (variant, ev)).fetchone()[0]

        rows.append({"variant": variant or "(none)", "sends": total,
                     **{ev: n(ev) for ev in _STAGES},
                     "bounced": n("bounced")})
    return rows


def _contacts(conn) -> list[dict]:
    out = []
    for email, brand in conn.execute("SELECT email, brand FROM contacts ORDER BY brand, email"):
        touches = conn.execute("SELECT COUNT(*) FROM sends WHERE to_email=?", (email,)).fetchone()[0]
        reached = "—"
        for ev in reversed(_STAGES):
            hit = conn.execute(
                "SELECT 1 FROM events e JOIN sends s ON s.id=e.send_id "
                "WHERE s.to_email=? AND e.type=? LIMIT 1", (email, ev)).fetchone()
            if hit:
                reached = ev
                break
        if reached == "—" and touches:
            reached = "sent"
        supp = db.is_suppressed(conn, email)
        out.append({"email": email, "brand": brand, "touches": touches,
                    "reached": reached, "suppressed": supp})
    return out


def _reply_queue(conn) -> list[dict]:
    rows = conn.execute(
        "SELECT s.to_email, s.brand, s.subject, e.occurred_at FROM events e "
        "JOIN sends s ON s.id=e.send_id WHERE e.type IN ('reply','booked') "
        "ORDER BY e.occurred_at DESC LIMIT 100").fetchall()
    return [{"email": r[0], "brand": r[1], "subject": r[2], "when": r[3]} for r in rows]


def _gates(client_dir: str | None) -> list[dict]:
    if not client_dir:
        return []
    p = Path(client_dir) / "client.json"
    if not p.exists():
        return []
    c = json.loads(p.read_text())
    domains = (c.get("sending") or {}).get("domains") or []
    ready = any((d.get("warmup_status") == "ready") for d in domains)
    comp = c.get("compliance") or {}
    succ = c.get("success") or {}
    dedupe_csvs = list((Path(client_dir) / "dedupe").glob("*.csv"))
    checks = [
        ("warmed sending domain", ready),
        ("reply inbox", bool(c.get("reply_to"))),
        ("calendar link", bool(c.get("calendar_url"))),
        ("tracked-link host", bool(c.get("host_base_url"))),
        ("postal address", bool(comp.get("postal_address"))),
        ("unsubscribe (config or /u host)", bool(comp.get("unsubscribe_url") or c.get("host_base_url"))),
        ("success thresholds", succ.get("target_booked_rate") is not None),
        ("dedupe lists", len(dedupe_csvs) > 0),
    ]
    return [{"item": name, "ok": ok} for name, ok in checks]


def _esc(s) -> str:
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def render(conn, client_dir: str | None) -> str:
    funnel = _funnel(conn)
    contacts = _contacts(conn)
    replies = _reply_queue(conn)
    gates = _gates(client_dir)
    supp_count = conn.execute("SELECT COUNT(*) FROM suppressions").fetchone()[0]
    client = os.environ.get("JW_CLIENT", "")

    def pct(num, den):
        return f"{(num/den*100):.0f}%" if den else "—"

    f_rows = "".join(
        f"<tr><td>{_esc(r['variant'])}</td><td>{r['sends']}</td>"
        + "".join(f"<td>{r[ev]} <span class=p>{pct(r[ev], r['sends'])}</span></td>" for ev in _STAGES)
        + f"<td>{r['bounced']}</td></tr>"
        for r in funnel) or "<tr><td colspan=8 class=dim>no sends yet</td></tr>"

    c_rows = "".join(
        f"<tr><td>{_esc(c['brand'])}</td><td>{_esc(c['email'])}</td><td>{c['touches']}</td>"
        f"<td><span class='b {c['reached']}'>{c['reached']}</span></td>"
        f"<td>{'<span class=sup>suppressed</span>' if c['suppressed'] else ''}</td></tr>"
        for c in contacts) or "<tr><td colspan=5 class=dim>no contacts yet</td></tr>"

    r_rows = "".join(
        f"<tr><td>{_esc(r['brand'])}</td><td>{_esc(r['email'])}</td>"
        f"<td>{_esc(r['subject'])}</td><td class=dim>{_esc(r['when'])}</td></tr>"
        for r in replies) or "<tr><td colspan=4 class=dim>no replies yet</td></tr>"

    g_rows = "".join(
        f"<li><span class='dot {'ok' if g['ok'] else 'no'}'></span>{_esc(g['item'])}</li>"
        for g in gates) or "<li class=dim>no client config loaded</li>"
    blocked = [g for g in gates if not g["ok"]]
    gate_summary = ("<b class=no>BLOCKED</b> — " + ", ".join(_esc(g["item"]) for g in blocked)
                    if blocked else "<b class=ok>all gates clear</b>")

    return f"""<!doctype html><html><head><meta charset=utf-8>
<meta http-equiv=refresh content=10><title>outreach — {_esc(client)}</title>
<style>
 body{{font:14px/1.5 system-ui,sans-serif;margin:0;background:#0f1117;color:#e6e6e6}}
 header{{padding:14px 22px;background:#161a24;border-bottom:1px solid #262c3a}}
 header h1{{margin:0;font-size:16px}} header .s{{color:#8a93a6;font-size:12px}}
 main{{padding:22px;display:grid;gap:22px;max-width:1100px;margin:0 auto}}
 section{{background:#161a24;border:1px solid #262c3a;border-radius:10px;padding:16px 18px}}
 h2{{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#8a93a6}}
 table{{width:100%;border-collapse:collapse}} td,th{{text-align:left;padding:6px 8px;border-bottom:1px solid #21263200}}
 tr:nth-child(even){{background:#1b2030}} th{{color:#8a93a6;font-weight:600;border-bottom:1px solid #262c3a}}
 .p{{color:#8a93a6;font-size:12px}} .dim{{color:#6b7488}} .sup{{color:#ff7b72;font-size:12px}}
 .b{{padding:1px 7px;border-radius:20px;font-size:12px;background:#21314a}}
 .booked{{background:#1f6f3f}} .reply{{background:#2f5fa8}} .click{{background:#3a4a6a}}
 .dot{{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:middle}}
 .dot.ok{{background:#3fb950}} .dot.no{{background:#ff7b72}} ul{{list-style:none;padding:0;margin:0;columns:2}}
 b.ok{{color:#3fb950}} b.no{{color:#ff7b72}} a{{color:#79c0ff}}
</style></head><body>
<header><h1>Outreach dashboard <span class=s>· client: {_esc(client) or '—'} · suppressed: {supp_count} · auto-refresh 10s</span></h1></header>
<main>
 <section><h2>Gate status</h2><p>{gate_summary}</p><ul>{g_rows}</ul></section>
 <section><h2>Funnel by variant</h2><table>
   <tr><th>variant</th><th>sends</th><th>delivered</th><th>view</th><th>click</th><th>reply</th><th>booked</th><th>bounced</th></tr>
   {f_rows}</table></section>
 <section><h2>Reply queue</h2><table>
   <tr><th>brand</th><th>email</th><th>subject</th><th>when</th></tr>{r_rows}</table></section>
 <section><h2>Contacts ({len(contacts)})</h2><table>
   <tr><th>brand</th><th>email</th><th>touches</th><th>furthest stage</th><th></th></tr>{c_rows}</table></section>
</main></body></html>"""


def dashboard(host: str = "127.0.0.1", port: int = 8787,
              db_path: str | None = None, client_dir: str | None = None) -> None:
    client_dir = client_dir or os.environ.get("JW_CLIENT_DIR")

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            if self.path not in ("/", "/index.html"):
                self.send_response(404); self.end_headers(); return
            conn = db.connect(Path(db_path)) if db_path else db.connect()
            try:
                html = render(conn, client_dir).encode("utf-8")
            finally:
                conn.close()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.end_headers()
            self.wfile.write(html)

    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"dashboard on http://{host}:{port}  (client={client_dir}, db={db_path or 'default'})")
    httpd.serve_forever()
