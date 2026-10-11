import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as signIn } from "@/app/api/auth/sign-in/route";
import { POST as signOut } from "@/app/api/auth/sign-out/route";
import { POST as switchUser } from "@/app/api/auth/switch/route";
import { SESSION_COOKIE } from "../config";
import { signSession, verifySession } from "../token";

const SECRET = "routes-test-secret-0123456789abcdefghij";
const KEY = new TextEncoder().encode(SECRET);

function post(path: string, body: unknown, cookie?: string): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
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
    expect(await verifySession(cookie.value, KEY)).toEqual({ role: "technician", name: "Rajesh Kumar" });
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
    expect(await verifySession(sessionCookie(res)!.value, KEY)).toEqual({ role: "asset_operations_manager", name: "Priya Nair" });
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
