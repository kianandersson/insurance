# Entity-graph structure for a lead

A **Lead**'s state is modelled as a **graph**, not as fixed-column rows. Nodes are the graph's
**Party**s (a **Person** or **Company**) and **Insurable Object**s (a **Vehicle** or **Property**),
connected by typed **Relationship**s (owns, married-to, and the like). Each node holds **Attribute**s,
and every value of an Attribute is recorded as an append-only **Attribute Revision** carrying its
origin and verification status.

## Decision

- **Values are revisions, never overwrites.** A new observation of an Attribute adds a Revision; it
  does not replace the last one. Verification is derived from a Revision's origin plus an optional
  manual confirmation. A directly-defined value lives in exactly one place, and other views reference
  it rather than copying it.

- **The current view is derived, not stored.** What a Lead "currently is" is a projection folded
  from its Revisions at read time, and it is pushed live to subscribers as the graph changes.

- **One module owns the graph.** The graph lives behind a single module boundary (labelled `graph`)
  exposed as a port; nothing outside reaches into its stores. Reads, a live subscription to the
  projection, value submission, source-data ingestion, and consent-driven purging all pass through
  that port.

## Considered alternatives

A conventional fixed-schema relational row per entity was rejected: it cannot hold multiple competing
observations of the same field, loses origin and verification per value, and forces the entity shape
to be known up front. The graph-plus-revision shape lets a Lead be sparse, grow as data arrives from
any producer, and stay fully attributable — which the consent, enrichment, and audit concerns all
depend on.

## Consequences

The shape is hard to reverse once producers, projections, and the audit trail are built against it.
It is the reason a Lead can be simultaneously thin (a fresh personal lead) and rich (a commercial
lead already filled from registers) with no schema change, and the reason a consent withdrawal can
purge values while the causal trail survives.
