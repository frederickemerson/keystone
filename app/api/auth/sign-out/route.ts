// POST /api/auth/sign-out — clears the session cookie and returns to sign-in.
// Posted by a plain HTML form (the shell's user menu), so the body is not JSON;
// the same-origin check alone stops a cross-site page logging the user out.

import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/config";
import { crossSiteRejected, isSameOriginRequest } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossSiteRejected();
  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
