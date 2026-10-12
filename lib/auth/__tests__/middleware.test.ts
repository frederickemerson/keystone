import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import * as pageStaticInfo from "next/dist/build/analysis/get-page-static-info";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, middleware } from "@/middleware";
import { SESSION_COOKIE } from "../config";
import { isPublicPath } from "../public-paths";
import { signSession } from "../token";

const SECRET = "middleware-test-secret-0123456789abcdef";

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `${SESSION_COOKIE}=${cookie}`);
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

/** Does middleware run on this path at all? Compiled by Next's own (untyped, internal) matcher compiler. */
const { getMiddlewareMatchers } = pageStaticInfo as unknown as {
  getMiddlewareMatchers: (matcher: string[], nextConfig: object) => { regexp: string }[];
};
const matcherRegexps = getMiddlewareMatchers(config.matcher, {}).map((m) => new RegExp(m.regexp));
function matched(path: string): boolean {
  return matcherRegexps.some((re) => re.test(path));
}

/** Is this path reachable without a session? (middleware runs and lets it through, or never runs.) */
async function reachableSignedOut(path: string): Promise<boolean> {
  if (!matched(path)) return true;
  return (await middleware(request(path))).headers.get("x-middleware-next") === "1";
}

/** Every page and route handler under app/, as a URL path ([param] → sample value). */
function appRoutes(): string[] {
  const root = join(process.cwd(), "app");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/^(page\.tsx|route\.ts)$/.test(entry.name)) {
        const segments = relative(root, dir).split(sep).filter((s) => s && !/^\(.*\)$/.test(s));
        out.push(`/${segments.map((s) => (s.startsWith("[") ? "sample-id" : s)).join("/")}`);
      }
    }
  };
  walk(root);
  return out.sort();
}

/** The deliberate public surface. Anything else under app/ must require a session. */
const PUBLIC_ROUTES = ["/", "/api/auth/sign-in", "/api/auth/sign-out", "/sign-in"];

describe("middleware", () => {
  beforeEach(() => {
    vi.stubEnv("KEYSTONE_SESSION_SECRET", SECRET);
  });

  it("redirects a signed-out page request to /sign-in with a relative next", async () => {
    const res = await middleware(request("/incident/INC-2026-1011?step=10"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.origin).toBe("http://localhost:3000");
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("next")).toBe("/incident/INC-2026-1011?step=10");
  });

  it("next is always this request's own path — never another origin", async () => {
    const res = await middleware(request("//evil.example/pulse"));
    const next = new URL(res.headers.get("location")!).searchParams.get("next")!;
    expect(new URL(next, "http://localhost:3000").origin).toBe("http://localhost:3000");
  });

  it("answers 401 (not a redirect) for the LLM API", async () => {
    const res = await middleware(request("/api/llm/extract"));
    expect(res.status).toBe(401);
  });

  it("lets a valid session through", async () => {
    const token = await signSession("technician", new TextEncoder().encode(SECRET));
    const res = await middleware(request("/pulse", token));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects a tampered or foreign-key session", async () => {
    const foreign = await signSession("executive", new TextEncoder().encode("x".repeat(40)));
    expect((await middleware(request("/pulse", foreign))).status).toBe(307);
    expect((await middleware(request("/pulse", "not-a-jwt"))).status).toBe(307);
  });

  it("protects every app screen and the LLM/Jev API; leaves /, /sign-in, sign-in/out API and assets public", async () => {
    for (const p of [
      "/pulse",
      "/capture",
      "/canvas/technical-services-chilled-water-leak",
      "/registry",
      "/incident/INC-2026-1011",
      "/approvals",
      "/learning/technical-services-chilled-water-leak",
      "/api/llm/extract",
      "/api/llm/tenant-message",
      "/api/jev/suggest",
      "/api/auth/switch",
    ]) {
      expect(await reachableSignedOut(p), p).toBe(false);
    }
    for (const p of [
      "/",
      "/sign-in",
      "/api/auth/sign-in",
      "/api/auth/sign-out",
      "/icon.svg",
      "/apple-icon",
      "/robots.txt",
      "/landing/video-poster.png",
      "/_next/static/chunks/x.js",
      "/_next/image",
    ]) {
      expect(await reachableSignedOut(p), p).toBe(true);
    }
  });

  it("DEFAULT DENY: paths nobody listed (new pages, new APIs, look-alikes) need a session", async () => {
    for (const p of [
      "/new-feature",
      "/api/new-route",
      "/api/llm",
      "/api/auth/anything-else",
      "/sign-in-admin",
      "/sign-in/extra",
      "/landing", // only files under /landing/ are public
      "/pulse.rsc",
      "/_next/data/build/pulse.json",
    ]) {
      expect(await reachableSignedOut(p), p).toBe(false);
    }
  });

  it("every page and route handler under app/ is protected unless explicitly allowlisted", async () => {
    const routes = appRoutes();
    expect(routes.length).toBeGreaterThan(10);
    for (const path of routes) {
      expect(await reachableSignedOut(path), path).toBe(PUBLIC_ROUTES.includes(path));
    }
    // The allowlist names only routes that exist, so it cannot drift silently.
    for (const path of PUBLIC_ROUTES) expect(routes, path).toContain(path);
  });

  it("the allowlist is exact: no prefix match leaks to siblings", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-in/")).toBe(false);
    expect(isPublicPath("/api/auth/switch")).toBe(false);
  });
});
