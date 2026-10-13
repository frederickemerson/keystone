// Evidence ingestion: what a building feed may say, and the one thing it may
// never say.
//
// The invariant under test: a telemetry feed may raise an incident but may
// never confirm a gating evidence key. It is enforced at run time in three
// places, and each is tested on its own — the mapping decision, the response
// schema, and the endpoint end to end, including the case where a pill edit
// turns a key the feed already reports into a gating one.

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(async (): Promise<{ role: string; name: string; sessionId: string } | null> => ({
    role: 'technician',
    name: 'Rajesh Kumar',
    sessionId: 'session-ingest',
  })),
  /** Keys a doctored pill makes gating, to simulate a pill edit. */
  extraGating: [] as string[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/session', () => ({
  getVerifiedSession: mocks.session,
  sessionRole: async () => 'technician',
}));
vi.mock('@/lib/pills/load', async (original) => {
  const actual = await original<typeof import('@/lib/pills/load')>();
  return {
    ...actual,
    loadAllPills: () => {
      const bundles = actual.loadAllPills();
      if (mocks.extraGating.length === 0) return bundles;
      const doctored = structuredClone(bundles);
      for (const key of mocks.extraGating) {
        const bundle = doctored.find((b) => key in b.pill.evidenceCatalog)!;
        bundle.pill.rules[0].required_evidence.push(key);
      }
      return doctored;
    },
  };
});

import { GET, POST } from '@/app/api/ingest/route';
import { connectorById } from '@/lib/connectors/registry';
import { loadAllPills } from '@/lib/pills/load';
import { ingestRequestSchema, ingestedObservationSchema, ingestResponseSchema, schemaSystems } from '../contract';
import { catalogOf, gatingKeysOf } from '../evidence';
import { INGEST_LIMITS, resetIngestLimits } from '../limits';
import { dispositionOf, mapIngest } from '../map';
import { INGEST_SOURCES } from '../sources';

const INCIDENT = 'INC-2026-1011';
const REAL_GATING = gatingKeysOf(loadAllPills());
const CATALOG = catalogOf(loadAllPills());
const RECEIVED_AT = '2026-10-13T09:00:00.000Z';

function environment(gatingKeys: ReadonlySet<string> = REAL_GATING) {
  return { gatingKeys, catalog: CATALOG, receivedAt: RECEIVED_AT };
}

function alarm(signal: string, state: 'alarm' | 'normal' = 'alarm') {
  return {
    system: 'ibms' as const,
    incidentId: INCIDENT,
    points: [{ pointId: 'LD-23-04', signal, state, at: '2026-10-11T08:02:18+08:00' }],
  };
}

function workOrder(type: string) {
  return {
    system: 'cmms' as const,
    incidentId: INCIDENT,
    workOrders: [
      {
        workOrderId: 'WO-2026-1011-0347',
        cmmsAssetCode: 'AHU-23-01',
        at: '2026-10-11T08:05:30+08:00',
        documents: [{ type, ref: 'ISV-L23-CHW isolation diagram' }],
      },
    ],
  };
}

function post(body: unknown, ip = '203.0.113.20') {
  return new Request('http://localhost/api/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetIngestLimits();
  mocks.extraGating.length = 0;
  mocks.session.mockResolvedValue({ role: 'technician', name: 'Rajesh Kumar', sessionId: 'session-ingest' });
});

describe('the ingest binding table', () => {
  it('names a real connector, and only keys that connector is allowed to report', () => {
    expect(Object.keys(INGEST_SOURCES).length).toBeGreaterThan(0);
    for (const [system, source] of Object.entries(INGEST_SOURCES)) {
      const connector = connectorById(source.connectorId);
      expect(connector, `${system}: ${source.connectorId}`).toBeDefined();
      expect(Object.keys(source.bindings).length, system).toBeGreaterThan(0);
      for (const [signal, binding] of Object.entries(source.bindings)) {
        expect(connector!.evidenceKeys, `${system}.${signal}`).toContain(binding.key);
        expect(CATALOG[binding.key], `${system}.${signal}`).toBeDefined();
      }
    }
  });

  it('has a request shape for every system, and no shape for a system it does not have', () => {
    expect(schemaSystems().sort()).toEqual(Object.keys(INGEST_SOURCES).sort());
  });

  it('never binds a feed that cannot confirm gate evidence to a gating key', () => {
    for (const [system, source] of Object.entries(INGEST_SOURCES)) {
      const connector = connectorById(source.connectorId)!;
      if (connector.canConfirmGateEvidence) continue;
      for (const [signal, binding] of Object.entries(source.bindings)) {
        expect(REAL_GATING.has(binding.key), `${system}.${signal} reports gating ${binding.key}`).toBe(false);
      }
    }
    // Non-vacuous: the CMMS binding IS a gating key, so the loop above is a real filter.
    expect(REAL_GATING.has(INGEST_SOURCES.cmms.bindings.isolation_diagram.key)).toBe(true);
    expect(connectorById('cmms_work_orders')!.canConfirmGateEvidence).toBe(true);
  });
});

describe('the gate rule, as one decision', () => {
  const ibms = () => connectorById('ibms_alarms')!;
  const cmms = () => connectorById('cmms_work_orders')!;

  it('refuses a gating key from a feed, allows it unconfirmed from a record, confirms neither-nor', () => {
    expect(dispositionOf('lew_signoff', ibms(), REAL_GATING)).toBe('refused_gating');
    expect(dispositionOf('shutoff_map_available', cmms(), REAL_GATING)).toBe('accepted_unconfirmed');
    expect(dispositionOf('leak_alarm_active', ibms(), REAL_GATING)).toBe('accepted_confirmed');
  });
});

describe('mapping one payload', () => {
  it('accepts an alarm as confirmed evidence that can raise the incident', () => {
    const outcome = mapIngest(alarm('leak_alarm'), environment());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.response.accepted).toEqual([
      {
        key: 'leak_alarm_active',
        label: CATALOG.leak_alarm_active.label,
        value: true,
        confirmed: true,
        gating: false,
        confirmableBy: CATALOG.leak_alarm_active.confirmable_by,
        from: 'LD-23-04',
        at: '2026-10-11T08:02:18+08:00',
      },
    ]);
    expect(outcome.response.refused).toEqual([]);
    expect(outcome.response.raisesIncident).toBe(true);
    expect(outcome.response.connectorId).toBe('ibms_alarms');
  });

  it('a point in its normal state raises nothing', () => {
    const outcome = mapIngest(alarm('leak_alarm', 'normal'), environment());
    expect(outcome.ok && outcome.response.raisesIncident).toBe(false);
    expect(outcome.ok && outcome.response.accepted[0].value).toBe(false);
  });

  it('REFUSES a gating key from a feed that cannot confirm one', () => {
    // The violation, injected: this key now gates a rule.
    const outcome = mapIngest(alarm('leak_alarm'), environment(new Set([...REAL_GATING, 'leak_alarm_active'])));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.response.accepted).toEqual([]);
    expect(outcome.response.refused).toEqual([
      {
        from: 'LD-23-04',
        signal: 'leak_alarm',
        reason: `${CATALOG.leak_alarm_active.label} can hold a gate open. iBMS alarm may raise an incident, but it can never confirm an item a gate needs.`,
      },
    ]);
    expect(outcome.response.raisesIncident).toBe(false);
  });

  it('accepts a work order\'s gating key, unconfirmed, naming who may confirm it', () => {
    const outcome = mapIngest(workOrder('isolation_diagram'), environment());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.response.accepted).toHaveLength(1);
    expect(outcome.response.accepted[0]).toMatchObject({
      key: 'shutoff_map_available',
      gating: true,
      confirmed: false,
      value: true,
      confirmableBy: CATALOG.shutoff_map_available.confirmable_by,
    });
    expect(outcome.response.accepted[0].confirmableBy).toContain('technical_services_lead');
  });

  it('refuses a signal it has no binding for, keeping the rest of the batch', () => {
    const payload = {
      system: 'ibms' as const,
      incidentId: INCIDENT,
      points: [
        { pointId: 'LD-23-04', signal: 'leak_alarm', state: 'alarm' as const, at: '2026-10-11T08:02:18+08:00' },
        { pointId: 'XX-1', signal: 'lew_has_signed_off', state: 'alarm' as const, at: '2026-10-11T08:02:18+08:00' },
      ],
    };
    const outcome = mapIngest(payload, environment());
    expect(outcome.ok && outcome.response.accepted.map((a) => a.key)).toEqual(['leak_alarm_active']);
    expect(outcome.ok && outcome.response.refused[0].reason).toContain('no binding for "lew_has_signed_off"');
  });

  it('refuses a whole payload whose shape does not match the system', () => {
    const outcome = mapIngest({ ...workOrder('isolation_diagram'), system: 'ibms' } as never, environment());
    expect(outcome).toMatchObject({ ok: false, reason: 'shape_mismatch' });
  });
});

describe('the response schema cannot describe a confirmed gate item', () => {
  const observation = {
    key: 'shutoff_map_available',
    label: 'Shut-off valve map available',
    value: true,
    confirmed: false,
    gating: true,
    confirmableBy: ['technical_services_lead'],
    from: 'WO-1',
    at: RECEIVED_AT,
  };

  it('accepts a gating key only while it is unconfirmed', () => {
    expect(ingestedObservationSchema.safeParse(observation).success).toBe(true);
    expect(ingestedObservationSchema.safeParse({ ...observation, confirmed: true }).success).toBe(false);
    expect(ingestedObservationSchema.safeParse({ ...observation, gating: false, confirmed: true }).success).toBe(true);
  });

  it('refuses a field it does not know', () => {
    expect(ingestResponseSchema.safeParse({ note: 'x' }).success).toBe(false);
    expect(ingestRequestSchema.safeParse({ ...alarm('leak_alarm'), extra: 1 }).success).toBe(false);
  });
});

describe('POST /api/ingest', () => {
  it('needs a signed-in caller', async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await POST(post(alarm('leak_alarm')))).status).toBe(401);
  });

  it('refuses a body that is not the contract, and an unknown incident', async () => {
    expect((await POST(post({ system: 'ibms', incidentId: INCIDENT, points: [] }))).status).toBe(400);
    expect((await POST(post({ system: 'bacnet', incidentId: INCIDENT }))).status).toBe(400);
    expect((await POST(post({ ...alarm('leak_alarm'), incidentId: 'INC-9999-9999' }))).status).toBe(404);
  });

  it('maps an iBMS alarm to evidence and never stores it', async () => {
    const response = await POST(post(alarm('leak_alarm')));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body).toMatchObject({ incidentId: INCIDENT, connectorId: 'ibms_alarms', raisesIncident: true });
    expect(body.accepted).toHaveLength(1);
    expect(body.accepted[0]).toMatchObject({ key: 'leak_alarm_active', confirmed: true, gating: false });
    expect(body.note).toMatch(/never confirmed here/);
  });

  it('returns a work order\'s gating key unconfirmed', async () => {
    const body = await (await POST(post(workOrder('isolation_diagram')))).json();
    expect(body.accepted[0]).toMatchObject({ key: 'shutoff_map_available', gating: true, confirmed: false });
  });

  it('refuses the telemetry event the moment a pill makes its key gating', async () => {
    // Baseline: accepted today.
    expect((await (await POST(post(alarm('leak_alarm')))).json()).accepted).toHaveLength(1);
    // A pill edit makes leak_alarm_active required evidence of a rule.
    mocks.extraGating.push('leak_alarm_active');
    const body = await (await POST(post(alarm('leak_alarm')))).json();
    expect(body.accepted).toEqual([]);
    expect(body.refused[0].reason).toContain('can never confirm an item a gate needs');
    expect(body.raisesIncident).toBe(false);
  });

  it(`stops at ${INGEST_LIMITS.sessionPerMinute} posts a minute`, async () => {
    // Unknown incidents still spend quota, and skip the pill read.
    for (let i = 0; i < INGEST_LIMITS.sessionPerMinute; i++) {
      expect((await POST(post({ ...alarm('leak_alarm'), incidentId: 'INC-9999-9999' }))).status).toBe(404);
    }
    const limited = await POST(post(alarm('leak_alarm')));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('GET /api/ingest', () => {
  it('publishes the same decision the mapping makes, for every signal', async () => {
    const response = await GET(new Request('http://localhost/api/ingest'));
    expect(response.status).toBe(200);
    const body = await response.json();
    const systems = Object.fromEntries(body.systems.map((s: { system: string }) => [s.system, s]));
    expect(Object.keys(systems).sort()).toEqual(Object.keys(INGEST_SOURCES).sort());
    const leak = systems.ibms.signals.find((s: { signal: string }) => s.signal === 'leak_alarm');
    expect(leak).toMatchObject({ key: 'leak_alarm_active', brickClass: 'Leak_Alarm', gating: false, disposition: 'accepted_confirmed' });
    expect(systems.cmms.signals[0]).toMatchObject({ key: 'shutoff_map_available', gating: true, disposition: 'accepted_unconfirmed' });
  });

  it('needs a signed-in caller', async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await GET(new Request('http://localhost/api/ingest'))).status).toBe(401);
  });
});
