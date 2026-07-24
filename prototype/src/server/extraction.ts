// One of the three real things: the AI that listens to the conversation and fills the graph.
// It runs a Vercel AI SDK structured-output call (Anthropic, cheap/fast tier) over the running
// transcript and returns the customer attributes that were *directly stated*. It never invents.
//
// The model is injectable so the seam can be exercised end-to-end without a live API key
// (see src/server/ingest.test.ts); production uses the default Haiku model.

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { Utterance } from "./store.ts";

export interface ExtractedAttribute {
  key: string; // dotted, English, canonical — e.g. "person.name", "home.address", "vehicle.make"
  value: string; // as stated by the customer (Danish text is fine)
}

// What the CRM already knows about this lead (typed at creation). Passed to the model so it can
// reconcile the lossy Danish transcription against high-confidence facts — the live narrowband
// transcription mangles proper nouns (a name "Kian" comes back as "kirken"), and the known name
// is a far better source of truth than a garbled near-match.
export interface ExtractionContext {
  name?: string;
  segment?: string;
}

const schema = z.object({
  attributes: z
    .array(
      z.object({
        key: z
          .string()
          .describe(
            "Dotted, lowercase, English attribute key on the customer's profile. " +
              "Prefer these when they fit: person.name, person.age, home.address, home.postcode, " +
              "home.type, home.ownership, home.size_m2, home.year_built, vehicle.make, vehicle.model, " +
              "vehicle.year, vehicle.plate, vehicle.mileage, family.children, family.marital_status, " +
              "current.insurer, current.cover, pet.type. Otherwise coin a sensible dotted key.",
          ),
        value: z.string().describe("The value exactly as the customer stated it."),
      }),
    )
    .describe("Every customer attribute that was directly stated in the conversation."),
});

const SYSTEM = [
  "You extract structured customer facts from the live transcript of a Danish insurance sales call.",
  "The conversation is in Danish; keep values in the customer's own words, but use English dotted keys.",
  "The transcript comes from live speech-to-text on a narrowband phone line, so it is LOSSY: proper",
  "nouns (names, street names) may be mangled and numbers are often dictated digit-by-digit.",
  "Rules:",
  "- Only return facts the customer (or agent, quoting the customer) DIRECTLY stated. Never infer, guess, or extrapolate.",
  "- If nothing concrete has been said yet, return an empty list.",
  "- Return the customer's own current values; if a value was corrected later in the call, return the corrected one.",
  "- One entry per distinct attribute. Do not duplicate keys.",
  "- Normalize numbers dictated as separated digits into their compact form: a licence plate heard as",
  "  'EC 1, 2, 3, 4, 5, 6' is 'EC123456' (Danish plates are two letters followed by digits). Same for",
  "  postcodes and phone numbers — join the digits.",
  "- When the customer states their OWN name and it is a garbled near-match to the known lead name",
  "  provided below, return the known lead name, not the garbled transcription.",
].join("\n");

function contextPreamble(context?: ExtractionContext): string {
  if (!context?.name && !context?.segment) return "";
  const lines = ["Known lead facts from the CRM (high confidence — typed at lead creation):"];
  if (context.name) lines.push(`- name: ${context.name}`);
  if (context.segment) lines.push(`- segment: ${context.segment}`);
  return `${lines.join("\n")}\n\n`;
}

// Default model for the extraction tier. Haiku is the fast, high-frequency tier (see
// .scratch/research/07-vercel-ai-sdk-models.md); it reads ANTHROPIC_API_KEY from the env.
export const defaultModel: LanguageModel = anthropic("claude-haiku-4-5");

export async function extractAttributes(
  utterances: Utterance[],
  context?: ExtractionContext,
  model: LanguageModel = defaultModel,
): Promise<ExtractedAttribute[]> {
  const transcript = utterances.map((u) => `${u.speaker}: ${u.text}`).join("\n");
  const { object } = await generateObject({
    model,
    schema,
    system: SYSTEM,
    prompt: `${contextPreamble(context)}Transcript so far:\n\n${transcript}\n\nReturn every customer attribute directly stated above.`,
  });
  // Guard against blank keys/values slipping through.
  return object.attributes.filter((a) => a.key.trim() && a.value.trim());
}
