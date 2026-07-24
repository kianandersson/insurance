// Ticket 10 follow-up — the app provisions its own Twilio-side records instead of asking the human
// to click around the console. The browser softphone needs two things registered IN Twilio: an API
// Key (to SIGN the Voice access tokens) and a TwiML App (to ROUTE the browser leg to our
// /twiml/outgoing). Both are creatable over REST with the Account SID + Auth Token we already hold —
// so we create-or-reuse them on boot and persist the result to .env.
//
// Runs once: when all three softphone vars are already present it's a pure no-op (no network), so
// normal boots pay nothing. It only reaches out to Twilio when something is missing.

import { join } from "node:path";

const API_BASE = "https://api.twilio.com/2010-04-01";
// One stable name so repeated provisioning reuses the same TwiML App instead of piling up new ones.
const FRIENDLY_NAME = "local-insurance softphone (ticket 10)";
// prototype/.env — resolved from this file (src/server/) so it's independent of the process cwd.
const ENV_PATH = join(import.meta.dir, "../../.env");

function basicAuth(sid: string, token: string): string {
  return `Basic ${btoa(`${sid}:${token}`)}`;
}

async function twilioForm(
  url: string,
  auth: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

// Upsert keys into prototype/.env (create the file if absent), preserving everything else. Values
// here are SIDs/secrets — no whitespace — so no quoting is needed.
async function persistEnv(updates: Record<string, string>): Promise<void> {
  const file = Bun.file(ENV_PATH);
  let text = (await file.exists()) ? await file.text() : "";
  let appendedHeader = false;
  for (const [k, v] of Object.entries(updates)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(text)) {
      text = text.replace(re, line);
    } else {
      if (text.length && !text.endsWith("\n")) text += "\n";
      if (!appendedHeader) {
        text += "\n# --- Twilio Voice / softphone (ticket 10) — auto-provisioned, do not edit ---\n";
        appendedHeader = true;
      }
      text += `${line}\n`;
    }
  }
  await Bun.write(ENV_PATH, text);
  console.log(`[voice-setup] wrote ${Object.keys(updates).join(", ")} to .env`);
}

// Ensure an API Key + TwiML App exist and their SIDs/secret live in the environment. Idempotent:
// no-op when already configured; safe to call on every boot.
export async function ensureVoiceProvisioned(): Promise<void> {
  // Already fully configured → trust env, touch no network.
  if (
    process.env.TWILIO_API_KEY_SID &&
    process.env.TWILIO_API_KEY_SECRET &&
    process.env.TWILIO_TWIML_APP_SID
  ) {
    return;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!sid || !token || !base) {
    console.warn(
      "[voice-setup] skipped — need TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + PUBLIC_BASE_URL to self-provision the softphone",
    );
    return;
  }

  const auth = basicAuth(sid, token);
  const updates: Record<string, string> = {};

  // 1) API Key. The secret is returned ONLY at creation, so we create a fresh key whenever we don't
  //    already hold the secret (an orphaned prior key is harmless on a throwaway account).
  if (!process.env.TWILIO_API_KEY_SID || !process.env.TWILIO_API_KEY_SECRET) {
    const key = await twilioForm(`${API_BASE}/Accounts/${sid}/Keys.json`, auth, {
      FriendlyName: FRIENDLY_NAME,
    });
    process.env.TWILIO_API_KEY_SID = key.sid as string;
    process.env.TWILIO_API_KEY_SECRET = key.secret as string;
    updates.TWILIO_API_KEY_SID = key.sid as string;
    updates.TWILIO_API_KEY_SECRET = key.secret as string;
    console.log(`[voice-setup] created API key ${key.sid}`);
  }

  // 2) TwiML App whose Voice Request URL points at our softphone endpoint. Reuse one with our
  //    friendly name if it already exists; otherwise create it.
  const voiceUrl = `${base}/twiml/outgoing`;
  let appSid = process.env.TWILIO_TWIML_APP_SID;
  if (!appSid) {
    const listRes = await fetch(
      `${API_BASE}/Accounts/${sid}/Applications.json?FriendlyName=${encodeURIComponent(FRIENDLY_NAME)}`,
      { headers: { authorization: auth } },
    );
    if (listRes.ok) {
      const data = (await listRes.json()) as { applications?: { sid: string }[] };
      appSid = data.applications?.[0]?.sid;
    }
    if (!appSid) {
      const app = await twilioForm(`${API_BASE}/Accounts/${sid}/Applications.json`, auth, {
        FriendlyName: FRIENDLY_NAME,
        VoiceUrl: voiceUrl,
        VoiceMethod: "POST",
      });
      appSid = app.sid as string;
      console.log(`[voice-setup] created TwiML app ${appSid}`);
    }
    process.env.TWILIO_TWIML_APP_SID = appSid;
    updates.TWILIO_TWIML_APP_SID = appSid;
  }

  // Keep the app's Voice URL pointing at the current public base (cheap; covers a changed tunnel
  // hostname since the last provisioning).
  await twilioForm(`${API_BASE}/Accounts/${sid}/Applications/${appSid}.json`, auth, {
    VoiceUrl: voiceUrl,
    VoiceMethod: "POST",
  }).catch((err) => console.warn("[voice-setup] could not refresh TwiML app Voice URL:", err));

  if (Object.keys(updates).length) await persistEnv(updates);
}

// Also runnable standalone: `bun run src/server/voice-setup.ts` (script: `bun run setup:voice`).
if (import.meta.main) {
  await ensureVoiceProvisioned();
  console.log("[voice-setup] done");
}
