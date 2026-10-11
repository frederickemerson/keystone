import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, middleware } from "@/middleware";
import { SESSION_COOKIE } from "../config";
import { signSession } from "../token";

const SECRET = "middleware-test-secret-0123456789abcdef";

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `${SESSION_COOKIE}=${cookie}`);
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

/** Does the matcher protect this path? (Next compiles the same patterns.) */
function matched(path: string): boolean {
  return config.matcher.some((m) => new RegExp(`^${m.replace("/:path*", "(?:/.*)?")}$`).test(path));
}

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

  it("protects every app screen and the LLM API; leaves /, /sign-in, auth API and assets public", () => {
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
    ]) {
      expect(matched(p), p).toBe(true);
    }
    for (const p of ["/", "/sign-in", "/api/auth/sign-in", "/api/auth/sign-out", "/icon.svg", "/apple-icon", "/_next/static/x.js"]) {
      expect(matched(p), p).toBe(false);
    }
  });
});
