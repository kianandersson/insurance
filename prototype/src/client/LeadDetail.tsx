// The live lead screen — the stage everything downstream animates onto.
// It loads the lead once, then re-renders purely from server-pushed lead:updated events.
// Every panel is a shell today; tickets 04–07 push values the panels already know how to draw.

import { useEffect, useState } from "react";
import {
  type AttributeValue,
  getLead,
  type Lead,
  subscribeEvents,
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

      {/* Call control — a shell button today; ticket 04 wires the real Twilio call to it. */}
      <div className="callbar">
        <button type="button" disabled title="Wired up in the Twilio-call ticket">
          📞 Call {lead.name.split(" ")[0]}
        </button>
        <span className="muted small">Calling is wired up in a later step.</span>
      </div>

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
            <ul className="rows">
              {fromSources.map((a) => (
                <AttributeRow key={`${a.key}-${a.at}`} attr={a} showSource />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recommended products" empty="Recommendations appear as the graph fills.">
          {lead.products.length > 0 && (
            <ul className="rows">
              {lead.products.map((p) => (
                <li key={p.id} className="row">
                  <strong>{p.name}</strong>
                  <span className="muted small">{p.reason}</span>
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
