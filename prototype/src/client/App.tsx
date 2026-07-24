import { useEffect, useState } from "react";
import { getMe, listLeads, login, logout, subscribeEvents, type Lead } from "./api.ts";

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    getMe().then(setAuthed);
  }, []);

  if (authed === null) return <div className="center muted">Loading…</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Home onLogout={() => setAuthed(false)} />;
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
        <h1>Live Call Demo</h1>
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

function Home({ onLogout }: { onLogout: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    listLeads().then(setLeads);
    const unsubscribe = subscribeEvents((event) => {
      if (event.type === "hello") setLive(true);
      if (event.type === "lead:created" || event.type === "lead:updated") {
        // Later tickets push lead changes; refresh the list from the pushed state.
        listLeads().then(setLeads);
      }
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
        <strong>Live Call Demo</strong>
        <span className={`dot ${live ? "on" : "off"}`} title={live ? "Live stream connected" : "Connecting…"} />
        <span className="spacer" />
        <button className="link" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main className="content">
        {leads.length === 0 ? (
          <div className="empty">
            <h2>No leads yet</h2>
            <p className="muted">
              This is the empty home screen. The next ticket adds the “new lead” form and the live
              lead screen that fills in during a call.
            </p>
          </div>
        ) : (
          <ul className="leads">
            {leads.map((l) => (
              <li key={l.id}>
                <strong>{l.name}</strong> — {l.phone}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
