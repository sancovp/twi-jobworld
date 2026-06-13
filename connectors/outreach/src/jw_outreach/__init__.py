"""Universal JW outreach CLI.

Rule that defines this package: a thing is code ONLY if it must execute
something an LLM cannot do by generating tokens — an external system, an
external effect, or real persisted state. Everything else (the copy template,
the writing rules, the positioning, dedupe-against-a-list) is an instruction
handed to the LLM, not a function.

So this package is only external-effect verbs:

    pull    source contacts from a leads API (Apollo)
    video   generate a clip from a prompt via an external model
    send    deliver an email over SMTP
    track   write/read the real DB; record sends and events; report
    host    place an asset at a unique URL
    serve   serve hosted assets; record a view per unique-path GET (closes host->track)
    reply   read replies over IMAP

No string linter. No draft store. No content. A client config supplies the
strings at run time; the LLM fills the template.
"""
