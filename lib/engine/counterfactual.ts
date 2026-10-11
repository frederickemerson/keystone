// MOSAIC deterministic rule engine — counterfactual analysis.
// "What minimal evidence changes would flip the status of rule X?"

import type {
  ActionStatus,
  Asset,
  CounterfactualResult,
  Evidence,
  Incident,
  Pill,
  Rule,
} from "./types.js";
import { evaluate } from "./evaluate.js";

// Re-implement missing evidence inline to avoid exporting a private helper.
function computeMissing(rule: Rule, evidence: Evidence): string[] {
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
  const currentStatus: ActionStatus = currentTrace?.status ?? "allowed";

  // 2. Determine what would flip the status.
  //
  // Strategy: find the minimal set of evidence changes that alter the status.
  // The key insight: status is determined by (triggered, missingEvidence, exceptionApplied).
  // The most common flip is: missing evidence → confirmed evidence flips blocked → allowed/escalate.
  //
  // We test: "if all currently-missing required evidence were confirmed, what would the status be?"

  const missingNow = computeMissing(rule, evidence);

  // Build a hypothetical evidence where all missing required evidence is confirmed.
  const flippedEvidence: Evidence = { ...evidence };
  for (const key of missingNow) {
    const existing = evidence[key];
    if (existing) {
      // Unconfirmed → confirm it.
      flippedEvidence[key] = { ...existing, confirmed: true };
    } else {
      // Absent → add a confirmed true value.
      flippedEvidence[key] = {
        value: true,
        source: "counterfactual-hypothesis",
        at: new Date().toISOString(),
        confirmed: true,
      };
    }
  }

  const flippedResult = evaluate(pill, asset, incident, flippedEvidence);
  const flippedTrace = flippedResult.trace.find((t) => t.ruleId === ruleId);
  const flippedStatus: ActionStatus = flippedTrace?.status ?? "allowed";

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
      const existing = evidence[key];
      if (existing) {
        singleFlip[key] = { ...existing, confirmed: true };
      } else {
        singleFlip[key] = {
          value: true,
          source: "counterfactual-hypothesis",
          at: new Date().toISOString(),
          confirmed: true,
        };
      }
      const singleResult = evaluate(pill, asset, incident, singleFlip);
      const singleTrace = singleResult.trace.find((t) => t.ruleId === ruleId);
      const singleStatus = singleTrace?.status ?? "allowed";
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
      const missingTriggerEv = evKeys.filter((k) => {
        const item = evidence[k];
        return !item || !item.confirmed || item.value !== true;
      });

      if (missingTriggerEv.length > 0) {
        // Hypothesize: provide all missing trigger evidence + all missing required evidence.
        const hypoEvidence: Evidence = { ...evidence };
        for (const key of missingTriggerEv) {
          const existing = evidence[key];
          if (existing) {
            hypoEvidence[key] = { ...existing, value: true, confirmed: true };
          } else {
            hypoEvidence[key] = {
              value: true,
              source: "counterfactual-hypothesis",
              at: new Date().toISOString(),
              confirmed: true,
            };
          }
        }
        // Also confirm all required evidence.
        for (const key of missingNow) {
          if (!hypoEvidence[key] || !hypoEvidence[key].confirmed) {
            const existing = hypoEvidence[key];
            if (existing) {
              hypoEvidence[key] = { ...existing, confirmed: true };
            } else {
              hypoEvidence[key] = {
                value: true,
                source: "counterfactual-hypothesis",
                at: new Date().toISOString(),
                confirmed: true,
              };
            }
          }
        }

        const hypoResult = evaluate(pill, asset, incident, hypoEvidence);
        const hypoTrace = hypoResult.trace.find((t) => t.ruleId === ruleId);
        const hypoStatus = hypoTrace?.status ?? "allowed";
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
