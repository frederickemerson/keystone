// Keystone cost and brute-force guards: the concrete limits for the paid
// LLM/Jev routes and for sign-in. Backed by the per-instance in-memory
// SlidingWindow — read the limitation note in ./sliding-window.ts.
//
// Keys:
//   session:<jti>  the signed session's id. Re-signing in mints a new jti, which
//                  is why every per-session limit is paired with a per-IP one.
//   ip:<addr>      the client address Vercel's edge writes into x-forwarded-for.
//   global         this instance as a whole (a spend ceiling per warm instance).

import { check, consume, SlidingWindow, type LimitCheck, type LimitResult } from "./sliding-window";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The limits, in one place (reported in docs/DECISIONS.md D6). */
export const LIMITS = {
  llm: {
    sessionPerMinute: 10,
    sessionPerDay: 40,
    // An IP can carry many sessions (judges on one venue network), so it is looser.
    ipPerMinute: 20,
    ipPerDay: 120,
    globalPerMinute: 60,
    globalPerDay: 500,
  },
  /**
   * The tightest limits here, and deliberately so. Every ADP call spends the
   * account's own agent quota at Tencent, and the demo passcode ships with the
   * submission — so "has a session" says nothing about who is asking. These
   * numbers are a demo budget (a judge can ask a handful of questions), not a
   * production allowance.
   */
  adp: {
    sessionPerMinute: 3,
    sessionPerDay: 15,
    ipPerMinute: 5,
    ipPerDay: 30,
    globalPerMinute: 10,
    globalPerDay: 100,
  },
  jev: {
    sessionPerMinute: 60,
    ipPerMinute: 120,
    globalPerMinute: 600,
  },
  signIn: {
    // Counts failed passcode attempts only, so a venue NAT of honest judges is never locked out.
    ipFailuresPerMinute: 10,
    ipFailuresPerHour: 50,
  },
} as const;

function windows<K extends string>(
  prefix: string,
  specs: Record<K, readonly [limit: number, windowMs: number]>,
): Record<K, SlidingWindow> {
  const out = {} as Record<K, SlidingWindow>;
  for (const k of Object.keys(specs) as K[]) {
    const [limit, windowMs] = specs[k];
    out[k] = new SlidingWindow({ name: `${prefix}:${k}`, limit, windowMs });
  }
  return out;
}

const llm = windows("llm", {
  sessionMinute: [LIMITS.llm.sessionPerMinute, MINUTE],
  sessionDay: [LIMITS.llm.sessionPerDay, DAY],
  ipMinute: [LIMITS.llm.ipPerMinute, MINUTE],
  ipDay: [LIMITS.llm.ipPerDay, DAY],
  globalMinute: [LIMITS.llm.globalPerMinute, MINUTE],
  globalDay: [LIMITS.llm.globalPerDay, DAY],
});

const adp = windows("adp", {
  sessionMinute: [LIMITS.adp.sessionPerMinute, MINUTE],
  sessionDay: [LIMITS.adp.sessionPerDay, DAY],
  ipMinute: [LIMITS.adp.ipPerMinute, MINUTE],
  ipDay: [LIMITS.adp.ipPerDay, DAY],
  globalMinute: [LIMITS.adp.globalPerMinute, MINUTE],
  globalDay: [LIMITS.adp.globalPerDay, DAY],
});

const jev = windows("jev", {
  sessionMinute: [LIMITS.jev.sessionPerMinute, MINUTE],
  ipMinute: [LIMITS.jev.ipPerMinute, MINUTE],
  globalMinute: [LIMITS.jev.globalPerMinute, MINUTE],
});

const signIn = windows("sign-in", {
  ipMinute: [LIMITS.signIn.ipFailuresPerMinute, MINUTE],
  ipHour: [LIMITS.signIn.ipFailuresPerHour, HOUR],
});

export interface Caller {
  /** The session's jti. */
  sessionId: string;
  ip: string;
}

/** Spend one live LLM call for this caller, or say why not. */
export function takeLlmCall({ sessionId, ip }: Caller, now?: number): LimitResult {
  const checks: LimitCheck[] = [
    [llm.sessionMinute, `session:${sessionId}`],
    [llm.sessionDay, `session:${sessionId}`],
    [llm.ipMinute, `ip:${ip}`],
    [llm.ipDay, `ip:${ip}`],
    [llm.globalMinute, "global"],
    [llm.globalDay, "global"],
  ];
  return consume(checks, now);
}

/**
 * Spend one live ADP agent call for this caller, or say why not.
 *
 * Checked in the same all-or-nothing way as the LLM windows: a refused call
 * records nothing, so being over one limit never burns another's quota.
 */
export function takeAdpCall({ sessionId, ip }: Caller, now?: number): LimitResult {
  return consume(
    [
      [adp.sessionMinute, `session:${sessionId}`],
      [adp.sessionDay, `session:${sessionId}`],
      [adp.ipMinute, `ip:${ip}`],
      [adp.ipDay, `ip:${ip}`],
      [adp.globalMinute, "global"],
      [adp.globalDay, "global"],
    ],
    now,
  );
}

/** Spend one Jev call for this caller, or say why not. */
export function takeJevCall({ sessionId, ip }: Caller, now?: number): LimitResult {
  return consume(
    [
      [jev.sessionMinute, `session:${sessionId}`],
      [jev.ipMinute, `ip:${ip}`],
      [jev.globalMinute, "global"],
    ],
    now,
  );
}

const signInChecks = (ip: string): LimitCheck[] => [
  [signIn.ipMinute, `ip:${ip}`],
  [signIn.ipHour, `ip:${ip}`],
];

/** Is this IP locked out of sign-in (too many failed passcodes)? Records nothing. */
export function signInLockout(ip: string, now?: number): LimitResult {
  return check(signInChecks(ip), now);
}

/** Count one failed passcode attempt from this IP. */
export function recordSignInFailure(ip: string, now: number = Date.now()): void {
  for (const [window, key] of signInChecks(ip)) window.record(key, now);
}

/**
 * The client address. On Vercel the edge overwrites x-forwarded-for with the
 * real client IP (a client-sent value is not passed through), so the first hop
 * is authoritative there. Off Vercel, behind no proxy, the header is
 * client-controlled — another reason the per-session and global windows exist.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 headers for a limited response. */
export function retryHeaders(result: Extract<LimitResult, { ok: false }>): Record<string, string> {
  return { "Retry-After": String(result.retryAfterSeconds) };
}

/** Test helper: clear every window. */
export function resetAllLimits(): void {
  for (const group of [llm, adp, jev, signIn]) for (const w of Object.values(group)) w.reset();
}
