// Keystone demo auth — the authenticated session, read on the server.
// Pages call getSession() and redact on the server for session.role before any
// props reach a client component.

import "server-only";
import { cookies } from "next/headers";
import { UNRESOLVED_ROLE } from "@/lib/governance/access";
import { SESSION_COOKIE, sessionSecret } from "./config";
import { verifySession, type SessionClaims } from "./token";

export type { SessionClaims } from "./token";

/** The verified session, or null (no cookie, invalid/expired token, or no secret in production). */
export async function getSession(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token, sessionSecret());
}

/**
 * Role for server-side redaction. Middleware only lets signed-in requests
 * reach protected pages; without a session this fails closed (public data only).
 */
export async function sessionRole(): Promise<string> {
  return (await getSession())?.role ?? UNRESOLVED_ROLE;
}
