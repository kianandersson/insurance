import { useEffect, useState } from "react";
import {
  createLead,
  getMe,
  type Lead,
  leadDisplayName,
  listLeads,
  login,
  logout,
  subscribeEvents,
} from "./api.ts";
import { LeadDetail } from "./LeadDetail.tsx";
import { navigate, usePath } from "./router.ts";

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const path = usePath();

  useEffect(() => {
    getMe().then(setAuthed);
  }, []);

  if (authed === null) return <div className="center muted">Loading…</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const leadMatch = path.match(/^\/leads\/([^/]+)$/);
  return (
    <Shell onLogout={() => setAuthed(false)}>
      {leadMatch ? <LeadDetail id={leadMatch[1]} /> : <Home />}
    </Shell>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await login(password);
    setBusy(false);
    if (ok) onSuccess();
    else setError(true);
  }

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <span className="eyebrow">Live call demo</span>
        <h1>Sign in</h1>
        <p className="muted">Enter the access code from your invite.</p>
        <input
          type="password"
          value={password}
          autoFocus
          placeholder="Access code"
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">Wrong code — try again.</p>}
        <button type="submit" disabled={busy || !password}>
          {busy ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

function LivePill({ live }: { live: boolean }) {
  return (
    <span className="live-pill" title={live ? "Live stream connected" : "Connecting…"}>
      <span className={`dot ${live ? "on" : "off"}`} />
      {live ? "Live" : "Connecting…"}
    </span>
  );
}

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeEvents((event) => {
      if (event.type === "hello") setLive(true);
    });
    return unsubscribe;
  }, []);

  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand link" onClick={() => navigate("/")}>
          Live Call Demo
        </button>
        <span className="spacer" />
        <LivePill live={live} />
        <button className="link" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main className="content">
        <div className="canvas">{children}</div>
      </main>
    </div>
  );
}

function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    listLeads().then(setLeads);
    const unsubscribe = subscribeEvents((event) => {
      if (event.type === "lead:created" || event.type === "lead:updated") {
        listLeads().then(setLeads);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div className="home">
      <NewLeadForm onCreated={(lead) => navigate(`/leads/${lead.id}`)} />
      <div>
        <div className="leads-head">
          <h2>Leads</h2>
          <span className="muted small">Select a lead to open its live screen.</span>
        </div>
        {leads.length > 0 ? (
          <ul className="leads">
            {leads.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className="leadrow"
                  onClick={() => navigate(`/leads/${l.id}`)}
                >
                  <span className="lead-main">
                    <span className="lead-name">{leadDisplayName(l)}</span>
                    <span className="lead-phone">{l.phone}</span>
                  </span>
                  {l.segment && <span className="lead-seg">{l.segment}</span>}
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="leads-empty">No leads yet — create one to get started.</p>
        )}
      </div>
    </div>
  );
}

function NewLeadForm({ onCreated }: { onCreated: (lead: Lead) => void }) {
  const [phone, setPhone] = useState("");
  const [segment, setSegment] = useState<"Private" | "Business">("Private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const lead = await createLead({ phone, segment });
    setBusy(false);
    if (lead) onCreated(lead);
    else setError(true);
  }

  return (
    <form className="card newlead" onSubmit={submit}>
      <h2>New lead</h2>
      <label>
        Phone
        <input value={phone} autoFocus placeholder="+4593703142" onChange={(e) => setPhone(e.target.value)} />
      </label>
      <div className="toggle" role="group" aria-label="Segment">
        {(["Private", "Business"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={segment === s ? "seg on" : "seg"}
            onClick={() => setSegment(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="error">Could not create the lead — try again.</p>}
      <button type="submit" disabled={busy || !phone.trim()}>
        {busy ? "Creating…" : "Create & open"}
      </button>
    </form>
  );
}
