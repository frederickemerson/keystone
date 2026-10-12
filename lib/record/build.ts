// Build an incident's decision record. Pure and client-safe: the page passes
// role-scoped incident data (server) and the governance store's versions,
// decisions, confirmations and audit (browser). The engine is re-run on the
// full timeline exactly as the incident room runs it, so the record and the
// room can never disagree about a gate.

import { evaluate, type Pill, type Rule } from '@/lib/engine';
import { evaluateRule } from '@/lib/engine/evaluate';
import type { AssetRecord, IncidentRecord, TenantMessageFixture, Timeline } from '@/lib/data/schemas';
import { auditFor, type AuditLog } from '@/lib/governance/audit';
import { roleLabel } from '@/lib/governance/access';
import type { ActionDecisionRecord, EvidenceConfirmationRecord } from '@/lib/governance/store';
import type { Actor } from '@/lib/governance/versions';
import { connectorForSource, sourceLabel } from '@/lib/connectors/registry';
import {
  accumulateEvidence,
  toEngineAsset,
  toEngineEvidence,
  toEngineIncident,
  type EvidenceState,
} from '@/components/incident/engineInputs';
import { humanizeKey } from '@/components/incident/labels';
import {
  DECISION_RECORD_SCHEMA,
  type EvidenceOrigin,
  type IncidentDecisionRecord,
  type RecordAiProposal,
  type RecordDecision,
  type RecordEvidence,
  type RecordGate,
  type RecordPill,
  type RecordTenantMessage,
} from './types';

export interface RecordPillInput {
  pillId: string;
  /** The pill at its approved version (pillAtVersion). */
  pill: Pill;
  version: string;
  approvedBy?: Actor;
  approvedAt?: string;
}

export interface RecordProposalInput {
  proposalId: string;
  ruleId: string;
  text: string;
  model: string;
  fixtureId: string;
  afterEventId: string;
}

export interface RecordInput {
  /** Role-scoped on the server (lib/governance/scope). */
  incident: IncidentRecord;
  asset: AssetRecord;
  timeline: Timeline;
  tenantMessage: TenantMessageFixture | null;
  proposals: readonly RecordProposalInput[];
  /** Every approved pill, at its approved version. */
  pills: readonly RecordPillInput[];
  /** This incident's latest decision per rule / draft id. */
  decisions: Readonly<Record<string, ActionDecisionRecord>>;
  /** This incident's human evidence confirmations. */
  confirmations: Readonly<Record<string, EvidenceConfirmationRecord>>;
  audit: AuditLog;
  role: string;
  generatedAt: string;
}

const STATUS_WORDS = {
  allowed: 'allowed',
  blocked: 'blocked',
  needs_approval: 'waiting for approval',
  escalate: 'escalated to a named person',
  not_applicable: 'not applicable',
} as const;

function labelFor(pills: readonly RecordPillInput[], key: string): string {
  for (const p of pills) {
    const entry = p.pill.evidenceCatalog[key];
    if (entry) return entry.label;
  }
  return humanizeKey(key);
}

function toDecision(record: ActionDecisionRecord | undefined): RecordDecision | undefined {
  if (!record) return undefined;
  return { outcome: record.outcome, actor: record.actor, at: record.at, ...(record.note ? { note: record.note } : {}) };
}

/** Where an evidence item's current value came from: its timeline event, or a person in Keystone. */
function originOf(key: string, state: EvidenceState, confirmations: RecordInput['confirmations']): EvidenceOrigin | undefined {
  const entry = state[key];
  if (!entry) return undefined;
  const c = confirmations[key];
  // accumulateEvidence folds a confirmation in right after its anchor event,
  // so the entry came from the confirmation exactly when it carries that event.
  if (c && c.eventId === entry.eventId) {
    return { source: 'Confirmed in Keystone', eventId: entry.eventId, at: c.at, confirmedBy: c.actor };
  }
  const connector = connectorForSource(entry.source);
  return { source: sourceLabel(entry.source), connectorId: connector?.id, eventId: entry.eventId, at: entry.at };
}

function evidenceList(input: RecordInput, state: EvidenceState): RecordEvidence[] {
  return Object.keys(state).map((key) => ({
    key,
    label: labelFor(input.pills, key),
    value: state[key].value,
    confirmed: state[key].confirmed,
    sensitivity: state[key].sensitivity,
    ...originOf(key, state, input.confirmations)!,
  }));
}

function engineContext(input: RecordInput, state: EvidenceState) {
  return {
    asset: toEngineAsset(input.asset),
    incident: toEngineIncident(input.incident),
    evidence: toEngineEvidence(state),
  };
}

function gatesFor(input: RecordInput, state: EvidenceState): { gates: RecordGate[]; pills: RecordPill[] } {
  const ctx = engineContext(input, state);
  const gates: RecordGate[] = [];
  const pills: RecordPill[] = [];
  for (const p of input.pills) {
    const result = evaluate(p.pill, ctx.asset, ctx.incident, ctx.evidence);
    pills.push({
      pillId: p.pillId,
      name: p.pill.manifest.name,
      version: p.version,
      approvedBy: p.approvedBy,
      approvedAt: p.approvedAt,
      rulesTriggered: result.actions.length,
      rulesTotal: p.pill.rules.length,
    });
    for (const action of result.actions) {
      const rule = p.pill.rules.find((r) => r.id === action.ruleId)!;
      const required = evaluateRule(rule, ctx).requiredEvidence;
      gates.push({
        pillId: p.pillId,
        pillVersion: p.version,
        ruleId: rule.id,
        title: rule.title,
        status: action.status,
        actionClass: action.actionClass,
        requiredEvidence: required.map((key) => ({
          key,
          label: labelFor(input.pills, key),
          state: action.missingEvidence.includes(key) ? 'missing' : 'confirmed',
          origin: originOf(key, state, input.confirmations),
        })),
        escalateTo: action.escalateTo,
        deadlineMinutes: action.deadline,
        decision: toDecision(input.decisions[rule.id]),
      });
    }
  }
  return { gates, pills };
}

function findRule(pills: readonly RecordPillInput[], ruleId: string): { pill: RecordPillInput; rule: Rule } | undefined {
  for (const pill of pills) {
    const rule = pill.pill.rules.find((r) => r.id === ruleId);
    if (rule) return { pill, rule };
  }
  return undefined;
}

function gateAt(input: RecordInput, rule: Rule, step: number): { status: RecordAiProposal['gateNow']['status']; missing: string[] } {
  const state = accumulateEvidence(input.timeline.events, step, input.confirmations);
  const trace = evaluateRule(rule, engineContext(input, state)).trace;
  return { status: trace.triggered ? trace.status : 'not_applicable', missing: trace.missingEvidence };
}

/** A label placed mid-sentence: "Area confirmed dry" → "area confirmed dry"; "LEW sign-off" stays. */
function inSentence(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

function fateOf(input: RecordInput, p: RecordProposalInput, version: string, then: RecordAiProposal['gateThen'], now: RecordAiProposal['gateNow'], decision?: RecordDecision): string {
  const gate = `${p.ruleId} v${version}`;
  const missing = then.missing.map((k) => inSentence(labelFor(input.pills, k)));
  let first: string;
  if (then.status === 'allowed') first = `Gate ${gate} allowed it when it was proposed; a named person still acts.`;
  else if (then.status === 'not_applicable') first = `Gate ${gate} did not apply when it was proposed.`;
  else if (missing.length > 0) first = `Held by ${gate}: ${missing.join(', ')} not confirmed when it was proposed.`;
  else first = `Held by ${gate}: ${STATUS_WORDS[then.status]}.`;
  const after = decision
    ? `${humanizeKey(decision.outcome)} by ${decision.actor.name}.`
    : `Gate now ${STATUS_WORDS[now.status]}; no decision recorded in Keystone.`;
  return `${first} ${after}`;
}

function proposalsFor(input: RecordInput): RecordAiProposal[] {
  const ids = input.timeline.events.map((e) => e.id);
  return input.proposals.map((p) => {
    const found = findRule(input.pills, p.ruleId);
    const step = ids.indexOf(p.afterEventId) + 1;
    const none = { status: 'not_applicable' as const, missing: [] };
    const then = found && step > 0 ? gateAt(input, found.rule, step) : none;
    const now = found ? gateAt(input, found.rule, ids.length) : none;
    const decision = toDecision(input.decisions[p.ruleId]);
    return {
      proposalId: p.proposalId,
      text: p.text,
      model: p.model,
      origin: 'recorded' as const,
      fixtureId: p.fixtureId,
      ruleId: p.ruleId,
      afterEventId: p.afterEventId,
      gateThen: then,
      gateNow: now,
      fate: found ? fateOf(input, p, found.pill.version, then, now, decision) : `Gate ${p.ruleId} is not in an approved pill.`,
      ...(decision ? { decision } : {}),
    };
  });
}

function tenantMessagesFor(input: RecordInput): RecordTenantMessage[] {
  return (input.tenantMessage?.drafts ?? []).map((d) => ({
    draftId: d.draft_id,
    channel: d.channel,
    subject: d.subject,
    approverRole: d.approved_by_role,
    ...(input.decisions[d.draft_id] ? { decision: toDecision(input.decisions[d.draft_id]) } : {}),
  }));
}

function affectedParty(incident: IncidentRecord): { affectedParty?: { name: string; where: string } } {
  if (incident.affected_tenant) return { affectedParty: { name: incident.affected_tenant.name, where: `Floors ${incident.affected_tenant.floors}` } };
  if (incident.affected_client) return { affectedParty: { name: incident.affected_client.name, where: incident.affected_client.halls } };
  return {};
}

export function buildDecisionRecord(input: RecordInput): IncidentDecisionRecord {
  const { incident } = input;
  const state = accumulateEvidence(input.timeline.events, input.timeline.events.length, input.confirmations);
  const { gates, pills } = gatesFor(input, state);
  return {
    schema: DECISION_RECORD_SCHEMA,
    generatedAt: input.generatedAt,
    scopedForRole: input.role,
    incident: {
      id: incident.id,
      type: incident.type,
      subtype: incident.subtype,
      status: incident.status,
      severity: incident.severity,
      openedAt: incident.opened_at,
      ...(incident.closed_at ? { closedAt: incident.closed_at } : {}),
      assetId: incident.asset_id,
      assetName: incident.asset_name,
      location: incident.location,
      description: incident.description,
      ...affectedParty(incident),
    },
    pills,
    gates,
    evidence: evidenceList(input, state),
    aiProposals: proposalsFor(input),
    tenantMessages: tenantMessagesFor(input),
    audit: auditFor(input.audit, { incidentId: incident.id }),
    notes: [
      'Generated from the demo governance store in this browser. Mock data.',
      `Scoped for the ${roleLabel(input.role)} role: anything above its clearance is masked.`,
      'Gates are decided by the deterministic engine on confirmed evidence; AI proposals are recorded drafts and never open a gate.',
      'Keystone never sends tenant messages; it records who approved a draft.',
    ],
  };
}
