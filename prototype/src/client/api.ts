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
}

export interface Utterance {
  id: string;
  speaker: "customer" | "agent" | "system";
  text: string;
  at: number;
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
  name: string;
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
