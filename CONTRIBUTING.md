# Contributing

This is the canonical process and code contract for this repository. It binds every
contributor equally — human or AI agent. It describes principles, not tooling: no commands,
no scripts. The platform is git and GitHub.

## Workflow & pull requests

- `main` is protected and always release-ready.
- Work happens on a short-lived branch — one focused change per pull request.
- Never push directly to `main`; changes land only through a pull request.
- An agent never self-merges. A human reviews, approves, and merges.
- A pull request must be green before it can merge.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org).
- A pull request explains what it changes and why, so it can be reviewed without digging.

## Definition of done

A change is ready to merge only when all of the following hold:

- Type checking is clean.
- Linting and formatting are clean.
- All tests pass.
- New behaviour is covered by tests.
- No unrelated changes are bundled in.
- No secrets or credentials are committed.
- Documentation touched by the change (`CONTEXT.md`, `docs/adr/`, spec) is updated.
- It uses the domain vocabulary from `CONTEXT.md` and never drifts to the rejected synonyms.

## Code standards

### Testing

- Verify behaviour through the public interface, not implementation details.
- Mock only at system boundaries (external APIs, time, randomness) — never your own modules.
- Work in vertical slices: one test, one implementation, repeat. Get to green before refactoring.
- Don't write trivial tests that merely mirror the code — they add no confidence and break on any refactor.

### Interface design

- Read the surrounding code first; reuse what exists and match its style rather than reinventing it.
- Prefer deep modules: a small interface hiding a deep implementation.
- Design for testability: accept dependencies rather than constructing them, and return results
  rather than producing side effects.

### Naming

- Name by role — what something is or does — not by appearance.
- Be predictable over clever: a guessable name beats a cleverly abbreviated one.
- A variant is a prop, not a new component.
- Casing: `PascalCase` for components, `camelCase` for utilities and hooks. Hooks start with
  `use`; booleans read as `is` / `has` / `can`; handlers as `on` / `handle`.
- One file, one responsibility.

### Comments

- A comment is a last resort. If you reach for one, first rewrite the code so it explains itself.
- The rare legitimate comment explains *why* — an unobvious constraint or decision — never *what*
  the code already says.
- No comments that restate the code, no commented-out code, no narrating what a change did.
