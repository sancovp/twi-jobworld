"""`dashboard` — the operator's read view over one outreach run.

External effect: a long-running, READ-ONLY HTTP server that renders the campaign
state from the DB (and the client config) as one server-rendered page. Binds
localhost by default — it is the OPERATOR's console, NOT the recipient-facing
`serve` server. Never expose it publicly; it shows campaign internals.

Deliberately stdlib-only (no framework, no build step, no JS beyond a meta
refresh) — it stays trivial to run during development. It unifies what is
otherwise scattered across `track report`, the reply CLI, and the gate config:

  - readiness: which $client slots still block a live send (the pre-launch view)
  - funnel by variant, with the month-one answers: video lift + engine-vs-control
  - cost: spend, cost per booked vs the client's cap
  - actions: the reply queue and recent opt-outs
  - contacts: per-contact furthest stage

    JWOUT_DB        the run DB to read
    JW_CLIENT_DIR   the client config dir (readiness + cost)
"""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import db, market

_STAGES = ["delivered", "view", "click", "reply", "booked"]

_CSS = """
 :root{--bg:#0d1017;--card:#151a23;--line:#232a37;--dim:#7d8699;--ink:#e7ebf0;--ok:#3fb950;--no:#f85149;--accent:#58a6ff}
 *{box-sizing:border-box} body{font:14px/1.55 ui-sans-serif,system-ui,sans-serif;margin:0;background:var(--bg);color:var(--ink)}
 header{padding:12px 26px;background:var(--card);border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
 header h1{margin:0;font-size:15px;font-weight:600;display:inline}
 header .s{color:var(--dim);font-size:12px}
 nav{display:inline-flex;gap:4px;margin-left:16px}
 .navlink{font-size:12px;color:var(--dim);text-decoration:none;padding:4px 12px;border-radius:8px}
 .navlink.on{background:#1f2733;color:var(--ink)}
 main{padding:24px;display:grid;gap:18px;max-width:1180px;margin:0 auto}
 section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px}
 h2{margin:0 0 14px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);font-weight:700}
 h3{margin:0 0 8px;font-size:13px;font-weight:600}
 .hero{font-size:18px;padding:18px 22px;border-radius:12px;border:1px solid var(--line)}
 .hero b{font-size:20px} .hero.ok{background:#12251a;border-color:#1f6f3f;color:#7ee2a8}
 .hero.no{background:#2a1416;border-color:#7d2a2a;color:#ffb4ab} .hero.none{color:var(--dim)}
 .missrow{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
 .miss{font-size:12px;background:#3d1d1f;color:#ffb4ab;padding:2px 9px;border-radius:20px}
 .chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
 .chip{font-size:12px;padding:3px 11px;border-radius:20px;border:1px solid var(--line)}
 .chip.y{background:#12251a;color:#7ee2a8;border-color:#1f6f3f} .chip.n{background:#231417;color:#ffb4ab;border-color:#5c2326}
 .funnels{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
 .fr{display:grid;grid-template-columns:88px 1fr 110px;align-items:center;gap:10px;margin:3px 0}
 .fl{color:var(--dim);font-size:12px} .ft{background:#0c1f17;border-radius:5px;height:16px;overflow:hidden}
 .ft i{display:block;height:100%;background:linear-gradient(90deg,#1f6f3f,#3fb950);min-width:2px}
 .fn{font-variant-numeric:tabular-nums;font-size:12px;text-align:right} .fn em{color:var(--dim);font-style:normal}
 .cmp{padding:8px 0;border-top:1px solid var(--line);font-size:13px} .cmp:first-child{border-top:0}
 .delta{font-weight:700} .delta.up{color:var(--ok)} .delta.down{color:var(--no)}
 .cost{font-size:15px} code{background:#0c1119;padding:1px 6px;border-radius:5px;color:var(--accent);font-size:12px}
 table{width:100%;border-collapse:collapse;font-size:13px} td,th{text-align:left;padding:6px 9px}
 tr:nth-child(even) td{background:#1a212c} th{color:var(--dim);font-weight:600;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
 .dim{color:var(--dim)} .sup{color:#ffb4ab;font-size:12px}
 .b{padding:1px 9px;border-radius:20px;font-size:12px;background:#21314a}
 .booked{background:#1f6f3f;color:#cffadd} .reply{background:#2f5fa8} .click{background:#3a4a6a} .sent{background:#2a3142;color:var(--dim)}
 .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px} @media(max-width:760px){.grid2{grid-template-columns:1fr}}
 .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px}
 .card{background:#0f141d;border:1px solid var(--line);border-radius:10px;padding:14px 16px}
 .card .k{color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.05em}
 .card .v{font-size:26px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums}
 .card .sub{color:var(--dim);font-size:12px;margin-top:2px} .card.won{border-color:#1f6f3f} .card.lost{border-color:#5c2326} .card.prog{border-color:#2f5fa8}
 .ph{display:inline-block;font-size:11px;font-weight:700;color:#e3b341;background:#2a2410;border:1px solid #6b5a1e;padding:2px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:.05em}
"""


def _nav(active):
    def link(href, label, key):
        return f"<a class='navlink{' on' if key == active else ''}' href='{href}'>{label}</a>"
    return "<nav>" + link("/", "Operations", "ops") + link("/business", "Business", "business") + "</nav>"


def _shell(client, active, summary, body):
    return ("<!doctype html><html><head><meta charset=utf-8>"
            "<meta http-equiv=refresh content=10><title>outreach · " + _esc(client) + "</title>"
            "<style>" + _CSS + "</style></head><body><header><div><h1>Outreach · "
            + (_esc(client) or "—") + "</h1>" + _nav(active) + "</div><span class=s>"
            + summary + "</span></header><main>" + body + "</main></body></html>")


def _money(n):
    if n is None:
        return None
    if n >= 1_000_000:
        return f"${n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"${n/1_000:.0f}K"
    return f"${n:,.0f}"


# ---- data ------------------------------------------------------------------

def _client(client_dir):
    if not client_dir:
        return {}
    p = Path(client_dir) / "client.json"
    return json.loads(p.read_text()) if p.exists() else {}


def _counts(conn, field, value):
    """Funnel counts for sends WHERE <field>=<value> (variant or cohort)."""
    total = conn.execute(f"SELECT COUNT(*) FROM sends WHERE {field}=?", (value,)).fetchone()[0]
    out = {"sends": total}
    for ev in _STAGES + ["bounced"]:
        out[ev] = conn.execute(
            f"SELECT COUNT(DISTINCT e.send_id) FROM events e JOIN sends s ON s.id=e.send_id "
            f"WHERE s.{field}=? AND e.type=?", (value, ev)).fetchone()[0]
    return out


def _distinct(conn, field):
    return [r[0] for r in conn.execute(f"SELECT DISTINCT {field} FROM sends ORDER BY {field}")]


def _booked_rate(conn, field, value):
    c = _counts(conn, field, value)
    return (c["booked"] / c["sends"]) if c["sends"] else None, c["sends"]


def _contacts(conn, limit=200):
    rows = conn.execute("SELECT email, brand FROM contacts").fetchall()
    out = []
    for email, brand in rows:
        touches = conn.execute("SELECT COUNT(*) FROM sends WHERE to_email=?", (email,)).fetchone()[0]
        reached, rank = ("sent", 0) if touches else ("—", -1)
        for i, ev in enumerate(_STAGES, 1):
            if conn.execute("SELECT 1 FROM events e JOIN sends s ON s.id=e.send_id "
                            "WHERE s.to_email=? AND e.type=? LIMIT 1", (email, ev)).fetchone():
                reached, rank = ev, i
        out.append({"email": email, "brand": brand, "touches": touches,
                    "reached": reached, "rank": rank,
                    "suppressed": db.is_suppressed(conn, email)})
    out.sort(key=lambda c: (-c["rank"], c["brand"]))   # most-advanced first
    return out, len(rows)


def _reply_queue(conn):
    rows = conn.execute(
        "SELECT s.to_email, s.brand, s.subject, e.type, e.occurred_at FROM events e "
        "JOIN sends s ON s.id=e.send_id WHERE e.type IN ('reply','booked') "
        "ORDER BY e.occurred_at DESC LIMIT 50").fetchall()
    return [{"email": r[0], "brand": r[1], "subject": r[2], "kind": r[3], "when": r[4]} for r in rows]


def _opt_outs(conn):
    rows = conn.execute("SELECT email, reason, created_at FROM suppressions "
                        "ORDER BY created_at DESC LIMIT 20").fetchall()
    return [{"email": r[0], "reason": r[1], "when": r[2]} for r in rows]


def _gates(c, client_dir):
    if not c:
        return []
    domains = (c.get("sending") or {}).get("domains") or []
    comp = c.get("compliance") or {}
    succ = c.get("success") or {}
    dedupe = list((Path(client_dir) / "dedupe").glob("*.csv")) if client_dir else []
    return [
        ("warmed sending domain", any(d.get("warmup_status") == "ready" for d in domains)),
        ("reply inbox", bool(c.get("reply_to"))),
        ("calendar link", bool(c.get("calendar_url"))),
        ("tracked-link host", bool(c.get("host_base_url"))),
        ("postal address", bool(comp.get("postal_address"))),
        ("unsubscribe", bool(comp.get("unsubscribe_url") or c.get("host_base_url"))),
        ("success thresholds", succ.get("target_booked_rate") is not None),
        ("dedupe lists", len(dedupe) > 0),
    ]


# ---- render ----------------------------------------------------------------

def _esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _pct(n, d):
    return f"{n / d * 100:.0f}%" if d else "—"


def _funnel_block(name, c):
    if not c["sends"]:
        return ""
    bars = ""
    for ev in _STAGES:
        w = (c[ev] / c["sends"] * 100) if c["sends"] else 0
        bars += (f"<div class=fr><span class=fl>{ev}</span>"
                 f"<span class=ft><i style='width:{w:.0f}%'></i></span>"
                 f"<span class=fn>{c[ev]} <em>{_pct(c[ev], c['sends'])}</em></span></div>")
    b = f"<span class=dim>· {c['bounced']} bounced</span>" if c["bounced"] else ""
    return f"<div class=fcol><h3>{_esc(name)} <span class=dim>· {c['sends']} sends {b}</span></h3>{bars}</div>"


def _compare(conn, field, a, b, label):
    ra, na = _booked_rate(conn, field, a)
    rb, nb = _booked_rate(conn, field, b)
    if ra is None or rb is None:
        return (f"<div class=cmp><b>{label}</b> <span class=dim>needs sends in both "
                f"<code>{_esc(a)}</code> and <code>{_esc(b)}</code> to compare</span></div>")
    dpp = (ra - rb) * 100
    cls = "up" if dpp > 0 else ("down" if dpp < 0 else "")
    sign = "+" if dpp > 0 else ""
    return (f"<div class=cmp><b>{label}</b> booked {ra*100:.1f}% "
            f"<span class=dim>({_esc(a)}, n={na})</span> vs {rb*100:.1f}% "
            f"<span class=dim>({_esc(b)}, n={nb})</span> → "
            f"<span class='delta {cls}'>{sign}{dpp:.1f}pp</span></div>")


def render(conn, client_dir):
    c = _client(client_dir)
    client = os.environ.get("JW_CLIENT", "") or c.get("name", "")
    gates = _gates(c, client_dir)
    blocked = [g for g, ok in gates if not ok]
    ready = bool(gates) and not blocked

    total_sends = conn.execute("SELECT COUNT(*) FROM sends").fetchone()[0]
    booked = conn.execute("SELECT COUNT(DISTINCT send_id) FROM events WHERE type='booked'").fetchone()[0]
    supp = conn.execute("SELECT COUNT(*) FROM suppressions").fetchone()[0]

    # readiness hero
    if not gates:
        hero = "<div class='hero none'><b>No client config loaded</b></div>"
    elif ready:
        hero = "<div class='hero ok'><b>READY</b> — all gates clear, live send unlocked</div>"
    else:
        items = "".join(f"<span class=miss>{_esc(g)}</span>" for g in blocked)
        hero = (f"<div class='hero no'><b>BLOCKED</b> — {len(blocked)} of {len(gates)} "
                f"gates remaining{('<div class=missrow>' + items + '</div>')}</div>")

    gate_chips = "".join(
        f"<span class='chip {'y' if ok else 'n'}'>{_esc(g)}</span>" for g, ok in gates) \
        or "<span class=dim>—</span>"

    # funnel + month-one comparisons
    variants = _distinct(conn, "variant")
    funnels = "".join(_funnel_block(v or "(none)", _counts(conn, "variant", v)) for v in variants) \
        or "<p class=dim>no sends yet</p>"
    comparisons = ""
    if "video" in variants and "text_only" in variants:
        comparisons += _compare(conn, "variant", "video", "text_only", "Video lift")
    cohorts = _distinct(conn, "cohort")
    if "engine" in cohorts and "manual_control" in cohorts:
        comparisons += _compare(conn, "cohort", "engine", "manual_control", "Engine vs control")
    if not comparisons:
        comparisons = ("<div class=cmp><span class=dim>split a batch across "
                       "<code>video</code>/<code>text_only</code> and tag a "
                       "<code>manual_control</code> cohort to read the lift</span></div>")

    # cost
    cps = c.get("cost_per_send_usd")
    cap = (c.get("success") or {}).get("max_cost_per_meeting_usd")
    if cps is not None and total_sends:
        spend = total_sends * cps
        cpb = (spend / booked) if booked else None
        cpb_s = f"${cpb:,.2f}" if cpb is not None else "—"
        over = cap is not None and cpb is not None and cpb > cap
        cap_s = (f" · cap ${cap:,.2f} <span class='delta {'down' if over else 'up'}'>"
                 f"{'OVER' if over else 'under'}</span>") if cap is not None else ""
        cost = (f"spend <b>${spend:,.2f}</b> over {total_sends} sends · "
                f"cost/booked <b>{cpb_s}</b>{cap_s}")
    else:
        cost = "<span class=dim>set cost_per_send_usd and send to see spend</span>"

    # actions
    replies = _reply_queue(conn)
    r_rows = "".join(
        f"<tr><td><span class='b {r['kind']}'>{r['kind']}</span></td><td>{_esc(r['brand'])}</td>"
        f"<td>{_esc(r['email'])}</td><td>{_esc(r['subject'])}</td><td class=dim>{_esc(r['when'])}</td></tr>"
        for r in replies) or "<tr><td colspan=5 class=dim>no replies yet</td></tr>"
    optouts = _opt_outs(conn)
    o_rows = "".join(
        f"<tr><td>{_esc(o['email'])}</td><td>{_esc(o['reason'])}</td><td class=dim>{_esc(o['when'])}</td></tr>"
        for o in optouts) or "<tr><td colspan=3 class=dim>none</td></tr>"

    # contacts
    contacts, n_contacts = _contacts(conn)
    shown = contacts[:200]
    c_rows = "".join(
        f"<tr><td>{_esc(x['brand'])}</td><td>{_esc(x['email'])}</td><td>{x['touches']}</td>"
        f"<td><span class='b {x['reached']}'>{x['reached']}</span></td>"
        f"<td>{'<span class=sup>suppressed</span>' if x['suppressed'] else ''}</td></tr>"
        for x in shown) or "<tr><td colspan=5 class=dim>no contacts yet</td></tr>"
    more = f"<p class=dim>showing 200 of {n_contacts}</p>" if n_contacts > 200 else ""

    summary = f"{total_sends} sends · {booked} booked · {supp} suppressed · auto-refresh 10s"
    body = f"""
 <section><h2>Readiness</h2>{hero}<div class=chips>{gate_chips}</div></section>
 <section><h2>Funnel &amp; month-one signal</h2>
   <div class=funnels>{funnels}</div>
   <div style='margin-top:14px'>{comparisons}</div></section>
 <section><h2>Cost</h2><div class=cost>{cost}</div></section>
 <div class=grid2>
   <section><h2>Reply queue</h2><table>
     <tr><th></th><th>brand</th><th>email</th><th>subject</th><th>when</th></tr>{r_rows}</table></section>
   <section><h2>Recent opt-outs</h2><table>
     <tr><th>email</th><th>reason</th><th>when</th></tr>{o_rows}</table></section>
 </div>
 <section><h2>Contacts ({n_contacts})</h2>{more}<table>
   <tr><th>brand</th><th>email</th><th>touches</th><th>furthest stage</th><th></th></tr>{c_rows}</table></section>"""
    return _shell(client, "ops", summary, body)


def render_business(conn, client_dir):
    c = _client(client_dir)
    client = os.environ.get("JW_CLIENT", "") or c.get("name", "")
    m = market.metrics(conn, c)
    deal = m["deal_value"]

    def card(k, v, sub="", cls=""):
        return (f"<div class='card {cls}'><div class=k>{k}</div><div class=v>{v}</div>"
                f"<div class=sub>{sub}</div></div>")

    def dual(count, value):
        """show $ if a deal value is configured, else the count."""
        return _money(value) if (deal is not None and value is not None) else f"{count:,}"

    # pipeline cards (won / in-progress / lost / potential)
    pipeline = (
        card("Won", dual(m["won"], m["won_value"]),
             f"{m['won']} meetings booked" if deal is not None else "meetings booked", "won")
        + card("In progress", f"{m['in_progress']:,}", "replied, not booked", "prog")
        + card("Lost", f"{m['lost']:,}", "bounced + opted-out", "lost")
        + card("Potential", f"{m['potential']:,}", "sourced, not contacted"))

    # market funnel TAM -> SAM -> SOM
    if m["tam"] is None:
        market_block = ("<p class=dim>No market snapshot yet. Run "
                        "<code>jwout market refresh</code> (free Apollo search) to size "
                        "TAM/SAM. SOM then computes live from your booked-rate.</p>")
    else:
        tam, sam, som = m["tam"], m["sam"], m["som"]
        def bar(label, n, of, sub):
            w = (n / of * 100) if (of and n is not None) else 0
            val = dual(n, _val(n, deal)) if n is not None else "—"
            return (f"<div class=fr><span class=fl>{label}</span>"
                    f"<span class=ft><i style='width:{w:.0f}%'></i></span>"
                    f"<span class=fn>{val} <em>{sub}</em></span></div>")
        som_sub = (f"@ {m['booked_rate']*100:.1f}% booked-rate" if m["booked_rate"] is not None
                   else "needs booked data")
        market_block = (
            bar("TAM", tam, tam, "all ICP decision-makers")
            + bar("SAM", sam, tam, "reachable (verified email)")
            + bar("SOM", som, tam, som_sub)
            + f"<p class=dim style='margin-top:8px'>snapshot {_esc(m['market_at'])} · "
              f"coverage {(_pct(m['sent'], m['sam']) if m['sam'] else '—')} of SAM contacted · "
              f"sharpens as more sends land</p>")

    deal_line = (f"deal value <b>{_money(deal)}</b> — pipeline shown in $"
                 if deal is not None else
                 "<span class=dim>set <code>economics.avg_deal_value_usd</code> in the client "
                 "config to value the pipeline in $ (counts shown until then)</span>")

    revenue = ("<span class=ph>placeholder</span> "
               "<span class=dim>Real cash/MRR is not connected. Hook a bank via "
               "<b>Teller</b> or a processor via <b>Stripe</b> to compute actual revenue. "
               "No figure is shown until an account is linked — nothing here is fabricated.</span>")

    summary = (f"won {m['won']:,} · SAM {m['sam']:,}" if m["sam"] is not None
               else f"won {m['won']:,} · run market refresh for TAM/SAM") + " · auto-refresh 10s"
    body = f"""
 <section><h2>Pipeline</h2><div class=cards>{pipeline}</div>
   <p style='margin-top:12px'>{deal_line}</p></section>
 <section><h2>Market · TAM → SAM → SOM</h2>{market_block}</section>
 <section><h2>Revenue (cash)</h2><div class=cost>{revenue}</div></section>"""
    return _shell(client, "business", summary, body)


def _val(n, deal):
    return (n * deal) if (deal is not None and n is not None) else None


def dashboard(host: str = "127.0.0.1", port: int = 8787,
              db_path: str | None = None, client_dir: str | None = None) -> None:
    client_dir = client_dir or os.environ.get("JW_CLIENT_DIR")

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            route = self.path.split("?", 1)[0]
            if route in ("/", "/index.html"):
                page = render
            elif route == "/business":
                page = render_business
            else:
                self.send_response(404); self.end_headers(); return
            conn = db.connect(Path(db_path)) if db_path else db.connect()
            try:
                html = page(conn, client_dir).encode("utf-8")
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
