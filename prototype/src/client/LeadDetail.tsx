// The live lead screen — a call cockpit. Left rail is the call: identity, the control, and the
// call log (each call kept separate, most recent on top, history beneath). The right dossier is
// what the AI assembles as the customer talks. Loads the lead once, then re-renders purely from
// server-pushed lead:updated events.

import { Call, Device } from "@twilio/voice-sdk";
import { useEffect, useRef, useState } from "react";
import {
  type AttributeValue,
  getLead,
  getVoiceToken,
  type Lead,
  leadDisplayName,
  postUtterance,
  subscribeEvents,
  toE164,
  type Utterance,
} from "./api.ts";
import { navigate } from "./router.ts";

// The typed-text composer is a test-only seam, not part of the real demo. Hidden by default;
// append `?debug=1` to the URL once to reveal it (remembered in localStorage across navigation,
// `?debug=0` clears it) so the extraction can still be exercised without placing a call.
function useDebug(): boolean {
  const [debug] = useState(() => {
    const q = new URLSearchParams(window.location.search).get("debug");
    if (q === "1") localStorage.setItem("debug", "1");
    if (q === "0") localStorage.removeItem("debug");
    return localStorage.getItem("debug") === "1";
  });
  return debug;
}

// One turn = a run of consecutive same-speaker lines merged into a block (Deepgram emits several
// Final:true lines per turn). One call = a run of consecutive lines sharing a callId (Twilio's
// CallSid). Grouping is pure rendering — lead.utterances is left untouched.
type Turn = { id: string; speaker: Utterance["speaker"]; text: string; at: number };
type CallLog = {
  callId: string;
  startedAt: number;
  endedAt: number;
  lines: number;
  turns: Turn[];
};

function groupCalls(utterances: Utterance[]): CallLog[] {
  const calls: CallLog[] = [];
  for (const u of utterances) {
    let call = calls[calls.length - 1];
    if (!call || call.callId !== u.callId) {
      call = { callId: u.callId, startedAt: u.at, endedAt: u.at, lines: 0, turns: [] };
      calls.push(call);
    }
    call.endedAt = u.at;
    call.lines += 1;
    const last = call.turns[call.turns.length - 1];
    if (last && last.speaker === u.speaker) last.text += ` ${u.text}`;
    else call.turns.push({ id: u.id, speaker: u.speaker, text: u.text, at: u.at });
  }
  return calls;
}

function clock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export function LeadDetail({ id }: { id: string }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [missing, setMissing] = useState(false);
  const [callLive, setCallLive] = useState(false);
  const debug = useDebug();

  useEffect(() => {
    let alive = true;
    getLead(id).then((l) => {
      if (!alive) return;
      if (l) setLead(l);
      else setMissing(true);
    });
    // Re-render from server-pushed state: whenever this lead is touched, take the pushed copy.
    const unsubscribe = subscribeEvents((event) => {
      if (
        (event.type === "lead:updated" || event.type === "lead:created") &&
        event.lead.id === id
      ) {
        setLead(event.lead);
      }
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [id]);

  if (missing) {
    return (
      <div className="empty">
        <h2>Lead not found</h2>
        <button type="button" onClick={() => navigate("/")}>
          Back to leads
        </button>
      </div>
    );
  }
  if (!lead) return <div className="center muted">Loading lead…</div>;

  const heard = lead.attributes.filter((a) => a.provenance !== "source");
  const fromSources = lead.attributes.filter((a) => a.provenance === "source");
  const sourceNames = [...new Set(fromSources.map((a) => a.sourceName ?? "Source"))];
  // The signature: a heard fact whose key a register also carries is "confirmed" by that register.
  const confirmedBy = new Map<string, string>();
  for (const s of fromSources) {
    if (!confirmedBy.has(s.key)) confirmedBy.set(s.key, s.sourceName ?? "Register");
  }
  // Most recent call first; the top one is "live" only while the browser call is up.
  const calls = groupCalls(lead.utterances).reverse();

  return (
    <div className="detail">
      <button type="button" className="link detail-back" onClick={() => navigate("/")}>
        ← All leads
      </button>

      <div className="cockpit">
        {/* LEFT — the call: who, the control, and each call's log beneath. */}
        <section className="stage">
          <div className="lead-hero">
            <span className="eyebrow">{lead.segment ? lead.segment : "Lead"}</span>
            <h1>{leadDisplayName(lead)}</h1>
            <div className="lead-phone">{lead.phone}</div>
          </div>

          {/* Call control — the real outbound Twilio call (tickets 04/10). */}
          <CallBar lead={lead} onLiveChange={setCallLive} />

          {/* Utterance composer — feeds the same seam the live call does. Debug-only (see useDebug):
              hidden in the real demo, revealed with ?debug=1 to exercise extraction without a call. */}
          {debug && <Composer leadId={lead.id} />}

          <div className="calls">
            <div className="panel-head">
              <span className="eyebrow">Calls</span>
              {calls.length > 0 && <span className="count">{calls.length}</span>}
            </div>
            {calls.length > 0 ? (
              <div className="call-list">
                {calls.map((call, i) => (
                  <CallLogView key={call.callId} call={call} live={i === 0 && callLive} />
                ))}
              </div>
            ) : (
              <p className="calls-empty">No calls yet.</p>
            )}
          </div>
        </section>

        {/* RIGHT — the dossier the AI assembles. */}
        <div className="dossier">
          <Panel title="Attributes" count={heard.length} empty="Nothing heard yet.">
            {heard.length > 0 && (
              <ul className="rows">
                {heard.map((a) => (
                  <AttributeRow key={`${a.key}-${a.at}`} attr={a} confirmedBy={confirmedBy.get(a.key)} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Sources" count={sourceNames.length} empty="No register matches yet.">
            {sourceNames.length > 0 && (
              <div className="source-groups">
                {sourceNames.map((name) => (
                  <div key={name} className="source-group">
                    <div className="source-stamp">
                      <span className="mark" aria-hidden="true" />
                      <span className="name">{name}</span>
                    </div>
                    <ul className="rows">
                      {fromSources
                        .filter((a) => (a.sourceName ?? "Source") === name)
                        .map((a) => (
                          <li key={`${a.key}-${a.at}`} className="row">
                            <span className="field">
                              <span className="key">{a.key}</span>
                              <span className="val">{a.value}</span>
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recommended products" count={lead.products.length} empty="No recommendations yet.">
            {lead.products.length > 0 && (
              <div className="product-list">
                {lead.products.map((p) => (
                  <div key={p.id} className="product">
                    <div className="product-top">
                      <span className="name">{p.name}</span>
                      <span className="price">{p.price}</span>
                    </div>
                    <p className="reason">{p.reason}</p>
                    <div className="product-meta">
                      <span className="cell">
                        <span className="lbl">Dækning</span>
                        <span className="v">{p.coverage}</span>
                      </span>
                      <span className="cell">
                        <span className="lbl">Selvrisiko</span>
                        <span className="v">{p.excess}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// One call in the log: a header (time + duration + line count, or a live marker) over its own
// transcript, coalesced by speaker. Left-ruled log lines — customer green, agent grey.
function CallLogView({ call, live }: { call: CallLog; live: boolean }) {
  return (
    <div className={`call-log ${live ? "is-live" : ""}`}>
      <div className="call-log-head">
        <span className="when">
          {live ? (
            <>
              <span className="pulse" aria-hidden="true" />
              Live
            </>
          ) : (
            clock(call.startedAt)
          )}
        </span>
        <span className="meta mono">
          {live
            ? `${call.lines} lines`
            : `${fmtDuration(call.endedAt - call.startedAt)} · ${call.lines} lines`}
        </span>
      </div>
      <ul className="transcript">
        {call.turns.map((turn) => (
          <li key={turn.id} className={`utter ${turn.speaker}`}>
            <span className="who">
              <span>{turn.speaker}</span>
              <span className="mono">{clock(turn.at)}</span>
            </span>
            <span className="said">{turn.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Browser softphone (ticket 10). The seller clicks Call → the browser becomes a Twilio Voice
// participant, Twilio bridges it to the customer's real number, and they talk two-way through the
// laptop. State is driven purely off Device/Call events, so the button reflects call-end without a
// poll; Hang up ends it from the app. A live elapsed timer is display-only off the same state.
type CallState = "idle" | "connecting" | "ringing" | "live" | "error";

function CallBar({ lead, onLiveChange }: { lead: Lead; onLiveChange: (live: boolean) => void }) {
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [liveSince, setLiveSince] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // Name may not be known yet on a cold call — fall back to a neutral label for the button/status.
  const first = lead.name.split(" ")[0] || lead.name || "kunden";

  // Presentational elapsed timer while the call is live (no behavioural effect on the call).
  useEffect(() => {
    if (liveSince === null) {
      setElapsed(0);
      return;
    }
    setElapsed(Math.floor((Date.now() - liveSince) / 1000));
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - liveSince) / 1000)), 1000);
    return () => clearInterval(t);
  }, [liveSince]);

  // Tear the Device (and any live call) down when leaving the lead screen.
  useEffect(() => {
    return () => {
      callRef.current?.disconnect();
      deviceRef.current?.destroy();
      deviceRef.current = null;
      callRef.current = null;
    };
  }, []);

  const ensureDevice = async (): Promise<Device> => {
    if (deviceRef.current) return deviceRef.current;
    const token = await getVoiceToken();
    if (!token) {
      throw new Error("Could not get a voice token — is Twilio Voice configured?");
    }
    const device = new Device(token);
    deviceRef.current = device;
    return device;
  };

  const call = async () => {
    setError(null);
    setState("connecting");
    try {
      const device = await ensureDevice();
      // Prompts for mic permission (secure context: served over the HTTPS tunnel). Twilio fetches
      // /twiml/outgoing with these params and dials the customer.
      const c = await device.connect({
        params: { To: toE164(lead.phone), leadId: lead.id },
      });
      callRef.current = c;
      c.on("ringing", () => setState("ringing"));
      c.on("accept", () => {
        setState("live");
        setLiveSince(Date.now());
        onLiveChange(true);
      });
      c.on("error", (e: { message?: string }) => {
        setState("error");
        setError(e?.message ?? "Call error.");
        setLiveSince(null);
        onLiveChange(false);
        callRef.current = null;
      });
      const end = () => {
        callRef.current = null;
        setLiveSince(null);
        onLiveChange(false);
        setState((s) => (s === "error" ? s : "idle"));
      };
      c.on("disconnect", end);
      c.on("cancel", end);
      c.on("reject", end);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not start the call.");
      setLiveSince(null);
      onLiveChange(false);
      callRef.current = null;
    }
  };

  const hangUp = () => callRef.current?.disconnect();

  const busy = state === "connecting" || state === "ringing" || state === "live";
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className={`callbar ${state === "live" ? "is-live" : ""}`}>
      <div className="call-meter">
        {state === "live" ? (
          <>
            <span className="call-timer mono">{mmss}</span>
            <span className="call-live-tag">
              <span className="pulse" />
              Live
            </span>
          </>
        ) : (
          <span className="eyebrow">
            {state === "connecting" ? "Connecting" : state === "ringing" ? "Ringing" : "Ready to call"}
          </span>
        )}
      </div>

      {busy ? (
        <button type="button" className="hangup" onClick={hangUp}>
          Hang up
        </button>
      ) : (
        <button type="button" onClick={call}>
          Call {first}
        </button>
      )}

      {state === "idle" && (
        <p className="call-status">Calls through your browser — allow the microphone when asked.</p>
      )}
      {state === "connecting" && <p className="call-status">Connecting — allow microphone access…</p>}
      {state === "ringing" && <p className="call-status">Ringing {first}…</p>}
      {state === "error" && (
        <p className="call-status">
          <span className="error">{error}</span>
        </p>
      )}
    </div>
  );
}

function Composer({ leadId }: { leadId: string }) {
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState<"customer" | "agent">("customer");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText(""); // clear optimistically; the transcript arrives via SSE
    await postUtterance(leadId, { speaker, text: t });
    setSending(false);
  };

  return (
    <div className="composer">
      <div className="toggle">
        <button
          type="button"
          className={`seg ${speaker === "customer" ? "on" : ""}`}
          onClick={() => setSpeaker("customer")}
        >
          Customer
        </button>
        <button
          type="button"
          className={`seg ${speaker === "agent" ? "on" : ""}`}
          onClick={() => setSpeaker("agent")}
        >
          Agent
        </button>
      </div>
      <input
        value={text}
        placeholder="Type what was just said, then Enter…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") send();
        }}
      />
      <button type="button" onClick={send} disabled={sending || !text.trim()}>
        Send
      </button>
    </div>
  );
}

function Panel({
  title,
  empty,
  count,
  children,
}: {
  title: string;
  empty: string;
  count?: number;
  children?: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">{title}</span>
        {count ? <span className="count">{count}</span> : null}
      </div>
      {hasContent ? children : <p className="panel-empty">{empty}</p>}
    </section>
  );
}

// A heard attribute. Tentative by default; when a register carries the same key it's "confirmed" —
// the filled accent check + register name. This is the product's trust story, made visible.
function AttributeRow({ attr, confirmedBy }: { attr: AttributeValue; confirmedBy?: string }) {
  return (
    <li className="row">
      <span className="field">
        <span className="key">{attr.key}</span>
        <span className="val">{attr.value}</span>
      </span>
      {confirmedBy ? (
        <span className="state confirmed" title={`Confirmed by ${confirmedBy}`}>
          <span className="check" aria-hidden="true" />
          {shortRegister(confirmedBy)}
        </span>
      ) : (
        <span className="state tentative">
          <span className="disc" aria-hidden="true" />
          heard
        </span>
      )}
    </li>
  );
}

// Register names arrive long ("BBR – Bygnings- og Boligregister"); the pill wants the short code.
function shortRegister(name: string): string {
  return name.split(/[–-]/)[0].trim();
}
