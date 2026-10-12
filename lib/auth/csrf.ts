// Keystone demo auth — same-origin guard for the state-changing auth routes
// (login/logout/switch CSRF). Edge-safe. JSON-only bodies are enforced by
// readRequest (lib/llm/requests.ts): a cross-site HTML form cannot send
// application/json without a CORS preflight.
//
// Browsers attach Origin to every cross-origin POST and Sec-Fetch-Site to every
// request they make, and a page cannot forge either. So:
//   - Sec-Fetch-Site present and not "same-origin" → cross-site → reject.
//   - Origin present and not this host → reject.
//   - Neither present → not a browser (curl, server-to-server); CSRF needs a
//     victim's browser, so there is nothing to forge — allow.

/** Hosts this request could legitimately originate from (the host the browser addressed). */
function ownHosts(request: Request): Set<string> {
  const hosts = new Set<string>([new URL(request.url).host]);
  // The browser sets Host itself (a cross-site page cannot choose it); behind
  // Vercel's edge the public host also arrives as x-forwarded-host.
  for (const name of ["host", "x-forwarded-host"]) {
    const value = request.headers.get(name)?.split(",")[0]?.trim();
    if (value) hosts.add(value.toLowerCase());
  }
  return hosts;
}

export function isSameOriginRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false; // "null" (sandboxed/opaque origin) or garbage
  }
  return ownHosts(request).has(host);
}

export function crossSiteRejected(): Response {
  return Response.json({ error: "Cross-site request refused." }, { status: 403 });
}
