# Consent as a Terms model, not a consent entity

The lawful backbone that gates enrichment and calling is modelled as a **Terms** model plus a
parallel **Legal Provision** entity — not as a first-class consent entity. The word "consent" is
reserved for the GDPR Article 6 lawful ground it denotes in law; it never names an entity, a
document, or the subject's stream of decisions.

## Decision

- **No consent entity; the word is reserved.** Under GDPR, consent is one Article 6 lawful ground —
  a freely given, specific, informed agreement to processing. It is a *ground*, not the artifact we
  author and not the subject's decision. So "consent" names only that ground and never a stored thing.

- **The Terms model.** We author **Terms** — named, purpose-scoped documents. Each has a line of
  immutable **Terms Version**s. A **Party** answers a specific version with an append-only **Terms
  Response** — accepting, rejecting, or withdrawing. The stream is deliberately neutral: a rejection
  is not a "consent", so it is not named after one.

- **Permissions are authored, never inferred.** A Terms Version carries an explicitly authored,
  reviewed set of **Permission**s. They are declared and vetted, not derived from the document's
  text — a lawful grant must never rest on a machine's reading of prose.

- **Legal Provision — the parallel statutory door.** A first-class **Legal Provision** represents a
  referenced piece of law that grants permissions for a defined period. It is the law, identical for
  every subject, not something the subject did — so it sits beside the Terms side, not inside it. The
  two doors are defeated differently: a consent is withdrawn through a **Terms Response**, whereas a
  statutory ground is contested through an **Objection** (a GDPR Article 21 objection).

- **Lawfulness is derived, not stored.** A lead's **Effective Permissions** are folded at read time
  from its Terms Responses and the applicable Legal Provisions. Each permission is covered by one or
  more **Grant**s, where a Grant is simply a reference to what makes it lawful — a Terms Response
  (consent) or a Legal Provision (statute). There is no stored basis value and no materialised grant
  entity, and a single permission may be covered by several grants at once.

## Considered alternatives

- **A first-class consent entity** — the obvious model, and this project's own earlier one: a consent
  object, versioned, whose accepted version yields a person's permissions. Rejected because it
  mis-names the domain: it collapses three distinct things — the document we author, the subject's
  decision, and the Article 6 ground — into a single word, and it makes "consent" an entity when in
  law it is a ground. Separating **Terms**, **Terms Response**, and the reserved word "consent" keeps
  each of the three precise.

- **Deriving permissions from the Terms text** — tagging a version's wording and mapping those tags
  to permissions. Rejected: a legal grant must not be a machine guess. Permissions are authored and
  reviewed explicitly, so what a version grants is always a human legal judgement, never inferred.

## Why record this

A reader who opens the model expecting a consent entity — the conventional shape, and the one this
project first proposed — will not find one, and will wonder why the lawful backbone is split across
Terms, Terms Responses, and Legal Provisions with the word "consent" naming no thing at all. This
ADR records that the split is deliberate and grounded in what the GDPR terms actually mean, so the
entity is not "restored" later and the reserved meaning of "consent" is not eroded.
