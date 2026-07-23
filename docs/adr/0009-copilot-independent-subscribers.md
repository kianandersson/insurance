# The copilot is independent event-subscribers, not one engine

There is no single "copilot" engine and no chat assistant. The copilot is an umbrella for independent
event-subscribers — extraction, recommendation, summary, and a reasoned why-log — each reacting to the
event bus and doing one thing. It is a graph-derivation engine that keeps the lead's living graph up
to date, with full but corrective autonomy.

## Decision

- **Independent subscribers, not an engine; extraction is the only splittable unit.** The copilot is
  four subscribers, each hanging off the bus. The service-splittable module boundary is the extraction
  layer alone — an **Utterance** in, derived values on the graph out — which is the one genuinely new
  thing the POC adds. Recommendation is *not* part of extraction: it is a separate reaction to the
  graph getting richer, indifferent to whether the new knowledge came from the call, a source lookup,
  or the seller typing.

- **A graph-derivation engine, not a chat.** The copilot keeps the living graph current — values with
  origin, and derived recommendations — as automatically and as fast as possible; it does not pitch
  sales talking points, and there is no chat UI. The seller's live view is a pure projection of that
  graph, not a second, separately rewritten running-notes document. One source of truth, rendered
  rather than rewritten, removes an entire failure class in which a rewrite drops a value it should
  have kept.

- **Full autonomy, corrective not approving — safe by construction.** The moment the model judges in
  context that a value belongs to this customer, it fills the attribute and runs the consent-gated
  lookup immediately; there is no accept-first gate. This is safe not because the model is trusted to
  be right, but because a mistake cannot destroy data: enrichment never overwrites, so a mis-heard
  value is additive, origin-tagged, and correctable — the worst case is a wasted lookup — and the
  expensive lookup is already guarded by the category-keyed consent rule. The seller intervenes only to
  correct.

- **"Confidence" is contextual judgement, not a number.** Per candidate value the model judges
  attribution (does this belong to *this* customer — using speaker tracks, so "my mother's address" is
  not attributed to the customer) and currency (is it true *now* — "I *had* a Golf, now a Tesla"); only
  values passing both are written. There is no numeric threshold to tune. Whether a value adds or
  corrects is the same kind of judgement, and a correction supersedes the earlier value without
  destroying its trace.

- **A source-agnostic input seam.** Core consumes only a source-agnostic **Utterance** — speaker,
  text, ordering, time — and no core module references a transport. So the whole copilot is
  developable and eval-testable in code by driving utterances straight into the seam, and the real
  telephony path is a swap rather than a dependency. There is deliberately no chat UI: the seam's value
  is real-transport-versus-scripted-test, not chat-versus-phone.

- **The "reasoned why-log" is a rendered view, not a reason-storing log.** The why-log named above is
  live *product observability* — it renders the rationale that each decision persists on its own domain
  record (a recommendation's justification, pricing's factor breakdown). The durable, system-wide audit
  log is the separate **reference-only** subscriber of [ADR-0007](0007-audit-log-reference-only-subscriber.md)
  and holds no reason prose; ticket 19 supersedes any earlier "one reasoned log serves both" framing.

## Why record this

Letting an AI write customer data and fire consent-gated external lookups with no human accept-gate is
the kind of decision a reviewer will reflexively want to reverse by adding an approval step "to be
safe." Recording *why* it is already safe — never-overwrite makes every mistake additive and
correctable, and the lookup is consent-guarded — keeps the corrective-not-approving autonomy from
being downgraded into an approve-first gate that would defeat the live, hands-free value loop. Equally,
the word "copilot" invites being rebuilt as one engine or a chat assistant; recording that it is
independent subscribers over a shared graph — with recommendation reacting to the graph rather than to
the call — keeps the pieces decoupled and the extraction unit independently splittable.
