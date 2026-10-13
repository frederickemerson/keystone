// Rate limits for POST /api/ingest.
//
// These sit here rather than in lib/ratelimit/policies.ts because ingestion
// spends nothing: it reads the pills on disk and answers. The limits exist to
// bound the work a single caller can ask one warm instance to do, not to guard
// a model budget. They are built on the same sliding window as the metered
// routes, and inherit its honest limitation (per-instance memory — see
// lib/ratelimit/sliding-window.ts).

import { consume, SlidingWindow, type LimitResult } from '@/lib/ratelimit/sliding-window';
import type { Caller } from '@/lib/ratelimit/policies';

const MINUTE = 60_000;

/** A building feed posts often; a judge clicking the demo posts rarely. */
export const INGEST_LIMITS = {
  sessionPerMinute: 60,
  ipPerMinute: 120,
  globalPerMinute: 600,
} as const;

const windows = {
  session: new SlidingWindow({ name: 'ingest:session:minute', limit: INGEST_LIMITS.sessionPerMinute, windowMs: MINUTE }),
  ip: new SlidingWindow({ name: 'ingest:ip:minute', limit: INGEST_LIMITS.ipPerMinute, windowMs: MINUTE }),
  global: new SlidingWindow({ name: 'ingest:global:minute', limit: INGEST_LIMITS.globalPerMinute, windowMs: MINUTE }),
};

/** Spend one ingestion post for this caller, or say why not. */
export function takeIngestPost({ sessionId, ip }: Caller, now?: number): LimitResult {
  return consume(
    [
      [windows.session, `session:${sessionId}`],
      [windows.ip, `ip:${ip}`],
      [windows.global, 'global'],
    ],
    now,
  );
}

/** Test helper: clear the ingest windows. */
export function resetIngestLimits(): void {
  for (const window of Object.values(windows)) window.reset();
}
