# Pricing behind a per-carrier seam (MGA path kept open)

Price is computed behind a **pricing port**, resolved by a **rating-basis adapter per carrier** — one
adapter for each insurer's filed rating, faithfully mocked now and swappable for real filed rating
later. A new carrier or delegated-authority agreement is another adapter, the same house pattern as
the source adapters that feed enrichment. We deliberately do **not** build the actuarial engine, hold
insurance risk, or use real carrier tables.

## Context

The wedge strategy is not to become a risk-bearing insurer now, but to leave the Managing General
Agent (MGA) path open: a future where this platform prices and binds cover on a carrier's behalf under
delegated authority, without bearing the risk itself. That future requires an **auditable, explainable
premium** — every price reconstructable from what produced it. So the seam has to exist from the start
even though the engine behind it does not.

## Decision

- **Pricing is a port, not a formula in the caller.** Callers ask the port for a price; how it is
  derived is the adapter's concern.

- **One adapter per carrier's rating basis.** Each adapter mocks a real carrier's filed rating with
  market-faithful structure but illustrative numbers (real tables are not public). The MGA / new-carrier
  path is "add an adapter", never "change the pricing callers".

- **Every price carries its derivation.** A price is returned with enough of its reasoning — the
  amount, a factor-by-factor breakdown, and which rating basis produced it — to feed the audit trail
  and satisfy the auditable-premium requirement. (The exact return shape is the implementer's; this
  ADR fixes only that the derivation travels with the price.)

- **Explicit non-goals.** No actuarial risk engine, no risk-bearing, no real carrier rating tables,
  and none of the MGA regulatory or commercial arrangement — those are out of scope and stay mocked or
  absent.

## Why record this

Building a port and mocked adapters for what looks like a demo price is surprising without the MGA
context; a later reader would reasonably ask why an illustrative formula was not enough. The seam is
also hard to reverse — it shapes how pricing, audit, and the carrier abstraction all fit together — and
it was a real trade-off: a casual illustrative price was on the table and rejected in favour of a
real-shape derivation, precisely to preserve the auditable-premium demo value and MGA optionality.
