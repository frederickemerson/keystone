// POST /api/auth/switch — "Switch user" in one click for a signed-in demo user.
//
// Every demo persona is unlocked by the same shared passcode, so a valid
// session already proves everything a fresh sign-in would: re-issuing it for
// another persona grants nothing the passcode does not. Without a valid
// session (none, expired, tampered) the caller must go through /sign-in.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isKnownRole, personaFor } from "@/lib/governance/access";
import { SESSION_COOKIE, sessionCookieOptions, sessionSecret } from "@/lib/auth/config";
import { crossSiteRejected, isSameOriginRequest } from "@/lib/auth/csrf";
import { signSession, verifySession } from "@/lib/auth/token";
import { readRequest } from "@/lib/llm/requests";

const bodySchema = z.object({ role: z.string().min(1).max(64) });

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return crossSiteRejected();
  const secret = sessionSecret();
  const current = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret);
  if (!current || !secret) {
    return NextResponse.json({ error: "Sign in again to switch user.", reauth: true }, { status: 401 });
  }
  // JSON-only (a cross-site form cannot send it) and size-capped.
  const json = await readRequest(request, z.unknown());
  if (json instanceof Response) return json;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || !isKnownRole(parsed.data.role)) {
    return NextResponse.json({ error: "Unknown person." }, { status: 400 });
  }
  const { role } = parsed.data;
  const response = NextResponse.json({ ok: true, actor: personaFor(role) });
  response.cookies.set(SESSION_COOKIE, await signSession(role, secret), sessionCookieOptions());
  return response;
}
