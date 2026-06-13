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
    pulled_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sends (
    id INTEGER PRIMARY KEY,
    to_email TEXT, brand TEXT,
    subject TEXT, body TEXT,
    touch INTEGER, variant TEXT, cohort TEXT,
    asset_url TEXT,
    click_token TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    send_id INTEGER REFERENCES sends(id),
    -- delivered | bounced | spam | open | click | view | reply | booked
    type TEXT NOT NULL,
    occurred_at TEXT DEFAULT (datetime('now'))
);
"""


def connect(db_path: Path = DB_PATH) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    return conn


def save_contact(conn: sqlite3.Connection, c: Contact) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO contacts VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))",
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
                click_token: str = "") -> int:
    cur = conn.execute(
        "INSERT INTO sends (to_email, brand, subject, body, touch, variant, "
        "cohort, asset_url, click_token) VALUES (?,?,?,?,?,?,?,?,?)",
        (to_email, brand, subject, body, touch, variant, cohort, asset_url, click_token),
    )
    conn.commit()
    return cur.lastrowid


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
