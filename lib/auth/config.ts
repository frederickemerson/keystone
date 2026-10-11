// Keystone demo auth — configuration read from the environment.
// Edge-safe (no Node APIs): used by middleware, route handlers and pages.
//
//   KEYSTONE_SESSION_SECRET  HS256 key for the session cookie (≥ 32 chars).
//                            Development falls back to a fixed, public key with
//                            a warning; production without it fails closed
//                            (no session can be issued or accepted).
//   KEYSTONE_DEMO_PASSCODE   Shared demo passcode. Unset ⇒ "keystone", and the
//                            sign-in page shows it as a hint.

export const SESSION_COOKIE = "keystone_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const SESSION_ISSUER = "keystone-demo";
export const SESSION_AUDIENCE = "keystone";

export const DEFAULT_DEMO_PASSCODE = "keystone";
const MIN_SECRET_LENGTH = 32;

/** Public, development-only key. Never accepted in production. */
const DEV_SESSION_SECRET = "keystone-development-only-session-secret-do-not-use-in-production";

type Env = Readonly<Record<string, string | undefined>>;

function isProduction(env: Env): boolean {
  return env.NODE_ENV === "production";
}

let warnedDevSecret = false;

/**
 * The session signing key, or null when sessions must not work at all
 * (production with no — or a too-short — KEYSTONE_SESSION_SECRET).
 */
export function sessionSecret(env: Env = process.env): Uint8Array | null {
  const configured = env.KEYSTONE_SESSION_SECRET?.trim();
  if (configured && configured.length >= MIN_SECRET_LENGTH) return new TextEncoder().encode(configured);
  if (isProduction(env)) return null;
  if (!warnedDevSecret) {
    warnedDevSecret = true;
    console.warn(
      `[keystone] KEYSTONE_SESSION_SECRET is ${configured ? `shorter than ${MIN_SECRET_LENGTH} characters` : "unset"}; ` +
        "using the public development key. Production refuses to issue sessions without it.",
    );
  }
  return new TextEncoder().encode(DEV_SESSION_SECRET);
}

/** The shared demo passcode and whether it is the public default (shown as a hint). */
export function demoPasscode(env: Env = process.env): { passcode: string; isDefault: boolean } {
  const configured = env.KEYSTONE_DEMO_PASSCODE;
  return configured && configured.length > 0
    ? { passcode: configured, isDefault: false }
    : { passcode: DEFAULT_DEMO_PASSCODE, isDefault: true };
}

/** Cookie attributes for the session cookie. Secure whenever the app runs in production. */
export function sessionCookieOptions(env: Env = process.env) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(env),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
