// Single long-running Bun + TypeScript server: serves the built React client (static),
// the JSON API, and the SSE stream — one process, in-memory state. No serverless, no database.
// Twilio's TwiML + transcription webhooks (ticket 04) will hang off this same server.

import { join, normalize } from "node:path";
import { checkPassword, clearCookie, isAuthed, mintCookie } from "./auth.ts";
import { createLead, getLead, listLeads, subscribe, type StoreEvent } from "./store.ts";

const PORT = Number(process.env.PORT ?? 3000);
const DIST = join(import.meta.dir, "../../dist");

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

async function serveStatic(pathname: string): Promise<Response | null> {
  // SPA static assets only. Prevent path traversal by normalising under DIST.
  const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const file = Bun.file(join(DIST, rel));
  return (await file.exists()) ? new Response(file) : null;
}

async function handleApi(req: Request, pathname: string): Promise<Response> {
  // --- public auth endpoints ---
  if (pathname === "/api/login" && req.method === "POST") {
    const { password } = (await req.json().catch(() => ({}))) as { password?: string };
    if (!password || !checkPassword(password)) {
      return json({ ok: false, error: "wrong password" }, { status: 401 });
    }
    return json({ ok: true }, { headers: { "set-cookie": await mintCookie() } });
  }
  if (pathname === "/api/logout" && req.method === "POST") {
    return json({ ok: true }, { headers: { "set-cookie": clearCookie() } });
  }
  if (pathname === "/api/me") {
    return json({ authed: await isAuthed(req) });
  }

  // --- everything below requires auth ---
  if (!(await isAuthed(req))) return json({ error: "unauthorized" }, { status: 401 });

  if (pathname === "/api/leads" && req.method === "GET") {
    return json({ leads: listLeads() });
  }
  if (pathname === "/api/leads" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      phone?: string;
      segment?: string;
    };
    if (!body.name || !body.phone) {
      return json({ error: "name and phone are required" }, { status: 400 });
    }
    return json({ lead: createLead({ name: body.name, phone: body.phone, segment: body.segment }) });
  }
  const leadMatch = pathname.match(/^\/api\/leads\/([^/]+)$/);
  if (leadMatch && req.method === "GET") {
    const lead = getLead(leadMatch[1]);
    return lead ? json({ lead }) : json({ error: "not found" }, { status: 404 });
  }

  return json({ error: "not found" }, { status: 404 });
}

function sseStream(): Response {
  const enc = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: StoreEvent | { type: "ping" }) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      send({ type: "hello", at: Date.now() });
      unsubscribe = subscribe(send);
      heartbeat = setInterval(() => {
        try {
          send({ type: "ping" });
        } catch {
          /* client gone */
        }
      }, 15000);
    },
    cancel() {
      unsubscribe();
      clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

const server = Bun.serve({
  port: PORT,
  idleTimeout: 0, // keep SSE connections open
  async fetch(req) {
    const { pathname } = new URL(req.url);

    if (pathname.startsWith("/api/")) return handleApi(req, pathname);

    if (pathname === "/events") {
      if (!(await isAuthed(req))) return json({ error: "unauthorized" }, { status: 401 });
      return sseStream();
    }

    // Static assets (built JS/CSS). These are public so the login page can load.
    if (pathname !== "/" && !pathname.endsWith("/")) {
      const asset = await serveStatic(pathname);
      if (asset) return asset;
    }

    // SPA fallback: the React app decides login vs. home from /api/me.
    return new Response(Bun.file(join(DIST, "index.html")), {
      headers: { "content-type": "text/html" },
    });
  },
});

console.log(`live-call-demo listening on http://localhost:${server.port}`);
