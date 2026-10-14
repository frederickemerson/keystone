// The attention list: order, reasons, and what it refuses to include.

import { describe, expect, it } from 'vitest';
import { loadAssets, loadIncidents } from '@/lib/data';
import { loadAllPills } from '@/lib/pills/load';
import type { IncidentRecord } from '@/lib/data/schemas';
import { ATTENTION_KINDS, attentionList } from '../attention';

const LABELS = {
  lew_signoff: 'LEW sign-off',
  area_dry: 'Area dry',
  insulation_resistance_ok: 'Insulation resistance within limits',
};

function incident(over: Partial<IncidentRecord> & { id: string }): IncidentRecord {
  return {
    asset_id: 'asset-hf1',
    status: 'active',
    opened_at: '2026-10-11T08:00:00+08:00',
    ...over,
  } as IncidentRecord;
}

describe('attentionList', () => {
  it('puts a blocked gate above an approval, and an approval above an escalation', () => {
    const report = attentionList(
      [
        incident({
          id: 'INC-1',
          actions: [
            { rule_id: 'TE-04', decision: 'Call the anchor tenant', action_class: 'must_escalate', status: 'escalate', provenance: 'p' },
            { rule_id: 'TE-01', decision: 'First notice', action_class: 'requires_approval', status: 'needs_approval', provenance: 'p' },
            { rule_id: 'TS-07', decision: 'Re-energise', action_class: 'must_escalate', status: 'blocked', provenance: 'p' },
          ],
        }),
      ],
      LABELS,
      10,
    );
    expect(report.items.map((i) => i.ruleId)).toEqual(['TS-07', 'TE-01', 'TE-04']);
    expect(report.items.map((i) => i.kind)).toEqual([...ATTENTION_KINDS]);
  });

  it('puts the longest-waiting incident first inside one kind', () => {
    const report = attentionList(
      [
        incident({
          id: 'INC-NEW',
          opened_at: '2026-10-11T09:00:00+08:00',
          actions: [{ rule_id: 'TS-07', decision: 'd', action_class: 'must_escalate', status: 'blocked', provenance: 'p' }],
        }),
        incident({
          id: 'INC-OLD',
          opened_at: '2026-10-11T07:00:00+08:00',
          actions: [{ rule_id: 'TS-07', decision: 'd', action_class: 'must_escalate', status: 'blocked', provenance: 'p' }],
        }),
      ],
      LABELS,
      10,
    );
    expect(report.items.map((i) => i.incidentId)).toEqual(['INC-OLD', 'INC-NEW']);
  });

  it('names the missing evidence in the reader’s own labels', () => {
    const report = attentionList(
      [
        incident({
          id: 'INC-1',
          actions: [
            {
              rule_id: 'TS-07',
              decision: 'Re-energise',
              action_class: 'must_escalate',
              status: 'blocked',
              missing_evidence: ['lew_signoff', 'insulation_resistance_ok', 'area_dry'],
              provenance: 'p',
            },
          ],
        }),
      ],
      LABELS,
      10,
    );
    expect(report.items[0].why).toBe(
      'TS-07 is holding this until LEW sign-off, Insulation resistance within limits and Area dry are confirmed by someone the pill allows.',
    );
  });

  it('falls back to the raw key only when no label was supplied', () => {
    const report = attentionList(
      [
        incident({
          id: 'INC-1',
          actions: [
            { rule_id: 'TS-07', decision: 'd', action_class: 'must_escalate', status: 'blocked', missing_evidence: ['cfm_cosign'], provenance: 'p' },
          ],
        }),
      ],
      {},
      10,
    );
    expect(report.items[0].why).toContain('cfm_cosign');
  });

  it('leaves out a closed incident, a completed action and a status nothing is waiting on', () => {
    const report = attentionList(
      [
        incident({
          id: 'INC-CLOSED',
          status: 'closed',
          actions: [{ rule_id: 'TS-07', decision: 'd', action_class: 'must_escalate', status: 'blocked', provenance: 'p' }],
        }),
        incident({
          id: 'INC-OPEN',
          actions: [
            { rule_id: 'TS-02', decision: 'd', action_class: 'recommend', status: 'completed', completed_at: '2026-10-11T08:09:00+08:00', provenance: 'p' },
            { rule_id: 'TS-04', decision: 'd', action_class: 'recommend', status: 'allowed', provenance: 'p' },
            {
              rule_id: 'TE-06',
              decision: 'd',
              action_class: 'must_escalate',
              status: 'escalate',
              completed_at: '2026-10-11T09:28:00+08:00',
              provenance: 'p',
            },
          ],
        }),
      ],
      LABELS,
      10,
    );
    expect(report.items).toEqual([]);
    expect(report.hidden).toBe(0);
  });

  it('reports what the limit hid instead of dropping it silently', () => {
    const actions = ['TS-07', 'TS-08', 'TS-09'].map((rule_id) => ({
      rule_id,
      decision: 'd',
      action_class: 'must_escalate' as const,
      status: 'blocked',
      provenance: 'p',
    }));
    const report = attentionList([incident({ id: 'INC-1', actions })], LABELS, 2);
    expect(report.items).toHaveLength(2);
    expect(report.hidden).toBe(1);
  });

  it('carries the named person and the deadline the record sets', () => {
    const report = attentionList(
      [
        incident({
          id: 'INC-1',
          actions: [
            {
              rule_id: 'TE-01',
              decision: 'First notice',
              action_class: 'requires_approval',
              status: 'needs_approval',
              deadline_min: 30,
              escalate_to: { role: 'tenant_experience_manager', name: 'Lim Hui Fen' },
              provenance: 'p',
            },
          ],
        }),
      ],
      LABELS,
      10,
    );
    expect(report.items[0]).toMatchObject({
      who: 'Lim Hui Fen (tenant_experience_manager)',
      deadlineMinutes: 30,
    });
  });

  it('is stable: the same record always produces the same order', () => {
    const incidents = loadIncidents();
    const first = attentionList(incidents, LABELS, 5);
    const second = attentionList([...incidents].reverse(), LABELS, 5);
    expect(second.items.map((i) => `${i.incidentId}:${i.ruleId}`)).toEqual(
      first.items.map((i) => `${i.incidentId}:${i.ruleId}`),
    );
  });

  it('runs on the real record and reports only live work', () => {
    const labels: Record<string, string> = {};
    for (const { pill } of loadAllPills()) {
      for (const [key, entry] of Object.entries(pill.evidenceCatalog)) labels[key] ??= entry.label;
    }
    const incidents = loadIncidents();
    const report = attentionList(incidents, labels, 5);
    expect(report.items.length).toBeGreaterThan(0);

    const open = new Set(incidents.filter((i) => i.status !== 'closed').map((i) => i.id));
    const assets = new Set(loadAssets().map((a) => a.id));
    for (const item of report.items) {
      expect(open.has(item.incidentId)).toBe(true);
      expect(assets.has(item.assetId)).toBe(true);
      // Every reason names its rule, so a reader can go and read the rule.
      expect(item.why).toContain(item.ruleId);
      // No raw evidence key survives into a reason when a label exists.
      expect(item.why).not.toMatch(/\b[a-z]+_[a-z_]+\b/);
    }
    // The blocked gates are the ones the demo turns on, so they lead.
    expect(report.items[0].kind).toBe('gate_blocked');
  });
});
