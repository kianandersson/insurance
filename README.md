# Insurance Platform

A general insurance intermediation platform. Its capabilities grow feature by feature; the
first is working a sales lead from prospect to recommendation.

## Layout

- `apps/` — deployable applications
- `packages/` — shared libraries
- `CONTEXT.md` — the domain model and the language we hold ourselves to
- `docs/adr/` — the decisions that got us here

## Development

Prerequisites: Node 24+ (`.nvmrc`), pnpm, and Docker.

```sh
pnpm install
docker compose up -d postgres          # local Postgres for dev
cp .env.example .env                    # DATABASE_URL + PORT

pnpm --filter @insurance/server dev     # the core app on :3000
pnpm --filter @insurance/client start   # exercise the seam against it
```

Quality gates, each also run in CI:

```sh
pnpm typecheck
pnpm lint
pnpm test
```

The whole stack — core app plus Postgres — also runs as containers with `docker compose up --build`. The app serves plain HTTP; in production the hosting platform's edge terminates TLS in front of it (managed HTTPS, vendor deferred).

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. It is the process and code contract for every
contributor, human or agent.
