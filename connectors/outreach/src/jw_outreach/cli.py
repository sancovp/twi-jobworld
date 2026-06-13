"""The universal JW outreach CLI — external-effect verbs only.

    jwout pull   --titles a,b --seniorities director,vp --status verified --domains x.com,y.com --limit N
    jwout video  "<prompt>" --out teaser.mp4 [--model M]
    jwout send   --to a@b.com --subject S (--body TEXT | --body-file F) --from f@dom [--from-name N] [--reply-to R]
                 [--brand B --touch N --variant V --cohort C --asset-url U]   (records the send unless --no-record)
    jwout track  event <send_id> <type>
    jwout track  report [--cost FLOAT]
    jwout host   <file> [--uid UID]
    jwout serve  [--host H] [--port N] [--docroot D]   (serves hosted assets; GET /<uid>/<file> records a view)
    jwout reply  [--folder INBOX] [--all] [--limit N] [--json]

Every verb does something the LLM cannot do by emitting tokens. Copy, rules,
templates and dedupe lists are NOT here — they are instructions the LLM applies.
"""

import argparse
import json
import sys
from pathlib import Path

from . import db, host, reply, send, serve, source, video


def _split(s: str) -> list[str]:
    return [x.strip() for x in s.split(",") if x.strip()] if s else []


def _conn(args):
    return db.connect(Path(args.db)) if getattr(args, "db", "") else db.connect()


# ---- pull -----------------------------------------------------------------

def cmd_pull(args):
    contacts = source.pull_contacts(
        titles=_split(args.titles),
        seniorities=_split(args.seniorities),
        email_statuses=_split(args.status),
        organization_domains=_split(args.domains),
        per_page=args.limit,
        enrich=not args.no_enrich,
        reveal_personal_emails=args.reveal_personal,
    )
    if args.no_enrich:
        # Preview only — NOT saved. Un-enriched rows have empty email, which is the
        # contacts PK, so they cannot be persisted distinctly. Print who matched.
        for c in contacts:
            print(f"  {c.brand}  |  {c.first_name} {c.last_name}  |  {c.title}  |  {c.domain}")
        print(f"searched (FREE, no emails, NOT saved): {len(contacts)} matches")
        return
    conn = _conn(args)
    for c in contacts:
        db.save_contact(conn, c)
    print(f"pulled + enriched: {len(contacts)} contacts saved")


# ---- video ----------------------------------------------------------------

def cmd_video(args):
    out = video.generate(args.prompt, args.out, args.model)
    print(out)


# ---- send -----------------------------------------------------------------

def cmd_send(args):
    body = Path(args.body_file).read_text() if args.body_file else args.body
    msg = send.build_message(
        to_email=args.to, subject=args.subject, body=body,
        from_email=getattr(args, "from"), from_name=args.from_name, reply_to=args.reply_to,
    )
    send.smtp_send(msg)
    if args.no_record:
        print(f"sent to {args.to} (not recorded)")
        return
    conn = _conn(args)
    sid = db.record_send(conn, to_email=args.to, subject=args.subject, body=body,
                         brand=args.brand, touch=args.touch, variant=args.variant,
                         cohort=args.cohort, asset_url=args.asset_url)
    print(f"sent to {args.to}; send_id={sid}")


# ---- track ----------------------------------------------------------------

def cmd_track_event(args):
    conn = _conn(args)
    db.record_event(conn, args.send_id, args.type)
    print(f"event '{args.type}' recorded for send {args.send_id}")


def cmd_track_report(args):
    conn = _conn(args)
    print(db.report(conn, cost_per_send=args.cost or 0.0))


# ---- host -----------------------------------------------------------------

def cmd_host(args):
    print(host.host_file(args.file, uid=args.uid or None))


# ---- serve -----------------------------------------------------------------

def cmd_serve(args):
    serve.serve(host=args.host, port=args.port, docroot=args.docroot or None)


# ---- reply ----------------------------------------------------------------

def cmd_reply(args):
    msgs = reply.fetch(folder=args.folder,
                       criterion="ALL" if args.all else "UNSEEN",
                       limit=args.limit)
    if args.json:
        print(json.dumps(msgs, indent=2))
        return
    for m in msgs:
        print(f"- {m['from']}  |  {m['subject']}\n  {m['snippet'][:140]}")
    print(f"{len(msgs)} message(s)")


# ---- parser ---------------------------------------------------------------

def _add_db(p):
    p.add_argument("--db", default="", help="sqlite path (default: env JWOUT_DB or data/outreach.db)")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="jwout", description=__doc__.splitlines()[0])
    top = parser.add_subparsers(dest="cmd", required=True)

    p = top.add_parser("pull", help="source contacts from Apollo")
    p.add_argument("--titles", default="")
    p.add_argument("--seniorities", default="")
    p.add_argument("--status", default="", help="contact_email_status filter, comma sep")
    p.add_argument("--domains", default="")
    p.add_argument("--limit", type=int, default=25, help="per_page (search width)")
    p.add_argument("--no-enrich", action="store_true",
                   help="search only (FREE, no emails) — preview who matches before spending credits")
    p.add_argument("--reveal-personal", action="store_true",
                   help="enrich personal emails too (default: work emails only)")
    _add_db(p)
    p.set_defaults(func=cmd_pull)

    p = top.add_parser("video", help="generate a clip from a prompt")
    p.add_argument("prompt")
    p.add_argument("--out", default="teaser.mp4")
    p.add_argument("--model", default="")
    p.set_defaults(func=cmd_video)

    p = top.add_parser("send", help="deliver an email over SMTP")
    p.add_argument("--to", required=True)
    p.add_argument("--subject", required=True)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--body", default="")
    g.add_argument("--body-file", default="")
    p.add_argument("--from", required=True, help="from address")
    p.add_argument("--from-name", default="")
    p.add_argument("--reply-to", default="")
    p.add_argument("--brand", default="")
    p.add_argument("--touch", type=int, default=1)
    p.add_argument("--variant", default="")
    p.add_argument("--cohort", default="")
    p.add_argument("--asset-url", default="")
    p.add_argument("--no-record", action="store_true", help="send without writing to the DB")
    _add_db(p)
    p.set_defaults(func=cmd_send)

    p_track = top.add_parser("track", help="record events / report metrics")
    sub = p_track.add_subparsers(dest="verb", required=True)
    pe = sub.add_parser("event", help="record one event for a send")
    pe.add_argument("send_id", type=int)
    pe.add_argument("type", help="delivered|bounced|open|click|view|reply|booked|...")
    _add_db(pe)
    pe.set_defaults(func=cmd_track_event)
    pr = sub.add_parser("report", help="metrics by variant")
    pr.add_argument("--cost", type=float, default=None)
    _add_db(pr)
    pr.set_defaults(func=cmd_track_report)

    p = top.add_parser("host", help="place an asset at a unique URL")
    p.add_argument("file")
    p.add_argument("--uid", default="")
    p.set_defaults(func=cmd_host)

    p = top.add_parser("serve", help="serve hosted assets; record a view per unique-path GET")
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--docroot", default="")
    p.set_defaults(func=cmd_serve)

    p = top.add_parser("reply", help="read replies over IMAP")
    p.add_argument("--folder", default="INBOX")
    p.add_argument("--all", action="store_true", help="all mail, not just unseen")
    p.add_argument("--limit", type=int, default=50)
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_reply)

    return parser


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
