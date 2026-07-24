# Live Call Demo — throwaway prototype

A **throwaway** prototype (map: `.scratch/prototype/map.md`). Not under the POC's
`CONTRIBUTING.md` contract — one branch (`prototype/live-call-demo`), direct commits, no PRs,
no tests, hardcode freely. Code quality is explicitly irrelevant.

Single long-running **Bun + TypeScript** server serving a **React (Vite)** front, a JSON API, and
an **SSE** stream. State is an in-memory module (`src/server/store.ts`) — no database.

## Run locally

```sh
cd prototype
bun install
cp .env.example .env      # set DEMO_PASSWORD
bun run dev               # builds the client, then starts the server on :3000
```

Open http://localhost:3000, enter the access code (`DEMO_PASSWORD`), land on the empty home screen.

During UI work you can instead run Vite's dev server with HMR in one terminal (`bunx vite`,
serves :5173 and proxies `/api` + `/events` to :3000) and `bun run start` in another.

## Layout

- `src/server/index.ts` — the server: static client, `/api/*`, `/events` (SSE). Twilio webhooks
  land here from ticket 04.
- `src/server/auth.ts` — one shared password → HMAC-signed cookie. No users/sessions.
- `src/server/store.ts` — in-memory lead graph + SSE broadcast. The shape everything hangs off.
- `src/client/` — React app: login gate → home screen, wired to the SSE stream.

## Deploy (get the public HTTPS URL)

Twilio webhooks (ticket 04) need a public URL, and the stakeholder opens it. Any container host
works via the `Dockerfile` (binds `PORT`). Fastest path — **Railway**:

```sh
# one-time, interactive (run these yourself):
brew install railway            # or: npm i -g @railway/cli
railway login
railway init                    # create/link a project
railway up                      # build & deploy the Dockerfile
```

Then in the Railway dashboard set env vars **`DEMO_PASSWORD`** and **`SESSION_SECRET`**, and grab
the generated public HTTPS URL — that is the invite URL. (Render/Fly work the same way from the
Dockerfile.)
