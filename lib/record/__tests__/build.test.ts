import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { canSee, ROLES } from '@/lib/governance/access';
import { appendAudit, EMPTY_AUDIT_LOG } from '@/lib/governance/audit';
import type { ActionDecisionRecord, EvidenceConfirmationRecord } from '@/lib/governance/store';
import { seedVersion, type PillVersion } from '@/lib/governance/versions';
import { DEMO_INCIDENT_ID } from '@/lib/journey/routes';
import { loadAllPills } from '@/lib/pills/load';
import { buildDecisionRecord, type RecordInput, type RecordPillInput } from '../build';
import { loadRecordScenario } from '../scenario.server';

const PEOPLE = {
  createdBy: { name: 'Rajesh Kumar', role: 'technical_services_lead' },
  approvedBy: { name: 'Goh Boon Kheng', role: 'head_technical_services' },
};
// Real (demo) clock: the store seeds the pill files when the app first loads.
const SEEDED_AT = '2026-10-12T07:50:00.000Z';

const bundles = loadAllPills();
const pills: RecordPillInput[] = bundles.map((b) => {
  const seed = seedVersion(b.id, b.pill, PEOPLE, SEEDED_AT);
  return { pillId: b.id, pill: b.pill, history: [seed] };
});

const TENANT = 'Straits Meridian Bank';
const uncleared = ROLES.map((r) => r.role).find((r) => !canSee(r, 'tenant_pii'))!;
const cleared = ROLES.map((r) => r.role).find((r) => canSee(r, 'tenant_pii'))!;

const decision: ActionDecisionRecord = {
  incidentId: DEMO_INCIDENT_ID,
  ruleId: 'TS-07',
  outcome: 'escalated',
  actor: { name: 'Muhammad Hafiz', role: 'technical_services_lead' },
  at: '2026-10-11T08:40:00+08:00',
  note: 'LEW on site; re-energise only after sign-off',
};

const audit = [
  { actor: 'Muhammad Hafiz', role: 'technical_services_lead', action: 'action_escalated' as const, incidentId: DEMO_INCIDENT_ID, ruleId: 'TS-07', detail: 'escalated' },
  { actor: 'Goh Boon Kheng', role: 'head_technical_services', action: 'version_approved' as const, pillId: 'x', detail: 'not about this incident' },
  { actor: 'Someone', role: 'technician', action: 'evidence_confirmed' as const, incidentId: 'INC-OTHER', detail: 'other incident' },
].reduce((log, e) => appendAudit(log, e), EMPTY_AUDIT_LOG);

function inputFor(role: string, overrides: Partial<RecordInput> = {}): RecordInput {
  const scenario = loadRecordScenario(DEMO_INCIDENT_ID, role)!;
  return {
    ...scenario,
    pills,
    decisions: { 'TS-07': decision },
    confirmations: {},
    audit,
    role,
    generatedAt: '2026-10-12T09:00:00.000Z',
    ...overrides,
  };
}

describe('incident decision record', () => {
  it('lists every approved pill evaluated, with its version', () => {
    const record = buildDecisionRecord(inputFor(cleared));
    expect(record.pills.map((p) => `${p.pillId}@${p.current.version}`).sort()).toEqual(bundles.map((b) => `${b.id}@${b.pill.manifest.version}`).sort());
    // Nothing approved since the incident opened: opened under the version that runs now.
    expect(record.pills.every((p) => p.openedUnder.version === p.current.version)).toBe(true);
    expect(record.pills.every((p) => p.rulesTriggered > 0)).toBe(true);
  });

  it('shows each gate with its evidence, source and the named human decision', () => {
    const record = buildDecisionRecord(inputFor(cleared));
    const ts07 = record.gates.find((g) => g.ruleId === 'TS-07')!;
    expect(ts07.requiredEvidence.map((r) => r.key).sort()).toEqual(['area_dry', 'insulation_resistance_ok', 'lew_signoff']);
    const signoff = ts07.requiredEvidence.find((r) => r.key === 'lew_signoff')!;
    expect(signoff).toMatchObject({ state: 'confirmed', origin: { source: 'LEW sign-off', connectorId: 'lew_signoff', eventId: 'EV-1011-17' } });
    expect(ts07.decision).toMatchObject({ outcome: 'escalated', actor: { name: 'Muhammad Hafiz' } });
  });

  it('says what happened to the AI proposal: held by the gate when it was made', () => {
    const [proposal] = buildDecisionRecord(inputFor(cleared)).aiProposals;
    expect(proposal).toMatchObject({ ruleId: 'TS-07', origin: 'recorded', afterEventId: 'EV-1011-10' });
    expect(proposal.gateThen.status).toBe('blocked');
    expect(proposal.gateThen.missing).toEqual(expect.arrayContaining(['lew_signoff', 'insulation_resistance_ok', 'area_dry']));
    expect(proposal.fate).toContain('LEW written sign-off');
    expect(proposal.fate).toMatch(/^Held by TS-07 v1\.2\.0: .*not confirmed when it was proposed\. Escalated by Muhammad Hafiz\.$/);
  });

  it('credits a confirmation made in Keystone to the named person', () => {
    const confirmation: EvidenceConfirmationRecord = {
      incidentId: DEMO_INCIDENT_ID,
      key: 'lew_on_site',
      value: true,
      eventId: 'EV-1011-17',
      pillId: pills[0].pillId,
      actor: { name: 'Rahul Menon', role: 'duty_lew' },
      at: '2026-10-11T09:30:00+08:00',
    };
    const record = buildDecisionRecord(inputFor(cleared, { confirmations: { lew_on_site: confirmation } }));
    expect(record.evidence.find((e) => e.key === 'lew_on_site')).toMatchObject({
      source: 'Confirmed in Keystone',
      confirmedBy: { name: 'Rahul Menon', role: 'duty_lew' },
      recordedAt: '2026-10-11T09:30:00+08:00',
    });
  });

  it('keeps only this incident\'s audit events', () => {
    const record = buildDecisionRecord(inputFor(cleared));
    expect(record.audit.map((e) => e.detail)).toEqual(['escalated']);
  });

  it('masks tenant data for a role not cleared for it, and shows it to one that is', () => {
    expect(uncleared).toBeDefined();
    expect(cleared).toBeDefined();
    const hidden = JSON.stringify(buildDecisionRecord(inputFor(uncleared)));
    expect(hidden).not.toContain(TENANT);
    const shown = buildDecisionRecord(inputFor(cleared));
    expect(shown.incident.affectedParty?.name).toBe(TENANT);
    // Gates do not depend on who is looking.
    const gateStatuses = (r: ReturnType<typeof buildDecisionRecord>) => r.gates.map((g) => `${g.ruleId}:${g.status}`);
    expect(gateStatuses(buildDecisionRecord(inputFor(uncleared)))).toEqual(gateStatuses(shown));
  });

  it('records tenant messages as approved or not, never as sent', () => {
    const draftDecision: ActionDecisionRecord = { ...decision, ruleId: 'TM-1011-01', outcome: 'approved', actor: { name: 'Lim Hui Fen', role: 'tenant_experience_manager' } };
    const record = buildDecisionRecord(inputFor(cleared, { decisions: { 'TM-1011-01': draftDecision } }));
    expect(record.tenantMessages).toEqual([
      expect.objectContaining({ draftId: 'TM-1011-01', decision: expect.objectContaining({ outcome: 'approved' }) }),
    ]);
    expect(record.notes.join(' ')).toContain('never sends tenant messages');
  });

  it('is plain JSON', () => {
    const record = buildDecisionRecord(inputFor(cleared));
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });

  it('shows the file version before the governance store is readable', () => {
    const record = buildDecisionRecord(inputFor(cleared, { pills: pills.map((p) => ({ ...p, history: null })) }));
    expect(record.pills.map((p) => p.current.version).sort()).toEqual(bundles.map((b) => b.pill.manifest.version).sort());
  });

  it('returns null for an unknown incident', () => {
    expect(loadRecordScenario('INC-NOPE', cleared)).toBeNull();
  });
});

describe('decision record across a pill version change (M5)', () => {
  const CWL = bundles.find((b) => b.pill.manifest.name === 'chilled-water-leak')!;
  // Real clock, as the QA run: escalated 07:54:19Z under v1.2.0, v1.3.0 approved 07:57:57Z.
  const ESCALATED_AT = '2026-10-12T07:54:19.000Z';
  const CONFIRMED_AT = '2026-10-12T07:55:30.000Z';
  const V13_APPROVED_AT = '2026-10-12T07:57:57.000Z';
  const LATER_AT = '2026-10-12T08:05:00.000Z';
  const approver = { name: 'Goh Boon Kheng', role: 'head_technical_services' };

  function withV13(): RecordPillInput[] {
    return pills.map((p) => {
      if (p.pillId !== CWL.id) return p;
      const [seed] = p.history!;
      const v13: PillVersion = {
        ...seed,
        version: '1.3.0',
        status: 'Approved',
        parentVersion: seed.version,
        reason: 'Add TS-14 from a frontline note',
        createdAt: '2026-10-12T07:56:00.000Z',
        approvedBy: approver,
        approvedAt: V13_APPROVED_AT,
      };
      return { ...p, history: [{ ...seed, status: 'Retired' }, v13] };
    });
  }

  const escalated: ActionDecisionRecord = {
    incidentId: DEMO_INCIDENT_ID,
    ruleId: 'TS-07',
    outcome: 'escalated',
    actor: { name: 'Rajesh Kumar', role: 'technical_services_lead' },
    at: ESCALATED_AT,
    pillId: CWL.id,
    pillVersion: '1.2.0',
  };

  function record(decisions: RecordInput['decisions'] = { 'TS-07': escalated }, confirmations: RecordInput['confirmations'] = {}) {
    return buildDecisionRecord(inputFor(cleared, { pills: withV13(), decisions, confirmations }));
  }

  it('keeps v1.2.0 on a decision made under v1.2.0 after v1.3.0 is approved', () => {
    const ts07 = record().gates.find((g) => g.ruleId === 'TS-07')!;
    expect(ts07.decision).toMatchObject({ outcome: 'escalated', pillId: CWL.id, pillVersion: '1.2.0', recordedAt: ESCALATED_AT });
    // The gate itself is evaluated now, under the version live now, and says so.
    expect(ts07.evaluatedUnder).toBe('1.3.0');
  });

  it('derives the live version from approval times when a decision did not record one', () => {
    const { pillVersion: _drop, ...unversioned } = escalated;
    const early = record({ 'TS-07': unversioned }).gates.find((g) => g.ruleId === 'TS-07')!;
    expect(early.decision?.pillVersion).toBe('1.2.0');
    const late = record({ 'TS-07': { ...unversioned, at: LATER_AT } }).gates.find((g) => g.ruleId === 'TS-07')!;
    expect(late.decision?.pillVersion).toBe('1.3.0');
  });

  it('attributes an evidence confirmation to the version live when it was made', () => {
    const confirmation: EvidenceConfirmationRecord = {
      incidentId: DEMO_INCIDENT_ID,
      key: 'lew_on_site',
      value: true,
      eventId: 'EV-1011-17',
      pillId: CWL.id,
      actor: { name: 'Rahul Menon', role: 'duty_lew' },
      at: CONFIRMED_AT,
    };
    const item = record(undefined, { lew_on_site: confirmation }).evidence.find((e) => e.key === 'lew_on_site')!;
    expect(item).toMatchObject({ confirmedBy: { name: 'Rahul Menon' }, pillVersion: '1.2.0', recordedAt: CONFIRMED_AT });
    // The incident clock of the event it is anchored to, kept apart from the real time.
    expect(item.incidentTime).toMatch(/^2026-10-11T/);
  });

  it('shows the version the incident opened under and, separately, the one approved later', () => {
    const pill = record().pills.find((p) => p.pillId === CWL.id)!;
    expect(pill.openedUnder.version).toBe('1.2.0');
    expect(pill.current).toMatchObject({ version: '1.3.0', approvedBy: approver, approvedRecordedAt: V13_APPROVED_AT });
  });

  it('names its clocks in the JSON: incidentTime for the timeline, recordedAt for actions in the demo', () => {
    const json = JSON.parse(JSON.stringify(record())) as Record<string, unknown> & { gates: Record<string, unknown>[]; audit: Record<string, unknown>[] };
    expect(json.clocks).toEqual({ incidentTime: expect.any(String), recordedAt: expect.any(String) });
    const ts07 = json.gates.find((g) => g.ruleId === 'TS-07')!;
    const decisionJson = ts07.decision as Record<string, unknown>;
    expect(decisionJson).toHaveProperty('recordedAt', ESCALATED_AT);
    expect(decisionJson).not.toHaveProperty('at');
    const signoff = (ts07.requiredEvidence as { key: string; origin: Record<string, unknown> }[]).find((r) => r.key === 'lew_signoff')!;
    expect(signoff.origin).toHaveProperty('incidentTime');
    expect(signoff.origin).not.toHaveProperty('at');
    expect(json.audit.every((e) => 'recordedAt' in e && !('at' in e))).toBe(true);
  });
});

