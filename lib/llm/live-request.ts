// Client-side call to a live LLM route. Client-safe: no SDK imports, no secrets.
//
// The server answers within LLM_SERVER_BUDGET_MS (live output or the recorded
// fixture, with a reason). The client waits LLM_CLIENT_WAIT_MS at most and
// otherwise shows the caller's recorded fallback with an explicit reason —
// never an open-ended spinner, and never a provider name it did not get back.

import { LLM_CLIENT_WAIT_MS, type Generation } from './attribution';

export type LiveFailure = 'timeout' | 'rate-limited' | 'unauthorised' | 'request-failed' | 'invalid-response';

export const LIVE_FAILURE_REASON: Readonly<Record<LiveFailure, string>> = {
  timeout: `No answer within ${LLM_CLIENT_WAIT_MS / 1000} s; showing the recorded output.`,
  'rate-limited': 'Live drafting is rate-limited right now; showing the recorded output.',
  unauthorised: 'Sign in to draft live; showing the recorded output.',
  'request-failed': 'Live request failed; showing the recorded output.',
  'invalid-response': 'Live response was malformed; showing the recorded output.',
};

export interface LiveRequestOptions<T> {
  /** Recorded output to show if the request does not produce a usable Generation. */
  fallback: (reason: string) => Generation<T>;
  timeoutMs?: number;
  /** Caller-owned cancellation (e.g. component unmount or a newer request). */
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

function isGeneration(value: unknown): value is Generation<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Partial<Generation<unknown>>;
  return (g.source === 'live' || g.source === 'recorded') && typeof g.provider === 'string'
    && typeof g.model === 'string' && typeof g.latencyMs === 'number' && 'data' in g;
}

function failureFor(status: number): LiveFailure {
  if (status === 429) return 'rate-limited';
  if (status === 401 || status === 403) return 'unauthorised';
  return 'request-failed';
}

/**
 * POST `body` to `url` and return the server's Generation, or the caller's
 * recorded fallback (with a reason) on timeout, HTTP error or malformed body.
 * Rejects only when the caller's own `signal` aborts.
 */
export async function requestLive<T>(url: string, body: unknown, options: LiveRequestOptions<T>): Promise<Generation<T>> {
  const { fallback, timeoutMs = LLM_CLIENT_WAIT_MS, signal, fetchImpl = fetch } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetchImpl(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) return fallback(LIVE_FAILURE_REASON[failureFor(response.status)]);
    const json: unknown = await response.json();
    return isGeneration(json) ? (json as Generation<T>) : fallback(LIVE_FAILURE_REASON['invalid-response']);
  } catch (error) {
    if (signal?.aborted) throw error;
    return fallback(LIVE_FAILURE_REASON[timedOut ? 'timeout' : 'request-failed']);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
