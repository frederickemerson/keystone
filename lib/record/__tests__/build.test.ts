import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { canSee, ROLES } from '@/lib/governance/access';
import { appendAudit, EMPTY_AUDIT_LOG } from '@/lib/governance/audit';
import type { ActionDecisionRecord, EvidenceConfirmationRecord } from '@/lib/governance/store';
import { DEMO_INCIDENT_ID } from '@/lib/journey/routes';
import { loadAllPills } from '@/lib/pills/load';
import { buildDecisionRecord, type RecordInput, type RecordPillInput } from '../build';
import { loadRecordScenario } from '../scenario.server';

const pills: RecordPillInput[] = loadAllPills().map((b) => ({
  pillId: b.id,
  pill: b.pill,
  version: b.pill.manifest.version,
  approvedBy: { name: 'Goh Boon Kheng', role: 'head_technical_services' },
}));

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
    expect(record.pills.map((p) => `${p.pillId}@${p.version}`).sort()).toEqual(pills.map((p) => `${p.pillId}@${p.version}`).sort());
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

  it('returns null for an unknown incident', () => {
    expect(loadRecordScenario('INC-NOPE', cleared)).toBeNull();
  });
});
