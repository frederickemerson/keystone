// MOSAIC deterministic rule engine — counterfactual analysis.
// "What minimal evidence changes would flip the status of rule X?"

import type {
  ActionStatus,
  Asset,
  CounterfactualResult,
  Evidence,
  EvidenceItem,
  Incident,
  Pill,
  Rule,
} from "./types";
import { evaluate, isEvidenceSatisfied } from "./evaluate";

/**
 * Build the hypothetical item that would satisfy a required evidence key.
 * Satisfaction requires value === true AND confirmed === true, so the
 * counterfactual change is "key confirmed true" (with value true).
 */
function satisfy(key: string, evidence: Evidence): EvidenceItem {
  const existing = evidence[key];
  return {
    value: true,
    source: existing?.source ?? "counterfactual-hypothesis",
    at: existing?.at ?? new Date().toISOString(),
    confirmed: true,
  };
}

/** Required evidence keys that are not satisfied (see isEvidenceSatisfied). */
function computeMissing(rule: Rule, evidence: Evidence): string[] {
  return rule.required_evidence.filter((key) => !isEvidenceSatisfied(evidence[key]));
}

// ---------------------------------------------------------------------------
// Public API: counterfactual(pill, asset, incident, evidence, ruleId)
// ---------------------------------------------------------------------------

export function counterfactual(
  pill: Pill,
  asset: Asset,
  incident: Incident,
  evidence: Evidence,
  ruleId: string,
): CounterfactualResult {
  const rule = pill.rules.find((r) => r.id === ruleId);
  if (!rule) {
    throw new Error(`counterfactual: rule "${ruleId}" not found in pill`);
  }

  // 1. Current status.
  const currentResult = evaluate(pill, asset, incident, evidence);
  const currentTrace = currentResult.trace.find((t) => t.ruleId === ruleId);
  const currentStatus: ActionStatus = currentTrace?.status ?? "not_applicable";

  // 2. Determine what would flip the status.
  //
  // Strategy: find the minimal set of evidence changes that alter the status.
  // The key insight: status is determined by (triggered, missingEvidence, exceptionApplied).
  // The most common flip is: missing evidence → confirmed evidence flips blocked → allowed/escalate.
  //
  // We test: "if all currently-missing required evidence were confirmed, what would the status be?"

  const missingNow = computeMissing(rule, evidence);

  // Build a hypothetical evidence where all missing required evidence is satisfied.
  const flippedEvidence: Evidence = { ...evidence };
  for (const key of missingNow) {
    flippedEvidence[key] = satisfy(key, evidence);
  }

  const flippedResult = evaluate(pill, asset, incident, flippedEvidence);
  const flippedTrace = flippedResult.trace.find((t) => t.ruleId === ruleId);
  const flippedStatus: ActionStatus = flippedTrace?.status ?? "not_applicable";

  // 3. Build the ifEvidence list.
  //
  // If confirming all missing evidence flips the status, we report all of them.
  // But we also want the *minimal* set — so we try each individually.
  const ifEvidence: string[] = [];
  let flipsTo: ActionStatus = flippedStatus;

  if (flippedStatus !== currentStatus) {
    // Try to find a minimal single-key flip.
    let minimalFound = false;
    for (const key of missingNow) {
      const singleFlip: Evidence = { ...evidence };
      singleFlip[key] = satisfy(key, evidence);
      const singleResult = evaluate(pill, asset, incident, singleFlip);
      const singleTrace = singleResult.trace.find((t) => t.ruleId === ruleId);
      const singleStatus = singleTrace?.status ?? "not_applicable";
      if (singleStatus !== currentStatus) {
        ifEvidence.push(key);
        flipsTo = singleStatus;
        minimalFound = true;
        break; // Found a single-key flip — that's minimal.
      }
    }

    // No single key flips it alone — need all missing evidence.
    if (!minimalFound) {
      ifEvidence.push(...missingNow);
      flipsTo = flippedStatus;
    }
  } else {
    // Confirming all missing evidence doesn't flip it.
    // Maybe the rule isn't triggered at all — check if trigger conditions need evidence.
    if (!currentTrace?.triggered) {
      // Find evidence-backed trigger conditions that could be satisfied.
      const evidenceConds = [
        ...rule.trigger.all.filter((c) => c.path.startsWith("evidence.")),
        ...rule.trigger.any.filter((c) => c.path.startsWith("evidence.")),
      ];
      const evKeys = evidenceConds.map((c) => c.path.split(".")[1]);
      const missingTriggerEv = evKeys.filter((k) => !isEvidenceSatisfied(evidence[k]));

      if (missingTriggerEv.length > 0) {
        // Hypothesize: provide all missing trigger evidence + all missing required evidence.
        const hypoEvidence: Evidence = { ...evidence };
        for (const key of missingTriggerEv) {
          hypoEvidence[key] = satisfy(key, evidence);
        }
        // Also satisfy all required evidence.
        for (const key of missingNow) {
          hypoEvidence[key] = satisfy(key, evidence);
        }

        const hypoResult = evaluate(pill, asset, incident, hypoEvidence);
        const hypoTrace = hypoResult.trace.find((t) => t.ruleId === ruleId);
        const hypoStatus = hypoTrace?.status ?? "not_applicable";
        if (hypoStatus !== currentStatus) {
          flipsTo = hypoStatus;
          ifEvidence.push(...new Set([...missingTriggerEv, ...missingNow]));
        }
      }
    }
  }

  // 4. Build the plain-English summary.
  const summary = buildSummary(ruleId, currentStatus, flipsTo, ifEvidence);

  return {
    ruleId,
    currentStatus,
    flipsTo,
    ifEvidence,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Summary sentence builder
// ---------------------------------------------------------------------------

function buildSummary(
  ruleId: string,
  from: ActionStatus,
  to: ActionStatus,
  ifEvidence: string[],
): string {
  if (ifEvidence.length === 0) {
    return `${ruleId} is currently ${from} and no single evidence change flips the status.`;
  }

  const evidenceClause =
    ifEvidence.length === 1
      ? `${ifEvidence[0]} is confirmed`
      : `${ifEvidence.slice(0, -1).join(", ")} and ${ifEvidence[ifEvidence.length - 1]} are all confirmed`;

  return `If ${evidenceClause}, ${ruleId} changes from ${from} to ${to}.`;
}
