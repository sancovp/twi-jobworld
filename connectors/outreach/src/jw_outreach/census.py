"""Census CBP cross-check — an INDEPENDENT account-level denominator for TAM.

Apollo's count is an inflated upper bound (dupes, dead records, parent/sub
misattribution; firmographics are modeled estimates that decay). The US Census
County Business Patterns (CBP) gives an authoritative establishment count by
industry (NAICS) × employee-size-band × geography, from a different basis — so the
two together bracket the real TAM instead of trusting one number.

Census now requires a free API key (sign up at https://api.census.gov/data/key_signup.html).
Gated on CENSUS_API_KEY, like our other API clients — no key, no number (the
dashboard says "connect Census", it does not fabricate a count).

    CENSUS_API_KEY     (required)
    CENSUS_CBP_YEAR    (default 2022)
"""

import os

import requests

CBP_BASE = "https://api.census.gov/data"


def establishment_count(
    naics_codes: list[str],
    *,
    empszes: str = "001",     # 001 = all establishments; size-band codes narrow it
    geo: str = "us",          # "us" or a 2-digit state FIPS
    year: str | None = None,
    api_key: str | None = None,
) -> dict:
    """Total US establishments across the given NAICS codes at the size band.
    Returns {count, per_naics, basis} so the dashboard can show the basis, not
    just a bare number."""
    api_key = api_key or os.environ["CENSUS_API_KEY"]
    year = year or os.environ.get("CENSUS_CBP_YEAR", "2022")
    forclause = "us:*" if geo == "us" else f"state:{geo}"

    total = 0
    per = {}
    for naics in naics_codes:
        params = {"get": "ESTAB", "for": forclause, "NAICS2017": naics,
                  "EMPSZES": empszes, "key": api_key}
        resp = requests.get(f"{CBP_BASE}/{year}/cbp", params=params, timeout=30)
        resp.raise_for_status()
        rows = resp.json()  # [["ESTAB", ...header...], ["12345", ...], ...]
        # sum the ESTAB column (index 0) over data rows (skip the header row)
        header = rows[0]
        idx = header.index("ESTAB")
        n = sum(int(r[idx]) for r in rows[1:] if r[idx] not in (None, "", "null"))
        per[naics] = n
        total += n
    return {"count": total, "per_naics": per,
            "basis": f"CBP {year} · NAICS {','.join(naics_codes)} · EMPSZES {empszes} · {geo}"}
