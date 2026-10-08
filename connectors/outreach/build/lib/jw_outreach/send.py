"""`send` — deliver an email over SMTP.

External effect: opens an SMTP connection and hands off a message. It is
deliberately dumb — it sends exactly the subject and body it is given. The
copy, the footer, the rules: all written by the LLM upstream. This function
adds nothing and judges nothing.

Connects to whatever SMTP host you point it at (a cold mailserver, a relay).
Credentials come from the environment so nothing sensitive lives in code:
    SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS  (SMTP_STARTTLS=1 by default)
"""

import os
import smtplib
import ssl
from email.message import EmailMessage


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
