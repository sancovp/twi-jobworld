"""`pull` — source contacts from the Apollo leads API.

Apollo is TWO steps (verified against docs.apollo.io, 2026-06; confirm against
one live call before trusting at volume):

  1. SEARCH  POST /api/v1/mixed_people/api_search  — find people by filters.
             Returns person stubs (id, name, title, org) but NO email. FREE.
  2. ENRICH  POST /api/v1/people/bulk_match (<=10 per call) — reveal emails.
             COSTS one credit per matched record (this is the SPEC's "1 credit
             per matched record", not the search).

Universal: titles / seniorities / email-status / domains are passed in by the
caller (the client config decides who to target). Requires a master API key.
"""

import os

import requests

from .models import Contact

APOLLO_BASE = "https://api.apollo.io/api/v1"


def _headers(api_key: str) -> dict:
    return {"X-Api-Key": api_key, "Content-Type": "application/json"}


def _chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def search_people(
    *,
    titles: list[str] | None = None,
    seniorities: list[str] | None = None,
    email_statuses: list[str] | None = None,
    organization_domains: list[str] | None = None,
    per_page: int = 25,
    page: int = 1,
    api_key: str | None = None,
) -> list[dict]:
    """Step 1 — search. Returns person stubs (no emails). Free."""
    api_key = api_key or os.environ["APOLLO_API_KEY"]
    payload: dict = {"per_page": per_page, "page": page}
    if titles:
        payload["person_titles"] = titles
    if seniorities:
        payload["person_seniorities"] = seniorities
    if email_statuses:
        payload["contact_email_status"] = email_statuses
    if organization_domains:
        payload["q_organization_domains_list"] = organization_domains

    resp = requests.post(f"{APOLLO_BASE}/mixed_people/api_search",
                         json=payload, headers=_headers(api_key), timeout=30)
    resp.raise_for_status()
    return resp.json().get("people", [])


def search_total(
    *,
    titles: list[str] | None = None,
    seniorities: list[str] | None = None,
    email_statuses: list[str] | None = None,
    organization_domains: list[str] | None = None,
    employee_ranges: list[str] | None = None,
    industries: list[str] | None = None,
    api_key: str | None = None,
) -> int:
    """How many people match these filters — `pagination.total_entries` from a
    free 1-result search. Used for TAM/SAM sizing + cube sweeps (no credits).
    employee_ranges = Apollo `organization_num_employees_ranges` (e.g. "51,200");
    industries = `q_organization_keyword_tags`."""
    api_key = api_key or os.environ["APOLLO_API_KEY"]
    payload: dict = {"per_page": 1, "page": 1}
    if titles:
        payload["person_titles"] = titles
    if seniorities:
        payload["person_seniorities"] = seniorities
    if email_statuses:
        payload["contact_email_status"] = email_statuses
    if organization_domains:
        payload["q_organization_domains_list"] = organization_domains
    if employee_ranges:
        payload["organization_num_employees_ranges"] = employee_ranges
    if industries:
        payload["q_organization_keyword_tags"] = industries
    resp = requests.post(f"{APOLLO_BASE}/mixed_people/api_search",
                         json=payload, headers=_headers(api_key), timeout=30)
    resp.raise_for_status()
    return int(resp.json().get("pagination", {}).get("total_entries", 0))


def org_total(
    *,
    employee_ranges: list[str] | None = None,
    industries: list[str] | None = None,
    organization_domains: list[str] | None = None,
    api_key: str | None = None,
) -> int:
    """How many ORGANIZATIONS (accounts) match — for an account-level TAM that is
    comparable to Census establishment counts. Free (per_page=1 count read).
    Endpoint follows Apollo's mixed_companies search; verify the field names
    against a live call before trusting at volume (same caution as the people search)."""
    api_key = api_key or os.environ["APOLLO_API_KEY"]
    payload: dict = {"per_page": 1, "page": 1}
    if employee_ranges:
        payload["organization_num_employees_ranges"] = employee_ranges
    if industries:
        payload["q_organization_keyword_tags"] = industries
    if organization_domains:
        payload["q_organization_domains_list"] = organization_domains
    resp = requests.post(f"{APOLLO_BASE}/mixed_companies/api_search",
                         json=payload, headers=_headers(api_key), timeout=30)
    resp.raise_for_status()
    return int(resp.json().get("pagination", {}).get("total_entries", 0))


def enrich_people(
    stubs: list[dict],
    *,
    api_key: str | None = None,
    reveal_personal_emails: bool = False,
) -> list[Contact]:
    """Step 2 — bulk_match (<=10 per call). Returns Contacts WITH emails. Costs credits."""
    api_key = api_key or os.environ["APOLLO_API_KEY"]
    contacts: list[Contact] = []
    for batch in _chunks(stubs, 10):
        details = [{
            "first_name": s.get("first_name"),
            "last_name": s.get("last_name"),
            "organization_name": (s.get("organization") or {}).get("name"),
            "domain": (s.get("organization") or {}).get("primary_domain"),
        } for s in batch]
        resp = requests.post(
            f"{APOLLO_BASE}/people/bulk_match",
            json={"details": details, "reveal_personal_emails": reveal_personal_emails},
            headers=_headers(api_key), timeout=60)
        resp.raise_for_status()
        matches = resp.json().get("matches", [])
        for stub, m in zip(batch, matches):
            if not m:
                continue
            email = m.get("email") or ""
            if not email or "@" not in email:
                continue
            org = m.get("organization") or stub.get("organization") or {}
            contacts.append(Contact(
                brand=org.get("name") or "",
                domain=org.get("primary_domain") or email.split("@")[1],
                first_name=m.get("first_name") or stub.get("first_name") or "",
                last_name=m.get("last_name") or stub.get("last_name") or "",
                title=m.get("title") or stub.get("title") or "",
                email=email,
                seniority=m.get("seniority") or stub.get("seniority") or "",
                email_status=m.get("email_status") or "",
                context=_context(org),
            ))
    return contacts


def pull_contacts(
    *,
    titles=None, seniorities=None, email_statuses=None, organization_domains=None,
    per_page: int = 25, page: int = 1, api_key: str | None = None,
    enrich: bool = True, reveal_personal_emails: bool = False,
) -> list[Contact]:
    """The `pull` verb: search, then (unless enrich=False) enrich to get emails.

    enrich=False is a FREE preview — returns Contacts with empty email so a worker
    can see who matched before spending credits.
    """
    stubs = search_people(titles=titles, seniorities=seniorities,
                          email_statuses=email_statuses,
                          organization_domains=organization_domains,
                          per_page=per_page, page=page, api_key=api_key)
    if not enrich:
        return [Contact(
            brand=(s.get("organization") or {}).get("name") or "",
            domain=(s.get("organization") or {}).get("primary_domain") or "",
            first_name=s.get("first_name") or "", last_name=s.get("last_name") or "",
            title=s.get("title") or "", email="",
            seniority=s.get("seniority") or "", email_status="(not enriched)",
            context=_context(s.get("organization") or {}),
        ) for s in stubs]
    return enrich_people(stubs, api_key=api_key, reveal_personal_emails=reveal_personal_emails)


def _context(org: dict) -> str:
    parts = []
    for key, label in [("industry", "industry"), ("keywords", "keywords"),
                       ("short_description", "about"),
                       ("estimated_num_employees", "employees")]:
        val = org.get(key)
        if val:
            if isinstance(val, list):
                val = ", ".join(str(v) for v in val[:8])
            parts.append(f"{label}: {val}")
    return "; ".join(parts)
