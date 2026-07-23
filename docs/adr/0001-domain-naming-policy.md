# Domain naming policy

To keep a shared, precise language across a codebase built largely by agents, every domain word
is either a **ratified term** or **plain prose** — there is no third category. This ADR records how
we name things and, just as importantly, what non-implementing artifacts may *not* presuppose.

## Decision

- **Ratified terms live in `CONTEXT.md`.** It is an opinionated glossary: one canonical word per
  concept, the alternatives listed under `_Avoid_`, and definitions that say what a thing *is*, not
  what it does. When several words compete, we pick one and retire the rest. `CONTEXT.md` is a
  glossary and nothing else — no mechanics, no implementation, no spec.

- **Everything else is prose.** A word that is not a ratified term is written as ordinary prose. We
  do not create a middle tier of half-blessed vocabulary.

- **Non-implementing artifacts must not dictate implementation.** Specs, tickets, and maps describe
  *what* and *why* in prose and ratified terms. They must **not** invent code-shaped identifiers —
  type names, string keys, method or function signatures, ID schemes — nor presuppose database
  structures (tables, columns, storage shapes). Those are decisions the implementing agent makes
  against the real code and its standards; a planning artifact that pre-commits them is guessing on
  the implementer's behalf and tends to railroad the eventual code. If a concept matters, name it as
  a ratified term or describe it in prose; leave the encoding to the code.

- **Market specifics are data, not vocabulary.** This is a market-agnostic platform. Denmark is the
  first configured market; its registers, statutes, and product types are configuration and data,
  never model vocabulary.

## Why record this

The policy is a cross-cutting constraint that is invisible in any single file, surprising to a
reader who has not seen it, and binding on every future contributor — human or agent. Without it,
each new artifact re-litigates naming and quietly hard-codes premature identifiers and schemas into
prose that later reads as settled design.
