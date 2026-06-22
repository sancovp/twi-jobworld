# Warmup / deliverability — the R&D track (must beat Instantly)

**Status: NOT BUILT. Unproven. Do not run a real client on it.**

## The honest current state
What we hand-rolled for outbound is the **easy 10%, not the hard 90%**:
- `send.py` smtp backend = a *deliberately dumb SMTP relay* (sends what it's handed).
- `warmup_status` = a **human-set flag + a dashboard checkbox**, the only usage being
  `("warmed sending domain", any(d.warmup_status == "ready"))`. The engine *refuses to
  send until someone ticks the box.* **It warms nothing.**
- There is **zero** warmup / reputation-building / inbox-rotation / deliverability
  machinery. A dumb relay on a cold domain lands in spam — and deliverability is the
  SPEC's #1 success factor, the one thing that **cannot be faked or simulated** (it's a
  real-world reputation phenomenon, see worldsim DESIGN §8 "never knowable from any sim").

## The decision (ship the proven arm; R&D the better one)
- **BASELINE = Instantly** (`SEND_BACKEND=instantly`, ~$40/mo). Proven warmup +
  deliverability. B6 goes live on this. Wired in `send.py::instantly_add_lead`.
- **R&D = hand-rolled warmup** (this track). It does **not** ship to a client until it
  **beats Instantly on a measured number** — it must earn the replacement, not assume it.

## The bar to beat (the kill-criterion)
On a controlled A/B (same copy, same list split, same window):
- **inbox-placement rate** (seed-list / monitored) ≥ Instantly's, and
- **reply rate per sending domain** ≥ Instantly's, and
- at a **cost per delivered-to-inbox** below Instantly's amortized $40/mo+ at our volume.

Until all three hold on real sends, the hand-rolled stack stays in R&D. No silent
promotion.

## What "build it" actually means (so we don't underestimate it)
Warmup is **weeks of real-world reputation building**, not a code task:
- domain + DNS hygiene (SPF/DKIM/DMARC), dedicated IPs or pooled, gradual volume ramp,
- seed-list warmup traffic (send+open+reply loops across a mailbox network),
- placement monitoring (seed inboxes across providers), reputation/blocklist tracking,
- per-domain throttling + automatic backoff on bounce/spam signals, rotation across a
  pool of warmed mailboxes.
This is genuinely Instantly's whole product. Build it **only** if there's a reason
Instantly can't serve (cost at scale, control, IP) — otherwise it's reinventing a hard
wheel. The orchestration we already have (copy, tracking, dedup, dashboards) sits **on
top of** whichever backend wins.
