# The Denotational Bridge — autonomy framework × the Crystal Ball domain program

**Written by the Fable window, 2026-06-12, after reading both canons. Two windows built two
moods of one theory on the same day without seeing each other's results: this framework is the
OPERATIONAL mood (handlers, grades, annealing, records — control theory's reading); the CB
program (`~/Downloads/cb_*.md` + `~/fable_test/cb_agency_invariants_and_convergence.md`) is the
DENOTATIONAL mood (Scott domains, fixed points, orbits, the admissible band — order theory's
reading). The rows below are identifications, not new mathematics; each is grounded in a PROVED
artifact on at least one side. Additive file — nothing prior was edited.**

---

## 1. Annealing's genus IS the Kleene climb

Amendment 4's genus — *"annealing := relaxation of a system to a fixed point of its own update
operator"*, convergence test *"a fresh pass changes nothing"* — is precisely the object the CB
resolution paper PROVES for `resolve`: the one-round operator is inflationary unconditionally,
monotone on the policy-coherent subdomain, and instantiation is the Kleene supremum
`⊔ₙ r_πⁿ(⊥)` — the least fixed point (Bourbaki–Witt gives bare existence with no assumptions
at all). The General Annealing Protocol's dynamics ("iterate U; the gauge detects the fixed
point") is the operational reading of that theorem. Species ledger, extended:

| Species | State space (the would-be domain) | Update U | Carrier proved? |
|---|---|---|---|
| trust-annealing (manifesto) | oversight/config space | gated execution + config delta | OPEN (not yet formalized as a domain) |
| artifact-annealing (RALPH) | code on disk | one fresh stateless run | — |
| config-annealing (Bandit) | pipeline configs | construct + review ±1 | — |
| **scheme-annealing** (steward WARRANT) | the classification scheme | strain → warrant → accept | graph-implemented (neo4j `steward` db) |
| **identity-annealing** (CB seventh doc) | fingerprint/orbit space | any admissible commitment | **Scott domain PROVED** (Platform Theorem) |

The CB program supplies what the genus-definition lacked: a carrier on which "fixed point of
the update operator" is a theorem rather than a metaphor.

## 2. `supposedly_done` now has proof-backed semantics; and a naming collision to log

**Gauge ≠ Handler** (A5.3) lands on proved structure: JobWorld's `supposedly_done`
("gauge-passed, handler-pending") = CB's **kernelComplete within a fiat view-boundary**
(equipment paper B6: a maximal element of `D_B`) **∧ not-yet-admissible** (the band). The
distinction the state machine encoded is the distinction the platform proves: syntactic
maximality vs. gate acceptance are different predicates, and the gap between them is where
every gauge-passed-handler-pending state lives.

⚠ **Naming collision (the "annealing" situation again, one word later):** this framework's
**gauge** = the *internal instrument* (g of the six slots). The CB seventh document's
**gauge** = *gauge freedom* (orbit-equivalent choice; the physics sense — a difference that
makes no difference). Two mechanisms, one word. Proposed glossary rule: "gauge" unqualified
means the instrument (canon here); the symmetry sense is always said as **"gauge freedom" /
"within-orbit choice."**

## 3. Grades-are-handlers = the proposer/acceptor separation = the layer contract

`await_verdict` + handler substitution ("the autonomy ladder never touches the program") is
the steward's constitutional line — *you PROPOSE; the gate DISPOSES; acceptance is a
gatekeeper act, never yours* — and the CB band's two-sidedness. The live handler ladder the
recon found (human → deterministic validity-cache → LLM Reviewer → learned OVP, stub) is the
gate's roadmap. Note what this makes the steward system: **a shield-1 traversal of the
ontology domain, already in progress** — its grade-1 handler is the human gatekeeper, and per
Amendment 2's corollary ("instrument traversal one as if the records were the product"), its
records already comply: every placement, root-hold reason, strain, and warrant verdict is
durable, typed, and provenance-bearing in the graph. The ontology domain's shield-2a corpus is
accumulating as a side effect of normal operation.

## 4. Futamura tower = embedding-projection tower = the Sanctuary funnel

A3.4/A5.2's tower (1st projection eats *task instances*; 2nd eats *domains*; 3rd eats
*interpreters*) and the CB seventh doc's hero→mentor tower (a Mentor is an element of
`[D→D]`; levels `D_{n+1} = [D_n → D_n]`; limit `D_∞ ≅ [D_∞ → D_∞]`) are one ascent in two
literatures — which are historically a single subject: partial evaluation's semantics lives on
Scott domains. The sharpest identification: A3.1's adjunction **α ⊣ γ** (mining ⊣ compilation;
"duality exactly on the closure fixpoints") has the embedding-projection shape — `p∘e = id`,
`e∘p ⊑ id` — i.e. the seventh doc's *pedagogical inequalities* (the method recovers its worked
example; one worked example under-determines the method) ARE the abstraction/concretization
adjunction. Mentor = α(trajectory); grade 3's instance→pattern α-step = "finishing the Hero
loop instantiates the Mentor methodology." Two windows, same arrow, different labels, same day.

## 5. THE load-bearing wire: grade promotion = arity collapse

Amendment 2's observability bound (automation degree = slots groundable in internal records ÷
total slots; A3.4: this is a binding-time analysis) meets the seventh doc's **effective arity**
(orbit count among admissible fillers of an exposed slot):

> A slot is automatable exactly when the record corpus collapses its effective arity to 1 —
> the records determine the filler (static, in BTA terms). The irreducible-human set = the
> slots where arity-given-records remains > 1 = **where genuine choice lives**.

Therefore: **trust-annealing's promotion criterion ("the phase's configuration stops
changing") is convergence-to-identity in config space.** The manifesto's annealing becomes
measurable by the seventh doc's queries, and the falsifiable claims fuse: *arity-given-records
is non-increasing along gated traversals* ⇔ *annealing works*. One prediction, two
vocabularies.

## 6. The four predicted-but-unbuilt wires, re-specified denotationally

1. **RALPH convergence detector** = a fixed-point detector. General form, from the genus: "a
   fresh pass changes nothing," measured as diff-size 0 (artifact gauge) / fingerprint
   stability (identity gauge) / effective arity 1 (choice gauge). **One detector, three
   gauges.**
2. **RALPH→Bandit reward edge** = the Episode write-back regime (procedural knowledge
   validated by runs, outcome-weighted — the CB/steward Episodes-vs-provenance split).
3. **OVP acceptance handler** = shield 2a = fit the governor's verdict history. For the
   ontology domain, the training corpus is already accumulating (row 3).
4. **Row-typed contexts** = region-typed, facet-addressed records — the steward's REGION
   coordinate + address tuples, and the observatory's forced invariant tag mapping, are the
   same move: A3.2's "typed records the acceptance model trains against," already real in two
   places.

## 7. Non-transferability has an order-theoretic reason

"Every new substrate enters at grade 1" was stated as policy. The band supplies the reason it
is *true*: admissibility is **bottomless** (when-is paper: multiple incomparable minimal
admissible configurations — no neutral legitimate self). Being trusted requires
already-committed, domain-specific witnesses; trust cannot transfer because **legitimacy is
constituted by in-domain commitments**. The principle is a theorem-shadow, not a preference —
and Amendment 1's lift (the *procedure* transfers, the trust doesn't) is meta-level transfer
over object-level bottomlessness, exactly as stated.

## 8. Defects found while reading (for the owning window)

- **AUTONOMY-MANIFESTO.md is truncated mid-edit:** two "Amendment 4" sections; the second
  ends at an empty `### A4.3` header at EOF (line 753). The second copy contains refinements
  the first lacks (the validity gate "reaches one level down, onto the records themselves";
  the third handler kind = *external service*, from the Grug callback). Needs reconciliation —
  don't lose the second copy's deltas. *(HEALED later the same day: merged to a single
  Amendment 4 with the deltas folded and marked, duplicate removed, editorial note at the
  header; the file is now 743 lines. The canon catalog records the before/after state-skew as
  item c-030.)*
- The **gauge** collision (row 2) — one glossary row fixes it.
- Nothing else contradicts: every identification above is two existing artifacts agreeing.
