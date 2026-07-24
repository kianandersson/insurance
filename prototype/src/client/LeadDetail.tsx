// The live lead screen — the stage everything downstream animates onto.
// It loads the lead once, then re-renders purely from server-pushed lead:updated events.
// Every panel is a shell today; tickets 04–07 push values the panels already know how to draw.

import { Call, Device } from "@twilio/voice-sdk";
import { useEffect, useRef, useState } from "react";
import {
  type AttributeValue,
  getLead,
  getVoiceToken,
  type Lead,
  postUtterance,
  subscribeEvents,
  toE164,
} from "./api.ts";
import { navigate } from "./router.ts";

export function LeadDetail({ id }: { id: string }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [missing, setMissing] = useState(false);

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

  return (
    <div className="detail">
      <div className="detail-head">
        <button type="button" className="link" onClick={() => navigate("/")}>
          ← Leads
        </button>
        <div>
          <h1>{lead.name}</h1>
          <p className="muted">
            {lead.phone}
            {lead.segment ? ` · ${lead.segment}` : ""}
          </p>
        </div>
      </div>

      {/* Call control — places the real outbound Twilio call (ticket 04). */}
      <CallBar lead={lead} />

      {/* Utterance composer — feeds the same seam the live call will. Type what was said and
          watch the AI fill the Attributes panel. Ticket 04 swaps the real transcript onto this seam. */}
      <Composer leadId={lead.id} />

      <div className="grid">
        <Panel title="Attributes" empty="Nothing heard yet — start a call and the AI fills this in.">
          {heard.length > 0 && (
            <ul className="rows">
              {heard.map((a) => (
                <AttributeRow key={`${a.key}-${a.at}`} attr={a} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Sources" empty="No source enrichment yet.">
          {sourceNames.length > 0 && (
            <div className="source-groups">
              {sourceNames.map((name) => (
                <div key={name} className="source-group">
                  <h4 className="source-name">{name}</h4>
                  <ul className="rows">
                    {fromSources
                      .filter((a) => (a.sourceName ?? "Source") === name)
                      .map((a) => (
                        <AttributeRow key={`${a.key}-${a.at}`} attr={a} />
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recommended products" empty="Recommendations appear as the graph fills.">
          {lead.products.length > 0 && (
            <ul className="rows">
              {lead.products.map((p) => (
                <li key={p.id} className="product">
                  <div className="product-head">
                    <strong>{p.name}</strong>
                    <span className="price">{p.price}</span>
                  </div>
                  <span className="muted small">{p.reason}</span>
                  <div className="product-meta small">
                    <span>
                      <span className="meta-label">Dækning:</span> {p.coverage}
                    </span>
                    <span>
                      <span className="meta-label">Selvrisiko:</span> {p.excess}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Transcript" empty="The live transcript streams in during the call.">
          {lead.utterances.length > 0 && (
            <ul className="transcript">
              {lead.utterances.map((u) => (
                <li key={u.id} className={`utter ${u.speaker}`}>
                  <span className="who">{u.speaker}</span> {u.text}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// Browser softphone (ticket 10). The seller clicks Call → the browser becomes a Twilio Voice
// participant, Twilio bridges it to the customer's real number, and they talk two-way through the
// laptop. State is driven purely off Device/Call events, so the button reflects call-end without a
// poll; Hang up ends it from the app. No robot voice. (Graph-filling returns in ticket 11.)
type CallState = "idle" | "connecting" | "ringing" | "live" | "error";

function CallBar({ lead }: { lead: Lead }) {
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const first = lead.name.split(" ")[0] || lead.name;

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
      c.on("accept", () => setState("live"));
      c.on("error", (e: { message?: string }) => {
        setState("error");
        setError(e?.message ?? "Call error.");
        callRef.current = null;
      });
      const end = () => {
        callRef.current = null;
        setState((s) => (s === "error" ? s : "idle"));
      };
      c.on("disconnect", end);
      c.on("cancel", end);
      c.on("reject", end);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not start the call.");
      callRef.current = null;
    }
  };

  const hangUp = () => callRef.current?.disconnect();

  const busy = state === "connecting" || state === "ringing" || state === "live";

  return (
    <div className="callbar">
      {busy ? (
        <button type="button" className="hangup" onClick={hangUp}>
          ✖ Hang up
        </button>
      ) : (
        <button type="button" onClick={call}>
          📞 Call {first}
        </button>
      )}
      <span className="muted small">
        {state === "idle" &&
          "Calls the customer through your browser — grant the mic, then talk two-way through the laptop."}
        {state === "connecting" && "Connecting — allow microphone access…"}
        {state === "ringing" && `Ringing ${first}…`}
        {state === "live" && `Live with ${first} — talk. Hang up when you're done.`}
        {state === "error" && <span className="error">{error}</span>}
      </span>
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
        placeholder="Type what was just said, then Enter — the AI fills the graph…"
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
  children,
}: {
  title: string;
  empty: string;
  children?: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <section className="panel">
      <h3>{title}</h3>
      {hasContent ? children : <p className="muted small">{empty}</p>}
    </section>
  );
}

function AttributeRow({ attr, showSource }: { attr: AttributeValue; showSource?: boolean }) {
  return (
    <li className="row">
      <span className="key">{attr.key}</span>
      <span className="val">{attr.value}</span>
      {showSource && attr.sourceName && <span className="badge">{attr.sourceName}</span>}
      {!attr.verified && attr.provenance === "ai-heard" && (
        <span className="badge tentative">heard</span>
      )}
    </li>
  );
}
