// Exercises the Twilio adapter's pure logic without placing a call or hitting the network:
// number normalization, the TwiML the answered leg receives, and mapping a `Final:true`
// transcription webhook onto the normalized seam. The live call itself is verified by hand
// (see ticket 04). Run: `bun test`.

import { expect, test } from "bun:test";
import { outgoingTwiml, parseTranscription, toE164, voiceTwiml } from "./twilio.ts";

test("toE164 nudges Danish numbers to E.164 and trusts explicit ones", () => {
  expect(toE164("12 34 56 78")).toBe("+4512345678"); // bare 8-digit DK mobile
  expect(toE164("+45 30 12 34 56")).toBe("+4530123456"); // already +country
  expect(toE164("004530123456")).toBe("+4530123456"); // 00 international prefix
  expect(toE164("+1 202 555 0100")).toBe("+12025550100"); // non-DK left intact
});

test("voiceTwiml starts Deepgram Danish transcription on the inbound track and holds the line", () => {
  const twiml = voiceTwiml("lead-123", "https://demo.example.com/");
  expect(twiml).toContain('transcriptionEngine="deepgram"');
  expect(twiml).toContain('speechModel="nova-3"');
  expect(twiml).toContain('languageCode="da-DK"');
  expect(twiml).toContain('track="inbound_track"'); // solo: only the customer's voice
  expect(twiml).toContain('enableProviderData="true"'); // per-word confidence (ticket 08)
  // Webhook URL carries the leadId and the trailing slash on the base is not doubled.
  expect(twiml).toContain(
    'statusCallbackUrl="https://demo.example.com/twilio/transcription?leadId=lead-123"',
  );
  expect(twiml).toContain('<Pause length="300" />'); // the 5-min hard cap in solo topology
});

test("outgoingTwiml bridges the browser to the customer and starts Danish transcription on both tracks", () => {
  const twiml = outgoingTwiml("12 34 56 78", "lead-123", "+4593703142", "https://demo.example.com/");
  // Transcription is started (asynchronously) on the parent call, around the <Dial>.
  expect(twiml).toContain("<Start>");
  expect(twiml).toContain('transcriptionEngine="deepgram"');
  expect(twiml).toContain('speechModel="nova-3"');
  expect(twiml).toContain('languageCode="da-DK"');
  expect(twiml).toContain('track="both_tracks"'); // bridged: BOTH seller and customer
  expect(twiml).toContain('enableProviderData="true"'); // per-word confidence (ticket 08)
  expect(twiml).toContain(
    'statusCallbackUrl="https://demo.example.com/twilio/transcription?leadId=lead-123"',
  );
  // The bridge itself: dial the customer's normalized number, no robot <Say>, hard 5-min cap.
  expect(twiml).toContain('callerId="+4593703142"');
  expect(twiml).toContain('answerOnBridge="true"');
  expect(twiml).toContain('timeLimit="300"');
  expect(twiml).toContain("<Number>+4512345678</Number>");
  expect(twiml).not.toContain("<Say");
});

test("parseTranscription lifts a Final:true event onto the seam and drops non-content events", () => {
  // Bridged topology: outbound_track is the dialed CUSTOMER (played back to the browser).
  const finalEvent = new URLSearchParams({
    TranscriptionEvent: "transcription-content",
    Final: "true",
    Track: "outbound_track",
    SequenceId: "3",
    TranscriptionData: JSON.stringify({
      transcript: "jeg bor i et rækkehus i Aarhus",
      confidence: 0.94,
    }),
  });
  const ev = parseTranscription(finalEvent);
  expect(ev.isContent).toBe(true);
  expect(ev.isFinal).toBe(true);
  expect(ev.speaker).toBe("customer"); // outbound_track → customer (bridged)
  expect(ev.sequenceId).toBe("3");
  expect(ev.transcript).toBe("jeg bor i et rækkehus i Aarhus");
  expect(ev.confidence).toBeCloseTo(0.94);

  // A "started" lifecycle event is not content — the webhook handler ignores it.
  const started = new URLSearchParams({ TranscriptionEvent: "transcription-started" });
  expect(parseTranscription(started).isContent).toBe(false);

  // Bridged topology: inbound_track is the SELLER's browser mic → the agent speaker.
  const seller = new URLSearchParams({
    TranscriptionEvent: "transcription-content",
    Final: "true",
    Track: "inbound_track",
    SequenceId: "4",
    TranscriptionData: JSON.stringify({ transcript: "godt, det noterer jeg" }),
  });
  expect(parseTranscription(seller).speaker).toBe("agent");
});
