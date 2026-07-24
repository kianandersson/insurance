// Ticket 04 — the real outbound call and its live transcription feed.
//
// Topology A, SOLO one-phone sub-shape (the decision this ticket makes): the app dials the
// LEAD's own number, the stakeholder answers on that phone (speaker on, next to the laptop) and
// simply talks — narrating as the customer. One device, no second party, no bridge: the most
// reliable thing to hand an unassisted stakeholder. Because there is no <Dial>, the hard 5-min
// cap is carried by <Pause length="300"> instead of <Dial timeLimit="300"> — same ceiling, same
// guardrail (Twilio hangs up when the pause ends).
//
// Everything Twilio-specific stays in this adapter. It maps a `Final:true` transcription webhook
// onto the normalized Utterance seam, so past ingestUtterance the AI core cannot tell a spoken
// line from a typed one — exactly the seam ticket 05 was built against.

import type { Lead } from "./store.ts";

const API_BASE = "https://api.twilio.com/2010-04-01";

function creds() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const base = process.env.PUBLIC_BASE_URL;
  if (!sid || !token || !from) {
    throw new Error("Twilio env not configured (need TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER)");
  }
  if (!base) throw new Error("PUBLIC_BASE_URL not set — Twilio needs a public URL for its webhooks");
  return { sid, token, from, base: base.replace(/\/$/, "") };
}

// Light E.164 nudge: trust a proper +country number; prefix +45 for a bare 8-digit Danish mobile,
// and turn a 00-prefixed international number into +. Anything else is passed through untouched.
export function toE164(raw: string): string {
  const s = raw.replace(/[^\d+]/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return `+${s.slice(2)}`;
  if (/^\d{8}$/.test(s)) return `+45${s}`;
  return s;
}

// Place the real outbound call. Twilio dials `To`; when the lead answers, Twilio fetches our
// /twiml/voice for the TwiML that starts transcription and holds the line open.
export async function placeCall(lead: Lead): Promise<{ sid: string }> {
  const { sid, token, from, base } = creds();
  const body = new URLSearchParams({
    To: toE164(lead.phone),
    From: from,
    Url: `${base}/twiml/voice?leadId=${encodeURIComponent(lead.id)}`,
  });
  const res = await fetch(`${API_BASE}/Accounts/${sid}/Calls.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio call rejected (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { sid: string };
  return { sid: data.sid };
}

// The TwiML Twilio fetches when the lead answers. Solo topology: start transcribing the
// customer's own inbound track (Deepgram Nova-3, Danish), greet them, then hold the line with a
// 300s pause (the hard cap). Transcribing inbound_track ONLY keeps our spoken <Say> greeting
// (which is outbound audio) out of the transcript.
//
// enableProviderData="true" adds per-word confidence + timing to the Final:true payloads — the one
// source-side tuning knob that actually helps Danish narrowband (ticket 08: keyterm priming is NOT
// reachable through this verb for the Deepgram engine, so there is no source-side fix for mangled
// proper nouns; that's carried by the extraction and the demo script). Stay monolingual da-DK.
export function voiceTwiml(leadId: string, base: string): string {
  const cb = `${base.replace(/\/$/, "")}/twilio/transcription?leadId=${encodeURIComponent(leadId)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Transcription transcriptionEngine="deepgram" speechModel="nova-3" languageCode="da-DK" track="inbound_track" profanityFilter="false" enableProviderData="true" statusCallbackUrl="${cb}" />
  </Start>
  <Say voice="Polly.Naja" language="da-DK">Du er forbundet. Fortæl frit om dig selv, dit hjem, din bil og din familie, så udfylder systemet oplysningerne mens du taler.</Say>
  <Pause length="300" />
</Response>`;
}

// One normalized transcription event, stripped of everything Twilio-specific.
export interface TranscriptionEvent {
  isContent: boolean; // TranscriptionEvent === "transcription-content"
  isFinal: boolean; // a settled utterance (Final === "true")
  speaker: "customer" | "agent";
  sequenceId: string; // per-call ordering/dedupe key
  transcript: string;
  confidence?: number;
}

// Parse a Twilio transcription webhook (application/x-www-form-urlencoded). TranscriptionData is
// itself a JSON string carrying the transcript (and confidence on finals) — parse it out.
export function parseTranscription(form: URLSearchParams): TranscriptionEvent {
  const isContent = form.get("TranscriptionEvent") === "transcription-content";
  const isFinal = form.get("Final") === "true";
  const track = form.get("Track");
  const sequenceId = form.get("SequenceId") ?? "";

  let transcript = "";
  let confidence: number | undefined;
  const raw = form.get("TranscriptionData");
  if (raw) {
    try {
      const data = JSON.parse(raw) as { transcript?: string; confidence?: number };
      transcript = (data.transcript ?? "").trim();
      confidence = data.confidence;
    } catch {
      /* leave transcript empty — a garbled frame is simply dropped */
    }
  }

  // Track → speaker. In solo topology only inbound_track is transcribed (the customer); the
  // outbound_track label is kept for the day this grows a bridged seller leg.
  const speaker = track === "outbound_track" ? "agent" : "customer";
  return { isContent, isFinal, speaker, sequenceId, transcript, confidence };
}
