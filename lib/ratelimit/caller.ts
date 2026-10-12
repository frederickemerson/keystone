// The rate-limit identity of a request to a paid route: its signed session id
// (jti) and client IP. Server-only (reads the session cookie).

import "server-only";
import { getVerifiedSession } from "@/lib/auth/session";
import { clientIp, type Caller } from "./policies";

/** null when there is no verified session (middleware should already have refused it). */
export async function callerOf(request: Request): Promise<Caller | null> {
  const session = await getVerifiedSession();
  return session ? { sessionId: session.sessionId, ip: clientIp(request.headers) } : null;
}

export function signInRequired(): Response {
  return Response.json({ error: "Sign in required." }, { status: 401 });
}
