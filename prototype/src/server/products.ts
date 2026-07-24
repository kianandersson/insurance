// Live recommended products (ticket 07) — the payoff on screen. From the current graph values
// (AI-heard + faked source facts) derive a short list of products the platform recommends, each with
// a one-line Danish justification, and re-derive whenever the graph changes so recommendations
// visibly appear and shift during the call.
//
// FAKED like everything but the three real things: the catalog is a hardcoded fixture and selection
// is simple deterministic rules, NOT a model. Deterministic + instant + no flicker is exactly what a
// live, unassisted demo wants, and a rule can only ever pick a product that exists in the fixture
// (never invents one, per the ticket). "The AI recommends" reads on screen purely from products
// appearing as the conversation fills the graph.

import { getLead, type Lead, type RecommendedProduct, touchLead } from "./store.ts";

// First value on the graph whose key contains `substr` (lowercased). Prefers a source-tagged value
// (clean register data) over an AI-heard one, so reasons read well even from a lossy transcript.
function value(lead: Lead, substr: string): string | undefined {
  const matches = lead.attributes.filter((a) => a.key.toLowerCase().includes(substr));
  const preferred = matches.find((a) => a.provenance === "source") ?? matches[0];
  return preferred?.value;
}

function has(lead: Lead, substr: string): boolean {
  return lead.attributes.some((a) => a.key.toLowerCase().includes(substr));
}

interface ProductRule {
  id: string;
  name: string;
  applies: (lead: Lead) => boolean;
  reason: (lead: Lead) => string;
}

// Hardcoded catalog. Rules key off the same trigger words the sources do (address / plate / cvr)
// plus person/family attributes, so the golden path lights products up predictably. Array order is
// display order.
const CATALOG: ProductRule[] = [
  {
    id: "bilforsikring",
    name: "Bilforsikring (kasko)",
    applies: (l) => has(l, "vehicle"),
    reason: (l) => {
      const car = [value(l, "vehicle.make"), value(l, "vehicle.model")].filter(Boolean).join(" ");
      const year = value(l, "vehicle.year");
      const desc = car ? `${car}${year ? ` (${year})` : ""}` : "en bil";
      return `Kunden har ${desc} — tilbyd kasko oven på lovpligtig ansvar.`;
    },
  },
  {
    id: "indboforsikring",
    name: "Indboforsikring",
    applies: (l) => has(l, "home.address") || has(l, "home.type"),
    reason: (l) => {
      const type = value(l, "home.type");
      return `Kunden bor i ${type ?? "egen bolig"} — indbo er ikke dækket uden separat police.`;
    },
  },
  {
    id: "husforsikring",
    name: "Husforsikring (bygning)",
    applies: (l) =>
      (value(l, "home.ownership")?.toLowerCase().includes("ejer") ?? false) ||
      ["hus", "villa", "parcel"].some((t) =>
        (value(l, "home.type")?.toLowerCase() ?? "").includes(t),
      ),
    reason: (l) => {
      const m2 = value(l, "home.size_m2");
      const built = value(l, "home.year_built");
      const bits = [m2 && `${m2} m²`, built && `opført ${built}`].filter(Boolean).join(", ");
      return `Ejerbolig${bits ? ` (${bits})` : ""} kræver en bygningsforsikring.`;
    },
  },
  {
    id: "boerneforsikring",
    name: "Børneforsikring",
    applies: (l) => {
      const kids = value(l, "family.children");
      return kids !== undefined && !/^(0|nej|ingen|nul)/i.test(kids.trim());
    },
    reason: (l) => `Familien har børn (${value(l, "family.children")}) — børneulykke dækker fritid og skole.`,
  },
  {
    id: "ulykkesforsikring",
    name: "Ulykkesforsikring",
    applies: (l) => has(l, "person.age"),
    reason: (l) => {
      const age = value(l, "person.age");
      return `Personlig ulykkesforsikring anbefales${age ? ` (alder ${age})` : ""}.`;
    },
  },
  {
    id: "dyreforsikring",
    name: "Dyreforsikring",
    applies: (l) => has(l, "pet"),
    reason: (l) => `Kunden har ${value(l, "pet.type") ?? "et kæledyr"} — syge-/ulykkesdækning for dyret.`,
  },
  {
    id: "erhvervsforsikring",
    name: "Erhvervsforsikring",
    applies: (l) =>
      (l.segment?.toLowerCase().includes("business") ?? false) || has(l, "cvr") || has(l, "company"),
    reason: (l) => {
      const name = value(l, "company.name");
      const industry = value(l, "company.industry");
      const emp = value(l, "company.employees");
      const desc = [name, industry?.toLowerCase(), emp && `${emp} ansatte`]
        .filter(Boolean)
        .join(", ");
      return `Virksomhed${desc ? ` (${desc})` : ""} — erhvervsansvar og arbejdsskade.`;
    },
  },
];

// Recompute the whole recommendation list from the current graph and, only if it changed, write it
// back and push one SSE update. Full idempotent recompute (not a fire-once guard) is what makes the
// list re-derive live as the conversation fills — and shrink again if a value is corrected away.
export function deriveProducts(leadId: string): void {
  const lead = getLead(leadId);
  if (!lead) return;

  const next: RecommendedProduct[] = CATALOG.filter((rule) => rule.applies(lead)).map((rule) => ({
    id: rule.id,
    name: rule.name,
    reason: rule.reason(lead),
  }));

  if (serialize(next) === serialize(lead.products)) return; // no change — no needless SSE churn
  lead.products = next;
  touchLead(lead);
}

function serialize(products: RecommendedProduct[]): string {
  return JSON.stringify(products.map((p) => [p.id, p.name, p.reason]));
}
