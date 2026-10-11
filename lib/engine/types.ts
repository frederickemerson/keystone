// MOSAIC deterministic rule engine — type definitions.
// Mirrors SPEC §4 (rule schema) and §5 (engine contract).

// ---------------------------------------------------------------------------
// SKILL.md frontmatter → PillManifest
// ---------------------------------------------------------------------------

export interface PillManifest {
  name: string;
  description: string;
  version: string;
  owner: string;
  steward: string;
  approver: string;
  scope: string;
  access: string;
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
}

/** Per-asset-type overrides keyed by asset type, e.g. { data_centre: { escalate_to: {...} } } */
export type AssetOverrides = Record<
  string,
  Partial<Pick<Rule, "escalate_to" | "action_class" | "deadline_minutes" | "allowed_actions" | "forbidden_actions">>
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

/** Provenance entry: rule_id → transcript spans + confirmation status. */
export type ProvenanceMap = Record<
  string,
  {
    transcript_segment: string;
    confirmation_status: "confirmed" | "edited" | "rejected";
    expert_role?: string;
  }
>;

export interface Pill {
  manifest: PillManifest;
  rules: Rule[];
  provenance: ProvenanceMap;
  /** Raw eval cases keyed by case id. */
  evals: Record<string, EvalCase>;
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

export type ActionStatus = "allowed" | "blocked" | "needs_approval" | "escalate";

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
  /** ruleId → expected status. */
  expected: Record<string, ActionStatus>;
}

export interface EvalCaseResult {
  caseId: string;
  ruleId: string;
  expected: ActionStatus;
  actual: ActionStatus;
  pass: boolean;
}

export interface EvalSummary {
  passed: number;
  failed: number;
  results: EvalCaseResult[];
}

export interface Regression {
  caseId: string;
  ruleId: string;
  expected: ActionStatus;
  oldActual: ActionStatus;
  newActual: ActionStatus;
}
