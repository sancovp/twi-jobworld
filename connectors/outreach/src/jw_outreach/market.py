"""Market sizing + business metrics.

TAM/SAM come from free Apollo search totals (no credits): TAM = all
decision-makers matching the ICP, SAM = the reachable subset (verified-email
filter). They are snapshotted by `market refresh` (not recomputed per dashboard
load — that would spend an API call every 10s). SOM and the won/lost/potential
rollup are computed live from the run DB, so they SHARPEN as more data lands:
SOM = SAM × the observed booked-rate.

Dollar figures appear only when the client config supplies
`economics.avg_deal_value_usd`; otherwise everything is in lead/meeting counts —
never a fabricated number.
"""

from . import db, source


def refresh(conn, targeting: dict, api_key: str | None = None) -> dict:
    """Free Apollo searches → store a TAM/SAM snapshot."""
    titles = targeting.get("titles") or None
    seniorities = targeting.get("seniorities") or None
    statuses = targeting.get("email_statuses") or None
    domains = targeting.get("domains") or None
    tam = source.search_total(titles=titles, seniorities=seniorities,
                              organization_domains=domains, api_key=api_key)
    sam = source.search_total(titles=titles, seniorities=seniorities,
                              email_statuses=statuses,
                              organization_domains=domains, api_key=api_key)
    db.record_market(conn, tam, sam)
    return {"tam": tam, "sam": sam}


def _distinct_contacts_with_event(conn, ev: str) -> int:
    return conn.execute(
        "SELECT COUNT(DISTINCT s.to_email) FROM events e JOIN sends s ON s.id=e.send_id "
        "WHERE e.type=?", (ev,)).fetchone()[0]


def metrics(conn, client: dict) -> dict:
    sourced = conn.execute("SELECT COUNT(*) FROM contacts").fetchone()[0]
    sent = conn.execute("SELECT COUNT(DISTINCT to_email) FROM sends").fetchone()[0]
    booked = _distinct_contacts_with_event(conn, "booked")
    replied = _distinct_contacts_with_event(conn, "reply")
    bounced = _distinct_contacts_with_event(conn, "bounced")
    suppressed = conn.execute("SELECT COUNT(*) FROM suppressions").fetchone()[0]

    in_progress = max(replied - booked, 0)           # answered, not yet booked
    lost = bounced + suppressed                       # hard-out
    potential = max(sourced - sent, 0)                # sourced, not yet contacted
    booked_rate = (booked / sent) if sent else None   # the lever that sharpens

    mk = db.latest_market(conn)
    tam = mk["tam"] if mk else None
    sam = mk["sam"] if mk else None
    som = int(sam * booked_rate) if (sam is not None and booked_rate is not None) else None
    coverage = (sent / sam) if (sam and sam > 0) else None  # share of SAM touched

    econ = (client or {}).get("economics") or {}
    deal = econ.get("avg_deal_value_usd")

    def dollars(n):
        return (n * deal) if (deal is not None and n is not None) else None

    return {
        "sourced": sourced, "sent": sent, "booked": booked, "replied": replied,
        "bounced": bounced, "suppressed": suppressed,
        "won": booked, "in_progress": in_progress, "lost": lost, "potential": potential,
        "booked_rate": booked_rate,
        "tam": tam, "sam": sam, "som": som, "coverage": coverage,
        "market_at": mk["computed_at"] if mk else None,
        "deal_value": deal,
        "won_value": dollars(booked),
        "som_value": dollars(som),
        "tam_value": dollars(tam),  # full-market $ if every reachable lead booked (ceiling)
    }
