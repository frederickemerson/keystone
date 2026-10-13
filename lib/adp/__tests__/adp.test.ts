// Tencent Cloud ADP adapter: the wire shape, and the honesty of its status.
//
// The status rule under test is the one that matters for the submission: with
// no AppKey the adapter says "not configured", with an AppKey but no answer it
// says "not verified", and the only way anything says "live" is a real ADP
// response arriving in this process.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveStatus } from '@/lib/connectors/ai-status';
import { CONNECTORS } from '@/lib/connectors/registry';
import { askAdp } from '../client';
import { ADP_CHAT_URL, ADP_ID_PATTERN, adpAppKey, adpChatRequestSchema, newAdpId } from '../contract';
import { createSseParser } from '../sse';
import { adpStatus, adpStatusNow, adpVerification, resetAdpVerification } from '../status';

const KEY_SET = { ADP_APP_KEY: 'app-key-from-the-console' } as const;

/** An SSE response built from chunks, so a split event is exercised. */
function sseResponse(chunks: readonly string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const ANSWER = [
  'event: text.delta\ndata: {"Content":"Isolate the branch "}\n\nevent: text.del',
  'ta\ndata: {"Content":"sub-valve first."}\n\n',
  'event: reference.added\ndata: {"DocId":"sop-12"}\n\n',
  'event: response.completed\ndata: {}\n\nevent: done\ndata: {}\n\n',
];

function stub(response: Response | (() => Promise<Response>)): { fetchImpl: typeof fetch; calls: { url: string; init?: RequestInit }[] } {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return typeof response === 'function' ? response() : response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

beforeEach(() => resetAdpVerification());

describe('ADP wire contract', () => {
  it('mints ids ADP accepts, and refuses ones it does not', () => {
    const id = newAdpId();
    expect(id).toMatch(ADP_ID_PATTERN);
    expect(id).toHaveLength(32);
    expect(ADP_ID_PATTERN.test('too-short')).toBe(false);
    expect(ADP_ID_PATTERN.test(`${'a'.repeat(64)}x`)).toBe(false);
  });

  it('requires the documented fields and nothing else', () => {
    const valid = {
      RequestId: newAdpId(),
      ConversationId: newAdpId(),
      AppKey: 'k',
      Contents: [{ Type: 'text', Text: 'Why is TS-07 blocked?' }],
      VisitorId: 'session-A',
      Stream: true,
    };
    expect(adpChatRequestSchema.safeParse(valid).success).toBe(true);
    expect(adpChatRequestSchema.safeParse({ ...valid, SecretId: 'nope' }).success).toBe(false);
    expect(adpChatRequestSchema.safeParse({ ...valid, ConversationId: 'short' }).success).toBe(false);
    expect(adpChatRequestSchema.safeParse({ ...valid, Contents: [] }).success).toBe(false);
  });

  it('reads the AppKey only from ADP_APP_KEY, ignoring blank values', () => {
    expect(adpAppKey({})).toBeNull();
    expect(adpAppKey({ ADP_APP_KEY: '   ' })).toBeNull();
    expect(adpAppKey({ ADP_APP_KEY: ' k ' })).toBe('k');
  });
});

describe('SSE framing', () => {
  it('emits only complete events, across chunk boundaries', () => {
    const parser = createSseParser();
    expect(parser.push('event: text.delta\ndata: {"Content":"a"}')).toEqual([]);
    expect(parser.push('\n\nevent: do')).toEqual([{ event: 'text.delta', data: '{"Content":"a"}' }]);
    expect(parser.push('ne\ndata: {}\n\n')).toEqual([{ event: 'done', data: '{}' }]);
    expect(parser.flush()).toEqual([]);
  });

  it('joins multi-line data, skips comments, and flushes an unterminated tail', () => {
    const parser = createSseParser();
    expect(parser.push(': keep-alive\n\nevent: x\ndata: one\ndata: two\n')).toEqual([]);
    expect(parser.flush()).toEqual([{ event: 'x', data: 'one\ntwo' }]);
  });
});

describe('ADP chat client', () => {
  it('posts to the documented endpoint with the AppKey in the body and no signature', async () => {
    const { fetchImpl, calls } = stub(sseResponse(ANSWER));
    const result = await askAdp('Why is TS-07 blocked?', { visitorId: 'session-A', fetchImpl, env: KEY_SET });

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(ADP_CHAT_URL);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.AppKey).toBe(KEY_SET.ADP_APP_KEY);
    expect(body).toMatchObject({ Stream: true, Contents: [{ Type: 'text', Text: 'Why is TS-07 blocked?' }] });
    expect(Object.keys(calls[0].init?.headers as Record<string, string>)).toEqual(['Content-Type', 'Accept']);
    if (result.ok) {
      expect(result.text).toBe('Isolate the branch sub-valve first.');
      expect(result.references).toBe(1);
    }
  });

  it('reports the live bogus-key answer as a structured API error, not a failure to parse', async () => {
    const envelope = new Response('{"Code":4505004,"Message":"App key invalid"}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const { fetchImpl } = stub(envelope);
    const result = await askAdp('hello', { visitorId: 'v', fetchImpl, env: { ADP_APP_KEY: 'bogus' } });
    expect(result).toMatchObject({ ok: false, reason: 'api_error', code: 4505004, detail: 'App key invalid' });
  });

  it('answers not_configured without an AppKey, and never calls out', async () => {
    const { fetchImpl, calls } = stub(sseResponse(ANSWER));
    expect(await askAdp('hello', { visitorId: 'v', fetchImpl, env: {} })).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(calls).toEqual([]);
  });

  it.each([
    ['an HTTP failure', new Response('gateway', { status: 502 }), { reason: 'http_error', status: 502 }],
    [
      'a delta with no text',
      sseResponse(['event: text.delta\ndata: {"Nope":1}\n\n']),
      { reason: 'invalid_response' },
    ],
    [
      'a stream that stops early',
      sseResponse(['event: text.delta\ndata: {"Content":"half"}\n\n']),
      { reason: 'invalid_response' },
    ],
    ['a completed response with no text', sseResponse(['event: response.completed\ndata: {}\n\n']), { reason: 'invalid_response' }],
  ])('fails typed on %s', async (_label, response, expected) => {
    const { fetchImpl } = stub(response);
    const result = await askAdp('hello', { visitorId: 'v', fetchImpl, env: KEY_SET });
    expect(result).toMatchObject({ ok: false, ...expected });
    expect(adpVerification()).toBeNull();
  });

  it('aborts and reports a timeout rather than hanging', async () => {
    const fetchImpl = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      })) as unknown as typeof fetch;
    const result = await askAdp('hello', { visitorId: 'v', fetchImpl, env: KEY_SET, timeoutMs: 5 });
    expect(result).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('reports a network error as a network error', async () => {
    const fetchImpl = (() => Promise.reject(new TypeError('fetch failed'))) as unknown as typeof fetch;
    expect(await askAdp('hello', { visitorId: 'v', fetchImpl, env: KEY_SET })).toMatchObject({ ok: false, reason: 'network_error' });
  });
});

describe('ADP status', () => {
  it('is not_configured without an AppKey, whatever proof is passed', () => {
    expect(adpStatus({}, null).state).toBe('not_configured');
    expect(adpStatus({}, { requestId: 'r', at: 'now', latencyMs: 1, answerChars: 2 }).state).toBe('not_configured');
  });

  it('is not_verified with an AppKey but no answer yet', () => {
    const status = adpStatus(KEY_SET, null);
    expect(status.state).toBe('not_verified');
    expect(status.reason).toContain(ADP_CHAT_URL);
  });

  it('becomes verified only after a real answer, and the connectors screen reports live only then', () => {
    const adpRow = CONNECTORS.find((c) => c.id === 'adp_chat')!;
    expect(adpRow.statusFrom).toBe('config');

    const probe = { llmFirstProvider: null, jevConfigured: false, asr: [] };
    // Before: an AppKey is set, nothing has answered.
    expect(adpStatusNow(KEY_SET).state).toBe('not_verified');
    expect(resolveStatus(adpRow, { ...probe, adp: { state: 'not_verified', detail: 'd' } }).status).toBe('adapter_not_configured');
    // A probe that never read ADP is not a pass either.
    expect(resolveStatus(adpRow, probe).status).toBe('adapter_not_configured');
    // After: proof recorded by the client's success path.
    expect(resolveStatus(adpRow, { ...probe, adp: { state: 'verified', detail: 'answered' } }).status).toBe('live');
  });

  it('records the verification on a real answer and nothing else does', async () => {
    const { fetchImpl } = stub(sseResponse(ANSWER));
    expect(adpStatusNow(KEY_SET).state).toBe('not_verified');
    await askAdp('hello', { visitorId: 'v', fetchImpl, env: KEY_SET });
    const verification = adpVerification();
    expect(verification?.answerChars).toBe('Isolate the branch sub-valve first.'.length);
    expect(adpStatusNow(KEY_SET).state).toBe('verified');
    // Without an AppKey the recorded proof still cannot make it configured.
    expect(adpStatusNow({}).state).toBe('not_configured');
  });

  it('is recorded from exactly one place in the app: the client success path', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(process.cwd(), dir))) {
        const rel = `${dir}/${entry}`;
        if (entry === '__tests__' || entry === 'node_modules') continue;
        if (statSync(join(process.cwd(), rel)).isDirectory()) walk(rel);
        else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) files.push(rel);
      }
    };
    walk('lib');
    walk('app');
    // Guard against a vacuous pass: the scan must have read real source.
    expect(files).toContain('lib/adp/client.ts');
    expect(files.length).toBeGreaterThan(50);
    const callers = files.filter((file) => /\brecordAdpSuccess\b/.test(readFileSync(join(process.cwd(), file), 'utf8')));
    expect(callers.sort()).toEqual(['lib/adp/client.ts', 'lib/adp/status.ts']);
  });
});
