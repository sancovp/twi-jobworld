"""The real persisted state: contacts, sends, events. SQLite.

This is code because it is durable state an LLM cannot hold. `cohort` and
`variant` are free strings the caller sets (e.g. for an A/B or a control arm);
this layer assigns them no meaning.
"""

import os
import sqlite3
from pathlib import Path

from .models import Contact

DB_PATH = Path(os.environ.get("JWOUT_DB", "data/outreach.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS contacts (
    email TEXT PRIMARY KEY,
    brand TEXT, domain TEXT,
    first_name TEXT, last_name TEXT, title TEXT,
    seniority TEXT, email_status TEXT, context TEXT,
    fit_tier TEXT,        -- A | B | C | D (LLM ICP score; A/B = good fit)
    fit_score INTEGER,    -- 0..100
    fit_reason TEXT,      -- why (auditable; the reasoning trace)
    pulled_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sends (
    id INTEGER PRIMARY KEY,
    to_email TEXT, brand TEXT,
    subject TEXT, body TEXT,
    touch INTEGER, variant TEXT, cohort TEXT,
    asset_url TEXT,
    click_token TEXT,
    click_dest TEXT,
    unsub_token TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    send_id INTEGER REFERENCES sends(id),
    -- delivered | bounced | spam | open | click | view | reply | booked
    type TEXT NOT NULL,
    occurred_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS suppressions (
    email TEXT PRIMARY KEY,
    reason TEXT,           -- unsubscribe | hostile | bounce | manual
    source TEXT,           -- self-service | reply | api | ...
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS market (
    -- TAM/SAM snapshots from Apollo search totals (history, read latest).
    id INTEGER PRIMARY KEY,
    tam INTEGER, sam INTEGER,
    breakdown TEXT,       -- JSON: free count-sweep cube (e.g. per seniority)
    computed_at TEXT DEFAULT (datetime('now'))
);
"""


# Columns added after the first release. CREATE TABLE IF NOT EXISTS will NOT add
# these to a pre-existing table, so we ensure them explicitly — otherwise the
# first write against an old DB raises "no such column".
_ADDED_COLUMNS = {
    "sends": ["asset_url TEXT", "click_token TEXT", "click_dest TEXT", "unsub_token TEXT"],
    "contacts": ["fit_tier TEXT", "fit_score INTEGER", "fit_reason TEXT"],
    "market": ["breakdown TEXT"],
}


def connect(db_path: Path = DB_PATH) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    _migrate(conn)
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    """Idempotently add any columns missing from a pre-existing table."""
    for table, cols in _ADDED_COLUMNS.items():
        have = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
        for col in cols:
            if col.split()[0] not in have:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col}")
    conn.commit()


def save_contact(conn: sqlite3.Connection, c: Contact) -> None:
    # Upsert the firmographic fields by email; an existing contact's fit_*
    # (ICP score) is PRESERVED across a re-pull — re-pulling refreshes the
    # company data, it does not erase the qualification.
    conn.execute(
        "INSERT INTO contacts (email, brand, domain, first_name, last_name, title, "
        "seniority, email_status, context) VALUES (?,?,?,?,?,?,?,?,?) "
        "ON CONFLICT(email) DO UPDATE SET brand=excluded.brand, domain=excluded.domain, "
        "first_name=excluded.first_name, last_name=excluded.last_name, title=excluded.title, "
        "seniority=excluded.seniority, email_status=excluded.email_status, context=excluded.context",
        (c.email, c.brand, c.domain, c.first_name, c.last_name, c.title,
         c.seniority, c.email_status, c.context),
    )
    conn.commit()


def load_contacts(conn: sqlite3.Connection) -> list[Contact]:
    rows = conn.execute(
        "SELECT email, brand, domain, first_name, last_name, title, "
        "seniority, email_status, context FROM contacts"
    ).fetchall()
    return [
        Contact(email=r[0], brand=r[1], domain=r[2], first_name=r[3],
                last_name=r[4], title=r[5], seniority=r[6], email_status=r[7],
                context=r[8])
        for r in rows
    ]


def record_send(conn: sqlite3.Connection, *, to_email: str, subject: str,
                body: str, brand: str = "", touch: int = 1,
                variant: str = "", cohort: str = "", asset_url: str = "",
                click_token: str = "", click_dest: str = "", unsub_token: str = "") -> int:
    cur = conn.execute(
        "INSERT INTO sends (to_email, brand, subject, body, touch, variant, "
        "cohort, asset_url, click_token, click_dest, unsub_token) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (to_email, brand, subject, body, touch, variant, cohort, asset_url,
         click_token, click_dest, unsub_token),
    )
    conn.commit()
    return cur.lastrowid


def record_suppression(conn: sqlite3.Connection, email: str,
                       reason: str = "manual", source: str = "") -> None:
    """Opt-out list. CAN-SPAM requires honoring these; deliver checks it."""
    conn.execute(
        "INSERT OR REPLACE INTO suppressions (email, reason, source) VALUES (?,?,?)",
        (email.lower().strip(), reason, source),
    )
    conn.commit()


def is_suppressed(conn: sqlite3.Connection, email: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM suppressions WHERE email=?", (email.lower().strip(),)
    ).fetchone()
    return row is not None


def record_market(conn: sqlite3.Connection, tam: int, sam: int, breakdown: str = "") -> None:
    conn.execute("INSERT INTO market (tam, sam, breakdown) VALUES (?,?,?)",
                 (tam, sam, breakdown))
    conn.commit()


def latest_market(conn: sqlite3.Connection) -> dict | None:
    row = conn.execute(
        "SELECT tam, sam, breakdown, computed_at FROM market ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return {"tam": row[0], "sam": row[1], "breakdown": row[2], "computed_at": row[3]} if row else None


def set_fit(conn: sqlite3.Connection, email: str, tier: str, score, reason: str = "") -> bool:
    """Store an LLM ICP score on a contact. Returns False if the contact is unknown."""
    cur = conn.execute(
        "UPDATE contacts SET fit_tier=?, fit_score=?, fit_reason=? WHERE email=?",
        (tier, score, reason, email.lower().strip()))
    conn.commit()
    return cur.rowcount > 0


def fit_summary(conn: sqlite3.Connection) -> dict:
    """Qualification rollup of the SCORED contacts — the rate that sharpens TAM."""
    scored = conn.execute("SELECT COUNT(*) FROM contacts WHERE fit_tier IS NOT NULL").fetchone()[0]
    by_tier = {t: n for t, n in conn.execute(
        "SELECT fit_tier, COUNT(*) FROM contacts WHERE fit_tier IS NOT NULL GROUP BY fit_tier")}
    good = by_tier.get("A", 0) + by_tier.get("B", 0)   # A/B = good fit
    return {"scored": scored, "by_tier": by_tier, "good_fit": good,
            "rate": (good / scored) if scored else None}


def record_event(conn: sqlite3.Connection, send_id: int, event_type: str) -> None:
    conn.execute("INSERT INTO events (send_id, type) VALUES (?,?)", (send_id, event_type))
    conn.commit()


def report(conn: sqlite3.Connection, cost_per_send: float = 0.0) -> str:
    lines = ["outreach report", "=" * 32]
    for (variant,) in conn.execute("SELECT DISTINCT variant FROM sends"):
        total = conn.execute("SELECT COUNT(*) FROM sends WHERE variant=?", (variant,)).fetchone()[0]
        if not total:
            continue
        lines.append(f"\nvariant {variant or '(none)'}  (sends: {total})")

        def count(ev: str) -> int:
            return conn.execute(
                "SELECT COUNT(DISTINCT e.send_id) FROM events e JOIN sends s "
                "ON s.id=e.send_id WHERE s.variant=? AND e.type=?",
                (variant, ev),
            ).fetchone()[0]

        booked = count("booked")
        for label in ["delivered", "bounced", "open", "click", "view", "reply", "booked"]:
            n = count(label)
            lines.append(f"  {label:<12} {n:>5}  ({n / total:.1%})")
        if booked and cost_per_send:
            lines.append(f"  cost/booked  ${total * cost_per_send / booked:,.2f}")
    if len(lines) == 2:
        lines.append("(no sends yet)")
    return "\n".join(lines)
