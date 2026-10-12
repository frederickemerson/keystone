import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as extract } from '@/app/api/llm/extract/route';
import { POST as tenantMessage } from '@/app/api/llm/tenant-message/route';
import { POST as suggest } from '@/app/api/jev/suggest/route';
import { LIMITS, resetAllLimits } from '../policies';

const mocks = vi.hoisted(() => ({
  session: vi.fn(async (): Promise<{ role: string; name: string; sessionId: string } | null> => ({
    role: 'asset_operations_manager', name: 'Priya Nair', sessionId: 'session-A',
  })),
  generate: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/session', () => ({
  getVerifiedSession: mocks.session,
  sessionRole: async () => 'asset_operations_manager',
}));
// Count would-be paid calls; the fixture path needs no provider.
vi.mock('@/lib/llm/providers', async (original) => ({
  ...(await original<typeof import('@/lib/llm/providers')>()),
  generateJson: mocks.generate,
}));

const TURNS = [{ t: '00:00:01', speaker: 'CE', text: 'Never re-energise wet switchgear.' }];

function post(path: string, body: unknown, ip = '203.0.113.10') {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetAllLimits();
  mocks.generate.mockReset();
  mocks.generate.mockImplementation(async () => {
    throw new Error('stop after counting'); // never reached once limited
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('/api/llm/* cost guard', () => {
  it(`extract: after ${LIMITS.llm.sessionPerMinute} calls/min the session gets the recorded fixture with 429 and no live call`, async () => {
    mocks.generate.mockResolvedValue({ data: { candidates: [], rejected: [] }, source: 'live', provider: 'openai', model: 'm', latencyMs: 1, attempts: [] });
    for (let i = 0; i < LIMITS.llm.sessionPerMinute; i++) {
      expect((await extract(post('/api/llm/extract', { turns: TURNS }))).status).toBe(200);
    }
    const res = await extract(post('/api/llm/extract', { turns: TURNS }));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    const body = await res.json();
    expect(body).toMatchObject({ source: 'recorded', provider: 'fixtures' });
    expect(body.reason).toMatch(/rate limit/i);
    expect(body.data.candidates.length).toBeGreaterThan(0);
    expect(mocks.generate).toHaveBeenCalledTimes(LIMITS.llm.sessionPerMinute);
  });

  it('tenant-message shares the LLM quota and answers with the scoped recorded draft', async () => {
    for (let i = 0; i < LIMITS.llm.sessionPerMinute; i++) await extract(post('/api/llm/extract', { turns: TURNS })).catch(() => null);
    const res = await tenantMessage(post('/api/llm/tenant-message', { incidentId: 'INC-2026-1011' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toMatchObject({ source: 'recorded', provider: 'fixtures', data: { draft: { status: 'needs_approval' } } });
  });

  it('invalid requests are refused before they spend quota', async () => {
    for (let i = 0; i < 30; i++) expect((await extract(post('/api/llm/extract', { turns: [] }))).status).toBe(400);
    mocks.generate.mockResolvedValue({ data: { candidates: [], rejected: [] }, source: 'live', provider: 'openai', model: 'm', latencyMs: 1, attempts: [] });
    expect((await extract(post('/api/llm/extract', { turns: TURNS }))).status).toBe(200);
  });

  it('no verified session → 401 (defence in depth behind middleware)', async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await extract(post('/api/llm/extract', { turns: TURNS }))).status).toBe(401);
  });
});

describe('/api/jev/suggest cost guard', () => {
  it(`after ${LIMITS.jev.sessionPerMinute} calls/min: {available:false, reason:"Rate limit"} with 429, no upstream call`, async () => {
    vi.stubEnv('JEV_API_KEY', 'jev:apikey_TEST_rate_limit');
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ model: 'jev', answers: { water_near_electrical: { type: 'noul', noul: 0.9 } } }), { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const body = { incidentId: 'INC-2026-1011', eventId: 'EV-1011-08', pillId: 'technical-services-chilled-water-leak', keys: ['water_near_electrical'] };
    for (let i = 0; i < LIMITS.jev.sessionPerMinute; i++) expect((await suggest(post('/api/jev/suggest', body))).status).toBe(200);
    const res = await suggest(post('/api/jev/suggest', body));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ available: false, reason: 'Rate limit' });
    expect(fetchSpy).toHaveBeenCalledTimes(LIMITS.jev.sessionPerMinute);
    vi.unstubAllEnvs();
  });
});
