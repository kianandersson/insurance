# Seller-workspace spec (for design)

This is the **product spec, distilled for design** — the companion to
`seller-workspace-design-brief.md`. The brief fixes the *experience and interaction model*; this
file is the **feature and behaviour source of truth**: what the seller workspace must *do*, and how
each part *behaves*.

It is distilled from the full PoC spec (GitHub issue #3), which the design tool cannot read directly
(it is a GitHub issue, not a file). So the seller-facing surface is captured here, as a file, on
purpose. Two rules carry over from the brief:

- **This is not screen copy.** Do not put these sentences, or their phrasing, on screen. Read for
  behaviour; write your own short product microcopy (see brief §6).
- **Completeness *and* coherence.** The brief teaches you to design against two concrete leads so the
  result is coherent. That is the *method*. But the workspace must still **contain every
  seller-facing feature listed below**, even the ones a given journey doesn't happen to exercise —
  the per-call notes and the end-of-call summary are features, not optional flavour.

---

## What the product is (the one paragraph)

Each lead becomes a **living record** of the people, companies, and insured things (vehicles,
property) attached to it. Values flow in on their own — from register lookups and, during a call,
from the conversation as an AI derives values live — and the workspace continuously derives
**recommended products and changes** from the current values. Every value carries its origin; the
seller **corrects rather than approves**. One workspace serves both a thin **personal** lead (which
the conversation fills up) and a rich **commercial** lead (already full from registers before the
call). **The seller drives the sale; the platform makes the information ready.**

---

## The feature surface (everything below must be present)

### A. The living record

- The lead is a living record of **parties** (a **Person** or a **Company**) and **insurable
  objects** (**Vehicle**, **Property**), each holding its own **attributes**. It continuously
  reflects the current picture.
- Relationships (a car *owned by* a person, a director *of* a company) are expressed by **structure
  and nesting**, never a node-link graph (brief §3.1).
- **The same workspace serves personal and commercial leads** — never two different screens.

### B. Provenance and trust (calm by default, deep on demand)

- Every value has an **origin**: a **register lookup**, **manual entry**, or **heard by the AI on
  the call**. At rest, register and manual values look ordinary; only a heard-not-yet-confirmed value
  carries the one quiet **"not verified yet"** marker.
- The marker is **passive** — the value is usable as it stands. **The seller corrects, never
  approves.** *Correct* (fix a wrong value) is the first-class action; *Confirm* is an optional
  elevation, never a queue to clear, and nothing tallies "values confirmed" as progress. The seller
  must **never be clicking through confirmations during a call**.
- An attribute can hold **more than one source-tagged value at once**. Enrichment **never
  overwrites** — a new lookup *adds* a candidate. A disagreement between sources shows as **one
  most-trusted candidate, with the others inspectable** on drill-down (conflict lives in the
  drill-down, never at rest).
- **Manual entry and correction are real, working affordances**, and they flow into the same record
  as everything else.
- The seller can **see why any value appeared** (its origin and history) by drilling in.

### C. How the record fills itself (enrichment)

- **Automatic register lookups fire in reaction to the values the record already holds** — the
  seller never asks. An **identifier** (a vehicle's licence plate, a company's registration number,
  an address) triggers a lookup that **blooms a whole verified cluster** into the record at once (a
  plate → the full vehicle). This self-building bloom is the product's signature (brief §3.2, §7).
- **Commercial lead:** rich from registers **before any call** — the seller is *preparing*.
- **Personal lead:** the **conversation itself fills the record**, live, during the call.
- A lookup can be **unavailable** when there is no lawful basis to hold the data; if that surfaces at
  all, it surfaces only as a **plain consequence**, never as permissions machinery (see F).

### D. The live call

- The seller can **place a real call** to the lead from within the workspace — no tool-switching.
- The call is either **available or blocked**. A blocked call shows a **plain human reason** (e.g.
  the person hasn't agreed to phone contact) — **never** the underlying consent machinery.
- A **live transcript** runs during the call: **Danish**, **ambient and display-only**, showing the
  AI is listening. It is not the working surface and there is **no chat UI** (brief §3.5).
- The AI **derives values from the conversation live** and runs any resulting lookup **immediately**,
  so the record keeps up with the call.
- **Per-call notes.** The seller **takes notes during the call**, kept **visibly separate** from the
  lead's durable record — call scratch must not pollute the permanent record.
- **End-of-call summary.** When the call ends, the workspace produces a **summary recap** of the
  call. This is a distinct feature from the live notes: notes are what the seller jots *during*; the
  summary is what the system produces *at the end*.

### E. Recommendations (the seller's primary decision surface)

- The workspace **recommends products and changes** derived from the current values — both **new
  products** and **changes to existing cover** (a coverage gap, a cross-sell).
- Recommendations are **durable lead state**: they **persist and survive the end of the call**, and
  are **re-derived whenever the record changes** (they appear and sharpen as the picture fills).
- Every recommendation is drawn from an **authored catalog** — never invented — and **explains
  itself** with a justification.
- A recommendation **spots coverage gaps and cross-sells** by comparing against the lead's **current
  cover**. Make *gaps* visually prominent — an under-covered prospect is the strongest angle.
- Each card shows four scannable signals — **what** (product / tier), **angle** (new · gap ·
  cross-sell), **why in one line**, **price signal** — and expands to the depth: full justification,
  factor breakdown, exact coverages (brief §3.4).
- **This is decision support, not autopilot.** No "accept"/"apply" action that implies the system
  does the selling. Actions serve the seller (expand, get a price, use in the pitch).

### F. Pricing (inside a recommendation)

- A recommendation can show a **price for a configuration**, with a **factor breakdown** and a
  **bind / refer / decline** outcome.
- A **change** is expressed as a **price delta with a short explanation** ("what this change costs").
- Numbers are **illustrative** in this PoC (one carrier); the *structure* is real.

### G. Why it happened (product observability)

- The seller can **see why each value and each recommendation appeared** — a calm, on-demand "why",
  not a dashboard. This is what lets the seller trust the platform's autonomy.

---

## Out of scope for this design (context only — do not design these)

These exist in the product but are **not** the seller workspace; do not design them here:

- The **lawyer/admin authoring** surfaces (authoring the catalog — Coverage / Product / Tier — and
  Terms).
- The **audit / trace / compliance** view.
- The **landing page** and lead **intake**.
- **Sign-in / access** (magic-link).
- The underlying **consent, permission, and lawful-basis machinery** — it exists and governs what is
  possible, but the seller only ever sees its **consequences** (a call available or blocked; a value
  or lookup present or unavailable), never its mechanics. Never surface the plumbing vocabulary
  (brief §6).

Note there is deliberately **no AI sales-coaching / pitch-script** feature — the seller drives the
sale; the transcript is ambient, not a script to read (brief §3.5).
