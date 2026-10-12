// POST /api/auth/sign-in — demo login: pick a roles.json persona + the shared
// demo passcode. Issues the signed, HTTP-only session cookie.
//
// Guards, in order: same-origin (login CSRF) → per-IP lockout after repeated
// wrong passcodes → JSON-only, size-capped body → constant-time passcode check.

import { NextResponse } from "next/server";
import { z } from "@/lib/zod";
import { isKnownRole } from "@/lib/governance/access";
import { demoPasscode, SESSION_COOKIE, sessionCookieOptions, sessionSecret } from "@/lib/auth/config";
import { crossSiteRejected, isSameOriginRequest } from "@/lib/auth/csrf";
import { passcodeMatches } from "@/lib/auth/passcode";
import { safeNextPath } from "@/lib/auth/redirect";
import { signSession } from "@/lib/auth/token";
import { readRequest } from "@/lib/llm/requests";
import { clientIp, recordSignInFailure, retryHeaders, signInLockout } from "@/lib/ratelimit/policies";

export const runtime = "nodejs";

const bodySchema = z.object({
  role: z.string().min(1).max(64),
  passcode: z.string().max(256),
  next: z.string().max(2048).optional(),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossSiteRejected();

  const ip = clientIp(request.headers);
  // Checked before the passcode is even read, so a locked-out caller learns
  // nothing about it; the comparison itself stays constant-time.
  const lockout = signInLockout(ip);
  if (!lockout.ok) {
    return NextResponse.json(
      { error: "Too many wrong passcodes. Try again shortly." },
      { status: 429, headers: retryHeaders(lockout) },
    );
  }

  const json = await readRequest(request, z.unknown());
  if (json instanceof Response) return json;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Choose a person and enter the passcode." }, { status: 400 });
  const { role, passcode, next } = parsed.data;
  if (!isKnownRole(role)) return NextResponse.json({ error: "Unknown person." }, { status: 400 });

  const secret = sessionSecret();
  if (!secret) {
    // Production without KEYSTONE_SESSION_SECRET: fail closed.
    return NextResponse.json({ error: "Sign-in is not configured on this deployment." }, { status: 503 });
  }
  if (!passcodeMatches(passcode, demoPasscode().passcode)) {
    recordSignInFailure(ip);
    return NextResponse.json({ error: "That passcode is not right." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, next: safeNextPath(next) });
  response.cookies.set(SESSION_COOKIE, await signSession(role, secret), sessionCookieOptions());
  return response;
}
