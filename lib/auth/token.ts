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
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(secret);
}

/**
 * Verify a session token. Returns null for anything not issued by us and still
 * valid: bad signature, other algorithm, expired, wrong issuer/audience, or a
 * role/name pair that is not a roles.json persona.
 */
export async function verifySession(
  token: string | undefined | null,
  secret: Uint8Array | null,
  now: Date = new Date(),
): Promise<SessionClaims | null> {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      currentDate: now,
      requiredClaims: ["exp", "iat"],
    });
    const { role, name } = payload;
    if (typeof role !== "string" || typeof name !== "string" || !isKnownRole(role)) return null;
    if (!sameIdentity(name, personaFor(role).name)) return null;
    return { role, name: personaFor(role).name };
  } catch (err) {
    if (err instanceof errors.JOSEError) return null;
    throw err;
  }
}
