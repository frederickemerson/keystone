import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { loadAllTimelines } from '@/lib/data';
import { loadAllPills } from '@/lib/pills/load';
import { connectorsFileSchema, type Connector } from '../contract';
import { CONNECTORS, connectorForSource, groupConnectors, sourceLabel } from '../registry';
import { resolveStatus, resolveStatuses, type AiConfigProbe } from '../ai-status';

const raw: unknown = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'connectors.json'), 'utf8'));
const pills = loadAllPills();
const timelines = loadAllTimelines();
const events = timelines.flatMap((t) => t.events);

/** Every key that can gate a rule in any pill: base required + exception-added. */
const GATING_KEYS = new Set(
  pills.flatMap(({ pill }) =>
    pill.rules.flatMap((r) => [...r.required_evidence, ...r.exceptions.flatMap((ex) => ex.add_required_evidence ?? [])]),
  ),
);
const DECLARED_KEYS = new Set(pills.flatMap(({ pill }) => Object.keys(pill.evidenceCatalog)));

/** Connectors that read building telemetry. A feed may raise an incident; it never opens a gate. */
const TELEMETRY_IDS = ['ibms_alarms', 'leak_detection', 'dcim'];

describe('data/connectors.json', () => {
  it('matches the contract, with unique ids', () => {
    const parsed = connectorsFileSchema.parse(raw);
    expect(new Set(parsed.map((c) => c.id)).size).toBe(parsed.length);
  });

  it('maps every timeline source to exactly one connector', () => {
    const sources = new Set(events.map((e) => e.source));
    for (const source of sources) {
      const owners = CONNECTORS.filter((c) => c.timelineSources.includes(source));
      expect(owners.map((c) => c.id), source).toHaveLength(1);
    }
  });

  it('only lists timeline sources that occur in the data, and only on evidence sources', () => {
    const sources = new Set(events.map((e) => e.source));
    for (const c of CONNECTORS) {
      if (c.kind !== 'evidence_source') expect(c.timelineSources, c.id).toEqual([]);
      for (const s of c.timelineSources) expect(sources.has(s), `${c.id}: ${s}`).toBe(true);
    }
  });

  it('declares every evidence key in some pill evidence.yaml', () => {
    for (const c of CONNECTORS) {
      for (const key of c.evidenceKeys) expect(DECLARED_KEYS.has(key), `${c.id}: ${key}`).toBe(true);
    }
  });

  it('lists every key its timeline events report', () => {
    for (const event of events) {
      const connector = connectorForSource(event.source)!;
      for (const key of Object.keys(event.evidence_updates)) {
        expect(connector.evidenceKeys, `${event.id} (${event.source}) reports ${key}`).toContain(key);
      }
    }
  });

  it('a connector that cannot confirm gate evidence never confirms a gating key in the data', () => {
    for (const event of events) {
      const connector = connectorForSource(event.source)!;
      if (connector.canConfirmGateEvidence) continue;
      for (const [key, update] of Object.entries(event.evidence_updates)) {
        const opensGate = GATING_KEYS.has(key) && update.confirmed && update.value === true;
        expect(opensGate, `${event.id}: ${connector.id} confirms gating key ${key}`).toBe(false);
      }
    }
  });

  it('no telemetry connector can confirm gate evidence, or report a gating key at all', () => {
    for (const id of TELEMETRY_IDS) {
      const c = CONNECTORS.find((x) => x.id === id);
      expect(c, id).toBeDefined();
      expect(c!.canConfirmGateEvidence, id).toBe(false);
      for (const key of c!.evidenceKeys) expect(GATING_KEYS.has(key), `${id}: ${key}`).toBe(false);
    }
  });

  it('never writes "live" for a data feed or an AI service; AI statuses come from configuration', () => {
    for (const c of CONNECTORS) {
      if (c.kind !== 'export') expect(c.status, c.id).not.toBe('live');
      if (c.kind === 'ai_service') expect(c.statusFrom, c.id).toBe('config');
      else expect(c.statusFrom, c.id).toBe('static');
    }
  });

  it('every sample payload resolves to a real event from one of the connector\'s sources', () => {
    for (const c of CONNECTORS) {
      if (!c.samplePayload) continue;
      const [file, eventId] = c.samplePayload.split('#');
      const timeline = JSON.parse(readFileSync(path.join(process.cwd(), file), 'utf8')) as { events: { id: string; source: string }[] };
      const event = timeline.events.find((e) => e.id === eventId);
      expect(event, c.samplePayload).toBeDefined();
      const feeds = c.id === 'leak_detection' ? ['iBMS'] : c.timelineSources;
      expect(feeds, `${c.id} sample comes from ${event!.source}`).toContain(event!.source);
    }
  });
});

describe('source labels', () => {
  it('labels every timeline source from its connector, never with a raw id', () => {
    for (const source of new Set(events.map((e) => e.source))) {
      const label = sourceLabel(source);
      expect(label).toBe(connectorForSource(source)!.label);
      expect(label, source).not.toMatch(/_/);
      expect(label, source).not.toBe(source);
    }
    expect(sourceLabel('lew')).toBe('LEW sign-off');
  });

  it('falls back to sentence case for an unknown source', () => {
    expect(sourceLabel('facility_desk')).toBe('Facility desk');
    expect(sourceLabel('')).toBe('Unknown source');
  });

  it('groups every connector exactly once', () => {
    const grouped = groupConnectors().flatMap((g) => g.connectors.map((c) => c.id));
    expect([...grouped].sort()).toEqual(CONNECTORS.map((c) => c.id).sort());
  });
});

const NOTHING: AiConfigProbe = {
  llmFirstProvider: null,
  jevConfigured: false,
  asr: [
    { provider: 'tencent_asr', state: 'not_configured', detail: 'Tencent Cloud ASR (ap-singapore) is not configured.' },
    { provider: 'openai_transcribe', state: 'not_enabled', detail: 'OpenAI transcription is off.' },
  ],
};

const byId = (id: string): Connector => CONNECTORS.find((c) => c.id === id)!;

describe('AI service status', () => {
  it('is never live without configuration', () => {
    const statuses = resolveStatuses(CONNECTORS, NOTHING);
    for (const c of CONNECTORS.filter((x) => x.kind === 'ai_service')) {
      expect(statuses[c.id].status, c.id).not.toBe('live');
    }
  });

  it('is live only when the real check says Keystone calls the service', () => {
    const probe: AiConfigProbe = {
      llmFirstProvider: 'hy4-preview via TokenHub',
      jevConfigured: true,
      asr: [
        { provider: 'tencent_asr', state: 'not_verified', detail: 'Credentials set but not verified; it is not used.' },
        { provider: 'openai_transcribe', state: 'ready', detail: 'gpt-4o-mini-transcribe · us' },
      ],
    };
    expect(resolveStatus(byId('llm_drafting'), probe)).toMatchObject({ status: 'live' });
    expect(resolveStatus(byId('llm_drafting'), probe).detail).toContain('hy4-preview via TokenHub');
    expect(resolveStatus(byId('jev'), probe).status).toBe('live');
    expect(resolveStatus(byId('tencent_asr'), probe).status).toBe('adapter_not_configured');
    expect(resolveStatus(byId('openai_transcribe'), probe).status).toBe('live');
  });

  it('leaves browser speech to the browser and keeps static statuses', () => {
    expect(resolveStatus(byId('browser_speech'), NOTHING).checkedIn).toBe('browser');
    expect(resolveStatus(byId('ibms_alarms'), NOTHING).status).toBe('simulated');
    expect(resolveStatus(byId('skill_package_export'), NOTHING).status).toBe('live');
  });

  it('reads the same configuration checks the AI code uses', async () => {
    vi.stubEnv('MOSAIC_LLM_PROVIDER', 'fixtures');
    vi.stubEnv('JEV_API_KEY', '');
    vi.stubEnv('TENCENT_ASR_SECRET_ID', '');
    vi.stubEnv('CAPTURE_SERVER_ASR', '');
    try {
      const { readAiConfig } = await import('../ai-status.server');
      const probe = readAiConfig();
      expect(probe.llmFirstProvider).toBeNull();
      expect(probe.jevConfigured).toBe(false);
      expect(probe.asr.map((a) => a.state)).toEqual(['not_configured', 'not_enabled']);
      expect(resolveStatus(byId('llm_drafting'), probe).status).toBe('adapter_not_configured');

      vi.stubEnv('JEV_API_KEY', 'jev:apikey_test');
      expect(readAiConfig().jevConfigured).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
