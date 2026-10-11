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

  // 4. Missing evidence.
  const missingEvidence = computeMissingEvidence(rule, ctx.evidence);

  // 5. Exception check.
  let exceptionApplied = false;
  let exceptionNote: string | null = null;
  if (triggered) {
    const ex = checkExceptions(rule.exceptions, ctx);
    if (ex) {
      exceptionApplied = true;
      exceptionNote = ex.note;
    }
  }

  // 6. Compute status.
  const status = computeStatus(rule, triggered, missingEvidence, exceptionApplied);

  // 7. Effective action class (with asset overrides applied).
  const effectiveClass = resolveActionClass(rule, ctx.asset.type);

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
  };
}

// ---------------------------------------------------------------------------
// Missing evidence
// ---------------------------------------------------------------------------

/**
 * A required evidence key is "missing" if:
 *  - it is absent from the evidence record, OR
 *  - its confirmed flag is false.
 */
function computeMissingEvidence(rule: Rule, evidence: Evidence): string[] {
  const missing: string[] = [];
  for (const key of rule.required_evidence) {
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
 * Status logic per SPEC §5:
 *   must_escalate → 'escalate'
 *   forbidden_if_missing_evidence && missing → 'blocked'
 *   requires_approval → 'needs_approval'
 *   else → 'allowed'
 *
 * If the rule is not triggered, status is 'allowed' (no action fires).
 * If an exception applies, it can override the blocking: the status becomes
 * 'needs_approval' (the exception note describes the co-sign requirement).
 */
function computeStatus(
  rule: Rule,
  triggered: boolean,
  missingEvidence: string[],
  exceptionApplied: boolean,
): ActionStatus {
  if (!triggered) {
    return "allowed";
  }

  // must_escalate rules always escalate.
  if (rule.action_class === "must_escalate") {
    // But if evidence is missing AND forbidden_if_missing_evidence, block first.
    if (rule.forbidden_if_missing_evidence && missingEvidence.length > 0 && !exceptionApplied) {
      return "blocked";
    }
    return "escalate";
  }

  // Blocked if evidence missing and forbidden_if_missing_evidence.
  if (rule.forbidden_if_missing_evidence && missingEvidence.length > 0 && !exceptionApplied) {
    return "blocked";
  }

  // requires_approval → needs_approval.
  if (rule.action_class === "requires_approval") {
    return "needs_approval";
  }

  // recommend → allowed.
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
  const escalateTo = resolveEscalateTo(rule, asset.type);
  const deadline = resolveDeadline(rule, asset.type);
  const { allowed, forbidden } = resolveActions(rule, asset.type);

  return {
    ruleId: rule.id,
    decision: rule.decision,
    actionClass: step.actionClass,
    status: step.status,
    missingEvidence: step.missingEvidence,
    owner: rule.owner,
    escalateTo: step.status === "escalate" || step.status === "blocked" ? escalateTo : null,
    deadline,
    provenance: rule.provenance,
    pillId: pill.manifest.name,
    pillVersion: pill.manifest.version,
    allowedActions: allowed,
    forbiddenActions: forbidden,
  };
}
