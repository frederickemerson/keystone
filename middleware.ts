// Keystone demo auth — DEFAULT DENY. Every path needs a valid signed session
// unless it is on the explicit public allowlist below (lib/auth/public-paths.ts).
// A new page or API route is therefore protected the moment it exists.
// Pages redirect to /sign-in?next=<this path>; the API answers 401.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionSecret } from "@/lib/auth/config";
import { isPublicPath } from "@/lib/auth/public-paths";
import { verifySession } from "@/lib/auth/token";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret());
  if (session) return NextResponse.next();

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
  // Run on everything except Next's own build output (hashed, immutable, no
  // user data). The allowlist decision itself lives in code, where it is tested.
  matcher: ["/((?!_next/static/|_next/image).*)"],
};
