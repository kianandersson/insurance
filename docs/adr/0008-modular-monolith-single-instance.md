# A modular monolith with real port seams and a single in-process event bus

The platform ships as one deployable whole, internally split into modules that talk only through
ports, so it can later split along those seams into services. The POC runs as a single instance with
an in-process event bus, and communicates by events only where decoupling is genuine — by direct
calls where the relationship is synchronous and local.

## Decision

- **One deployable whole; the seams are real ports from day one.** The platform is a single
  deployable process, split internally into modules — lead/intake, graph, enrichment, consent,
  copilot, telephony, insurance-domain, audit — each reached only through a port, with nothing outside
  a module touching its stores. The seam discipline is paid now in exchange for the option to lift any
  module into its own service later without a rewrite. This is deliberately neither a quick POC wired
  with direct cross-module coupling, nor microservices stood up before the seams are proven.

- **A single instance with an in-process event bus.** In the POC the whole runs as one instance, and
  modules that decouple communicate over an in-process event bus. Multi-instance operation was raised
  and deferred as post-POC: several other decisions rest on the single-instance premise — one browser
  socket on one instance, the audit subscriber, and the copilot subscribers all assume it. On a later
  service split the same event contract becomes a durable cross-service stream, so the subscribers
  move rather than being rewritten.

- **Event-driven only where decoupling is genuine.** Modules talk by events where there is real
  asynchrony or decoupling — a value change fanning out to enrichment, the audit log, and the live
  projection — and by direct calls where the relationship is synchronous and local. We deliberately do
  not event-source everything; events are the tool for decoupling, not a uniform house style.

## Considered alternatives

- **Microservices up front** — rejected: real infrastructure and operational cost for a POC, and a
  premature split before the module seams have been proven in one process.

- **A plain monolith with direct cross-module calls** — rejected: it forecloses the later split and
  undercuts the event-driven core loop (transcription to graph to live view), which is the product's
  center of gravity, not an afterthought to be retrofitted.

## Why record this

The obvious reading of "modular monolith" is a convenient POC to be tidied into services someday. The
decision here is stricter on three points that later readers tend to undo: the seams are enforced
ports from the first commit; the single-instance, in-process bus is a deliberate substrate that other
decisions depend on; and event-driven is applied selectively, not everywhere. Without this record, a
reader might "simplify" by letting modules reach into each other's internals (collapsing the
split-later option), "modernize" by pushing everything onto the bus (paying event-sourcing cost with
no decoupling benefit), or assume multi-instance is safe (breaking the one-socket and single-
subscriber assumptions).
