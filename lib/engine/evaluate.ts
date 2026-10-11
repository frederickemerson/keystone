// MOSAIC deterministic rule engine — evaluate() per SPEC §5.

import type {
  ActionClass,
  ActionDecision,
  ActionStatus,
  Asset,
  AssetOverrides,
  Confidence,
  EvaluationResult,
  Evidence,
  EvidenceItem,
  Incident,
  Pill,
  Rule,
  RuleException,
  TraceStep,
} from "./types";
import {
  type ConditionContext,
  evaluateAll,
  evaluateAny,
  evaluateCondition,
} from "./conditions";

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
    const step = evaluateRule(rule, ctx);
    trace.push(step.trace);

    if (step.trace.triggered) {
      // Confidence contribution from this fired rule.
      totalRequired += step.requiredEvidence.length;
      totalConfirmed += step.requiredEvidence.length - step.trace.missingEvidence.length;

      // Build the action decision.
      actions.push(buildAction(rule, step.trace, asset, pill));
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

export interface RuleEvaluation {
  trace: TraceStep;
  /** Effective required evidence (base ∪ exception-added), de-duplicated. */
  requiredEvidence: string[];
}

/**
 * Evaluate ONE rule. evaluate() is a fold of this over pill.rules — rules are
 * independent — so callers that need a single rule's outcome (counterfactual)
 * use this directly instead of re-evaluating the whole pill.
 */
export function evaluateRule(rule: Rule, ctx: ConditionContext): RuleEvaluation {
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

  // 4. Effective action class and forbidden_if_missing_evidence (with asset
  //    overrides — which parse-time validation only lets TIGHTEN a gate).
  const override = overrideFor(rule, ctx.asset.type);
  const effectiveClass = override?.action_class ?? rule.action_class;
  const effectiveForbidden =
    override?.forbidden_if_missing_evidence ?? rule.forbidden_if_missing_evidence;

  // 5. Exceptions — EVERY matching exception applies. Exceptions annotate and
  //    may only ADD requirements, so applying all of them is the monotone
  //    (never-relaxing) choice; applying only the first would silently drop
  //    a later exception's added gate.
  const matched = triggered ? matchingExceptions(rule.exceptions, ctx) : [];
  const exceptionApplied = matched.length > 0;
  const exceptionNote = exceptionApplied ? matched.map((ex) => ex.note).join("; ") : null;
  // Exception escalate_to takes precedence over the asset override and base
  // rule value; the first matching exception (authored order) that sets one wins.
  const exceptionEscalateTo = matched.find((ex) => ex.escalate_to)?.escalate_to ?? null;

  // 6. Missing evidence — base required + every exception-added key.
  const requiredEvidence = unique([
    ...rule.required_evidence,
    ...matched.flatMap((ex) => ex.add_required_evidence ?? []),
  ]);
  const missingEvidence = requiredEvidence.filter((key) => !isEvidenceSatisfied(ownItem(ctx.evidence, key)));

  // 7. Compute status — exceptions never relax a gate.
  const status = computeStatus(triggered, effectiveClass, effectiveForbidden, missingEvidence);

  // Effective escalate_to: exception > asset override > base.
  const effectiveEscalateTo = exceptionEscalateTo ?? override?.escalate_to ?? rule.escalate_to;

  return {
    requiredEvidence,
    trace: {
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
    },
  };
}

function unique(keys: string[]): string[] {
  return [...new Set(keys)];
}

/** The evidence item recorded under `key` — own keys only (never `constructor`, `__proto__`, …). */
function ownItem(evidence: Evidence, key: string): EvidenceItem | undefined {
  return Object.hasOwn(evidence, key) ? evidence[key] : undefined;
}

/** The asset override for `assetType` — own keys only, so an asset type named
 *  "constructor" or "__proto__" never picks up an inherited member. */
function overrideFor(rule: Rule, assetType: string): AssetOverrides[string] | undefined {
  return Object.hasOwn(rule.asset_overrides, assetType) ? rule.asset_overrides[assetType] : undefined;
}

// ---------------------------------------------------------------------------
// Missing evidence
// ---------------------------------------------------------------------------

/**
 * A required evidence key is satisfied iff the item exists, is confirmed, and
 * its value is exactly `true`.
 *
 * A confirmed "LEW did NOT sign off" (value `false`, confirmed `true`) is NOT
 * satisfied — it must never unblock a gate. Missing, unconfirmed, and false all
 * count as missing.
 */
export function isEvidenceSatisfied(item: EvidenceItem | undefined): boolean {
  // Total over whatever a caller passes (evidence often comes from JSON): a
  // null or non-object item is simply not satisfied.
  return typeof item === "object" && item !== null && item.confirmed === true && item.value === true;
}

// ---------------------------------------------------------------------------
// Exception checking
// ---------------------------------------------------------------------------

/** Every exception whose `when` conditions all match, in authored order. */
function matchingExceptions(exceptions: RuleException[], ctx: ConditionContext): RuleException[] {
  return exceptions.filter((ex) => ex.when.every((cond) => evaluateCondition(cond, ctx).matched));
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
 * Resolve effective deadline_minutes for a rule given asset type overrides.
 */
function resolveDeadline(rule: Rule, assetType: string): number | null {
  const override = overrideFor(rule, assetType);
  if (override?.deadline_minutes !== undefined) {
    return override.deadline_minutes;
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
  const override = overrideFor(rule, assetType);
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
    missingEvidence: [...step.missingEvidence],
    owner: rule.owner,
    escalateTo: step.status === "escalate" || step.status === "blocked" ? { ...step.escalateTo } : null,
    deadline,
    // Copies: the decision must not alias the pill (a consumer sorting or
    // editing a decision's lists would otherwise rewrite the rule itself).
    provenance: [...rule.provenance],
    pillId: pill.manifest.name,
    pillVersion: pill.manifest.version,
    allowedActions: [...allowed],
    forbiddenActions: [...forbidden],
  };
}
