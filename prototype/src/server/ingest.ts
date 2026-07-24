// The normalized Utterance seam — the single door every spoken or typed line comes through.
// Ticket 04's Twilio transcription webhook and the typed-text composer both call ingestUtterance;
// past this point speech and text are indistinguishable, so the AI extraction (ticket 05) is built
// once and runs the same way for both.
//
// Flow per utterance:
//   1. Append it to the lead's transcript and broadcast immediately (the line shows at once).
//   2. Fire the AI extraction over the whole conversation and merge any newly-stated attributes
//      onto the graph as not-yet-verified "AI-heard" values — a beat later, live.

import { extractAttributes, type ExtractedAttribute } from "./extraction.ts";
import { getLead, type Lead, touchLead, type Utterance } from "./store.ts";

// Injectable so the seam can be tested without a live model (see ingest.test.ts).
export type Extractor = (utterances: Utterance[]) => Promise<ExtractedAttribute[]>;

export interface IngestResult {
  utterance?: Utterance;
  extraction: Promise<void>; // resolves once the extraction pass has merged (or failed & skipped)
}

export function ingestUtterance(
  leadId: string,
  input: { speaker: Utterance["speaker"]; text: string },
  extract: Extractor = extractAttributes,
): IngestResult {
  const lead = getLead(leadId);
  if (!lead) return { extraction: Promise.resolve() };

  const utterance: Utterance = {
    id: crypto.randomUUID(),
    speaker: input.speaker,
    text: input.text.trim(),
    at: Date.now(),
  };
  lead.utterances.push(utterance);
  touchLead(lead); // transcript panel updates instantly

  const extraction = runExtraction(leadId, extract);
  return { utterance, extraction };
}

async function runExtraction(leadId: string, extract: Extractor): Promise<void> {
  const lead = getLead(leadId);
  if (!lead) return;
  try {
    const extracted = await extract(lead.utterances);
    // Re-read: the lead may have moved on while we were awaiting the model.
    const fresh = getLead(leadId);
    if (!fresh) return;
    if (mergeAiHeard(fresh, extracted)) touchLead(fresh);
  } catch (err) {
    // A failed extraction must never kill the call — the utterance still stands in the transcript.
    console.error(
      `[extraction] lead ${leadId} skipped:`,
      err instanceof Error ? err.message : err,
    );
  }
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
