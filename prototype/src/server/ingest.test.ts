// Exercises the Utterance seam end-to-end without a live model: a stub extractor stands in for
// the Anthropic call, proving that ingesting an utterance (a) shows in the transcript at once and
// (b) merges AI-heard attributes onto the graph and broadcasts. The real model just swaps in for
// the stub in production. Run: `bun test`.

import { expect, test } from "bun:test";
import { ingestUtterance, mergeAiHeard } from "./ingest.ts";
import { createLead, getLead, subscribe, type StoreEvent } from "./store.ts";

test("ingestUtterance shows the line immediately and fills the graph from extraction", async () => {
  const lead = createLead({ name: "Mette Hansen", phone: "+4512345678" });
  const events: StoreEvent[] = [];
  const unsub = subscribe((e) => events.push(e));

  // Stub extractor: pretends the AI heard a name and a car from the conversation.
  const stub = async () => [
    { key: "person.name", value: "Mette Hansen" },
    { key: "vehicle.make", value: "Volkswagen" },
  ];

  const { utterance, extraction } = ingestUtterance(
    lead.id,
    { speaker: "customer", text: "Hej, jeg hedder Mette og jeg kører en Volkswagen." },
    stub,
  );

  // (a) transcript line lands synchronously, before any extraction.
  expect(utterance?.text).toContain("Volkswagen");
  const afterUtter = getLead(lead.id)!;
  expect(afterUtter.utterances).toHaveLength(1);
  expect(afterUtter.attributes).toHaveLength(0);

  await extraction;

  // (b) extraction merged AI-heard attributes and they're not-yet-verified.
  const filled = getLead(lead.id)!;
  expect(filled.attributes.map((a) => a.key).sort()).toEqual(["person.name", "vehicle.make"]);
  expect(filled.attributes.every((a) => a.provenance === "ai-heard" && !a.verified)).toBe(true);

  // The seam broadcast at least twice: the utterance, then the merged attributes.
  const updates = events.filter((e) => e.type === "lead:updated");
  expect(updates.length).toBeGreaterThanOrEqual(2);

  unsub();
});

test("mergeAiHeard upserts by key and leaves source values untouched", () => {
  const lead = createLead({ name: "Test", phone: "+4500000000" });
  lead.attributes.push({
    key: "home.address",
    value: "Storgade 1",
    provenance: "source",
    sourceName: "BBR",
    verified: true,
    at: Date.now(),
  });

  // First hearing adds a new AI-heard value.
  expect(mergeAiHeard(lead, [{ key: "person.age", value: "34" }])).toBe(true);
  // Re-hearing the same value is a no-op.
  expect(mergeAiHeard(lead, [{ key: "person.age", value: "34" }])).toBe(false);
  // A correction updates in place.
  expect(mergeAiHeard(lead, [{ key: "person.age", value: "35" }])).toBe(true);
  expect(lead.attributes.find((a) => a.key === "person.age")?.value).toBe("35");

  // The source-provenance address is never overwritten by AI-heard merges.
  const address = lead.attributes.find((a) => a.key === "home.address");
  expect(address?.provenance).toBe("source");
  expect(address?.value).toBe("Storgade 1");
});
