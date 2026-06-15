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

import json

from . import census, db, source


def refresh(conn, client: dict, api_key: str | None = None) -> dict:
    """Free Apollo searches → TAM/SAM snapshot + a multi-dimension cube + an
    account-level Apollo org count + (if CENSUS_API_KEY) an independent Census
    cross-check. Every Apollo call is a per_page=1 count = no credits.

    `client` is the whole config: targeting drives the people counts; `cube`
    lists the dimensions to sweep; `market_crosscheck` configures Census."""
    t = client.get("targeting") or {}
    titles = t.get("titles") or None
    seniorities = t.get("seniorities") or None
    statuses = t.get("email_statuses") or None
    domains = t.get("domains") or None
    cube_cfg = client.get("cube") or {}
    emp_ranges = cube_cfg.get("employee_ranges") or []
    industries = cube_cfg.get("industries") or []

    tam = source.search_total(titles=titles, seniorities=seniorities,
                              organization_domains=domains, api_key=api_key)
    sam = source.search_total(titles=titles, seniorities=seniorities,
                              email_statuses=statuses,
                              organization_domains=domains, api_key=api_key)

    # free filter-sweep cube: reachable count per seniority / employee-band / industry
    by_sen = {s: source.search_total(titles=titles, seniorities=[s], email_statuses=statuses,
                                     organization_domains=domains, api_key=api_key)
              for s in (seniorities or [])}
    by_emp = {r: source.search_total(titles=titles, seniorities=seniorities, email_statuses=statuses,
                                     employee_ranges=[r], organization_domains=domains, api_key=api_key)
              for r in emp_ranges}
    by_ind = {i: source.search_total(titles=titles, seniorities=seniorities, email_statuses=statuses,
                                     industries=[i], organization_domains=domains, api_key=api_key)
              for i in industries}

    # account-level Apollo TAM (organizations matching the firmographics)
    try:
        org_tam = source.org_total(employee_ranges=emp_ranges or None,
                                   industries=industries or None,
                                   organization_domains=domains, api_key=api_key)
    except Exception as e:
        org_tam = None
        by_ind["_org_error"] = str(e)[:120]

    # independent denominator: Census CBP (only if configured + keyed)
    xc = client.get("market_crosscheck") or {}
    census_block = None
    if xc.get("naics") and ("CENSUS_API_KEY" in __import__("os").environ):
        try:
            census_block = census.establishment_count(
                xc["naics"], empszes=xc.get("empszes", "001"), geo=xc.get("geo", "us"))
        except Exception as e:
            census_block = {"error": str(e)[:160]}

    breakdown = {"by_seniority": by_sen, "by_employee": by_emp, "by_industry": by_ind,
                 "org_tam": org_tam, "census": census_block}
    db.record_market(conn, tam, sam, json.dumps(breakdown))
    return {"tam": tam, "sam": sam, "org_tam": org_tam, "census": census_block,
            "by_seniority": by_sen, "by_employee": by_emp, "by_industry": by_ind}


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
    bd = {}
    if mk and mk.get("breakdown"):
        try:
            bd = json.loads(mk["breakdown"])
        except Exception:
            bd = {}
    cube = bd.get("by_seniority", {})
    cube_emp = bd.get("by_employee", {})
    cube_ind = {k: v for k, v in bd.get("by_industry", {}).items() if not k.startswith("_")}
    org_tam = bd.get("org_tam")
    cen = bd.get("census")
    census_count = cen.get("count") if (isinstance(cen, dict) and "count" in cen) else None
    census_basis = cen.get("basis") if isinstance(cen, dict) else None
    # independent account-level denominators → a TAM range (board-defensible)
    ests = [x for x in (org_tam, census_count) if x is not None]
    account_range = (min(ests), max(ests)) if len(ests) >= 2 else None

    # qualification: LLM ICP scores on the pulled sample → a rate that sharpens
    # the raw Apollo count into a QUALIFIED TAM/SAM (the count is an upper bound).
    fit = db.fit_summary(conn)
    qrate = fit["rate"]
    qual_tam = int(tam * qrate) if (tam is not None and qrate is not None) else None
    qual_sam = int(sam * qrate) if (sam is not None and qrate is not None) else None

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
        "qual_rate": qrate, "qual_tam": qual_tam, "qual_sam": qual_sam,
        "scored": fit["scored"], "by_tier": fit["by_tier"], "good_fit": fit["good_fit"],
        "by_seniority": cube, "by_employee": cube_emp, "by_industry": cube_ind,
        "org_tam": org_tam, "census_count": census_count, "census_basis": census_basis,
        "account_range": account_range,
        "market_at": mk["computed_at"] if mk else None,
        "deal_value": deal,
        "won_value": dollars(booked),
        "som_value": dollars(som),
        "tam_value": dollars(qual_tam if qual_tam is not None else tam),
    }
