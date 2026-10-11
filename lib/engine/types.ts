// MOSAIC deterministic rule engine — type definitions.
// Mirrors SPEC §4 (rule schema) and §5 (engine contract).

// ---------------------------------------------------------------------------
// SKILL.md frontmatter → PillManifest
// ---------------------------------------------------------------------------

export type PillStatus = "draft" | "shadow" | "approved" | "retired";

export interface ScopeObject {
  asset_types?: string[];
  incident_types?: string[];
  systems?: string[];
  geographic_scope?: string;
  standards?: string[];
}

export interface AccessObject {
  roles_allowed?: string[];
  roles_read_only?: string[];
  denied?: string[];
  sensitivity_default?: string;
}

export interface ReviewCadence {
  interval_months?: number;
  /** ISO date string. js-yaml may parse an unquoted YYYY-MM-DD as a Date — normalise to ISO. */
  next_review?: string;
  trigger_conditions?: string[];
}

export interface PillManifest {
  name: string;
  description: string;
  version: string;
  owner: string;
  steward: string;
  approver: string;
  /** Lifecycle gate. Every authored SKILL.md declares it. */
  status: PillStatus;
  /** Authored OBJECT: { asset_types[], incident_types[], systems[], geographic_scope, standards[] }. */
  scope: ScopeObject;
  /** Authored OBJECT: { roles_allowed[], roles_read_only[], denied[], sensitivity_default }. */
  access: AccessObject;
  review_cadence?: ReviewCadence;
}

// ---------------------------------------------------------------------------
// Rule schema (SPEC §4)
// ---------------------------------------------------------------------------

export type Operator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "exists";

export interface Condition {
  /** Dotted path resolved over {evidence, asset, incident}, e.g. "evidence.lew_signoff" */
  path: string;
  op: Operator;
  /** Compared value for eq/neq/gt/gte/lt/lte; array for `in`; ignored for `exists`. */
  value?: unknown;
}

export type ActionClass = "recommend" | "requires_approval" | "must_escalate";

export type Sensitivity = "public" | "internal" | "tenant_pii" | "commercial";

export interface EscalateTarget {
  role: string;
  fallback?: string;
}

export interface RuleException {
  when: Condition[];
  note: string;
  /** Additional evidence keys this exception requires (may never relax a gate). */
  add_required_evidence?: string[];
  /** Override or add an escalation target when this exception applies. */
  escalate_to?: EscalateTarget;
}

/** Per-asset-type overrides keyed by asset type, e.g. { data_centre: { escalate_to: {...} } } */
export type AssetOverrides = Record<
  string,
  Partial<
    Pick<
      Rule,
      | "escalate_to"
      | "action_class"
      | "deadline_minutes"
      | "allowed_actions"
      | "forbidden_actions"
      | "forbidden_if_missing_evidence"
    >
  > & { note?: string }
>;

export interface Rule {
  id: string;
  title: string;
  trigger: {
    incident_type: string;
    /** AND — all must match. Empty array = vacuously true. */
    all: Condition[];
    /** OR — if non-empty, at least one must match. Empty array = skip. */
    any: Condition[];
  };
  required_evidence: string[];
  decision: string;
  allowed_actions: string[];
  forbidden_actions: string[];
  exceptions: RuleException[];
  action_class: ActionClass;
  /** When true, status = 'blocked' if any required evidence is missing or unconfirmed. */
  forbidden_if_missing_evidence: boolean;
  escalate_to: EscalateTarget;
  owner: string;
  deadline_minutes: number | null;
  asset_overrides: AssetOverrides;
  asset_refs: string[];
  sensitivity: Sensitivity;
  provenance: string[];
}

// ---------------------------------------------------------------------------
// Pill
// ---------------------------------------------------------------------------

export type ConfirmationStatus = "confirmed" | "edited" | "rejected";

/** Per-rule provenance entry as authored in provenance.json `rules[<ruleId>]`. */
export interface ProvenanceRuleEntry {
  source: string;
  start: string;
  end: string;
  quote: string;
  confirmation: ConfirmationStatus;
  confirmed_by: string;
  confirmed_at: string;
  edit_note?: string;
  /** @deprecated legacy alias retained for component compat during migration. */
  transcript_segment?: string;
  /** @deprecated legacy alias retained for component compat during migration. */
  confirmation_status?: ConfirmationStatus;
}

export interface ProvenanceExpert {
  name: string;
  role: string;
  years_experience?: number;
  employer_context?: string;
}

/** Authored provenance.json shape: wrapper with per-rule entries under `rules`. */
export interface Provenance {
  pill: string;
  version: string;
  source_interview: string;
  interviewer?: string;
  expert: ProvenanceExpert;
  rules: Record<string, ProvenanceRuleEntry>;
}

/** Provenance keyed by rule id (the per-rule entries exposed on the Pill). */
export type ProvenanceMap = Record<string, ProvenanceRuleEntry>;

// ---------------------------------------------------------------------------
// Evidence catalog (optional pill file evidence.yaml)
// ---------------------------------------------------------------------------

/** One evidence definition as authored in evidence.yaml. */
export interface EvidenceCatalogEntry {
  label: string;
  type: string;
  confirmable_by: string[];
  description?: string;
}

/** Evidence key → definition. Empty when the pill ships no evidence.yaml. */
export type EvidenceCatalog = Record<string, EvidenceCatalogEntry>;

export interface Pill {
  manifest: PillManifest;
  rules: Rule[];
  provenance: ProvenanceMap;
  /** Raw eval cases keyed by case id. */
  evals: Record<string, EvalCase>;
  /** Optional evidence catalog from evidence.yaml ({} when absent). */
  evidenceCatalog: EvidenceCatalog;
}

// ---------------------------------------------------------------------------
// Inputs: Asset, Incident, Evidence
// ---------------------------------------------------------------------------

export interface Asset {
  id: string;
  name: string;
  type: string;
  attributes: Record<string, unknown>;
}

export interface EvidenceItem {
  value: unknown;
  source: string;
  at: string;
  confirmed: boolean;
}

/** Keyed evidence record: evidence key → item. */
export type Evidence = Record<string, EvidenceItem>;

export interface Incident {
  id: string;
  type: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Engine output (SPEC §5)
// ---------------------------------------------------------------------------

export type ActionStatus = "allowed" | "blocked" | "needs_approval" | "escalate" | "not_applicable";

export interface ActionDecision {
  ruleId: string;
  decision: string;
  actionClass: ActionClass;
  status: ActionStatus;
  missingEvidence: string[];
  owner: string;
  escalateTo: EscalateTarget | null;
  deadline: number | null;
  provenance: string[];
  pillId: string;
  pillVersion: string;
  allowedActions: string[];
  forbiddenActions: string[];
}

export interface Confidence {
  requiredEvidence: number;
  confirmed: number;
}

export interface TraceStep {
  ruleId: string;
  ruleTitle: string;
  triggered: boolean;
  /** Why the trigger matched or didn't — human-readable. */
  triggerReason: string;
  /** Per-condition results for the `all` array. */
  allConditions: ConditionTrace[];
  /** Per-condition results for the `any` array. */
  anyConditions: ConditionTrace[];
  missingEvidence: string[];
  exceptionApplied: boolean;
  exceptionNote: string | null;
  status: ActionStatus;
  actionClass: ActionClass;
  /** Effective escalate target (exception > asset override > base). */
  escalateTo: EscalateTarget;
}

export interface ConditionTrace {
  path: string;
  op: Operator;
  value?: unknown;
  resolved: unknown;
  matched: boolean;
  reason: string;
}

export interface EvaluationResult {
  actions: ActionDecision[];
  confidence: Confidence;
  trace: TraceStep[];
}

// ---------------------------------------------------------------------------
// Counterfactual
// ---------------------------------------------------------------------------

export interface CounterfactualResult {
  ruleId: string;
  currentStatus: ActionStatus;
  flipsTo: ActionStatus;
  /** Evidence keys that, if changed, would flip the status. */
  ifEvidence: string[];
  /** Plain-English summary sentence. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Evals
// ---------------------------------------------------------------------------

export interface EvalCase {
  /** Case id (filename without extension in evals/). */
  id: string;
  description?: string;
  asset: Asset;
  incident: Incident;
  evidence: Evidence;
  /** ruleId → expected decision fields (status always; others when authored). */
  expected: Record<string, ExpectedDecision>;
}

/** Fields an eval may assert on a rule's decision. `status` is always asserted. */
export interface ExpectedDecision {
  status: ActionStatus;
  /** Effective deadline (after asset overrides); `null` asserts "no deadline". */
  deadline_minutes?: number | null;
}

/** One asserted field of an expected decision. */
export type EvalField = keyof ExpectedDecision;

/** Value of an asserted field: a status for `status`, minutes (or null) for `deadline_minutes`. */
export type EvalValue = ActionStatus | number | null;

/** One assertion: a single field of one rule's decision in one eval case. */
export interface EvalCaseResult {
  caseId: string;
  ruleId: string;
  /** Which field this assertion checks — tells the reader exactly what mismatched. */
  field: EvalField;
  expected: EvalValue;
  actual: EvalValue;
  pass: boolean;
}

export interface EvalSummary {
  /** Assertions that passed. */
  passed: number;
  /** Assertions that failed. */
  failed: number;
  results: EvalCaseResult[];
}

export interface Regression {
  caseId: string;
  ruleId: string;
  field: EvalField;
  expected: EvalValue;
  oldActual: EvalValue;
  newActual: EvalValue;
}
