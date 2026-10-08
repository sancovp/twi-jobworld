# B6 — ICP scoring rubric (instruction for `outreach-qualify`)

Score each pulled account 0–100 against this rubric and assign a tier. The score
turns the raw Apollo count into a **qualified** TAM. Output, per account, a JSON
object: `{"tier": "A|B|C|D", "score": 0-100, "reason": "<one-paragraph trace>"}`.

## Ground the rubric in closed-won, not a persona

Calibrate against B6's actual wins (brands that have sponsored or co-developed a
series). When real won/lost data exists, a good rubric puts the won accounts in
tier A/B; if your best customers score at the median, the rubric is wrong — fix it.
Until won data is loaded, score against the SPEC ICP below and mark uncertainty
honestly in the reason.

## The rubric (ADDITIVE — never multiply criteria)

| criterion | weight | what earns it |
|---|---|---|
| **Active in social (THE core condition — B6's stated gate)** | 30 | posting regularly (ideally ~daily), multiple active accounts, a real follower base, and especially **creator / influencer / UGC partnerships** (other accounts organically promoting the brand) — partnerships are the single strongest "active" signal |
| Consumer-facing brand | 25 | sells to consumers; a product/world a short-form series could be built around |
| Decision-maker authority | 20 | the contact is director+ in brand/marketing/content/social/growth |
| Revenue ~$20M+ | 15 | can afford a sponsored/co-developed season |
| Brandable world / product fit | 10 | the product naturally lives inside an episodic format |

Sum the earned points. **Tiers:** A = 80–100, B = 60–79, C = 40–59, D = 0–39.
A/B count as **good fit** (they drive the qualified-TAM rate).

**Active-in-social is a near-gate (B6's explicit condition).** A brand with no
real social presence cannot be a good fit regardless of the other points — cap it
at tier C and flag it in the reason. The signals to surface in `research` /
`qualify`: posting frequency (per day), number of active accounts, follower base,
and **creator/influencer/UGC partnerships** (other accounts promoting the brand) —
the last is the strongest indicator; let it pull the score up hard when present.

## Anti-pitfall rules (from how this goes wrong in practice)

- **Additive, not multiplicative.** Multiplying criteria produces dead zones and
  fake-perfect scores. Add the earned points.
- **Watch "size counted five times."** Revenue, headcount, and "big brand" all
  co-vary; do not let three proxies for bigness dominate — they are one axis.
- **Missing data ≠ poor fit.** If a firmographic is unknown, do NOT score it 0.
  Note the gap in the reason and lean toward tier C (review), not D. A confident
  zero on missing data is the most common scoring error.
- **No invented facts.** Score only on what the contact context / public identity
  actually supports. If you inferred something, say so in the reason. Never
  fabricate a revenue figure or a campaign.
- **The reason is the audit trail.** One paragraph: which criteria earned points,
  what was missing, and the recommended outreach angle.

## Out of scope (force tier D / skip)

Anything on the client's `dedupe/` lists (STC / Trashed / 7 Stories), the primary
domain, B2B-only or non-consumer brands, or contacts below director level aimed at
a six-figure concept (authority mismatch — SPEC §4).
