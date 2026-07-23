# PostgreSQL with a JSONB value column for the attribute model

The primary persistence layer is **PostgreSQL**: a normalized relational skeleton for the compliance
and reference invariants, with a **JSONB** column as the escape valve for the one genuinely
polymorphic thing — an attribute's value. Document and reactive stores (MongoDB, Convex) are
rejected. This is a *lower-regret* choice on fit and cost-of-mismatch, not a claim that a document
store cannot do it.

## Decision

- **Relational skeleton, JSONB for the volatile value.** The stable, compliance-bearing part of every
  value — its source origin, the grant references covering it, its verification status and
  timestamps — is kept in rigid relational structure, because it is the legal audit trail and must not
  carry schemaless flex on top of GDPR evidence. The value itself, whose shape varies from one
  attribute to the next, lives free in a JSONB column with no migrations.

- **Document and reactive stores are rejected — on fit, not capability.** A document store's one real
  advantage here is loading a whole lead in a single nested read. But compliance requires each value
  to be an independently addressable unit with its own lifecycle, so we can delete precisely on consent
  withdrawal and prove it afterwards — which forces the values back out of the nest. Un-nested in a
  document store is the relational model rebuilt *without* its guarantees: no referential integrity, no
  cross-entity transactional delete, a manual lookup instead of a join. The moment you honour the
  compliance requirement, the document model neutralizes its own advantage and you pay the relational
  cost without the relational guarantees.

- **Relational fit, mapped to the forces.** The compliance sweep — purging values left without a
  covering grant on withdrawal — is the one place atomic in-store deletion is genuinely wanted, and it
  is free here. Shared, source-owned data and the authored Terms catalog are referenced by many leads
  rather than copied per lead, which is relational's home turf.

- **What this decision does not settle.** The store sits behind the graph module's port, so it stays
  swappable and modules own their data. The query/ORM layer is a framework detail left to the build
  map; managed-versus-self-hosted Postgres is a hosting question, not part of the engine choice.
  Standard Postgres and JSONB carry no proprietary lock-in, so the eventual production migration is a
  hosting move, not a rewrite.

## The hinge premise

The whole conclusion swings on one premise: **granular, per-value deletion-with-proof on consent
withdrawal is a hard, non-negotiable product and legal requirement — in the POC too.** Had a coarse
"reset the whole lead" deletion been acceptable, a clean nested document model would have won. If that
premise ever changes, this decision should be revisited.

## Why record this

Choosing relational for what looks like a document-shaped problem — sparse, polymorphic, per-lead
attributes — is exactly the call a later reader would question and try to "modernize" to a document or
reactive store, armed with the true but irrelevant observation that such a store "can also do it."
Recording that the decision turns on a single compliance premise, and that a document store rebuilds
the relational model without its guarantees the moment that premise is honoured, keeps the substrate
from being swapped on a feature-checklist argument that misses the real force.
