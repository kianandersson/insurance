# Audit log is a pure, reference-only event subscriber

The system-wide audit log is an independent **listener** on the domain event bus. It holds only
references — never personal values — and reconstructs cross-domain causal chains. No domain module
calls it or knows it exists, and it is never purged by lead-erasure.

## Decision

- **A pure event-bus subscriber, zero inbound coupling.** The log subscribes to the same domain event
  bus that value changes, consent acts, transcribed utterances, and copilot derivations already flow
  on. No domain module ever calls the log and no domain knows it exists. The standing premise is that
  every auditable action is already published as an event, so nothing auditable happens off the bus.

- **References only — no personal value anywhere.** Every field is a reference — to a value revision,
  a consent act, a graph node, a recommendation, a call, or the responsible **Actor** — plus an
  action, a timestamp, and the chain ids below. The Actor is itself a reference to a user or a system
  component, never a name or email. Because the log copies nothing, erasure in any owning domain
  empties the log's *view* while the log itself has nothing personal to delete: the entry survives as
  a reference-less stub. The trail is therefore append-only and is not purged by erasure — its lawful
  basis is accountability, independent of the lead's consent, which is what resolves the tension
  between the right to erasure and keeping an audit trail.

- **What we log is not why.** An entry records *that* something changed and points at the cause — the
  call an utterance came from — never the model's concrete rationalisation of it. There is thus no
  quoted personal text to purge; the reference-not-copy contract holds by construction rather than by
  a scrubbing rule.

- **Rationale lives in the referenced domain record, not in the log.** A recommendation entry points
  at the recommendation's own durable justification; a pricing entry points at the price's durable
  factor breakdown. Audit stays uniform and reference-based, and the richness lives in what it points
  at — thin-versus-rich *referenced records*, not two audit schemas. One obligation this places
  downstream: a decision that owns a rationale (a price, a recommendation) must persist it as a
  durable record at decision time, so the reference has something to point at.

- **Traceability is a causal chain, and it is purge-robust.** Two ids ride on every event: a
  chain-root shared by everything derived from one call, and an immediate-trigger id linking each
  entry to the event that caused it. Together they make a whole cascade walkable — call to utterance
  to value change to recommendation — and, because entries hold only ids, the chain survives as
  reference-less stubs when an underlying value is purged, so the trail stays provable after erasure.

## Consequences

Every entry shares a fixed core plus an opaque per-domain detail — the same rigid-plus-free split as
the persistence layer — so a new feeder needs no schema change, and the log keeps its own thin action
vocabulary decoupled from internal event names. It is read only through a narrow query port over its
own store; because it has zero inbound coupling, later extracting it into its own service is moving a
subscriber, not a rewrite.

## Why record this

An audit log that stores none of what happened, that no domain calls or even knows about, and that
survives an erasure the rest of the system honours, is surprising enough that a later reader would
assume it a mistake and "fix" it — by copying values in for convenience, or purging entries on
erasure to look compliant. Both would break the design: the log's whole compliance stance is that it
holds only references, so there is nothing personal to erase and the causal trail survives as proof.
Recording this keeps the reference-only contract and the append-only posture from being eroded.
