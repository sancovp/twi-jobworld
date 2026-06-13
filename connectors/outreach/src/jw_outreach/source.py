"""`pull` — source contacts from the Apollo leads API.

External effect: a paid API call (Apollo charges 1 credit per matched record).
Universal: titles / seniorities / email-status / domains are all passed in by
the caller (the client config decides who to target); this module only knows
the Apollo query shape. Verify field names against https://docs.apollo.io
before the first paid pull.
"""

import os

import requests

from .models import Contact

APOLLO_BASE = "https://api.apollo.io/api/v1"


def search_people(
    *,
    titles: list[str] | None = None,
    seniorities: list[str] | None = None,
    email_statuses: list[str] | None = None,
    organization_domains: list[str] | None = None,
    per_page: int = 25,
    page: int = 1,
    api_key: str | None = None,
) -> list[Contact]:
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

    resp = requests.post(
        f"{APOLLO_BASE}/mixed_people/search",
        json=payload,
        headers={"X-Api-Key": api_key, "Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    contacts = []
    for person in data.get("people", []):
        email = person.get("email") or ""
        if not email or "@" not in email:
            continue
        org = person.get("organization") or {}
        contacts.append(
            Contact(
                brand=org.get("name") or "",
                domain=org.get("primary_domain") or email.split("@")[1],
                first_name=person.get("first_name") or "",
                last_name=person.get("last_name") or "",
                title=person.get("title") or "",
                email=email,
                seniority=person.get("seniority") or "",
                email_status=person.get("email_status") or "",
                context=_context(org),
            )
        )
    return contacts


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
