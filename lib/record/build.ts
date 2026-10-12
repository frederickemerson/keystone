// Build an incident's decision record. Pure and client-safe: the page passes
// role-scoped incident data (server) and the governance store's versions,
// decisions, confirmations and audit (browser). The engine is re-run on the
// full timeline exactly as the incident room runs it (under the version live
// now), so the record and the room can never disagree about a gate. Every
// named-human action keeps the version that was live when it was taken.

import { evaluate, type Pill, type Rule } from '@/lib/engine';
import { evaluateRule } from '@/lib/engine/evaluate';
import type { AssetRecord, IncidentRecord, TenantMessageFixture, Timeline } from '@/lib/data/schemas';
import { auditFor, type AuditLog } from '@/lib/governance/audit';
import { roleLabel } from '@/lib/governance/access';
import type { ActionDecisionRecord, EvidenceConfirmationRecord } from '@/lib/governance/store';
import { currentApproved, pillAtVersion, type PillVersion } from '@/lib/governance/versions';
import { connectorForSource, sourceLabel } from '@/lib/connectors/registry';
import {
  accumulateEvidence,
  toEngineAsset,
  toEngineEvidence,
  toEngineIncident,
  type EvidenceState,
} from '@/components/incident/engineInputs';
import { humanizeKey } from '@/components/incident/labels';
import { pillIdFromRef } from '@/components/registry/hub-utils';
import { openedUnderVersion, versionAtAction } from './versions';
import {
  DECISION_RECORD_SCHEMA,
  RECORD_CLOCKS,
  type EvidenceOrigin,
  type IncidentDecisionRecord,
  type RecordAiProposal,
  type RecordDecision,
  type RecordEvidence,
  type RecordGate,
  type RecordGateState,
  type RecordPill,
  type RecordPillVersion,
  type RecordTenantMessage,
} from './types';

export interface RecordPillInput {
  pillId: string;
  /** The pill as loaded from its files. */
  pill: Pill;
  /**
   * The pill's whole version history from the governance store, or null while
   * the store is not readable yet (the file version is shown meanwhile).
   */
  history: readonly PillVersion[] | null;
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
  /** Every pill with its version history. */
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

/** A pill at the version the incident opened under and at the version live now. */
interface ResolvedPill {
  pillId: string;
  history: readonly PillVersion[];
  openedUnder: { pill: Pill; version: RecordPillVersion };
  current: { pill: Pill; version: RecordPillVersion };
}

/** Everything the record derives from, with the pills resolved once. */
interface Ctx {
  input: RecordInput;
  pills: readonly ResolvedPill[];
}

function recordVersion(v: PillVersion): RecordPillVersion {
  return {
    version: v.version,
    ...(v.approvedBy ? { approvedBy: v.approvedBy } : {}),
    ...(v.approvedAt ? { approvedRecordedAt: v.approvedAt } : {}),
  };
}

/** Pills with an approved version (or every file pill before the store is readable). */
function resolvePills(input: RecordInput): ResolvedPill[] {
  const opened = {
    openedAt: input.incident.opened_at,
    pillId: pillIdFromRef(input.incident.pill_applied),
    pillVersion: input.incident.pill_version,
  };
  return input.pills.flatMap((p): ResolvedPill[] => {
    if (!p.history) {
      const file = { pill: p.pill, version: { version: p.pill.manifest.version } };
      return [{ pillId: p.pillId, history: [], openedUnder: file, current: file }];
    }
    const current = currentApproved(p.history);
    if (!current) return [];
    const openedUnder = openedUnderVersion(p.history, opened, p.pillId) ?? current;
    return [
      {
        pillId: p.pillId,
        history: p.history,
        openedUnder: { pill: pillAtVersion(p.pill, openedUnder), version: recordVersion(openedUnder) },
        current: { pill: pillAtVersion(p.pill, current), version: recordVersion(current) },
      },
    ];
  });
}

function labelFor(ctx: Ctx, key: string): string {
  for (const p of ctx.pills) {
    const entry = p.current.pill.evidenceCatalog[key];
    if (entry) return entry.label;
  }
  return humanizeKey(key);
}

function findRule(
  pills: readonly ResolvedPill[],
  ruleId: string,
  at: 'current' | 'openedUnder',
): { pill: ResolvedPill; rule: Rule } | undefined {
  for (const pill of pills) {
    const rule = pill[at].pill.rules.find((r) => r.id === ruleId);
    if (rule) return { pill, rule };
  }
  return undefined;
}

/** The pill version live when a person acted: recorded with the action, else by approval times. */
function versionWhen(ctx: Ctx, pillId: string | undefined, recorded: string | undefined, at: string): string | undefined {
  const pill = ctx.pills.find((p) => p.pillId === pillId);
  if (!pill) return recorded;
  return versionAtAction(pill.history, recorded, at, pill.openedUnder.version.version);
}

function toDecision(ctx: Ctx, record: ActionDecisionRecord | undefined): RecordDecision | undefined {
  if (!record) return undefined;
  const owner = findRule(ctx.pills, record.ruleId, 'openedUnder') ?? findRule(ctx.pills, record.ruleId, 'current');
  const pillId = record.pillId ?? owner?.pill.pillId;
  const pillVersion = versionWhen(ctx, pillId, record.pillVersion, record.at);
  return {
    outcome: record.outcome,
    actor: record.actor,
    recordedAt: record.at,
    ...(record.note ? { note: record.note } : {}),
    ...(pillId ? { pillId } : {}),
    ...(pillVersion ? { pillVersion } : {}),
  };
}

/** Where an evidence item's current value came from: its timeline event, or a person in Keystone. */
function originOf(ctx: Ctx, key: string, state: EvidenceState): EvidenceOrigin | undefined {
  const entry = state[key];
  if (!entry) return undefined;
  const c = ctx.input.confirmations[key];
  // accumulateEvidence folds a confirmation in right after its anchor event,
  // so the entry came from the confirmation exactly when it carries that event.
  if (c && c.eventId === entry.eventId) {
    const pillVersion = versionWhen(ctx, c.pillId, c.pillVersion, c.at);
    return {
      source: 'Confirmed in Keystone',
      eventId: entry.eventId,
      incidentTime: entry.at,
      confirmedBy: c.actor,
      recordedAt: c.at,
      ...(pillVersion ? { pillVersion } : {}),
    };
  }
  const connector = connectorForSource(entry.source);
  return { source: sourceLabel(entry.source), connectorId: connector?.id, eventId: entry.eventId, incidentTime: entry.at };
}

function evidenceList(ctx: Ctx, state: EvidenceState): RecordEvidence[] {
  return Object.keys(state).map((key) => ({
    key,
    label: labelFor(ctx, key),
    value: state[key].value,
    confirmed: state[key].confirmed,
    sensitivity: state[key].sensitivity,
    ...originOf(ctx, key, state)!,
  }));
}

function engineContext(input: RecordInput, state: EvidenceState) {
  return {
    asset: toEngineAsset(input.asset),
    incident: toEngineIncident(input.incident),
    evidence: toEngineEvidence(state),
  };
}

function gatesFor(c: Ctx, state: EvidenceState): { gates: RecordGate[]; pills: RecordPill[] } {
  const ctx = engineContext(c.input, state);
  const gates: RecordGate[] = [];
  const pills: RecordPill[] = [];
  for (const p of c.pills) {
    const { pill } = p.current;
    const result = evaluate(pill, ctx.asset, ctx.incident, ctx.evidence);
    pills.push({
      pillId: p.pillId,
      name: pill.manifest.name,
      openedUnder: p.openedUnder.version,
      current: p.current.version,
      rulesTriggered: result.actions.length,
      rulesTotal: pill.rules.length,
    });
    for (const action of result.actions) {
      const rule = pill.rules.find((r) => r.id === action.ruleId)!;
      const required = evaluateRule(rule, ctx).requiredEvidence;
      const decision = toDecision(c, c.input.decisions[rule.id]);
      gates.push({
        pillId: p.pillId,
        evaluatedUnder: p.current.version.version,
        ruleId: rule.id,
        title: rule.title,
        status: action.status,
        actionClass: action.actionClass,
        requiredEvidence: required.map((key) => ({
          key,
          label: labelFor(c, key),
          state: action.missingEvidence.includes(key) ? 'missing' : 'confirmed',
          origin: originOf(c, key, state),
        })),
        escalateTo: action.escalateTo,
        deadlineMinutes: action.deadline,
        ...(decision ? { decision } : {}),
      });
    }
  }
  return { gates, pills };
}

function gateAt(input: RecordInput, rule: Rule, step: number, pillVersion: string): RecordGateState {
  const state = accumulateEvidence(input.timeline.events, step, input.confirmations);
  const trace = evaluateRule(rule, engineContext(input, state)).trace;
  return { status: trace.triggered ? trace.status : 'not_applicable', missing: trace.missingEvidence, pillVersion };
}

/** A label placed mid-sentence: "Area confirmed dry" → "area confirmed dry"; "LEW sign-off" stays. */
function inSentence(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

function fateOf(ctx: Ctx, p: RecordProposalInput, then: RecordGateState, now: RecordGateState, decision?: RecordDecision): string {
  const gate = `${p.ruleId} v${then.pillVersion}`;
  const missing = then.missing.map((k) => inSentence(labelFor(ctx, k)));
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

/** Proposals were made during the incident: their "then" gate is the version it opened under. */
function proposalsFor(ctx: Ctx): RecordAiProposal[] {
  const { input } = ctx;
  const events = input.timeline.events;
  const ids = events.map((e) => e.id);
  return input.proposals.map((p) => {
    const before = findRule(ctx.pills, p.ruleId, 'openedUnder');
    const after = findRule(ctx.pills, p.ruleId, 'current');
    const step = ids.indexOf(p.afterEventId) + 1;
    const none: RecordGateState = { status: 'not_applicable', missing: [] };
    const then = before && step > 0 ? gateAt(input, before.rule, step, before.pill.openedUnder.version.version) : none;
    const now = after ? gateAt(input, after.rule, ids.length, after.pill.current.version.version) : none;
    const decision = toDecision(ctx, input.decisions[p.ruleId]);
    return {
      proposalId: p.proposalId,
      text: p.text,
      model: p.model,
      origin: 'recorded' as const,
      fixtureId: p.fixtureId,
      ruleId: p.ruleId,
      afterEventId: p.afterEventId,
      incidentTime: events[step - 1]?.at ?? '',
      gateThen: then,
      gateNow: now,
      fate: before ? fateOf(ctx, p, then, now, decision) : `Gate ${p.ruleId} is not in the version the incident opened under.`,
      ...(decision ? { decision } : {}),
    };
  });
}

function tenantMessagesFor(ctx: Ctx): RecordTenantMessage[] {
  return (ctx.input.tenantMessage?.drafts ?? []).map((d) => {
    const decision = toDecision(ctx, ctx.input.decisions[d.draft_id]);
    return {
      draftId: d.draft_id,
      channel: d.channel,
      subject: d.subject,
      approverRole: d.approved_by_role,
      ...(decision ? { decision } : {}),
    };
  });
}

function affectedParty(incident: IncidentRecord): { affectedParty?: { name: string; where: string } } {
  if (incident.affected_tenant) return { affectedParty: { name: incident.affected_tenant.name, where: `Floors ${incident.affected_tenant.floors}` } };
  if (incident.affected_client) return { affectedParty: { name: incident.affected_client.name, where: incident.affected_client.halls } };
  return {};
}

export function buildDecisionRecord(input: RecordInput): IncidentDecisionRecord {
  const { incident } = input;
  const ctx: Ctx = { input, pills: resolvePills(input) };
  const state = accumulateEvidence(input.timeline.events, input.timeline.events.length, input.confirmations);
  const { gates, pills } = gatesFor(ctx, state);
  return {
    schema: DECISION_RECORD_SCHEMA,
    generatedAt: input.generatedAt,
    clocks: RECORD_CLOCKS,
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
    evidence: evidenceList(ctx, state),
    aiProposals: proposalsFor(ctx),
    tenantMessages: tenantMessagesFor(ctx),
    audit: auditFor(input.audit, { incidentId: incident.id }).map(({ at, ...e }) => ({ ...e, recordedAt: at })),
    notes: [
      'Generated from the demo governance store in this browser. Mock data.',
      `Scoped for the ${roleLabel(input.role)} role: anything above its clearance is masked.`,
      'Gates are decided by the deterministic engine on confirmed evidence; AI proposals are recorded drafts and never open a gate.',
      'Each decision and confirmation names the pill version live when it was made; gates show the version they are evaluated under now.',
      'Keystone never sends tenant messages; it records who approved a draft.',
    ],
  };
}
