/**
 * Device lock for the journal — passkey (Face ID / Touch ID) or a passcode.
 *
 * HONEST SCOPE: this is a lock on the door, not a safe. There is no server to
 * verify a passkey assertion against, and the journal in IndexedDB is stored
 * unencrypted, so anyone with real access to the device's browser internals
 * could still read it. It stops someone who picks up your unlocked phone and
 * opens the app — which is what it's for. Don't treat it as encryption.
 */

const PBKDF2_ITERATIONS = 310_000;

// ---- base64url helpers ----
function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
// Explicitly ArrayBuffer-backed: WebCrypto/WebAuthn types reject the
// SharedArrayBuffer-compatible default that Uint8Array.from() infers.
function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function toB64Url(buf: ArrayBuffer): string {
  return toB64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  return fromB64(pad + "=".repeat((4 - (pad.length % 4)) % 4));
}

// ---- passcode ----

export function randomSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function hashPasscode(code: string, saltB64: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toB64(bits);
}

/** Constant-time-ish compare so a wrong code doesn't leak position via timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---- backup code ----

/** Unambiguous alphabet — no O/0, I/1, so it's transcribable into a paper logbook. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBackupCode(): string {
  const pick = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
      .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
      .join("");
  return `JOTS-${pick(4)}-${pick(4)}`;
}

export function normalizeBackupCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ---- passkey (WebAuthn) ----

/** Is a platform authenticator (Face ID / Touch ID / Windows Hello) usable here? */
export async function passkeyAvailable(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    if (!window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Enroll a platform passkey. Returns its credential id, or null if declined. */
export async function createPasskey(label: string): Promise<string | null> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        // rp.id is omitted so it binds to the current origin automatically.
        rp: { name: "Coffee Jots" },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: label || "Coffee Jots",
          displayName: label || "Coffee Jots",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    return cred ? toB64Url(cred.rawId) : null;
  } catch {
    return null;
  }
}

/**
 * Ask the platform authenticator to verify the user.
 * Local-only: a resolved assertion is treated as success (see file header).
 */
export async function verifyPasskey(credentialId: string): Promise<boolean> {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: "public-key", id: fromB64Url(credentialId) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}
