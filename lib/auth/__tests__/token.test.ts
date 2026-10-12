import { SignJWT, UnsecuredJWT } from "jose";
import { describe, expect, it, vi } from "vitest";
import { demoPasscode, sessionCookieOptions, sessionSecret, SESSION_TTL_SECONDS } from "../config";
import { passcodeMatches } from "../passcode";
import { signSession, verifySession } from "../token";

const SECRET = new TextEncoder().encode("test-secret-test-secret-test-secret-0123");
const OTHER = new TextEncoder().encode("another-secret-another-secret-another-01");
const NOW = new Date("2026-10-11T08:00:00Z");

function tamperPayload(token: string, patch: Record<string, unknown>): string {
  const [h, p, s] = token.split(".");
  const payload = { ...JSON.parse(Buffer.from(p, "base64url").toString()), ...patch };
  return [h, Buffer.from(JSON.stringify(payload)).toString("base64url"), s].join(".");
}

describe("session token", () => {
  it("signs and verifies a session for a roles.json persona", async () => {
    const token = await signSession("technician", SECRET, NOW);
    expect(await verifySession(token, SECRET, NOW)).toEqual({ role: "technician", name: "Rajesh Kumar", sessionId: expect.any(String) });
  });

  it("gives every signed session its own id (jti) — per-session rate limits key on it", async () => {
    const a = await verifySession(await signSession("technician", SECRET, NOW), SECRET, NOW);
    const b = await verifySession(await signSession("technician", SECRET, NOW), SECRET, NOW);
    expect(a?.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(a?.sessionId).not.toBe(b?.sessionId);
  });

  it("rejects a validly signed token without a jti (issued before session ids)", async () => {
    const legacy = await new SignJWT({ role: "technician", name: "Rajesh Kumar" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("keystone-demo")
      .setAudience("keystone")
      .setIssuedAt(Math.floor(NOW.getTime() / 1000))
      .setExpirationTime(Math.floor(NOW.getTime() / 1000) + 60)
      .sign(SECRET);
    expect(await verifySession(legacy, SECRET, NOW)).toBeNull();
  });

  it("binds the name to the role's persona — callers cannot choose it", async () => {
    const token = await signSession("asset_operations_manager", SECRET, NOW);
    expect((await verifySession(token, SECRET, NOW))?.name).toBe("Priya Nair");
    await expect(signSession("superuser", SECRET, NOW)).rejects.toThrow(/not defined/);
  });

  it("rejects a tampered payload (role escalation) or signature", async () => {
    const token = await signSession("technician", SECRET, NOW);
    expect(await verifySession(tamperPayload(token, { role: "executive", name: "Tan Siew Leng" }), SECRET, NOW)).toBeNull();
    const flipped = token.slice(0, -2) + (token.endsWith("A") ? "BB" : "AA");
    expect(await verifySession(flipped, SECRET, NOW)).toBeNull();
  });

  it("rejects a token signed with another key", async () => {
    expect(await verifySession(await signSession("executive", OTHER, NOW), SECRET, NOW)).toBeNull();
  });

  it("rejects an expired token (8 hours) and accepts it just before", async () => {
    const token = await signSession("executive", SECRET, NOW);
    const justBefore = new Date(NOW.getTime() + (SESSION_TTL_SECONDS - 60) * 1000);
    const after = new Date(NOW.getTime() + (SESSION_TTL_SECONDS + 60) * 1000);
    expect(await verifySession(token, SECRET, justBefore)).not.toBeNull();
    expect(await verifySession(token, SECRET, after)).toBeNull();
  });

  it('rejects alg "none", missing exp, a forged persona name and an unknown role even when validly signed', async () => {
    const unsecured = new UnsecuredJWT({ role: "executive", name: "Tan Siew Leng" })
      .setIssuer("keystone-demo")
      .setAudience("keystone")
      .setIssuedAt()
      .setExpirationTime("1h")
      .encode();
    expect(await verifySession(unsecured, SECRET)).toBeNull();

    const sign = (claims: Record<string, unknown>, exp = true) => {
      const jwt = new SignJWT(claims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("keystone-demo")
        .setAudience("keystone")
        .setIssuedAt(Math.floor(NOW.getTime() / 1000))
        .setJti("test-session-id");
      if (exp) jwt.setExpirationTime(Math.floor(NOW.getTime() / 1000) + 3600);
      return jwt.sign(SECRET);
    };
    expect(await verifySession(await sign({ role: "executive", name: "Tan Siew Leng" }, false), SECRET, NOW)).toBeNull();
    expect(await verifySession(await sign({ role: "executive", name: "Mallory" }), SECRET, NOW)).toBeNull();
    expect(await verifySession(await sign({ role: "superuser", name: "Mallory" }), SECRET, NOW)).toBeNull();
    expect(await verifySession(await sign({ role: "executive", name: "Tan Siew Leng" }), SECRET, NOW)).not.toBeNull();
  });

  it("rejects garbage and missing input", async () => {
    for (const t of ["", "abc", "a.b.c", undefined, null]) expect(await verifySession(t, SECRET, NOW)).toBeNull();
    expect(await verifySession(await signSession("technician", SECRET, NOW), null, NOW)).toBeNull();
  });
});

describe("auth configuration", () => {
  it("production without KEYSTONE_SESSION_SECRET fails closed; development falls back with a warning", () => {
    expect(sessionSecret({ NODE_ENV: "production" })).toBeNull();
    expect(sessionSecret({ NODE_ENV: "production", KEYSTONE_SESSION_SECRET: "too-short" })).toBeNull();
    expect(sessionSecret({ NODE_ENV: "production", KEYSTONE_SESSION_SECRET: "x".repeat(32) })).not.toBeNull();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(sessionSecret({ NODE_ENV: "development" })).not.toBeNull();
    warn.mockRestore();
  });

  it("the passcode defaults to the public demo hint only when unset", () => {
    expect(demoPasscode({})).toEqual({ passcode: "keystone", isDefault: true });
    expect(demoPasscode({ KEYSTONE_DEMO_PASSCODE: "s3cret" })).toEqual({ passcode: "s3cret", isDefault: false });
  });

  it("the cookie is HTTP-only, SameSite=Lax, 8h, and Secure in production", () => {
    expect(sessionCookieOptions({ NODE_ENV: "production" })).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 8 * 3600,
    });
    expect(sessionCookieOptions({ NODE_ENV: "development" }).secure).toBe(false);
  });

  it("compares passcodes exactly", () => {
    expect(passcodeMatches("keystone", "keystone")).toBe(true);
    for (const wrong of ["", "Keystone", "keystone ", "keyston", "keystone\u0000"]) {
      expect(passcodeMatches(wrong, "keystone")).toBe(false);
    }
  });
});
