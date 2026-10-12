// Keystone demo auth — the signed session token (JWS, HS256, via jose).
// Edge-safe: middleware verifies it on every protected request.

import { errors, jwtVerify, SignJWT } from "jose";
import { isKnownRole, personaFor, sameIdentity } from "@/lib/governance/access";
import { SESSION_AUDIENCE, SESSION_ISSUER, SESSION_TTL_SECONDS } from "./config";

/** Who the session says is signed in: a roles.json role and its named persona. */
export interface SessionClaims {
  role: string;
  name: string;
}

/** A verified token: the identity plus this signed session's unique id (JWT `jti`). */
export interface VerifiedSession extends SessionClaims {
  /** Per-session rate limits key on it. Server-only bookkeeping — not passed to client props. */
  sessionId: string;
}

/** Sign a session for a roles.json role. The name is always that role's persona — never caller-chosen. */
export async function signSession(role: string, secret: Uint8Array, now: Date = new Date()): Promise<string> {
  if (!isKnownRole(role)) throw new Error(`Role "${role}" is not defined in data/roles.json`);
  const { name } = personaFor(role);
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({ role, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt(iat)
    .setJti(crypto.randomUUID())
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(secret);
}

/**
 * Verify a session token. Returns null for anything not issued by us and still
 * valid: bad signature, other algorithm, expired, wrong issuer/audience, no
 * session id (jti), or a role/name pair that is not a roles.json persona.
 */
export async function verifySession(
  token: string | undefined | null,
  secret: Uint8Array | null,
  now: Date = new Date(),
): Promise<VerifiedSession | null> {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      currentDate: now,
      // A token without a jti predates per-session limits: it must sign in again.
      requiredClaims: ["exp", "iat", "jti"],
    });
    const { role, name, jti } = payload;
    if (typeof role !== "string" || typeof name !== "string" || !isKnownRole(role)) return null;
    if (typeof jti !== "string" || jti.length === 0 || jti.length > 128) return null;
    if (!sameIdentity(name, personaFor(role).name)) return null;
    return { role, name: personaFor(role).name, sessionId: jti };
  } catch (err) {
    if (err instanceof errors.JOSEError) return null;
    throw err;
  }
}
