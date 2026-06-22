"""`send` — deliver an outbound email via a swappable backend.

Backend chosen by SEND_BACKEND (default "smtp"):

  smtp      — a deliberately-dumb SMTP relay. Sends exactly the subject+body it
              is handed, to whatever host you point it at. It does NO warmup and
              NO deliverability work — that is the hand-rolled R&D track
              (docs/WARMUP-RND.md), and it is UNPROVEN until it actually lands in
              inboxes. A dumb relay on a cold domain = spam folder.
                SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS   (SMTP_STARTTLS=1 default)

  instantly — the BASELINE production backend (ship the proven arm). Adds the
              contact as a LEAD to a warmed Instantly campaign; Instantly's engine
              sends from its warmed mailboxes on schedule — warmup + deliverability
              are theirs, and proven. Our generated copy rides as
              custom_variables {subject, body}; set the campaign's step template to
              `{{subject}}` / `{{body}}`. Built-in dedup via skip_if_in_campaign/list.
                INSTANTLY_API_KEY  INSTANTLY_CAMPAIGN_ID
                INSTANTLY_DRY_RUN=1  → return the payload instead of POSTing

Either way the copy, footer, tracked links, and unsubscribe are written upstream
by the LLM. This module adds nothing and judges nothing.
"""

import json
import os
import smtplib
import ssl
import urllib.request
from email.message import EmailMessage

INSTANTLY_LEADS_URL = "https://api.instantly.ai/api/v2/leads"


# ---- smtp backend (dumb relay; no warmup) ---------------------------------

def build_message(*, to_email: str, subject: str, body: str,
                  from_email: str, from_name: str = "", reply_to: str = "") -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    return msg


def smtp_send(msg: EmailMessage) -> None:
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASS", "")
    starttls = os.environ.get("SMTP_STARTTLS", "1") == "1"

    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context()) as s:
            if user:
                s.login(user, password)
            s.send_message(msg)
        return

    with smtplib.SMTP(host, port) as s:
        if starttls:
            s.starttls(context=ssl.create_default_context())
        if user:
            s.login(user, password)
        s.send_message(msg)


# ---- instantly backend (warmed campaign; BASELINE, proven deliverability) --

def instantly_add_lead(*, to_email: str, subject: str, body: str,
                       first_name: str = "", last_name: str = "",
                       company: str = "", personalization: str = "") -> dict:
    """Add the contact as a lead to the configured warmed Instantly campaign.
    Instantly sends our copy (carried in custom_variables) from its warmed
    mailboxes on schedule. Returns a small result dict; honors INSTANTLY_DRY_RUN."""
    api_key = os.environ["INSTANTLY_API_KEY"]
    campaign = os.environ["INSTANTLY_CAMPAIGN_ID"]
    payload = {
        "campaign": campaign,
        "email": to_email,
        "first_name": first_name,
        "last_name": last_name,
        "company_name": company,
        "personalization": personalization or subject,
        # built-in dedup: never double-add a contact already in this campaign/list
        "skip_if_in_campaign": True,
        "skip_if_in_list": True,
        # our generated copy; the campaign's step template references {{subject}}/{{body}}
        "custom_variables": {"subject": subject, "body": body},
    }
    if os.environ.get("INSTANTLY_DRY_RUN") == "1":
        return {"backend": "instantly", "dry_run": True,
                "url": INSTANTLY_LEADS_URL, "payload": payload}

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        INSTANTLY_LEADS_URL, data=data, method="POST",
        headers={"Authorization": f"Bearer {api_key}",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return {"backend": "instantly", "status": r.status,
                "response": json.loads(raw) if raw else {}}


# ---- dispatcher -----------------------------------------------------------

def deliver(*, to_email: str, subject: str, body: str,
            from_email: str = "", from_name: str = "", reply_to: str = "",
            first_name: str = "", last_name: str = "", company: str = "") -> dict:
    """Route to the SEND_BACKEND-configured backend. Returns a small result dict."""
    backend = os.environ.get("SEND_BACKEND", "smtp").lower()
    if backend == "instantly":
        return instantly_add_lead(
            to_email=to_email, subject=subject, body=body,
            first_name=first_name, last_name=last_name, company=company)
    # default: smtp (dumb relay)
    msg = build_message(to_email=to_email, subject=subject, body=body,
                        from_email=from_email, from_name=from_name, reply_to=reply_to)
    smtp_send(msg)
    return {"backend": "smtp", "to": to_email}
