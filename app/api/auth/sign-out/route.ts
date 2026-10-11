// POST /api/auth/sign-out — clears the session cookie and returns to sign-in.

import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/config";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
