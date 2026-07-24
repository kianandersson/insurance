// Thin client for the Bun server's JSON API + SSE stream.

export interface Lead {
  id: string;
  name: string;
  phone: string;
  segment?: string;
  createdAt: number;
  attributes: unknown[];
  utterances: unknown[];
  products: unknown[];
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

// Subscribe to the server-pushed event stream. Returns an unsubscribe fn.
export function subscribeEvents(onEvent: (event: { type: string } & Record<string, unknown>) => void): () => void {
  const source = new EventSource("/events");
  source.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* ignore malformed frame */
    }
  };
  return () => source.close();
}
