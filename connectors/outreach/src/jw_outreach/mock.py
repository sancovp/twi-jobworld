"""Mock backends — run the WHOLE pipeline with ZERO credentials.

Set `JWOUT_MOCK=1` (or a per-verb `SEND_BACKEND=mock` / `VIDEO_BACKEND=mock` /
`REPLY_BACKEND=mock`) and the four external-effect verbs return canned data
instead of calling Apollo / SMTP / fal.ai / IMAP:

    pull    -> fabricated Contacts (SAVED to the real DB, so the funnel has people)
    send    -> a fake send that IS recorded (so the funnel actually fills)
    video   -> a placeholder file written to --out (no paid generation)
    reply   -> a fixed spread of inbound replies (interested / not-now / opt-out / hostile / booked)
    market  -> canned TAM/SAM totals so `market refresh` flows

Everything else (`track`, `host`, `serve`, `page`, `dashboard`, `qualify`,
`suppress`) is already local SQLite/filesystem and needs no mock. The point:
SEE the agent loop and the whole funnel flow end-to-end, with fake external
effects. Nothing here sends a real email, charges an API, or reveals a real
address.

The data is DETERMINISTIC (indexed, not random) so a re-run is stable and a
demo is reproducible.
"""

import os
from pathlib import Path

from .models import Contact

_TRUE = {"1", "true", "yes", "on"}


def enabled() -> bool:
    """The global switch: JWOUT_MOCK flips ALL four external verbs to mock."""
    return (os.environ.get("JWOUT_MOCK") or "").strip().lower() in _TRUE


# --- fixtures (deterministic; DTC consumer brands, marketing decision-makers) ---

_BRANDS = [
    ("Oatly", "oatly.com"), ("Liquid Death", "liquiddeath.com"),
    ("Magic Spoon", "magicspoon.com"), ("Olipop", "drinkolipop.com"),
    ("Ruggable", "ruggable.com"), ("Dr. Squatch", "drsquatch.com"),
    ("Athletic Greens", "drinkag1.com"), ("Caraway", "carawayhome.com"),
    ("Graza", "graza.co"), ("Fly By Jing", "flybyjing.com"),
    ("Jones Road", "jonesroadbeauty.com"), ("Native", "nativecos.com"),
]
_TITLES = ["VP Brand Marketing", "Director of Marketing", "Head of Growth",
           "CMO", "VP Marketing", "Director of Brand"]
_FIRST = ["Jordan", "Casey", "Morgan", "Riley", "Avery", "Taylor",
          "Quinn", "Skyler", "Reese", "Hayden", "Emerson", "Rowan"]
_LAST = ["Bennett", "Carter", "Delgado", "Ellis", "Foster", "Grant",
         "Hughes", "Irwin", "Jensen", "Kline", "Lowe", "Mercer"]


def contacts(*, titles=None, seniorities=None, organization_domains=None,
             per_page: int = 25, enrich: bool = True) -> list[Contact]:
    """Fabricate a small, readable batch of Contacts. Caps at 12 for a legible
    demo. If organization_domains is given, the brands are derived from them
    (so a client's targeting shows through); otherwise the fixture brands are
    used. enrich=False mirrors the free-preview path (empty emails)."""
    n = min(max(int(per_page), 1), 12)
    title_pool = titles or _TITLES
    sen_pool = seniorities or ["director"]
    out: list[Contact] = []
    for i in range(n):
        brand, domain = _BRANDS[i % len(_BRANDS)]
        if organization_domains:
            domain = organization_domains[i % len(organization_domains)]
            brand = domain.split(".")[0].replace("-", " ").title()
        first = _FIRST[i % len(_FIRST)]
        last = _LAST[i % len(_LAST)]
        email = "" if not enrich else f"{first.lower()}.{last.lower()}@{domain}"
        out.append(Contact(
            brand=brand, domain=domain, first_name=first, last_name=last,
            title=title_pool[i % len(title_pool)], email=email,
            seniority=sen_pool[i % len(sen_pool)],
            email_status="(not enriched)" if not enrich else "verified",
            context=(f"industry: consumer brand; keywords: DTC, social-first; "
                     f"about: {brand} is a fast-growing consumer brand active on "
                     f"IG/TikTok; employees: {50 + i * 40}"),
        ))
    return out


def send_result(*, to_email: str) -> dict:
    """A successful mock send. Crucially NOT a dry-run: the CLI records this to
    the DB, so touches/funnel counts populate exactly as a real send would."""
    return {"backend": "mock", "to": to_email}


def video(prompt: str, out_path: str) -> str:
    """Write a placeholder file where a teaser would go. No paid generation."""
    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        "[MOCK TEASER — no real video generated]\n"
        f"prompt: {prompt}\n",
        encoding="utf-8",
    )
    return out_path


# A spread that exercises the classifier: interested, not-now, opt-out, hostile,
# and a booking. `outreach-replies` should route/record each differently.
_REPLIES = [
    {"from": "jordan.bennett@oatly.com", "subject": "Re: a show for Oatly",
     "snippet": "This is genuinely interesting. Can you send a couple of times next week? Happy to grab 15 minutes."},
    {"from": "casey.carter@liquiddeath.com", "subject": "Re: an idea for Liquid Death",
     "snippet": "Not the right quarter for us, but keep us in mind — maybe revisit in Q3."},
    {"from": "morgan.delgado@magicspoon.com", "subject": "unsubscribe",
     "snippet": "Please remove me from this list and don't email again."},
    {"from": "riley.ellis@drinkolipop.com", "subject": "Re: your email",
     "snippet": "Who is this and where did you get my email address?"},
    {"from": "avery.foster@ruggable.com", "subject": "Re: what a Ruggable show looks like",
     "snippet": "Love this direction. I just booked a slot on the calendar — talk soon."},
]


def replies(*, limit: int = 50) -> list[dict]:
    """A fixed inbound set (interested / not-now / opt-out / hostile / booked)."""
    return [{**r, "date": "Thu, 03 Jul 2026 09:00:00 -0700"} for r in _REPLIES[:limit]]


def market_total(*, kind: str = "people", titles=None, seniorities=None,
                 employee_ranges=None, industries=None,
                 organization_domains=None) -> int:
    """A canned Apollo-search total for TAM/SAM sizing. Varies with the number of
    filters so a cube sweep isn't degenerate (flat), but stays deterministic."""
    base = 4200 if kind == "people" else 1350
    salt = 0
    for grp in (seniorities, titles, employee_ranges, industries, organization_domains):
        if grp:
            salt += sum(len(str(x)) for x in grp)
    return max(1, base - salt * 7)
