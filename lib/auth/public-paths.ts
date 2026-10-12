// Keystone demo auth — the ONLY paths reachable without a session. Everything
// else is denied by middleware.ts. Edge-safe. Adding to this list is a
// security decision: lib/auth/__tests__/middleware.test.ts pins it.

/** Exact public paths. */
export const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  "/", // landing
  "/sign-in",
  "/api/auth/sign-in",
  // Clearing a cookie needs no session (an expired session must still be able to sign out).
  "/api/auth/sign-out",
  "/robots.txt",
  "/icon.svg",
  "/apple-icon",
  "/favicon.ico",
]);

/** Public path prefixes: landing images under public/landing and Next's own assets. */
export const PUBLIC_PREFIXES: readonly string[] = [
  "/landing/",
  "/_next/",
  // Next dev-overlay endpoints (never served in production builds).
  "/__nextjs_",
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}
