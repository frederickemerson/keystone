// The incident decision record: what was decided on an incident, by which
// pill versions and which named people, on what evidence. Plain JSON (it is
// also the "Download JSON" payload). Built only from role-scoped data.

import type { ActionClass, ActionStatus, EscalateTarget } from '@/lib/engine';
import type { AuditEvent } from '@/lib/governance/audit';
import type { SensitivityLevel } from '@/lib/data/schemas';

export const DECISION_RECORD_SCHEMA = 'keystone.decision-record/1';

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

export interface RecordPill {
  pillId: string;
  /** Manifest name, e.g. "chilled-water-leak". */
  name: string;
  version: string;
  approvedBy?: RecordActor;
  approvedAt?: string;
  /** Rules of this pill that fired on the incident. */
  rulesTriggered: number;
  rulesTotal: number;
}

/** Who or what made an evidence item true: a timeline source, or a named person in the app. */
export interface EvidenceOrigin {
  /** Connector label for a timeline source ("LEW sign-off"), or "Confirmed in Keystone". */
  source: string;
  connectorId?: string;
  eventId: string;
  at: string;
  /** A named person, when a person confirmed it in Keystone. Timeline entries name people in their text. */
  confirmedBy?: RecordActor;
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
  at: string;
  note?: string;
}

export interface RecordGate {
  pillId: string;
  pillVersion: string;
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
  /** The gate's status when the proposal was made, and what it was waiting for. */
  gateThen: { status: ActionStatus; missing: string[] };
  /** The gate's status on the full record. */
  gateNow: { status: ActionStatus; missing: string[] };
  /** One sentence: what happened to the proposal. */
  fate: string;
  decision?: RecordDecision;
}

export interface RecordTenantMessage {
  draftId: string;
  channel: string;
  subject: string;
  approverRole: string;
  decision?: RecordDecision;
}

export interface IncidentDecisionRecord {
  schema: typeof DECISION_RECORD_SCHEMA;
  generatedAt: string;
  /** The role the record was scoped to: values above its clearance are masked. */
  scopedForRole: string;
  incident: RecordIncident;
  pills: RecordPill[];
  gates: RecordGate[];
  evidence: RecordEvidence[];
  aiProposals: RecordAiProposal[];
  tenantMessages: RecordTenantMessage[];
  audit: AuditEvent[];
  notes: string[];
}
