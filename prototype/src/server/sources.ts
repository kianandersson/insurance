// Fake "source enrichment" — one of the FAKED things (ticket 06). No real registers, no adapters,
// no permissions, no Effective-Permissions gating (that's the POC's job). When a trigger value
// lands on the graph — an address, a licence plate, a CVR number — a fake lookup fires and, after a
// short delay, streams hardcoded source-tagged facts onto the lead. On screen the stakeholder sees
// "data coming in from the registers", visibly agreeing/overlapping with what the AI heard.
//
// Deliberately keyed off the *presence* of a trigger key, not its exact (lossy) value — a garbled
// Danish address still fires the property lookup, so the demo can't be broken by transcription WER.

import { deriveProducts } from "./products.ts";
import { getLead, touchLead } from "./store.ts";

interface SourceFact {
  key: string;
  value: string;
}

interface Enricher {
  // Fires when any attribute key matches (substring, lowercased) — tolerant of AI key variance.
  match: string;
  sourceName: string;
  facts: SourceFact[];
}

// Hardcoded fixtures. Values are plausible Danish register data; nothing here is looked up.
const ENRICHERS: Enricher[] = [
  {
    match: "address",
    sourceName: "BBR – Bygnings- og Boligregister",
    facts: [
      { key: "home.type", value: "Parcelhus" },
      { key: "home.ownership", value: "Ejerbolig" },
      { key: "home.size_m2", value: "148" },
      { key: "home.year_built", value: "1962" },
      { key: "home.roof", value: "Tegl" },
      { key: "home.value_dkk", value: "3.850.000" },
    ],
  },
  {
    match: "plate",
    sourceName: "Motorregisteret – DMR",
    facts: [
      { key: "vehicle.make", value: "Volkswagen" },
      { key: "vehicle.model", value: "Passat Variant" },
      { key: "vehicle.year", value: "2019" },
      { key: "vehicle.fuel", value: "Diesel" },
      { key: "vehicle.first_registration", value: "14-03-2019" },
      { key: "vehicle.value_dkk", value: "184.000" },
    ],
  },
  {
    match: "cvr",
    sourceName: "CVR – Det Centrale Virksomhedsregister",
    facts: [
      { key: "company.name", value: "Nordlys Håndværk ApS" },
      { key: "company.form", value: "Anpartsselskab" },
      { key: "company.industry", value: "Tømrer- og bygningssnedkervirksomhed" },
      { key: "company.employees", value: "7" },
      { key: "company.founded", value: "2015" },
    ],
  },
];

// No artificial delay — the demo should feel as realtime as possible. When a trigger lands, all of
// the lookup's facts drop onto the graph at once and go out in a single SSE update.

// Per-lead set of source lookups already fired, so a lookup runs once even though maybeEnrich is
// called after every extraction pass. Module global, like all the throwaway's "persistence".
const fired = new Map<string, Set<string>>();

// Inspect the lead's graph; for any trigger value that has landed and whose lookup hasn't fired yet,
// schedule its fake source enrichment. Idempotent — safe to call after every extraction merge.
export function maybeEnrich(leadId: string): void {
  const lead = getLead(leadId);
  if (!lead) return;

  let firedForLead = fired.get(leadId);
  if (!firedForLead) {
    firedForLead = new Set();
    fired.set(leadId, firedForLead);
  }

  for (const enricher of ENRICHERS) {
    if (firedForLead.has(enricher.sourceName)) continue;
    const triggered = lead.attributes.some((a) => a.key.toLowerCase().includes(enricher.match));
    if (!triggered) continue;
    firedForLead.add(enricher.sourceName);
    enrich(leadId, enricher);
  }
}

function enrich(leadId: string, enricher: Enricher): void {
  const lead = getLead(leadId);
  if (!lead) return;
  let changed = false;
  for (const fact of enricher.facts) {
    // Never double-add the same source fact (re-fire guard).
    if (lead.attributes.some((a) => a.key === fact.key && a.provenance === "source")) continue;
    lead.attributes.push({
      key: fact.key,
      value: fact.value,
      provenance: "source",
      sourceName: enricher.sourceName,
      verified: true, // register data is authoritative in the fiction
      at: Date.now(),
    });
    changed = true;
  }
  if (changed) {
    touchLead(lead); // Sources panel updates live via a single SSE push
    // Source facts (make/model, home.type, company.*) can unlock products too (ticket 07).
    deriveProducts(leadId);
  }
}
