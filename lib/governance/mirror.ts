// Mirroring the session's audit log into the durable record.
//
// The rule this file obeys: it may never change what the person sees. The
// browser's log stays the source of truth for the session, every write here is
// fire-and-forget, nothing awaits it, and a failure is silent to the flow and
// visible only where the screen reports whether the record is durable.
//
// Events are batched on a short timer rather than sent one per action: a
// Canvas review is a dozen appends in a few seconds, and a dozen round trips
// for one human gesture is rude to a serverless function. Each event carries
// its own id, and the server is idempotent per (session, id), so a retry or a
// double-send cannot double-count the record.

import type { AuditEvent } from './audit';

/** The browser session this log belongs to. Not identity — a demo session key. */
const SESSION_KEY = 'keystone.mirror.session';

/** How long to gather appends before sending them. One human gesture, one request. */
const BATCH_MS = 1_200;

export type MirrorState =
  | { kind: 'unknown' }
  | { kind: 'durable'; written: number }
  | { kind: 'session-only'; reason: string };

let queue: AuditEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let state: MirrorState = { kind: 'unknown' };
const listeners = new Set<(state: MirrorState) => void>();

function announce(next: MirrorState): void {
  state = next;
  for (const listener of listeners) listener(next);
}

export function mirrorState(): MirrorState {
  return state;
}

export function onMirrorState(listener: (state: MirrorState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function sessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    // Not crypto-random on purpose: it is a grouping key for a demo record,
    // never a credential, and must survive a reload.
    const made = `s-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    localStorage.setItem(SESSION_KEY, made);
    return made;
  } catch {
    return 's-ephemeral';
  }
}

/** Shape one audit event for the wire: the server validates this exactly. */
function toWire(event: AuditEvent): Record<string, unknown> {
  const { id, at, actor, role, action, pillId, pillVersion, incidentId, ruleId, ...rest } = event as AuditEvent &
    Record<string, unknown>;
  const detail = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
  return {
    id,
    at,
    actor,
    role,
    action,
    ...(pillId ? { pillId } : {}),
    ...(pillVersion ? { pillVersion } : {}),
    ...(incidentId ? { incidentId } : {}),
    ...(ruleId ? { ruleId } : {}),
    ...(Object.keys(detail).length ? { detail } : {}),
  };
}

async function flush(): Promise<void> {
  const batch = queue;
  queue = [];
  timer = null;
  if (!batch.length) return;

  try {
    const response = await fetch('/api/governance/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId(), events: batch.map(toWire) }),
      keepalive: true,
    });
    const body = (await response.json().catch(() => ({}))) as { persisted?: boolean; written?: number; reason?: string };
    if (response.ok && body.persisted) {
      const written = (state.kind === 'durable' ? state.written : 0) + (body.written ?? batch.length);
      announce({ kind: 'durable', written });
      return;
    }
    announce({ kind: 'session-only', reason: body.reason ?? 'The durable record did not accept the write.' });
  } catch {
    announce({ kind: 'session-only', reason: 'The durable record could not be reached from this browser.' });
  }
}

/**
 * Record one audit event durably, eventually. Safe to call from anywhere,
 * including a server render, where it does nothing.
 */
export function mirrorAudit(event: AuditEvent): void {
  if (typeof window === 'undefined') return;
  queue.push(event);
  if (timer) return;
  timer = setTimeout(() => {
    void flush();
  }, BATCH_MS);
}

/** Send whatever is queued now — for a tab that is closing. */
export function flushMirror(): void {
  if (typeof window === 'undefined') return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  void flush();
}
