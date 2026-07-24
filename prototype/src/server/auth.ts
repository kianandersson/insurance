// Cheapest possible auth that still looks like "logging in": one shared password.
// A correct password mints a signed cookie; every app route + the SSE stream checks it.
// No users, no sessions store — just an HMAC-signed constant so the cookie can't be forged.

const COOKIE_NAME = "demo_session";
const encoder = new TextEncoder();

const PASSWORD = process.env.DEMO_PASSWORD ?? "demo";
// If unset, a per-process random secret is used — fine for a throwaway, but it logs everyone
// out on restart. Set SESSION_SECRET in the deploy env to keep sessions across restarts.
const SECRET = process.env.SESSION_SECRET ?? crypto.randomUUID();

let keyPromise: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return keyPromise;
}

async function sign(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return Buffer.from(sig).toString("base64url");
}

const PAYLOAD = "authed";

export function checkPassword(candidate: string): boolean {
  return candidate === PASSWORD;
}

export async function mintCookie(): Promise<string> {
  const token = `${PAYLOAD}.${await sign(PAYLOAD)}`;
  // 12h session; Lax so it survives the Twilio-triggered redirects but not cross-site POSTs.
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function isAuthed(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie");
  if (!cookie) return false;
  const match = cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const [payload, sig] = decodeURIComponent(match[1]).split(".");
  if (payload !== PAYLOAD || !sig) return false;
  const expected = await sign(PAYLOAD);
  // Constant-time-ish compare; strings are short and fixed-shape here.
  return sig === expected;
}
