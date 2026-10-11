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
  TraceStep,
} from "./types";
import { evaluateRule, isEvidenceSatisfied } from "./evaluate";

/** The item recorded under `key` — own keys only. */
function ownItem(evidence: Evidence, key: string): EvidenceItem | undefined {
  return Object.hasOwn(evidence, key) ? evidence[key] : undefined;
}

/**
 * The hypothetical item that satisfies a key (value true AND confirmed true).
 * Pure: provenance fields are carried over from the existing item, never
 * stamped with the wall clock, so the same inputs always give the same answer.
 */
function satisfy(key: string, evidence: Evidence): EvidenceItem {
  const existing = ownItem(evidence, key);
  return {
    value: true,
    source: existing?.source ?? "counterfactual-hypothesis",
    at: existing?.at ?? "",
    confirmed: true,
  };
}

/** `evidence` with every key in `keys` satisfied (a copy; the input is untouched). */
function withSatisfied(evidence: Evidence, keys: Iterable<string>): Evidence {
  const next: Evidence = { ...evidence };
  for (const key of keys) next[key] = satisfy(key, evidence);
  return next;
}

/**
 * Rules are evaluated independently, so the counterfactual only ever
 * re-evaluates the ONE rule asked about (not the whole pill per hypothesis).
 */
function traceOf(rule: Rule, asset: Asset, incident: Incident, evidence: Evidence): TraceStep {
  return evaluateRule(rule, { asset, incident, evidence }).trace;
}

/**
 * Satisfy every missing gating key until none is missing. Confirming evidence
 * can make an exception match, and an exception can ADD required evidence, so
 * one pass over the currently-missing keys is not enough: iterate to the
 * fixpoint (bounded — each round adds at least one new key).
 */
function satisfyAllMissing(
  rule: Rule,
  asset: Asset,
  incident: Incident,
  evidence: Evidence,
  start: string[],
): { keys: string[]; trace: TraceStep } {
  const keys = new Set<string>();
  let missing = start;
  let trace = traceOf(rule, asset, incident, evidence);
  while (missing.some((k) => !keys.has(k))) {
    for (const k of missing) keys.add(k);
    trace = traceOf(rule, asset, incident, withSatisfied(evidence, keys));
    missing = trace.missingEvidence;
  }
  return { keys: [...keys], trace };
}

// ---------------------------------------------------------------------------
// Public API: counterfactual(pill, asset, incident, evidence, ruleId)
// ---------------------------------------------------------------------------

/**
 * "Which evidence, if confirmed, would change rule X's status — and to what?"
 *
 * Soundness (property-tested): satisfying exactly the keys in `ifEvidence`
 * makes the rule evaluate to `flipsTo`. When nothing flips the status,
 * `ifEvidence` is empty and `flipsTo === currentStatus`.
 */
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

  // 1. Current status. missingEvidence is the EFFECTIVE gate: base required
  //    evidence plus whatever every matching exception added.
  const current = traceOf(rule, asset, incident, evidence);
  const currentStatus = current.status;

  let flipsTo: ActionStatus = currentStatus;
  let ifEvidence: string[] = [];

  // 2. A single missing key that flips the status on its own is minimal.
  const single = current.missingEvidence.find(
    (key) => traceOf(rule, asset, incident, withSatisfied(evidence, [key])).status !== currentStatus,
  );
  if (single !== undefined) {
    ifEvidence = [single];
    flipsTo = traceOf(rule, asset, incident, withSatisfied(evidence, [single])).status;
  } else {
    // 3. Otherwise: all missing gating evidence (to the fixpoint).
    const all = satisfyAllMissing(rule, asset, incident, evidence, current.missingEvidence);
    if (all.trace.status !== currentStatus) {
      ifEvidence = all.keys;
      flipsTo = all.trace.status;
    } else if (!current.triggered) {
      // 4. Not triggered: try confirming the evidence its trigger reads, plus
      //    every gating key that then goes missing.
      const triggerKeys = [...rule.trigger.all, ...rule.trigger.any]
        .filter((c) => c.path.startsWith("evidence."))
        .map((c) => c.path.split(".")[1])
        .filter((k) => !isEvidenceSatisfied(ownItem(evidence, k)));
      if (triggerKeys.length > 0) {
        const base = withSatisfied(evidence, triggerKeys);
        const after = traceOf(rule, asset, incident, base);
        const gated = satisfyAllMissing(rule, asset, incident, base, after.missingEvidence);
        if (gated.trace.status !== currentStatus) {
          ifEvidence = [...new Set([...triggerKeys, ...gated.keys])];
          flipsTo = gated.trace.status;
        }
      }
    }
  }

  return {
    ruleId,
    currentStatus,
    flipsTo,
    ifEvidence,
    summary: buildSummary(ruleId, currentStatus, flipsTo, ifEvidence),
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
