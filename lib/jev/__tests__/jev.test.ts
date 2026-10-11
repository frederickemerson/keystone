import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluate } from '@/lib/engine/evaluate';
import { loadAsset, loadIncident, loadTimeline } from '@/lib/data';
import { createGovernanceStore, GovernanceError, memoryStorage } from '@/lib/governance/store';
import { parseGovernanceSnapshot } from '@/lib/governance/snapshot';
import { loadPill } from '@/lib/pills/load';
import {
  accumulateEvidence,
  toEngineAsset,
  toEngineEvidence,
  toEngineIncident,
} from '@/components/incident/engineInputs';
import { askNoul, jevBearerToken } from '../client';
import { suggestionKeys, suggestResponseSchema } from '../suggestions';

const mocks = vi.hoisted(() => ({ role: vi.fn(async () => 'technician') }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/session', () => ({ sessionRole: mocks.role }));

const FAKE_KEY = 'jev:apikey_TEST_SECRET_never_leak_123';
const PILL_ID = 'technical-services-chilled-water-leak';
const INCIDENT = 'INC-2026-1011';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** A fetch that never answers until aborted (simulates a hung upstream). */
const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });

beforeEach(() => {
  vi.stubEnv('JEV_API_KEY', FAKE_KEY);
  mocks.role.mockResolvedValue('technician');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

describe('Jev client', () => {
  it('sends the documented request and parses Noul probabilities', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        model: 'jev-1.13.0',
        answers: { water_near_electrical: { type: 'noul', noul: 0.94 }, breaker_tripped: { type: 'noul', noul: 0.03 } },
        usage: { input_tokens: 300, output_tokens: 40 },
      }),
    );
    const r = await askNoul(
      'Water dripping onto the DB.',
      {
        water_near_electrical: { type: 'noul', instructions: 'Water near electrical equipment' },
        breaker_tripped: { type: 'noul', instructions: 'Breaker tripped' },
      },
      { fetchImpl },
    );
    expect(r).toMatchObject({ ok: true, model: 'jev-1.13.0', probabilities: { water_near_electrical: 0.94, breaker_tripped: 0.03 } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    // The `jev:` label is not part of the bearer token (verified against the live API).
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer apikey_TEST_SECRET_never_leak_123');
    expect(JSON.parse(init.body as string)).toMatchObject({ model: 'jev-latest', state: 'Water dripping onto the DB.' });
  });

  it.each([
    ['probability out of range', { model: 'm', answers: { k: { type: 'noul', noul: 1.5 } } }],
    ['wrong answer type', { model: 'm', answers: { k: { type: 'choice', choice: 'x' } } }],
    ['missing answer for an asked question', { model: 'm', answers: {} }],
    ['not an object', 'nope'],
  ])('rejects a malformed response (%s)', async (_label, body) => {
    const r = await askNoul('s', { k: { type: 'noul', instructions: 'q' } }, { fetchImpl: async () => jsonResponse(body) });
    expect(r).toMatchObject({ ok: false, reason: 'invalid_response' });
  });

  it('times out → unavailable, within the budget', async () => {
    const started = Date.now();
    const r = await askNoul('s', { k: { type: 'noul', instructions: 'q' } }, { fetchImpl: hangingFetch, timeoutMs: 30 });
    expect(r).toMatchObject({ ok: false, reason: 'timeout' });
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('HTTP errors and missing key are typed failures that never echo the key', async () => {
    const r = await askNoul('s', { k: { type: 'noul', instructions: 'q' } }, { fetchImpl: async () => jsonResponse({ detail: 'bad' }, 401) });
    expect(r).toMatchObject({ ok: false, reason: 'http_error', status: 401 });
    expect(JSON.stringify(r)).not.toContain('apikey_');
    vi.stubEnv('JEV_API_KEY', '');
    expect(await askNoul('s', { k: { type: 'noul', instructions: 'q' } })).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(jevBearerToken('  ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

function routeRequest(body: unknown) {
  return new Request('http://localhost/api/jev/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/jev/suggest', () => {
  it('returns validated, unconfirmed suggestions labelled from evidence.yaml', async () => {
    vi.stubGlobal('fetch', async () =>
      jsonResponse({ model: 'jev-1.13.0', answers: { water_near_electrical: { type: 'noul', noul: 0.94 }, breaker_tripped: { type: 'noul', noul: 0.1 } } }),
    );
    const { POST } = await import('@/app/api/jev/suggest/route');
    const res = await POST(routeRequest({ incidentId: INCIDENT, eventId: 'EV-1011-08', pillId: PILL_ID, keys: ['water_near_electrical', 'breaker_tripped'] }));
    const body = suggestResponseSchema.parse(await res.json());
    expect(body).toMatchObject({
      available: true,
      suggestions: [
        { key: 'water_near_electrical', label: 'Water near electrical equipment', probability: 0.94 },
        { key: 'breaker_tripped', probability: 0.1 },
      ],
    });
    expect(JSON.stringify(body)).not.toContain('apikey_');
  });

  it('upstream timeout → "suggestions unavailable" (no LLM fallback)', async () => {
    vi.stubGlobal('fetch', hangingFetch);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { POST } = await import('@/app/api/jev/suggest/route');
      const pending = POST(routeRequest({ incidentId: INCIDENT, eventId: 'EV-1011-08', pillId: PILL_ID, keys: ['water_near_electrical'] }));
      await vi.advanceTimersByTimeAsync(3_100);
      const body = suggestResponseSchema.parse(await (await pending).json());
      expect(body).toEqual({ available: false, reason: 'Jev timed out' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses undeclared / non-boolean keys and events above the caller’s clearance', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { POST } = await import('@/app/api/jev/suggest/route');
    expect((await POST(routeRequest({ incidentId: INCIDENT, eventId: 'EV-1011-08', pillId: PILL_ID, keys: ['not_a_key'] }))).status).toBe(400);
    expect((await POST(routeRequest({ incidentId: INCIDENT, eventId: 'EV-1011-08', pillId: PILL_ID, keys: ['source_system'] }))).status).toBe(400);
    // EV-1011-03 is tenant_pii; a technician may not read it, so Jev never sees it for them.
    expect((await POST(routeRequest({ incidentId: INCIDENT, eventId: 'EV-1011-03', pillId: PILL_ID, keys: ['tenant_report_drip'] }))).status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Never gating: suggestions change nothing until a permitted human confirms
// ---------------------------------------------------------------------------

describe('suggestions never gate', () => {
  const bundle = loadPill(PILL_ID)!;
  const timeline = loadTimeline(INCIDENT)!;
  const incident = loadIncident(INCIDENT)!;
  const asset = loadAsset(incident.asset_id)!;
  const evalAt = (n: number) =>
    evaluate(bundle.pill, toEngineAsset(asset), toEngineIncident(incident), toEngineEvidence(accumulateEvidence(timeline.events, n)));
  const isBool = (k: string) => bundle.pill.evidenceCatalog[k]?.type === 'boolean';
  // First replay step with a gated action whose missing evidence is a boolean key.
  const step = timeline.events.findIndex((_, i) => evalAt(i + 1).actions.some((a) => a.missingEvidence.some(isBool))) + 1;
  const statuses = (confirmations = {}) =>
    evaluate(
      bundle.pill,
      toEngineAsset(asset),
      toEngineIncident(incident),
      toEngineEvidence(accumulateEvidence(timeline.events, step, confirmations)),
    ).actions.map((a) => `${a.ruleId}:${a.status}:${a.missingEvidence.join(',')}`);

  // A blocked/gated action at the end of the replay, and one of its missing keys.
  const gated = evalAt(step).actions.find((a) => a.missingEvidence.some(isBool))!;
  const key = gated.missingEvidence.find(isBool)!;
  const allowedRole = bundle.pill.evidenceCatalog[key].confirmable_by[0];

  function seeded() {
    const store = createGovernanceStore(memoryStorage(), () => '2026-10-11T09:00:00.000Z');
    store.getState().seedPills([{ id: PILL_ID, pill: bundle.pill }]);
    return store;
  }

  it('a gated key is a suggestion candidate', () => {
    expect(gated).toBeDefined();
    const ctx = { asset: toEngineAsset(asset), incident: toEngineIncident(incident), evidence: toEngineEvidence(accumulateEvidence(timeline.events, step)) };
    expect(suggestionKeys(bundle.pill, ctx)).toContain(key);
  });

  it('engine status is unchanged by a suggestion, and changes only after human confirmation', () => {
    const store = seeded();
    const statusBefore = statuses();
    // A (very confident) suggestion arrives — nothing writes it anywhere.
    suggestResponseSchema.parse({ available: true, model: 'jev-1.13.0', latencyMs: 210, suggestions: [{ key, label: 'x', probability: 0.99 }] });
    expect(store.getState().evidenceConfirmations).toEqual({});
    expect(statuses(store.getState().evidenceConfirmations[INCIDENT])).toEqual(statusBefore);

    store.getState().setRole(allowedRole);
    const rec = store.getState().confirmEvidence({
      incidentId: INCIDENT,
      pillId: PILL_ID,
      key,
      eventId: timeline.events[step - 1].id,
      suggestion: { model: 'jev-1.13.0', probability: 0.99 },
    });
    expect(rec).toMatchObject({ key, value: true, actor: { role: allowedRole } });
    const after = statuses(store.getState().evidenceConfirmations[INCIDENT]);
    expect(after).not.toEqual(statusBefore);
    expect(after.find((s) => s.startsWith(`${gated.ruleId}:`))).not.toContain(key);
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'evidence_confirmed', evidenceKey: key, role: allowedRole });
  });

  it('a role not in confirmable_by cannot confirm (refusal audited, engine unchanged)', () => {
    const store = seeded();
    // lew_signoff is confirmable by duty_lew only.
    expect(bundle.pill.evidenceCatalog.lew_signoff.confirmable_by).toEqual(['duty_lew']);
    store.getState().setRole('technician');
    expect(() =>
      store.getState().confirmEvidence({ incidentId: INCIDENT, pillId: PILL_ID, key: 'lew_signoff', eventId: 'EV-1011-08' }),
    ).toThrow(GovernanceError);
    expect(store.getState().evidenceConfirmations).toEqual({});
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'evidence_confirmation_blocked', evidenceKey: 'lew_signoff' });
    // Undeclared and non-boolean keys are refused for everyone.
    store.getState().setRole('duty_lew');
    expect(() => store.getState().confirmEvidence({ incidentId: INCIDENT, pillId: PILL_ID, key: 'nope', eventId: 'EV-1011-08' })).toThrow(GovernanceError);
    expect(() => store.getState().confirmEvidence({ incidentId: INCIDENT, pillId: PILL_ID, key: 'distance_to_electrical_m', eventId: 'EV-1011-08' })).toThrow(GovernanceError);
  });

  it('persisted confirmations must be backed by an audit event', () => {
    const store = seeded();
    store.getState().setRole('duty_lew');
    store.getState().confirmEvidence({ incidentId: INCIDENT, pillId: PILL_ID, key: 'lew_signoff', eventId: 'EV-1011-08' });
    const { versions, seedVersions, audit, decisions, shadowRuns, evidenceConfirmations } = store.getState();
    const snapshot = JSON.parse(JSON.stringify({ versions, seedVersions, audit, decisions, shadowRuns, evidenceConfirmations }));
    expect(parseGovernanceSnapshot(snapshot).ok).toBe(true);
    const forged = { ...snapshot, evidenceConfirmations: { [INCIDENT]: { ...snapshot.evidenceConfirmations[INCIDENT], lew_signoff: undefined, area_dry: { ...snapshot.evidenceConfirmations[INCIDENT].lew_signoff, key: 'area_dry' } } } };
    delete forged.evidenceConfirmations[INCIDENT].lew_signoff;
    expect(parseGovernanceSnapshot(forged).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Key never in the client bundle (runs after `next build`)
// ---------------------------------------------------------------------------

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const STATIC = join(process.cwd(), '.next', 'static');

describe('client bundle', () => {
  it.skipIf(!existsSync(STATIC))('contains no Jev key, key variable name or upstream endpoint', () => {
    for (const f of files(STATIC).filter((p) => p.endsWith('.js'))) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/apikey_|JEV_API_KEY|api\.typesafe\.ai/);
    }
  });
});
