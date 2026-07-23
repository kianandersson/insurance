# Internal client–server seam is Effect end-to-end, real-time-first

The seam between the seller's React app and the backend is one deliberate contract, not a by-product
of other decisions. It is **Effect** end-to-end and designed real-time-first — a live subscription is
a typed stream in the *same* contract as ordinary calls — with the browser deliberately sharing the
backend's Effect stack. External boundaries (the public intake API and the telephony token/webhook
endpoints) are edge adapters and do **not** participate in this internal contract.

## Decision

- **One internal contract, Effect end-to-end.** A single schema language spans unary calls, streams,
  and validation; errors are typed; there is no codegen — the client types are *derived from* the
  single server-side source of truth, never hand-duplicated. Effect is deliberately in the browser: a
  chosen end-to-end stack, not a backend concern leaking across the seam.

- **Real-time is first-class.** A subscription is a typed stream of graph updates in the same contract
  as ordinary calls. The live projection is the transport binding of the graph module's
  read-and-subscribe port: the seam subscribes to the port and streams the projection's
  snapshots and deltas to the browser. The remaining seller-app operations are unary calls.
  Consent-driven purging is triggered by consent events, not by a client call, so it is not a
  seller-app endpoint.

- **Transport is a default, not a wall.** Ordinary request/response calls travel over plain HTTP —
  inspectable, cacheable, standard middleware and observability — while streams ride the long-lived
  server→browser socket. Because the contract is transport-agnostic, a given unary call may instead
  ride the already-open socket where caching is irrelevant; that is per-call tuning latitude, not a
  re-decision, and the unified model (subscription-as-stream, one schema language) holds either way.

- **Edges are translated adapters, not part of the contract.** The public intake API and the
  telephony token/webhook endpoints have externally dictated shapes; they are translated to the
  domain at the edge, exactly like the data-source adapters, so an external shape never leaks into how
  the platform talks to itself. Responsibility resolved at the edge — the actor-at-the-edge model — is
  passed explicitly into modules, so modules never read cookies; on the socket it is resolved at
  connection upgrade.

## Considered alternatives

- **tRPC** — a parallel world to Effect, with its own validation and the weakest subscription story.
  Rejected because real-time is the core loop and the stack already holds Effect.

- **GraphQL** — mature real-time, but heavy resolver infrastructure and a second schema language for a
  single, owned client. Kept only as a future escape hatch: it may be added later *iff* external,
  non-TypeScript consumers appear — not an internal necessity now.

- **REST/OpenAPI** — codegen boilerplate and a duplicated type surface across the seam.

Within Effect, the streaming-RPC layer was preferred over the plain HTTP-API layer as the cleaner
real-time fit — a refinement of the choice, not its crux.

## Why record this

Effect in the browser and a bespoke, TypeScript-tight contract look — without this context — like a
backend concern leaking across the seam, or an eccentric refusal of REST and GraphQL. They are
neither: the internal seam has exactly one owned client and no external consumers, which is precisely
what makes a codegen-free, real-time-first Effect contract the right call, and what makes it costly to
reverse once the client is derived from it. Recording this stops a later reader from "fixing" the seam
back to REST, or bolting a websocket onto a request/response design instead of treating a subscription
as a first-class stream.
