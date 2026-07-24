// In-memory "persistence" for the throwaway demo. A module global — no database.
// Everything the live screen renders hangs off this shape. Later tickets (04 transcription,
// 05 AI extraction, 06 sources, 07 products) push values onto a lead and broadcast an event;
// the client re-renders from the pushed state.

export type Provenance = "ai-heard" | "source" | "user";

export interface AttributeValue {
  key: string; // e.g. "vehicle.plate", "home.address"
  value: string;
  provenance: Provenance;
  sourceName?: string; // set when provenance === "source"
  verified: boolean; // AI-heard values arrive not-yet-verified
  at: number;
}

export interface RecommendedProduct {
  id: string;
  name: string;
  reason: string; // why it surfaced — the trigger, in the customer's own terms
  coverage: string; // what the policy covers, short
  price: string; // indicative monthly premium, e.g. "499 kr./md."
  excess: string; // selvrisiko, e.g. "5.000 kr."
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

const leads = new Map<string, Lead>();

// ---- SSE broadcast --------------------------------------------------------

export type StoreEvent =
  | { type: "hello"; at: number }
  | { type: "lead:created"; lead: Lead }
  | { type: "lead:updated"; lead: Lead };

type Subscriber = (event: StoreEvent) => void;
const subscribers = new Set<Subscriber>();

export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function broadcast(event: StoreEvent): void {
  for (const fn of subscribers) fn(event);
}

// ---- Operations -----------------------------------------------------------

export function listLeads(): Lead[] {
  return [...leads.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function getLead(id: string): Lead | undefined {
  return leads.get(id);
}

export function createLead(input: { name?: string; phone: string; segment?: string }): Lead {
  const lead: Lead = {
    id: crypto.randomUUID(),
    name: (input.name ?? "").trim(), // a cold call starts from a phone; name fills in once heard

    phone: input.phone.trim(),
    segment: input.segment?.trim() || undefined,
    createdAt: Date.now(),
    attributes: [],
    utterances: [],
    products: [],
  };
  leads.set(lead.id, lead);
  broadcast({ type: "lead:created", lead });
  return lead;
}

// Emit a lead:updated after a caller has mutated a lead in place.
export function touchLead(lead: Lead): void {
  broadcast({ type: "lead:updated", lead });
}
