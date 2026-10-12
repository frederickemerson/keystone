import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as signIn } from "@/app/api/auth/sign-in/route";
import { POST as signOut } from "@/app/api/auth/sign-out/route";
import { POST as switchUser } from "@/app/api/auth/switch/route";
import { resetAllLimits } from "@/lib/ratelimit/policies";
import { SESSION_COOKIE } from "../config";
import { signSession, verifySession } from "../token";

vi.mock("server-only", () => ({}));

const SECRET = "routes-test-secret-0123456789abcdefghij";
const KEY = new TextEncoder().encode(SECRET);

function post(path: string, body: unknown, cookie?: string, extra: Record<string, string> = {}): NextRequest {
  const headers = new Headers({ "content-type": "application/json", ...extra });
  if (cookie) headers.set("cookie", `${SESSION_COOKIE}=${cookie}`);
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** The session cookie a response sets (value + attributes). */
function sessionCookie(res: Response): { value: string; attrs: string } | null {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!raw) return null;
  const [pair, ...attrs] = raw.split(";");
  return { value: pair.slice(SESSION_COOKIE.length + 1), attrs: attrs.join(";").toLowerCase() };
}

beforeEach(() => {
  resetAllLimits();
  vi.stubEnv("KEYSTONE_SESSION_SECRET", SECRET);
  vi.stubEnv("KEYSTONE_DEMO_PASSCODE", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/auth/sign-in", () => {
  it("issues a signed, HTTP-only, SameSite=Lax 8h session for the chosen persona", async () => {
    const res = await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone", next: "/incident/INC-2026-1011" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, next: "/incident/INC-2026-1011" });
    const cookie = sessionCookie(res)!;
    expect(cookie.attrs).toContain("httponly");
    expect(cookie.attrs).toContain("samesite=lax");
    expect(cookie.attrs).toContain("max-age=28800");
    expect(cookie.attrs).toContain("path=/");
    expect(await verifySession(cookie.value, KEY)).toEqual({ role: "technician", name: "Rajesh Kumar", sessionId: expect.any(String) });
  });

  it("uses KEYSTONE_DEMO_PASSCODE when set (the default no longer works)", async () => {
    vi.stubEnv("KEYSTONE_DEMO_PASSCODE", "harbourfront");
    expect((await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone" }))).status).toBe(401);
    expect((await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "harbourfront" }))).status).toBe(200);
  });

  it("rejects a wrong passcode, unknown role and malformed bodies without a cookie", async () => {
    for (const [body, status] of [
      [{ role: "technician", passcode: "nope" }, 401],
      [{ role: "superuser", passcode: "keystone" }, 400],
      [{ role: "technician" }, 400],
      [{ role: 42, passcode: "keystone" }, 400],
      ["{not json", 400],
    ] as const) {
      const res = await signIn(post("/api/auth/sign-in", body));
      expect(res.status).toBe(status);
      expect(sessionCookie(res)).toBeNull();
    }
  });

  it("never echoes an off-site next", async () => {
    const res = await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone", next: "//evil.example" }));
    expect((await res.json()).next).toBe("/pulse");
  });

  it("fails closed in production without a session secret", async () => {
    vi.stubEnv("KEYSTONE_SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const res = await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone" }));
    expect(res.status).toBe(503);
    expect(sessionCookie(res)).toBeNull();
  });

  it("sets Secure on the cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone" }));
    expect(sessionCookie(res)!.attrs).toContain("secure");
  });
});

describe("POST /api/auth/sign-out", () => {
  it("clears the cookie and returns to sign-in", async () => {
    const res = await signOut(post("/api/auth/sign-out", {}));
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/sign-in");
    const cookie = sessionCookie(res)!;
    expect(cookie.value).toBe("");
    expect(cookie.attrs).toContain("max-age=0");
  });
});

describe("POST /api/auth/switch (switch user)", () => {
  it("re-issues a valid session for another persona in one call", async () => {
    const current = await signSession("chief_engineer", KEY);
    const res = await switchUser(post("/api/auth/switch", { role: "asset_operations_manager" }, current));
    expect(res.status).toBe(200);
    expect((await res.json()).actor).toEqual({ name: "Priya Nair", role: "asset_operations_manager" });
    expect(await verifySession(sessionCookie(res)!.value, KEY)).toEqual({ role: "asset_operations_manager", name: "Priya Nair", sessionId: expect.any(String) });
  });

  it("without a valid session, sends the caller back through sign-in", async () => {
    for (const cookie of [undefined, "garbage", await signSession("executive", new TextEncoder().encode("y".repeat(40)))]) {
      const res = await switchUser(post("/api/auth/switch", { role: "executive" }, cookie));
      expect(res.status).toBe(401);
      expect((await res.json()).reauth).toBe(true);
      expect(sessionCookie(res)).toBeNull();
    }
  });

  it("rejects an unknown role", async () => {
    const current = await signSession("technician", KEY);
    const res = await switchUser(post("/api/auth/switch", { role: "superuser" }, current));
    expect(res.status).toBe(400);
    expect(sessionCookie(res)).toBeNull();
  });
});

describe("login/logout/switch CSRF", () => {
  const SAME = { origin: "http://localhost:3000", "sec-fetch-site": "same-origin" };
  const CROSS_ORIGIN = { origin: "https://evil.example" };
  const CROSS_SITE = { "sec-fetch-site": "cross-site" };

  it("sign-in accepts a same-origin browser request and refuses cross-site ones", async () => {
    const body = { role: "technician", passcode: "keystone" };
    expect((await signIn(post("/api/auth/sign-in", body, undefined, SAME))).status).toBe(200);
    for (const headers of [CROSS_ORIGIN, CROSS_SITE, { origin: "null" }, { "sec-fetch-site": "same-site" }]) {
      const res = await signIn(post("/api/auth/sign-in", body, undefined, headers));
      expect(res.status, JSON.stringify(headers)).toBe(403);
      expect(sessionCookie(res)).toBeNull();
    }
  });

  it("sign-in and switch refuse non-JSON bodies (what a cross-site HTML form can send)", async () => {
    const form = (path: string, cookie?: string) => {
      const headers = new Headers({ "content-type": "text/plain" });
      if (cookie) headers.set("cookie", `${SESSION_COOKIE}=${cookie}`);
      return new NextRequest(new URL(path, "http://localhost:3000"), {
        method: "POST", headers, body: JSON.stringify({ role: "executive", passcode: "keystone" }),
      });
    };
    const signInRes = await signIn(form("/api/auth/sign-in"));
    expect(signInRes.status).toBe(415);
    expect(sessionCookie(signInRes)).toBeNull();
    const switchRes = await switchUser(form("/api/auth/switch", await signSession("technician", KEY)));
    expect(switchRes.status).toBe(415);
    expect(sessionCookie(switchRes)).toBeNull();
  });

  it("switch and sign-out refuse cross-site requests", async () => {
    const current = await signSession("technician", KEY);
    const sw = await switchUser(post("/api/auth/switch", { role: "executive" }, current, CROSS_ORIGIN));
    expect(sw.status).toBe(403);
    expect(sessionCookie(sw)).toBeNull();
    const out = await signOut(post("/api/auth/sign-out", {}, current, CROSS_SITE));
    expect(out.status).toBe(403);
    expect(sessionCookie(out)).toBeNull();
  });

  it("sign-out still works from the same-origin HTML form (form-encoded body)", async () => {
    const req = new NextRequest(new URL("/api/auth/sign-out", "http://localhost:3000"), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", ...SAME },
      body: "",
    });
    expect((await signOut(req)).status).toBe(303);
  });

  it("accepts the public host behind a proxy (x-forwarded-host)", async () => {
    const res = await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone" }, undefined, {
      origin: "https://keystone.example", "x-forwarded-host": "keystone.example",
    }));
    expect(res.status).toBe(200);
  });
});

describe("sign-in brute-force limit", () => {
  const ip = (addr: string) => ({ "x-forwarded-for": addr });

  it("locks an IP out after 10 wrong passcodes in a minute — even the right passcode then gets 429", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await signIn(post("/api/auth/sign-in", { role: "technician", passcode: `guess-${i}` }, undefined, ip("203.0.113.20")))).status).toBe(401);
    }
    const locked = await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone" }, undefined, ip("203.0.113.20")));
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(sessionCookie(locked)).toBeNull();
    // Another address is unaffected.
    expect((await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone" }, undefined, ip("203.0.113.21")))).status).toBe(200);
  });

  it("successful sign-ins do not count (a venue NAT of honest users is never locked out)", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await signIn(post("/api/auth/sign-in", { role: "technician", passcode: "keystone" }, undefined, ip("203.0.113.22")))).status).toBe(200);
    }
  });
});
