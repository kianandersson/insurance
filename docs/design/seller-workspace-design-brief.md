# Design brief — Seller workspace (Claude Design)

This is a brief for **Claude Design**, not an implementation spec. It fixes the *experience and
interaction model* and deliberately leaves the *visual language* open. Read it in full before you
design anything.

---

## 0. Read the repo first (do this before designing)

You have access to this repository. **Read these before you start — they are context for you, not
copy for the screen:**

- **GitHub issue #3** ("Spec: Insurance platform PoC") — the product spec. Read it to understand the
  domain and how the pieces relate. **Do not treat its user stories as a widget checklist, and do not
  put its wording on screen.** It is written in an internal engineering vocabulary that must never
  surface as UI text (see §6).
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

2. **Change is made legible by a very subtle entrance animation, nothing louder.** When a value or a
   recommendation arrives, it *animates in* gently. It does not then keep flashing or wear a "new"
   badge. Freshness lives in the motion of arriving.

3. **Trust/provenance is calm by default, deep on demand.**
   - Register-sourced and manually-entered values look like ordinary values — no origin badges.
   - A value the AI *heard on the call* looks like any other value but carries **one quiet marker:
     "not verified yet"**, with an **inline way to confirm it** in a single gesture.
   - That is the *only* trust state on the resting surface. Do **not** decorate every field with a
     source, and do **not** surface source-conflict UI at rest.
   - Depth exists but stays out of the way: the seller can **drill into a value** to see its full
     history/origin and take advanced actions. Sketch this as a secondary state; it is not where the
     design energy goes.

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

## 4. Design against these two concrete leads (not against the feature list)

Design for these specific journeys — coherence beats completeness.

**Hero — a thin personal lead that fills up live.** The record starts nearly empty: a name, a phone
number. The seller starts a call. As the prospect talks, values arrive and animate in — a car, its
year, annual mileage — each "not verified yet" until the seller confirms with a tap. Recommendations
appear and sharpen as the picture fills. This journey is where the whole product's originality is
visible; make it sing.

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
- Demonstrate both the **resting state** and the **key transitions in motion** (a value arriving and
  being confirmed; a recommendation appearing), in **both lead states** from §4.
- Produce **two distinct visual directions** on top of the **one fixed interaction model** in §3, so
  the visual language can be chosen without reopening the settled interaction decisions.
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
- **The signature element is behavioural, not decorative:** *a value the seller just heard on the call
  arriving on the record — animating in, marked "not verified yet", confirmed in one gesture — the
  page filling itself while the seller talks.* That moment is what this product is remembered by.
  Design everything else to stay out of its way.

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
