import { afterEach, describe, expect, it, vi } from 'vitest';
import { LLM_CLIENT_WAIT_MS, LLM_SERVER_BUDGET_MS, type Generation } from '../attribution';
import { LIVE_FAILURE_REASON, requestLive } from '../live-request';

const recorded = (reason: string): Generation<string> => ({
  data: 'recorded', source: 'recorded', provider: 'fixtures', model: 'hy4-preview', latencyMs: 0, attempts: [], reason,
});
const live: Generation<string> = { data: 'live', source: 'live', provider: 'openai', model: 'gpt-5.4-mini', latencyMs: 5_600, attempts: [] };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const hangingFetch = (_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_, reject) => {
  init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
});

afterEach(() => { vi.useRealTimers(); });

describe('requestLive (client wait for live LLM routes)', () => {
  it('the client waits longer than the server budget, and at most 40 s', () => {
    expect(LLM_CLIENT_WAIT_MS).toBeGreaterThan(LLM_SERVER_BUDGET_MS);
    expect(LLM_CLIENT_WAIT_MS).toBeLessThanOrEqual(40_000);
  });

  it('returns the server Generation as-is, keeping the provider that actually answered', async () => {
    const result = await requestLive('/api/llm/extract', {}, { fallback: recorded, fetchImpl: async () => ok(live) });
    expect(result).toEqual(live);
  });

  it('gives up at the client timeout and shows the recorded output with a timeout reason', async () => {
    vi.useFakeTimers();
    const pending = requestLive('/api/llm/extract', {}, { fallback: recorded, fetchImpl: hangingFetch as typeof fetch });
    await vi.advanceTimersByTimeAsync(LLM_CLIENT_WAIT_MS);
    const result = await pending;
    expect(result).toMatchObject({ source: 'recorded', provider: 'fixtures', reason: LIVE_FAILURE_REASON.timeout });
    expect(result.reason).toContain('40 s');
  });

  it('maps HTTP failures to explicit reasons and never names a live provider', async () => {
    for (const [status, key] of [[429, 'rate-limited'], [401, 'unauthorised'], [500, 'request-failed']] as const) {
      const result = await requestLive('/x', {}, { fallback: recorded, fetchImpl: async () => new Response('{}', { status }) });
      expect(result).toMatchObject({ source: 'recorded', provider: 'fixtures', reason: LIVE_FAILURE_REASON[key] });
    }
  });

  it('a malformed body falls back instead of rendering untrusted JSON as a Generation', async () => {
    const result = await requestLive('/x', {}, { fallback: recorded, fetchImpl: async () => ok({ source: 'live', data: 'x' }) });
    expect(result).toMatchObject({ source: 'recorded', reason: LIVE_FAILURE_REASON['invalid-response'] });
  });

  it('a caller abort (unmount) rejects rather than showing a fallback', async () => {
    const controller = new AbortController();
    const pending = requestLive('/x', {}, { fallback: recorded, signal: controller.signal, fetchImpl: hangingFetch as typeof fetch });
    controller.abort();
    await expect(pending).rejects.toBeDefined();
  });
});
