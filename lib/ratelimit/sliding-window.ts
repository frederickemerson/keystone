// In-memory sliding-window (log) rate limiter.
//
// HONEST LIMITATION: state lives in this server instance's memory. On Vercel
// each serverless/Fluid instance keeps its own counters, and a cold start
// resets them, so the effective limit across the deployment is
// (limit × concurrently warm instances). It bounds a single client hammering
// one warm instance — the common abuse shape — and gives a per-instance global
// ceiling, but it is NOT a deployment-wide quota. Production should back this
// with a shared store (Upstash Redis / Vercel KV via @upstash/ratelimit) or a
// Vercel WAF rate-limit rule. See docs/DECISIONS.md (D6).

export interface WindowSpec {
  /** Label used in logs/tests, e.g. "llm:session:minute". */
  name: string;
  /** Maximum events allowed inside any window of `windowMs`. */
  limit: number;
  windowMs: number;
}

/** Hard cap on tracked keys so a flood of distinct keys cannot exhaust memory. */
const DEFAULT_MAX_KEYS = 10_000;

export class SlidingWindow {
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
  private readonly maxKeys: number;
  /** key → ascending event timestamps (ms) still inside the window. */
  private readonly events = new Map<string, number[]>();

  constructor(spec: WindowSpec, maxKeys: number = DEFAULT_MAX_KEYS) {
    if (!(spec.limit > 0) || !(spec.windowMs > 0)) throw new Error(`Invalid rate-limit window ${spec.name}`);
    this.name = spec.name;
    this.limit = spec.limit;
    this.windowMs = spec.windowMs;
    this.maxKeys = maxKeys;
  }

  private live(key: string, now: number): number[] {
    const log = this.events.get(key);
    if (!log) return [];
    const cutoff = now - this.windowMs;
    let drop = 0;
    while (drop < log.length && log[drop] <= cutoff) drop++;
    if (drop > 0) log.splice(0, drop);
    if (log.length === 0) this.events.delete(key);
    return log;
  }

  /** Milliseconds until one more event would fit (0 when it fits now). */
  retryAfterMs(key: string, now: number): number {
    const log = this.live(key, now);
    if (log.length < this.limit) return 0;
    // The oldest event that must expire for the log to drop below the limit.
    return log[log.length - this.limit] + this.windowMs - now;
  }

  record(key: string, now: number): void {
    let log = this.events.get(key);
    if (!log) {
      if (this.events.size >= this.maxKeys) this.evict(now);
      log = [];
      this.events.set(key, log);
    }
    log.push(now);
  }

  private evict(now: number): void {
    for (const key of [...this.events.keys()]) this.live(key, now);
    // Still full: drop the least recently created keys (Map keeps insertion order).
    for (const key of this.events.keys()) {
      if (this.events.size < this.maxKeys) break;
      this.events.delete(key);
    }
  }

  /** Test helper: forget everything. */
  reset(): void {
    this.events.clear();
  }
}

export type LimitCheck = readonly [window: SlidingWindow, key: string];

export type LimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; window: string };

/**
 * All-or-nothing: the event is recorded in every window only when every window
 * still has room, so a rejected request never consumes another window's quota.
 * Synchronous, so concurrent requests on one instance cannot interleave
 * between the check and the record.
 */
export function consume(checks: readonly LimitCheck[], now: number = Date.now()): LimitResult {
  const blocked = check(checks, now);
  if (!blocked.ok) return blocked;
  for (const [window, key] of checks) window.record(key, now);
  return { ok: true };
}

/** Like consume(), but records nothing. */
export function check(checks: readonly LimitCheck[], now: number = Date.now()): LimitResult {
  let worst: { ms: number; window: string } | null = null;
  for (const [window, key] of checks) {
    const ms = window.retryAfterMs(key, now);
    if (ms > 0 && (!worst || ms > worst.ms)) worst = { ms, window: window.name };
  }
  return worst ? { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(worst.ms / 1000)), window: worst.window } : { ok: true };
}
