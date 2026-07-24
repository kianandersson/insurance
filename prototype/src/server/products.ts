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

// Danish-formatted number → integer ("184.000" → 184000, "148 m²" → 148). Dots are thousands
// separators here, so strip everything that isn't a digit. Returns undefined when there's no number.
function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Monthly premium, rounded to the nearest 10 kr so it reads like a real quote.
function perMonth(dkk: number): string {
  return `${(Math.round(dkk / 10) * 10).toLocaleString("da-DK")} kr./md.`;
}

interface ProductRule {
  id: string;
  name: string;
  applies: (lead: Lead) => boolean;
  reason: (lead: Lead) => string;
  coverage: string; // what the policy covers
  excess: string; // selvrisiko
  price: (lead: Lead) => string; // indicative premium — scales off graph values where natural
}

// Hardcoded catalog. Rules key off the same trigger words the sources do (address / plate / cvr)
// plus person/family attributes, so the golden path lights products up predictably. Array order is
// display order. Prices scale off graph values (car value from DMR, m² from BBR, children, staff)
// where it's natural, so a quote visibly firms up as sources land — otherwise an indicative "fra".
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
    coverage: "Kasko + lovpligtig ansvar, glasskade, vejhjælp",
    excess: "5.000 kr.",
    // ~4 %/år af bilens værdi, ellers en indikativ startpris.
    price: (l) => {
      const val = num(value(l, "vehicle.value_dkk"));
      return val ? perMonth((val * 0.04) / 12) : "fra 449 kr./md.";
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
    coverage: "Indbo, tyveri, brand & vandskade + privatansvar",
    excess: "1.500 kr.",
    price: () => "159 kr./md.",
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
    coverage: "Bygningsskade, brand, storm, svamp & insekt, rørskade",
    excess: "4.000 kr.",
    // Skalerer med boligens areal (BBR), ellers indikativ.
    price: (l) => {
      const m2 = num(value(l, "home.size_m2"));
      return m2 ? perMonth(250 + m2 * 1.2) : "fra 349 kr./md.";
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
    coverage: "Barnets ulykke, invaliditet & kritisk sygdom",
    excess: "0 kr.",
    // 129 kr. pr. barn.
    price: (l) => perMonth(129 * (num(value(l, "family.children")) ?? 1)),
  },
  {
    id: "ulykkesforsikring",
    name: "Ulykkesforsikring",
    applies: (l) => has(l, "person.age"),
    reason: (l) => {
      const age = value(l, "person.age");
      return `Personlig ulykkesforsikring anbefales${age ? ` (alder ${age})` : ""}.`;
    },
    coverage: "Ulykke, méngodtgørelse, tandskade",
    excess: "0 kr.",
    price: () => "119 kr./md.",
  },
  {
    id: "dyreforsikring",
    name: "Dyreforsikring",
    applies: (l) => has(l, "pet"),
    reason: (l) => `Kunden har ${value(l, "pet.type") ?? "et kæledyr"} — syge-/ulykkesdækning for dyret.`,
    coverage: "Dyrlæge ved sygdom & ulykke, medicin, operation",
    excess: "1.000 kr.",
    price: () => "289 kr./md.",
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
    coverage: "Erhvervsansvar, arbejdsskade, produktansvar",
    excess: "6.000 kr.",
    // Skalerer med antal ansatte (CVR), ellers indikativ.
    price: (l) => {
      const emp = num(value(l, "company.employees"));
      return emp ? perMonth(400 + emp * 90) : "fra 899 kr./md.";
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
    coverage: rule.coverage,
    price: rule.price(lead),
    excess: rule.excess,
  }));

  if (serialize(next) === serialize(lead.products)) return; // no change — no needless SSE churn
  lead.products = next;
  touchLead(lead);
}

function serialize(products: RecommendedProduct[]): string {
  // Include every rendered field so a firmed-up price (source value landed) also pushes an update.
  return JSON.stringify(
    products.map((p) => [p.id, p.name, p.reason, p.coverage, p.price, p.excess]),
  );
}
