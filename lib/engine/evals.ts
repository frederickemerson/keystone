// MOSAIC deterministic rule engine — eval replay + regression detection.

import type {
  ActionDecision,
  EvalCase,
  EvalCaseResult,
  EvalField,
  EvalSummary,
  EvalValue,
  ExpectedDecision,
  Pill,
  Regression,
} from "./types";
import { evaluate } from "./evaluate";

// ---------------------------------------------------------------------------
// runEvals — replay past incidents through the pill and compare expected vs actual
// ---------------------------------------------------------------------------

/** The actual value of one asserted field. A rule that didn't fire has status
 *  'not_applicable' (never 'allowed') and no deadline. */
function actualField(action: ActionDecision | undefined, field: EvalField): EvalValue {
  switch (field) {
    case "status":
      return action?.status ?? "not_applicable";
    case "deadline_minutes":
      return action?.deadline ?? null;
  }
}

/** Every field the eval author specified for a rule, in a stable order. */
function assertedFields(expected: ExpectedDecision): [EvalField, EvalValue][] {
  const fields: [EvalField, EvalValue][] = [["status", expected.status]];
  if (expected.deadline_minutes !== undefined) {
    fields.push(["deadline_minutes", expected.deadline_minutes]);
  }
  return fields;
}

export function runEvals(pill: Pill, cases: EvalCase[]): EvalSummary {
  const results: EvalCaseResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const evalCase of cases) {
    const result = evaluate(pill, evalCase.asset, evalCase.incident, evalCase.evidence);
    // Index once per case: a linear find per expectation made a full replay
    // O(cases × rules²) — 13.7 s for 1,000 cases × 2,000 rules.
    const byRule = new Map(result.actions.map((a) => [a.ruleId, a]));

    for (const [ruleId, expectedDecision] of Object.entries(evalCase.expected)) {
      const action = byRule.get(ruleId);

      for (const [field, expected] of assertedFields(expectedDecision)) {
        const actual = actualField(action, field);
        const isPass = actual === expected;
        if (isPass) {
          passed++;
        } else {
          failed++;
        }
        results.push({ caseId: evalCase.id, ruleId, field, expected, actual, pass: isPass });
      }
    }
  }

  return { passed, failed, results };
}

// ---------------------------------------------------------------------------
// compareVersions — detect regressions between old and new pill versions
// ---------------------------------------------------------------------------

export interface ComparisonResult {
  oldSummary: EvalSummary;
  newSummary: EvalSummary;
  regressions: Regression[];
  improvements: Regression[];
}

export function compareVersions(
  oldPill: Pill,
  newPill: Pill,
  cases: EvalCase[],
): ComparisonResult {
  const oldSummary = runEvals(oldPill, cases);
  const newSummary = runEvals(newPill, cases);

  const regressions: Regression[] = [];
  const improvements: Regression[] = [];

  // Build a lookup of old results by caseId + ruleId.
  const oldLookup = new Map<string, EvalCaseResult>();
  for (const r of oldSummary.results) {
    oldLookup.set(`${r.caseId}:${r.ruleId}:${r.field}`, r);
  }

  for (const newResult of newSummary.results) {
    const key = `${newResult.caseId}:${newResult.ruleId}:${newResult.field}`;
    const oldResult = oldLookup.get(key);
    if (!oldResult) continue;

    // Regression: passed in old, failed in new.
    if (oldResult.pass && !newResult.pass) {
      regressions.push({
        caseId: newResult.caseId,
        ruleId: newResult.ruleId,
        field: newResult.field,
        expected: newResult.expected,
        oldActual: oldResult.actual,
        newActual: newResult.actual,
      });
    }

    // Improvement: failed in old, passed in new.
    if (!oldResult.pass && newResult.pass) {
      improvements.push({
        caseId: newResult.caseId,
        ruleId: newResult.ruleId,
        field: newResult.field,
        expected: newResult.expected,
        oldActual: oldResult.actual,
        newActual: newResult.actual,
      });
    }
  }

  return { oldSummary, newSummary, regressions, improvements };
}
