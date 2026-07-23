# Insurance Sales Platform — Domain Context

A generic, market-agnostic insurance-sales platform that assembles a lead into a graph of
related parties and insurable objects, each holding its own attributes. Denmark is the first
configured market; its registers, statutes, and product types are data, not model vocabulary.

## Language

### The lead

**Lead**:
A single sales prospect being worked, comprising its entity graph and everything gathered
about it.
_Avoid_: Profile, Opportunity, Case, Dossier, Prospect

### The seller

**Seller**:
The human who works a Lead through the platform and drives the sale — the primary user the product
serves.
_Avoid_: Agent, Advisor, User, Rep, Broker

**Actor**:
Who is responsible for an audited change or decision — a Seller, the AI, or the system.
_Avoid_: User, Author, Principal

### The entity graph

**Party**:
A legal actor that can hold consent and a lawful basis.
_Avoid_: Contact, Entity

**Person**:
A Party who is an individual human.
_Avoid_: Individual, Contact

**Company**:
A Party that is an organization.
_Avoid_: Firm, Business, Organisation

**Insurable Object**:
A risk-bearing thing that is insured but gives no consent.
_Avoid_: Asset, Risk, Item

**Vehicle**:
An Insurable Object that is a motor vehicle.

**Property**:
An Insurable Object that is real estate.

**Relationship**:
A typed edge between two nodes in a lead's graph, such as owns or married-to.
_Avoid_: Link, Edge, Association

### Attributes

**Attribute Definition**:
The typed declaration of one attribute for one entity type — its name, cardinality, category,
and type.
_Avoid_: Field-definition, Field, Attribute Schema, Profile Schema

**Attribute**:
A concrete attribute slot on a single node, defined from an Attribute Definition.
_Avoid_: Fact, Trait

**Attribute Revision**:
One recorded value of an Attribute, carrying its origin, verification status, and the Grant(s)
covering it.
_Avoid_: Claim, Value

### Source data

**Source**:
An external system of record that supplies data about parties or insurable objects. Specific
registers such as DMR or BBR are instances, not model vocabulary.
_Avoid_: Provider, Registry, Source-entity

**Source Binding**:
The definition of how one Source's data populates the attributes of one entity type.
_Avoid_: Source Mapping, Adapter, Connector

**Snapshot**:
A point-in-time, source-owned representation of what a single data source returned about a
node, contributing candidate values to its attributes.
_Avoid_: Source-entity, Source Record, Observation, Fact

### Consent

**Terms**:
A named, purpose-scoped document we author (e.g. marketing-outreach, data-enrichment) that a
Party is presented and may accept or reject.
_Avoid_: Agreement, Consent, Consent Document, Policy, Notice

**Terms Version**:
An immutable, semantically versioned edition of a Terms, carrying its per-language
translations and the set of permissions it grants.
_Avoid_: Version, Revision, Release

**Permission**:
A named entry in a seeded registry naming one thing we may do with a Party's data, such as
calling them or using their property data.
_Avoid_: Scope, Right, Capability

**Terms Response**:
A single, neutral act by a Party against one Terms Version — accepting, rejecting, or
withdrawing — recorded append-only.
_Avoid_: Consent, Consent Event, Terms Decision, Response

**Effective Permissions**:
The set of permissions currently in force for one lead, computed by folding together
everything that lawfully grants them.
_Avoid_: Permission Envelope, Permission Set, Consent Profile

**Legal Provision**:
A piece of legislation, cited by its statute and paragraphs, that grants a set of permissions
for a defined period.
_Avoid_: Statutory Grant, Legal Basis, Legal Ground, Exemption

**Objection**:
A Party's recorded, append-only act objecting to a Legal Provision, defeating that provision's
coverage for them (a GDPR Article 21 objection).
_Avoid_: Frabud, Opt-out, Withdrawal, Consent withdrawal

**Suppression Status**:
An external, per-subject status drawn from a source that suppresses a Permission — distinct from an
Objection, which is the Party's own will. Robinson is one instance, not model vocabulary.
_Avoid_: Suppression Signal, Opt-out, Block, Robinson, Objection

**Grant**:
The lawful reason covering a Permission for a lead — a reference to a Terms Response (consent)
or a Legal Provision (statute). A Permission may be covered by several at once.
_Avoid_: Basis, Ground, Justification

### The catalog

**Coverage**:
An authored, abstract insurance-cover concept — the atom our catalog composes and the shared
taxonomy in which a customer's current cover is expressed.
_Avoid_: Cover, Peril, Benefit, Dækning, Guarantee

**Product**:
A named, sellable composition of Coverages — each marked included or optional — that a
recommendation can point a lead at.
_Avoid_: Plan, Offering, Package, Policy

**Tier**:
A named, ordered preset selection over a Product's Coverages (e.g. Basis ⊂ Plus ⊂ Super) — a
packaging of that Product, not a separate Product.
_Avoid_: Variant, Level, Grade, Package

**Clause**:
A light, named textual rider on a Product — an authored provision that is not itself a Coverage.
_Avoid_: Klausul, Rider, Endorsement, Term

**Recommendation**:
A persistent, re-derived piece of lead state that points at a catalog entry (a Product,
Product + Tier, or Coverage) and carries a justification — always grounded in the catalog, never
invented.
_Avoid_: Suggestion, Advice, Proposal, Offer, Tip

**Carrier**:
The risk-bearing insurer on whose filed rating a price is based and on whose behalf cover would be
sold. A specific carrier is an instance, not model vocabulary.
_Avoid_: Insurer, Underwriter

### The call

**Call**:
A telephone session with a Party, consent-gated on the permission to call and transcribed into
Utterances that feed the lead graph.
_Avoid_: Phone Call, Session, Dialogue, Contact

**Utterance**:
A single transcribed unit of speech within a Call — the atomic input the AI reads to derive
values, and the unit the eval scripts.
_Avoid_: Turn, Segment, Message, Transcript line
