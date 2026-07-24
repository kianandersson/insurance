// Thin client for the Bun server's JSON API + SSE stream.
// Types mirror src/server/store.ts — the in-memory shape later tickets push into.

export type Provenance = "ai-heard" | "source" | "user";

export interface AttributeValue {
  key: string;
  value: string;
  provenance: Provenance;
  sourceName?: string;
  verified: boolean;
  at: number;
}

export interface RecommendedProduct {
  id: string;
  name: string;
  reason: string;
  coverage: string;
  price: string;
  excess: string;
}

export interface Utterance {
  id: string;
  speaker: "customer" | "agent" | "system";
  text: string;
  at: number;
  callId: string; // groups utterances into calls (Twilio CallSid, or "manual" for typed input)
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  segment?: string;
  createdAt: number;
  attributes: AttributeValue[];
  utterances: Utterance[];
  products: RecommendedProduct[];
}

export type StoreEvent =
  | { type: "hello"; at: number }
  | { type: "lead:created"; lead: Lead }
  | { type: "lead:updated"; lead: Lead }
  | { type: "ping" };

// A cold call starts from a phone number, not a name — the header/list fall back to the phone
// (or a last-resort placeholder) until extraction hears a name and promotes it.
export function leadDisplayName(lead: { name: string; phone: string }): string {
  return lead.name.trim() || lead.phone.trim() || "Ukendt lead";
}

export async function getMe(): Promise<boolean> {
  const res = await fetch("/api/me");
  const data = (await res.json()) as { authed: boolean };
  return data.authed;
}

export async function login(password: string): Promise<boolean> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST" });
}

export async function listLeads(): Promise<Lead[]> {
  const res = await fetch("/api/leads");
  if (!res.ok) return [];
  const data = (await res.json()) as { leads: Lead[] };
  return data.leads;
}

export async function getLead(id: string): Promise<Lead | null> {
  const res = await fetch(`/api/leads/${id}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { lead: Lead };
  return data.lead;
}

export async function createLead(input: {
  name?: string;
  phone: string;
  segment?: string;
}): Promise<Lead | null> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lead: Lead };
  return data.lead;
}

// Feed one utterance into the seam (typed-text stand-in for the live call). The graph fills
// from the server-pushed lead:updated events, so there's nothing to read back here.
export async function postUtterance(
  leadId: string,
  input: { speaker: "customer" | "agent"; text: string },
): Promise<boolean> {
  const res = await fetch(`/api/leads/${leadId}/utterances`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}

// Place the real outbound Twilio call to this lead. The transcript + graph then fill live via
// the SSE stream, so there's nothing to read back beyond whether the call was accepted.
export async function startCall(leadId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/leads/${leadId}/call`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  return { ok: res.ok && data.ok !== false, error: data.error };
}

// Fetch a Twilio Voice AccessToken for the browser softphone (ticket 10). The Device is created
// from this; null means Voice isn't configured (or the mint failed) — the CallBar shows the error.
export async function getVoiceToken(): Promise<string | null> {
  const res = await fetch("/api/voice-token");
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { token?: string };
  return data.token ?? null;
}

// Client-side twin of the server's toE164 (throwaway: duplicated rather than shared). The browser
// passes the dialed number to device.connect(), so it normalizes the lead's stored phone here.
export function toE164(raw: string): string {
  const s = raw.replace(/[^\d+]/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return `+${s.slice(2)}`;
  if (/^\d{8}$/.test(s)) return `+45${s}`;
  return s;
}

// Subscribe to the server-pushed event stream. Returns an unsubscribe fn.
export function subscribeEvents(onEvent: (event: StoreEvent) => void): () => void {
  const source = new EventSource("/events");
  source.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data) as StoreEvent);
    } catch {
      /* ignore malformed frame */
    }
  };
  return () => source.close();
}
