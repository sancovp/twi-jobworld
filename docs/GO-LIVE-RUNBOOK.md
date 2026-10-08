# B6 Go-Live Runbook — everything to do IRL, in order

The critical path is **domain warmup (~2–4 weeks)**. Do PHASE A today; everything
else happens *during* the warmup window. Each item notes where it plugs in
(`env var` in `deploy/secrets.<profile>.env`, or a slot in `clients/b6/client.json`).

---

## PHASE A — Start the warmup clock (DO TODAY — it's the long pole)

- [ ] **Buy 2–3 cold sending domains.** NOT `b6studios.com`. Use brand-adjacent
      variants (e.g. `getb6.com`, `b6studios.co`, `b6outreach.com`).
      - **Easiest path (recommended): Instantly's done-for-you (DFY) domains +
        mailboxes** — Instantly buys the domains, sets DNS, creates mailboxes, and
        warms them. One purchase inside Instantly; skip the DNS work. (Check current
        DFY pricing in-app.)
      - **DIY path:** buy domains at a registrar (Namecheap / Cloudflare / Porkbun,
        ~$10–15/yr each) → create mailboxes on Google Workspace or Microsoft 365
        (~$6–7/mailbox/mo) → set **SPF, DKIM, DMARC** per Instantly's connect guide.
- [ ] **Mailbox count = your daily volume ÷ ~40.** Standard cold practice: ~30–50
      sends/mailbox/day, 2–3 mailboxes/domain. (e.g. want ~300 sends/day → ~6–8
      mailboxes → ~3 domains.) Final number depends on B6's target volume.
- [ ] **Connect mailboxes to Instantly → turn ON warmup.** This starts the 2–4 week
      clock. Do not send real volume until warmup shows healthy.
      → sets `clients/b6/client.json.sending.domains[].warmup_status` to `ready` when done.

## PHASE B — Accounts & keys (this week, parallel to warmup)

- [ ] **Apollo** — get the API key from your account. → `APOLLO_API_KEY`
- [ ] **Instantly** — API key → `INSTANTLY_API_KEY`; create ONE campaign whose step
      template is literally `{{subject}}` / `{{body}}` → its id → `INSTANTLY_CAMPAIGN_ID`
- [ ] **Video — Kling via fal.ai** (the chosen teaser tool; ~$0.07-0.08/sec ≈ $0.4-0.8/clip,
      ~2-3× the SPEC's 3¢/sec estimate but per-brand/amortized → trivial vs deal value):
      get a **fal.ai API key** → `FAL_KEY`; confirm the Kling model tier slug on fal.ai.
      *Optional* — the `text_only` variant needs no video. (MiniMax is only a fallback;
      its account returned `1008 insufficient balance` — irrelevant unless `VIDEO_BACKEND=minimax`.)
- [ ] **Census** — free key (market sizing, not blocking) → `CENSUS_API_KEY`
- [ ] **Booking link** — Mason + Weston 15-min calendar → `client.json.reply_to`'s
      sibling `calendar_url`
- [ ] **Host for tracked links** — a domain/host to serve `/c/<token>` + teaser pages
      → `HOST_BASE_URL` / `client.json.host_base_url` (can be the same box the engine runs on)

## PHASE C — From Avi / Mason (this week, no code; these block the send)

- [ ] **Approved facts list** — real episode links + real view numbers (the generator
      may use NO number not on this list).
- [ ] **Dedupe CSVs** — active STC, Trashed, 7 Stories pipelines → `data/dedupe/`.
      **The engine refuses to send without them.**
- [ ] **Unsubscribe mechanism + physical postal address** — CAN-SPAM; assembler blocks
      without them.
- [ ] **Monitored reply inbox + who watches it** → `client.json.reply_to`
- [ ] **Success criteria** — target booked-meeting rate + max defensible cost/meeting.
- [ ] **Sign-off on the sending domains** (PHASE A).

## PHASE D — Our wiring (me, while warmup runs)

- [ ] Wire the **reply path for Instantly** (replies land in Instantly's mailboxes —
      IMAP into them, or use Instantly's reply API).
- [ ] Fill `secrets.b6.env` + `client.json` slots from B/C as they arrive.
- [ ] **Full dry-run**: pull a tiny test list → qualify → write → video → Instantly
      `DRY_RUN=1` payload → track. Verify the whole chain with zero real sends.

## PHASE E — Go live (after warmup is healthy, ~3–4 wks out)

- [ ] Confirm `warmup_status: ready`.
- [ ] First small batch (20–50 contacts), `INSTANTLY_DRY_RUN` off, monitor closely.
- [ ] Watch deliverability + replies; ramp volume gradually.

---

**Your immediate move:** PHASE A (domains + warmup) starts the clock. Hand me the
PHASE B/C items as you get them and I fill the config + run the dry-run, so the only
thing left at the 3-week mark is flipping it live.
