// Single long-running Bun + TypeScript server: serves the built React client (static),
// the JSON API, and the SSE stream — one process, in-memory state. No serverless, no database.
// Twilio's TwiML + transcription webhooks (ticket 04) will hang off this same server.

import { join, normalize } from "node:path";
import { checkPassword, clearCookie, isAuthed, mintCookie } from "./auth.ts";
import { ingestUtterance } from "./ingest.ts";
import { createLead, getLead, listLeads, subscribe, type StoreEvent } from "./store.ts";
import {
  mintVoiceToken,
  outgoingTwiml,
  parseTranscription,
  placeCall,
  toE164,
  voiceTwiml,
} from "./twilio.ts";

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

  // The Utterance seam: typed-text composer (ticket 05) and, later, Twilio's transcription
  // webhook (ticket 04) both funnel here. Responds immediately; extraction fills the graph async.
  const utterMatch = pathname.match(/^\/api\/leads\/([^/]+)\/utterances$/);
  if (utterMatch && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { speaker?: string; text?: string };
    if (!body.text?.trim()) return json({ error: "text is required" }, { status: 400 });
    const speaker =
      body.speaker === "agent" ? "agent" : body.speaker === "system" ? "system" : "customer";
    const { utterance } = ingestUtterance(utterMatch[1], { speaker, text: body.text });
    return utterance ? json({ utterance }) : json({ error: "not found" }, { status: 404 });
  }

  // Mint a Voice AccessToken for the browser softphone (ticket 10). The lead screen fetches this,
  // then creates a Twilio Device and connects — bridging the seller's browser to the customer.
  if (pathname === "/api/voice-token" && req.method === "GET") {
    try {
      return json({ token: mintVoiceToken("seller") });
    } catch (err) {
      const message = err instanceof Error ? err.message : "token failed";
      console.error("[voice-token]", message);
      return json({ error: message }, { status: 500 });
    }
  }

  // Place the real outbound Twilio call to this lead (ticket 04 — DORMANT solo path, superseded by
  // the ticket 10 softphone). Kept behind the API but no longer wired to the Call button.
  const callMatch = pathname.match(/^\/api\/leads\/([^/]+)\/call$/);
  if (callMatch && req.method === "POST") {
    const lead = getLead(callMatch[1]);
    if (!lead) return json({ error: "not found" }, { status: 404 });
    try {
      const { sid } = await placeCall(lead);
      // A system line in the transcript so any viewer sees the call was placed (skipped by
      // extraction — see ingest.ts). The real speech arrives via the transcription webhook.
      ingestUtterance(lead.id, {
        speaker: "system",
        text: `Call started to ${lead.name} (${toE164(lead.phone)}).`,
      });
      return json({ ok: true, callSid: sid });
    } catch (err) {
      const message = err instanceof Error ? err.message : "call failed";
      console.error(`[call] lead ${lead.id}:`, message);
      return json({ ok: false, error: message }, { status: 502 });
    }
  }

  return json({ error: "not found" }, { status: 404 });
}

// Per-lead set of transcription SequenceIds already ingested — Twilio may retry a webhook, and
// finals must not double-post onto the transcript. In-memory, like everything else here.
const seenSequences = new Map<string, Set<string>>();
function firstSeen(leadId: string, sequenceId: string): boolean {
  let set = seenSequences.get(leadId);
  if (!set) {
    set = new Set();
    seenSequences.set(leadId, set);
  }
  if (sequenceId && set.has(sequenceId)) return false;
  if (sequenceId) set.add(sequenceId);
  return true;
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
    const url = new URL(req.url);
    const { pathname } = url;

    // --- Twilio-facing endpoints (PUBLIC: Twilio's servers call these; no cookie to gate on) ---

    // TwiML Twilio fetches when the lead answers. Twilio POSTs by default, but tolerate GET too.
    if (pathname === "/twiml/voice") {
      const leadId = url.searchParams.get("leadId") ?? "";
      const base = process.env.PUBLIC_BASE_URL ?? `https://${req.headers.get("host") ?? ""}`;
      return new Response(voiceTwiml(leadId, base), {
        headers: { "content-type": "text/xml" },
      });
    }

    // The browser softphone's TwiML (ticket 10). When the seller's Device calls connect(), Twilio
    // fetches this (via the TwiML App) with the `To` + `leadId` params the Device passed. We bridge
    // the browser to the customer's number — no robot voice. (Ticket 11 hangs transcription here.)
    if (pathname === "/twiml/outgoing") {
      const form = new URLSearchParams(
        req.method === "POST" ? await req.text() : url.searchParams.toString(),
      );
      const to = form.get("To") ?? "";
      const leadId = form.get("leadId") ?? "";
      const from = process.env.TWILIO_FROM_NUMBER ?? "";
      return new Response(outgoingTwiml(to, leadId, from), {
        headers: { "content-type": "text/xml" },
      });
    }

    // The live transcription feed: each Final:true event → one normalized Utterance on the seam.
    if (pathname === "/twilio/transcription" && req.method === "POST") {
      const leadId = url.searchParams.get("leadId") ?? "";
      const form = new URLSearchParams(await req.text());
      const ev = parseTranscription(form);
      if (ev.isContent && ev.isFinal && ev.transcript && firstSeen(leadId, ev.sequenceId)) {
        ingestUtterance(leadId, { speaker: ev.speaker, text: ev.transcript });
      }
      return new Response(null, { status: 204 }); // ack fast; the copilot work is already async
    }

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
