# Design brief — Seller workspace (Claude Design)

This is a brief for **Claude Design**, not an implementation spec. It fixes the *experience and
interaction model* and deliberately leaves the *visual language* open. Read it in full before you
design anything.

---

## 0. Read the repo first (do this before designing)

You have access to this repository. **Read these before you start — they are context for you, not
copy for the screen:**

- **`docs/design/seller-workspace-spec.md`** — the **product spec, distilled for design**, and the
  most important thing to read after this brief. It is the **feature and behaviour source of truth**:
  what the workspace must *do*, and how each part behaves (the living record, provenance, enrichment,
  the live call incl. **per-call notes and the end-of-call summary**, recommendations, pricing). The
  full spec lives only as a GitHub issue the design tool cannot read, so its seller-facing surface is
  captured in that file on purpose — read it in full. **Every seller-facing feature it lists must be
  present in your design**, even ones a given journey doesn't exercise. But **do not put its sentences
  on screen** and **do not treat it as a literal widget checklist** — read for behaviour and write
  your own product microcopy (see §6).
- **`CONTEXT.md`** — the project's ubiquitous language (the shared, precise names for domain concepts).
- **`docs/adr/`** — architecture decisions, for background only.

Why this matters: the spec is unusually thorough, and a literal reading produces a page that reads
like a compliance dashboard written by a lawyer. Your job is to turn that model into a calm, fast,
professional tool a salesperson actually wants to work in.

---

## 1. Subject, audience, and the single job

- **Subject:** the workspace where a **seller** works a single insurance sales lead — a living record
  of the people, companies, and insured things (vehicles, property) attached to that lead, plus the
  products worth offering.
- **Audience:** a professional insurance salesperson, often **on a live phone call** with the
  prospect while using the screen.
- **The page's single job:** let the seller *see the prospect's picture assemble itself* and *decide,
  fast, what to sell* — while staying in charge of the sale.

**Scope for this brief:** design **only** the seller's lead workspace. Do **not** design the
lawyer/admin authoring surfaces, the audit/trace view, or the landing page.

---

## 2. The one organizing principle

**A calm, classic CRM/CDP record that quietly evolves itself.**

- The record is the permanent centre. Values, and product recommendations derived from them, arrive
  and update **in place**.
- **The surface is the same whether or not a call is live.** A live call does not restyle the page or
  switch it into a "call cockpit" — it only *adds* call-scoped content (a transcript, call controls)
  that is simply absent when there is no call.
- **No pop-ups, toasts, modals, or notifications** competing for the seller's attention. The seller is
  mid-sentence on a phone call; nothing may yank their focus. The page is honest about what just
  happened; it never shouts.

---

## 3. The fixed interaction model (do not redesign these)

These are settled. Your creative latitude is the visual language (§7), not the model below.

1. **The record is a structured CRM layout, never a node-link graph.** The lead is one person or
   company at the top; related parties and insured objects (vehicles, property) are sections/cards
   beneath, each with its attributes. Relationships (a car *owned by* a person) are expressed by
   **structure and nesting**, never by drawn nodes and edges. The word "graph" describes the data
   model underneath — it is not a visualization.

2. **The record fills itself from three streams — and a key value blooms a whole cluster.** Values
   arrive from (a) the **live conversation** (the AI derives them as the prospect talks), (b)
   **automatic register lookups**, and (c) **manual entry**. The essential motion the design must show:
   certain values are **identifiers** — a vehicle's licence plate, a company's registration number, an
   address — and the moment one lands, it **automatically triggers a register lookup that pours in a
   whole cluster of related, verified values at once**. The record does not gain one field; it **grows
   a whole card/branch** (a licence plate → the full vehicle: make, model, year, first registration, …).
   This self-building cascade — a value that fetches more values — is the **heart of the product**, not
   just a running transcription of what was said.

   **Arrival is made legible by a very subtle entrance animation, nothing louder.** A single field
   animates in gently; a lookup's cluster arrives as **one calm, staggered reveal**. Nothing flashes
   afterward or wears a "new" badge — freshness lives in the motion of arriving.

3. **Trust/provenance is calm by default, deep on demand — and the seller *corrects*, never *approves*.**
   - Register-sourced and manually-entered values look like ordinary values — no origin badges.
   - A value the AI *heard on the call* looks like any other value but carries **one quiet marker:
     "not verified yet"**. This marker is **passive** — the value is fully usable as it stands, and the
     seller can leave it marked indefinitely. It is a trust *indication*, not a task.
   - **The seller's primary action is to *correct* a wrong value, not to *confirm* a right one.** The
     product's stance is that the AI is autonomous and the seller only intervenes to fix what is wrong —
     they must **never be clicking through a queue of confirmations during a call**. So: **Correct** is
     the first-class, always-available action on any value; a lightweight **Confirm** may exist as an
     *optional* elevation of a heard value to verified, but it must never be framed as a to-do to clear,
     and nothing may score or tally "values confirmed" as if it were progress.
   - That is the *only* trust state on the resting surface. Do **not** decorate every field with a
     source, and do **not** surface source-conflict UI at rest.
   - Depth exists but stays out of the way, and it must be **real, not a decorative panel of dead
     buttons**. Drilling into a value reveals its **actual append history**: enrichment **never
     overwrites**, so a value can hold **several source-tagged candidates at once** (e.g. a register
     value and a differing heard value), shown as **one most-trusted candidate with the others
     inspectable**, plus the origin of each and the ability to correct or delete. Sketch this as a
     secondary state — it is not where the design energy goes — but it must express the many-candidates,
     never-overwrite model, not fake it with static labels.

4. **Recommendations are the seller's primary decision surface — make them fast to scan.** Each
   recommendation is a compact, scannable card showing four signals:
   - **What** — the product / tier name.
   - **Angle** — new product · **coverage gap** · cross-sell. Make *gaps* visually pop; an
     under-covered prospect is the strongest sales angle.
   - **Why, in one line** — grounded in this lead (e.g. "2019 Tesla, no comprehensive cover").
   - **Price signal** — a premium or a price delta (illustrative numbers in this PoC).

   Expanding a card reveals the depth: the full justification, the factor breakdown, the exact
   coverages. **This is decision support, not autopilot.** A recommendation has **no "accept"/"apply"
   action** implying the system does the selling. Actions serve the seller (expand, get a price, use
   in the pitch). The seller picks the angle; the tool informs.

5. **Call-scoped content appears only during a call, as a side region.**
   - A **transcript** that is **ambient and display-only** — a calm, scrolling panel that shows the AI
     is listening. It is *not* the working surface; the valuable moments show up in the record (values
     landing), not by reading transcript lines. There is **no chat UI**.
   - **Call controls.** The call button is simply **active or blocked** as a plain consequence — never
     expose the underlying permissions machinery; just show whether the seller can call and, if
     blocked, a plain reason.
   - **Per-call notes**, kept visibly separate from the lead's durable record.
   - An **end-of-call summary** when the call ends.

---

## 4. Design against these two concrete leads — but include the whole feature surface

Design *against* these two specific journeys so the result is coherent rather than a checklist of
disconnected widgets. That is the **method**, not the scope. **The workspace must still contain every
seller-facing feature in `seller-workspace-spec.md`** — the per-call notes, the end-of-call summary,
the value drill-down with its append history, the manual-entry/correct affordances, the pricing
signals, the "why did this appear" — even where a given journey below doesn't happen to exercise it.
A feature the spec defines but the design omits is a gap, not a simplification. Coherence is *how* you
present the surface; it is not a licence to drop parts of it.

**Hero — a thin personal lead that fills up live.** The record starts nearly empty: a name, a phone
number. The seller starts a call. Two things fill the record, and the prototype must show **both**:

- **The enrichment bloom (the essential moment, currently missing).** An **identifier** lands — the
  prospect reads out a **licence plate**, or the seller types it in — and it triggers an automatic
  **register lookup** that blooms a full, verified **vehicle card** into the record in one staggered
  reveal (make, model, year, first registration, …). One key → a whole cluster. The same pattern holds
  for an address (→ property) or, on a company lead, a registration number (→ the company and its
  vehicles).
- **The conversational trickle.** Things no register holds — annual mileage, "I park it on the
  street" — are **heard by the AI** and arrive marked **"not verified yet"**. They are usable
  immediately; the seller does not confirm them one by one. Show at least one **mis-heard value being
  *corrected*** — that is the real intervention (see §3.3), and it is the moment "the seller drives, the
  AI assists" becomes visible.

Recommendations appear and sharpen as the picture fills. This journey — the record **building itself**
from a spoken plate, not merely transcribing speech — is where the product's originality lives. Make
it sing.

**Required second state — a rich commercial lead, already full.** A company lead arrives already
populated from registers before any call: multiple parties, several vehicles, existing cover. The
seller is *preparing*, scanning a dense record. **Prove the layout holds when the record is full, not
just when it is filling** — a design that only works empty-and-filling is a failure.

---

## 5. Deliverable

- A **self-contained, high-fidelity, interactive prototype** with mocked/scripted data — not static
  mockups, and not wired to any real backend (the real build is a separate effort). The calm
  self-evolving quality and the subtle arrival animations can only be judged **in motion**, so build
  it interactive.
- Demonstrate both the **resting state** and the **key transitions in motion** — above all **the
  enrichment bloom** (an identifier triggering a register lookup that staggers a verified cluster into
  the record), plus a **mis-heard value being corrected**, the per-call notes and end-of-call summary,
  and a recommendation appearing — in **both lead states** from §4.
- Produce **one fully-realized visual direction** on top of the fixed interaction model in §3. (The
  interaction model is fixed, so "variants" collapse into trivial recolors and add little value —
  spend the effort on getting the *behaviour* right, above all the enrichment bloom. Visual
  alternatives can come later, once the interaction is right.)
- **Responsive: desktop is the primary platform, but it must remain fully usable on mobile.** Show how
  the multi-region desktop layout reflows to a stacked / tabbed mobile layout with the record as the
  primary surface.

---

## 6. Language and copy

- **UI labels use the project's ubiquitous language, in English, by default.** This is intentional
  (domain-driven design: the same word for user, stakeholder, and code). "Recommendation",
  "Coverage", "Product", "Verified" belong on screen. Localization (incl. Danish) is a later layer —
  **except** the **transcript content itself is Danish** (the actual conversation), inside an English
  UI frame.
- **Never surface these internal plumbing terms** as UI text; they are for the engine, not the seller:
  *Snapshot, Grant, Source Binding, Terms Response, Attribute Revision, Effective Permissions*
  (show only the *consequence* of the last — e.g. a call button that is active or blocked).
- **Microcopy is product copy, not spec sentences.** A user story like "confirm a not-yet-verified
  value" becomes a button that simply reads **"Confirm"** — short, concrete, in the seller's flow.
  Never transcribe spec phrasing onto a control.

---

## 7. Aesthetic direction — and what to avoid

Prompted "at the right altitude": character, not hex codes. Choose the palette, type, and motion
yourself — but in *this* character:

- **A calm, precise, trustworthy professional instrument** — think a high-craft trading terminal or a
  surgeon's console, not a marketing landing page. It is used for hours, during live calls, by a
  professional. Legibility, density, and stillness are features.
- **Spend boldness in exactly one place.** Your usual anti-"AI-slop" instincts (distinctive type,
  dominant color, high-impact page-load animation) are mostly **wrong here** — they fight the calm.
  Apply your own restraint discipline: keep everything quiet and disciplined, and let the **one
  signature moment** carry the character.
- **The signature element is behavioural, not decorative:** *the record building itself.* Two motions
  carry it: the **enrichment bloom** (an identifier such as a licence plate triggers a lookup and a
  whole verified cluster staggers into place) and the softer **conversational trickle** (a heard value
  arrives "not verified yet" and is confirmed in one gesture). The record assembling itself —
  especially the bloom from a single spoken plate — is what this product is remembered by. Design
  everything else to stay out of its way.

**Avoid:**
- Generic AI defaults — Inter/Roboto/Arial/system fonts, purple gradients on white, cookie-cutter
  cards. (Also avoid over-converging on the usual "distinctive" fallbacks like Space Grotesk.)
- **Attention-grabbing UI** — toasts, notification bells, badges on everything, celebratory
  animations, dashboard-gauge clutter. This tool must never distract a seller mid-call.
- A literal node-link **graph** visualization (§3.1) and any **chat** UI (§3.5).
- Turning the four recommendation signals into a wall of prose, or the record into a compliance
  read-out.

---

## 8. Before you show your work

Do a self-critique pass against this brief. If any part of your design reads like a generic default —
or like a *loud* default — rather than a choice made for a calm professional tool used during live
sales calls, revise it, and say what you changed and why.
