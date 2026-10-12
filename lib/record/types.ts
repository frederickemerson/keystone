// The incident decision record: what was decided on an incident, by which
// pill versions and which named people, on what evidence. Plain JSON (it is
// also the "Download JSON" payload). Built only from role-scoped data.
//
// Two clocks, never mixed in one field:
// - `incidentTime`: the recorded incident clock (the timeline), as are
//   incident.openedAt / closedAt;
// - `recordedAt`: the real time a person did something in the app (a decision,
//   a confirmation, a version approval, an audit event).

import type { ActionClass, ActionStatus, EscalateTarget } from '@/lib/engine';
import type { AuditEvent } from '@/lib/governance/audit';
import type { SensitivityLevel } from '@/lib/data/schemas';

export const DECISION_RECORD_SCHEMA = 'keystone.decision-record/2';

/** What each clock means; carried in the JSON so the export explains itself. */
export const RECORD_CLOCKS = {
  incidentTime: 'Recorded incident clock: when it happened on the incident timeline (incident.openedAt and closedAt are on this clock too).',
  recordedAt: 'Real time a person acted in Keystone (decisions, confirmations, version approvals, audit events). It is not on the incident clock.',
} as const;

export interface RecordActor {
  name: string;
  role: string;
}

export interface RecordIncident {
  id: string;
  type: string;
  subtype: string;
  status: string;
  severity: string;
  openedAt: string;
  closedAt?: string;
  assetId: string;
  assetName: string;
  location: string;
  description: string;
  /** Affected tenant or data-centre client, masked for roles not cleared for it. */
  affectedParty?: { name: string; where: string };
}

export interface RecordPillVersion {
  version: string;
  approvedBy?: RecordActor;
  /** Real time the version was approved (or seeded) in Keystone. */
  approvedRecordedAt?: string;
}

export interface RecordPill {
  pillId: string;
  /** Manifest name, e.g. "chilled-water-leak". */
  name: string;
  /** The version live when the incident opened. */
  openedUnder: RecordPillVersion;
  /** The version live now; the gates below are evaluated under it. Equals openedUnder unless a later version was approved. */
  current: RecordPillVersion;
  /** Rules of this pill (current version) that fired on the incident. */
  rulesTriggered: number;
  rulesTotal: number;
}

/** Who or what made an evidence item true: a timeline source, or a named person in the app. */
export interface EvidenceOrigin {
  /** Connector label for a timeline source ("LEW sign-off"), or "Confirmed in Keystone". */
  source: string;
  connectorId?: string;
  eventId: string;
  /** Incident clock of the timeline event (for a confirmation, the event it is anchored to). */
  incidentTime: string;
  /** A named person, when a person confirmed it in Keystone. Timeline entries name people in their text. */
  confirmedBy?: RecordActor;
  /** Real time of the confirmation in Keystone. */
  recordedAt?: string;
  /** The pill version live when the person confirmed it. */
  pillVersion?: string;
}

export interface RecordEvidence extends EvidenceOrigin {
  key: string;
  label: string;
  /** Role-scoped: a value above the viewer's clearance is already masked. */
  value: unknown;
  confirmed: boolean;
  sensitivity: SensitivityLevel;
}

export type RequiredEvidenceState = 'confirmed' | 'missing';

export interface RecordRequiredEvidence {
  key: string;
  label: string;
  state: RequiredEvidenceState;
  origin?: EvidenceOrigin;
}

export interface RecordDecision {
  outcome: string;
  actor: RecordActor;
  /** Real time the person decided in Keystone. */
  recordedAt: string;
  note?: string;
  pillId?: string;
  /** The pill version live when the decision was made (never relabelled by a later approval). */
  pillVersion?: string;
}

export interface RecordGate {
  pillId: string;
  /** The pill version this gate's status was evaluated under (the version live now). */
  evaluatedUnder: string;
  ruleId: string;
  title: string;
  status: ActionStatus;
  actionClass: ActionClass;
  requiredEvidence: RecordRequiredEvidence[];
  escalateTo: EscalateTarget | null;
  deadlineMinutes: number | null;
  /** Latest named-human decision on this rule, if any. */
  decision?: RecordDecision;
}

export interface RecordAiProposal {
  proposalId: string;
  text: string;
  model: string;
  /** Every proposal today is a recorded fixture replayed with the timeline. */
  origin: 'recorded';
  fixtureId: string;
  ruleId: string;
  /** The timeline event after which the model made the proposal. */
  afterEventId: string;
  /** Incident clock of the event after which it was proposed. */
  incidentTime: string;
  /** The gate's status when the proposal was made, under the version the incident opened under. */
  gateThen: RecordGateState;
  /** The gate's status on the full record, under the version live now. */
  gateNow: RecordGateState;
  /** One sentence: what happened to the proposal. */
  fate: string;
  decision?: RecordDecision;
}

export interface RecordGateState {
  status: ActionStatus;
  missing: string[];
  pillVersion?: string;
}

/** An audit event with its real time named as such. */
export type RecordAuditEvent = Omit<AuditEvent, 'at'> & { recordedAt: string };

export interface RecordTenantMessage {
  draftId: string;
  channel: string;
  subject: string;
  approverRole: string;
  decision?: RecordDecision;
}

export interface IncidentDecisionRecord {
  schema: typeof DECISION_RECORD_SCHEMA;
  /** Real time the record was generated. */
  generatedAt: string;
  clocks: typeof RECORD_CLOCKS;
  /** The role the record was scoped to: values above its clearance are masked. */
  scopedForRole: string;
  incident: RecordIncident;
  pills: RecordPill[];
  gates: RecordGate[];
  evidence: RecordEvidence[];
  aiProposals: RecordAiProposal[];
  tenantMessages: RecordTenantMessage[];
  audit: RecordAuditEvent[];
  notes: string[];
}
