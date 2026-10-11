// Keystone demo auth — every app screen and the LLM API need a valid signed
// session. Pages redirect to /sign-in?next=<this path>; the API answers 401.
// /api/jev/* (Jev suggestions) is protected the same way.
// "/", /sign-in, /api/auth/*, static assets and icons stay public (not matched).

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionSecret } from "@/lib/auth/config";
import { verifySession } from "@/lib/auth/token";

export async function middleware(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret());
  if (session) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  // Built from this request's own path, so it is always same-origin; the
  // sign-in route re-checks it (safeNextPath) before redirecting anyway.
  url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/pulse/:path*",
    "/capture/:path*",
    "/canvas/:path*",
    "/registry/:path*",
    "/incident/:path*",
    "/approvals/:path*",
    "/learning/:path*",
    "/api/llm/:path*",
    "/api/jev/:path*",
  ],
};
