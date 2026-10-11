// MOSAIC deterministic rule engine — evaluate() per SPEC §5.

import type {
  ActionClass,
  ActionDecision,
  ActionStatus,
  Asset,
  Confidence,
  EscalateTarget,
  EvaluationResult,
  Evidence,
  Incident,
  Pill,
  Rule,
  RuleException,
  TraceStep,
} from "./types.js";
import {
  type ConditionContext,
  evaluateAll,
  evaluateAny,
  evaluateCondition,
} from "./conditions.js";

// ---------------------------------------------------------------------------
// Public API: evaluate(pill, asset, incident, evidence)
// ---------------------------------------------------------------------------

export function evaluate(
  pill: Pill,
  asset: Asset,
  incident: Incident,
  evidence: Evidence,
): EvaluationResult {
  const ctx: ConditionContext = { evidence, asset, incident };

  const actions: ActionDecision[] = [];
  const trace: TraceStep[] = [];

  // Confidence: sum over fired rules' required evidence coverage.
  let totalRequired = 0;
  let totalConfirmed = 0;

  for (const rule of pill.rules) {
    const step = evaluateRule(rule, ctx, pill);
    trace.push(step);

    if (step.triggered) {
      // Confidence contribution from this fired rule.
      const req = rule.required_evidence.length;
      const conf = rule.required_evidence.filter((key) => {
        const item = evidence[key];
        return item !== undefined && item.confirmed;
      }).length;
      totalRequired += req;
      totalConfirmed += conf;

      // Build the action decision.
      actions.push(buildAction(rule, step, asset, pill));
    }
  }

  const confidence: Confidence = {
    requiredEvidence: totalRequired,
    confirmed: totalConfirmed,
  };

  return { actions, confidence, trace };
}

// ---------------------------------------------------------------------------
// Per-rule evaluation
// ---------------------------------------------------------------------------

function evaluateRule(
  rule: Rule,
  ctx: ConditionContext,
  _pill: Pill,
): TraceStep {
  // 1. Incident type match.
  const typeMatch = ctx.incident.type === rule.trigger.incident_type;

  // 2. `all` conditions (AND).
  const allResult = evaluateAll(rule.trigger.all, ctx);

  // 3. `any` conditions (OR, vacuously true if empty).
  const anyResult = evaluateAny(rule.trigger.any, ctx);

  const triggered = typeMatch && allResult.passed && anyResult.passed;

  // Trigger reason.
  let triggerReason: string;
  if (!typeMatch) {
    triggerReason = `Incident type "${ctx.incident.type}" does not match required "${rule.trigger.incident_type}"`;
  } else if (!allResult.passed) {
    const failed = allResult.traces.find((t) => !t.matched);
    triggerReason = `All-conditions failed: ${failed?.reason ?? "no conditions"}`;
  } else if (!anyResult.passed) {
    triggerReason = `Any-conditions failed: none of ${rule.trigger.any.length} conditions matched`;
  } else {
    triggerReason = "Trigger matched (incident type + all conditions + any conditions)";
  }

  // 4. Effective action class and forbidden_if_missing_evidence (with asset overrides).
  const effectiveClass = resolveActionClass(rule, ctx.asset.type);
  const effectiveForbidden = resolveForbiddenIfMissing(rule, ctx.asset.type);

  // 5. Exception check — exceptions annotate and may ADD requirements, never relax.
  let exceptionApplied = false;
  let exceptionNote: string | null = null;
  let exceptionAddRequired: string[] = [];
  // Exception escalate_to is supported in the schema/types. When set, it
  // takes precedence over the asset override and base rule value.
  let exceptionEscalateTo: EscalateTarget | null = null;
  if (triggered) {
    const ex = checkExceptions(rule.exceptions, ctx);
    if (ex) {
      exceptionApplied = true;
      exceptionNote = ex.note;
      exceptionAddRequired = ex.add_required_evidence ?? [];
      exceptionEscalateTo = ex.escalate_to ?? null;
    }
  }

  // 6. Missing evidence — base required + any exception-added evidence.
  const missingEvidence = computeMissingEvidence(rule, ctx.evidence, exceptionAddRequired);

  // 7. Compute status — exceptions never relax a gate.
  const status = computeStatus(triggered, effectiveClass, effectiveForbidden, missingEvidence);

  // Effective escalate_to: exception > asset override > base.
  const effectiveEscalateTo =
    exceptionEscalateTo ?? resolveEscalateTo(rule, ctx.asset.type);

  return {
    ruleId: rule.id,
    ruleTitle: rule.title,
    triggered,
    triggerReason,
    allConditions: allResult.traces,
    anyConditions: anyResult.traces,
    missingEvidence,
    exceptionApplied,
    exceptionNote,
    status,
    actionClass: effectiveClass,
    escalateTo: effectiveEscalateTo,
  };
}

// ---------------------------------------------------------------------------
// Missing evidence
// ---------------------------------------------------------------------------

/**
 * A required evidence key is "missing" if:
 *  - it is absent from the evidence record, OR
 *  - its confirmed flag is false.
 *
 * Includes exception-added evidence keys (exceptions may add requirements,
 * never relax them).
 */
function computeMissingEvidence(
  rule: Rule,
  evidence: Evidence,
  extraRequired: string[] = [],
): string[] {
  const missing: string[] = [];
  const allRequired = [...rule.required_evidence, ...extraRequired];
  for (const key of allRequired) {
    const item = evidence[key];
    if (item === undefined || !item.confirmed) {
      missing.push(key);
    }
  }
  return missing;
}

// ---------------------------------------------------------------------------
// Exception checking
// ---------------------------------------------------------------------------

function checkExceptions(
  exceptions: RuleException[],
  ctx: ConditionContext,
): RuleException | null {
  for (const ex of exceptions) {
    const allMatch = ex.when.every((cond) => {
      const trace = evaluateCondition(cond, ctx);
      return trace.matched;
    });
    if (allMatch) {
      return ex;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Status computation
// ---------------------------------------------------------------------------

/**
 * Status logic with strict precedence (exceptions NEVER relax a gate):
 *
 *   1. Not triggered                 → 'not_applicable'
 *   2. forbidden_if_missing_evidence
 *      && missing evidence           → 'blocked'  (always wins, even for
 *                                                  must_escalate; escalateTo
 *                                                  is still populated)
 *   3. action_class == must_escalate → 'escalate'
 *   4. action_class == requires_approval → 'needs_approval'
 *   5. else                          → 'allowed'
 *
 * The actionClass and forbidden parameters are the *effective* values after
 * asset overrides have been applied.
 */
function computeStatus(
  triggered: boolean,
  actionClass: ActionClass,
  forbiddenIfMissing: boolean,
  missingEvidence: string[],
): ActionStatus {
  if (!triggered) {
    return "not_applicable";
  }

  // forbidden_if_missing_evidence + missing → blocked (always wins).
  if (forbiddenIfMissing && missingEvidence.length > 0) {
    return "blocked";
  }

  if (actionClass === "must_escalate") {
    return "escalate";
  }

  if (actionClass === "requires_approval") {
    return "needs_approval";
  }

  return "allowed";
}

// ---------------------------------------------------------------------------
// Asset overrides
// ---------------------------------------------------------------------------

/**
 * Resolve the effective action class for a rule given asset type overrides.
 */
function resolveActionClass(rule: Rule, assetType: string): ActionClass {
  const override = rule.asset_overrides[assetType];
  if (override?.action_class) {
    return override.action_class;
  }
  return rule.action_class;
}

/**
 * Resolve the effective forbidden_if_missing_evidence for a rule given asset
 * type overrides.
 */
function resolveForbiddenIfMissing(rule: Rule, assetType: string): boolean {
  const override = rule.asset_overrides[assetType];
  if (override?.forbidden_if_missing_evidence !== undefined) {
    return override.forbidden_if_missing_evidence;
  }
  return rule.forbidden_if_missing_evidence;
}

/**
 * Resolve the effective escalate_to for a rule given asset type overrides.
 */
function resolveEscalateTo(rule: Rule, assetType: string): EscalateTarget {
  const override = rule.asset_overrides[assetType];
  if (override?.escalate_to) {
    return override.escalate_to;
  }
  return rule.escalate_to;
}

/**
 * Resolve effective deadline_minutes for a rule given asset type overrides.
 */
function resolveDeadline(rule: Rule, assetType: string): number | null {
  const override = rule.asset_overrides[assetType];
  if (override?.deadline_minutes !== undefined) {
    return override.deadline_minutes ?? null;
  }
  return rule.deadline_minutes;
}

/**
 * Resolve effective allowed/forbidden actions, merging overrides.
 */
function resolveActions(
  rule: Rule,
  assetType: string,
): { allowed: string[]; forbidden: string[] } {
  const override = rule.asset_overrides[assetType];
  return {
    allowed: override?.allowed_actions ?? rule.allowed_actions,
    forbidden: override?.forbidden_actions ?? rule.forbidden_actions,
  };
}

// ---------------------------------------------------------------------------
// Build action decision
// ---------------------------------------------------------------------------

function buildAction(
  rule: Rule,
  step: TraceStep,
  asset: Asset,
  pill: Pill,
): ActionDecision {
  const deadline = resolveDeadline(rule, asset.type);
  const { allowed, forbidden } = resolveActions(rule, asset.type);

  return {
    ruleId: rule.id,
    decision: rule.decision,
    actionClass: step.actionClass,
    status: step.status,
    missingEvidence: step.missingEvidence,
    owner: rule.owner,
    escalateTo: step.status === "escalate" || step.status === "blocked" ? step.escalateTo : null,
    deadline,
    provenance: rule.provenance,
    pillId: pill.manifest.name,
    pillVersion: pill.manifest.version,
    allowedActions: allowed,
    forbiddenActions: forbidden,
  };
}
