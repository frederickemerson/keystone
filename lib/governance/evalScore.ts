// Keystone governance — the one pass/fail count every screen shows.
//
// A pill's eval cases are past incidents. A past incident passes when every
// check the eval author wrote for it (a rule's status, and its deadline when
// given) matches what the engine decides. Pulse, Learning, the registry and
// approvals all count with this helper and word it with its labels, so the
// same pill never shows two different scores.

import { runEvals, type EvalCase, type EvalSummary, type Pill } from "@/lib/engine";

export interface PastIncidentScore {
  /** Past incidents (eval cases) replayed. */
  incidents: number;
  /** Past incidents where every check passed. */
  incidentsPassed: number;
  /** Individual checks (asserted fields) replayed. */
  checks: number;
  checksPassed: number;
}

export const EMPTY_SCORE: PastIncidentScore = { incidents: 0, incidentsPassed: 0, checks: 0, checksPassed: 0 };

/** Score an eval summary over the cases it ran. */
export function scoreSummary(cases: readonly EvalCase[], summary: EvalSummary): PastIncidentScore {
  const failedCases = new Set(summary.results.filter((r) => !r.pass).map((r) => r.caseId));
  return {
    incidents: cases.length,
    incidentsPassed: cases.filter((c) => !failedCases.has(c.id)).length,
    checks: summary.passed + summary.failed,
    checksPassed: summary.passed,
  };
}

/** Replay a pill's past incidents through it (pass a version's pill from pillAtVersion). */
export function pastIncidentScore(pill: Pill): PastIncidentScore {
  const cases = Object.values(pill.evals);
  return scoreSummary(cases, runEvals(pill, cases));
}

export function addScores(a: PastIncidentScore, b: PastIncidentScore): PastIncidentScore {
  return {
    incidents: a.incidents + b.incidents,
    incidentsPassed: a.incidentsPassed + b.incidentsPassed,
    checks: a.checks + b.checks,
    checksPassed: a.checksPassed + b.checksPassed,
  };
}

/** The label every screen uses for the score. */
export const PAST_INCIDENTS_LABEL = "Past incidents passed";

/** "5 of 6" — the headline value under PAST_INCIDENTS_LABEL. */
export function formatIncidents(s: PastIncidentScore): string {
  return `${s.incidentsPassed} of ${s.incidents}`;
}

/** "78 of 79 checks" — the detail line. */
export function formatChecks(s: PastIncidentScore): string {
  return `${s.checksPassed} of ${s.checks} checks`;
}

/** "5 of 6 past incidents pass (78 of 79 checks)" — the sentence form. */
export function describeScore(s: PastIncidentScore): string {
  return `${formatIncidents(s)} past incidents pass (${formatChecks(s)})`;
}
