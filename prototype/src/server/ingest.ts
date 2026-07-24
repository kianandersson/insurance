// The normalized Utterance seam — the single door every spoken or typed line comes through.
// Ticket 04's Twilio transcription webhook and the typed-text composer both call ingestUtterance;
// past this point speech and text are indistinguishable, so the AI extraction (ticket 05) is built
// once and runs the same way for both.
//
// Flow per utterance:
//   1. Append it to the lead's transcript and broadcast immediately (the line shows at once).
//   2. Fire the AI extraction over the whole conversation and merge any newly-stated attributes
//      onto the graph as not-yet-verified "AI-heard" values — a beat later, live.

import {
  type ExtractedAttribute,
  type ExtractionContext,
  extractAttributes,
} from "./extraction.ts";
import { deriveProducts } from "./products.ts";
import { maybeEnrich } from "./sources.ts";
import { getLead, type Lead, touchLead, type Utterance } from "./store.ts";

// Injectable so the seam can be tested without a live model (see ingest.test.ts). Context is
// optional so a stub extractor can ignore it.
export type Extractor = (
  utterances: Utterance[],
  context?: ExtractionContext,
) => Promise<ExtractedAttribute[]>;

export interface IngestResult {
  utterance?: Utterance;
  extraction: Promise<void>; // resolves once the extraction pass has merged (or failed & skipped)
}

export function ingestUtterance(
  leadId: string,
  input: { speaker: Utterance["speaker"]; text: string; callId?: string },
  extract: Extractor = extractAttributes,
): IngestResult {
  const lead = getLead(leadId);
  if (!lead) return { extraction: Promise.resolve() };

  const utterance: Utterance = {
    id: crypto.randomUUID(),
    speaker: input.speaker,
    text: input.text.trim(),
    at: Date.now(),
    // The call this line belongs to: Twilio's CallSid on a real call, "manual" for typed input.
    callId: input.callId?.trim() || "manual",
  };
  lead.utterances.push(utterance);
  touchLead(lead); // transcript panel updates instantly

  // "system" lines are call-status announcements, not spoken facts — never worth a model call.
  const extraction =
    input.speaker === "system" ? Promise.resolve() : runExtraction(leadId, extract);
  return { utterance, extraction };
}

async function runExtraction(leadId: string, extract: Extractor): Promise<void> {
  const lead = getLead(leadId);
  if (!lead) return;
  try {
    const extracted = await extract(lead.utterances, { name: lead.name, segment: lead.segment });
    // Re-read: the lead may have moved on while we were awaiting the model.
    const fresh = getLead(leadId);
    if (!fresh) return;
    const changed = mergeAiHeard(fresh, extracted);
    // Name discovery becomes the anchor: the first clean heard name fills the empty header, then
    // flows back as extraction context so later garbled mentions reconcile against it.
    const promoted = maybePromoteName(fresh, extracted);
    if (changed || promoted) touchLead(fresh);
    // A landed trigger value (address / plate / CVR) fires the fake source lookups (ticket 06).
    maybeEnrich(leadId);
    // Re-derive recommended products from the (now possibly richer) graph (ticket 07).
    deriveProducts(leadId);
  } catch (err) {
    // A failed extraction must never kill the call — the utterance still stands in the transcript.
    console.error(
      `[extraction] lead ${leadId} skipped:`,
      err instanceof Error ? err.message : err,
    );
  }
}

// Promote a heard person.name onto the lead header — but only while it's still empty, so a name
// typed at creation (or an earlier heard one) stays the anchor and isn't clobbered by a later
// garbled mention. Returns true if the header changed.
function maybePromoteName(lead: Lead, extracted: ExtractedAttribute[]): boolean {
  if (lead.name.trim()) return false;
  const heardName = extracted.find((a) => a.key === "person.name")?.value.trim();
  if (!heardName) return false;
  lead.name = heardName;
  return true;
}

// Upsert AI-heard attributes onto the lead graph. Only ever touches "ai-heard" values, so it
// leaves source-enriched values (ticket 06) alone. Returns true if anything changed.
export function mergeAiHeard(lead: Lead, extracted: ExtractedAttribute[]): boolean {
  let changed = false;
  for (const { key, value } of extracted) {
    const existing = lead.attributes.find((a) => a.key === key && a.provenance === "ai-heard");
    if (existing) {
      if (existing.value !== value) {
        existing.value = value;
        existing.at = Date.now();
        changed = true;
      }
    } else {
      lead.attributes.push({
        key,
        value,
        provenance: "ai-heard",
        verified: false,
        at: Date.now(),
      });
      changed = true;
    }
  }
  return changed;
}
