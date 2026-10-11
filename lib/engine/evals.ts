// MOSAIC deterministic rule engine — eval replay + regression detection.

import type {
  Asset,
  EvalCase,
  EvalCaseResult,
  EvalSummary,
  Evidence,
  Incident,
  Pill,
  Regression,
} from "./types.js";
import { evaluate } from "./evaluate.js";

// ---------------------------------------------------------------------------
// runEvals — replay past incidents through the pill and compare expected vs actual
// ---------------------------------------------------------------------------

export function runEvals(pill: Pill, cases: EvalCase[]): EvalSummary {
  const results: EvalCaseResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const evalCase of cases) {
    const result = evaluate(pill, evalCase.asset, evalCase.incident, evalCase.evidence);

    for (const [ruleId, expected] of Object.entries(evalCase.expected)) {
      const action = result.actions.find((a) => a.ruleId === ruleId);
      // If the rule didn't fire, its status is implicitly "allowed" (no action).
      const actual = action?.status ?? "allowed";

      const isPass = actual === expected;
      if (isPass) {
        passed++;
      } else {
        failed++;
      }

      results.push({
        caseId: evalCase.id,
        ruleId,
        expected,
        actual,
        pass: isPass,
      });
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
    oldLookup.set(`${r.caseId}:${r.ruleId}`, r);
  }

  for (const newResult of newSummary.results) {
    const key = `${newResult.caseId}:${newResult.ruleId}`;
    const oldResult = oldLookup.get(key);
    if (!oldResult) continue;

    // Regression: passed in old, failed in new.
    if (oldResult.pass && !newResult.pass) {
      regressions.push({
        caseId: newResult.caseId,
        ruleId: newResult.ruleId,
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
        expected: newResult.expected,
        oldActual: oldResult.actual,
        newActual: newResult.actual,
      });
    }
  }

  return { oldSummary, newSummary, regressions, improvements };
}
