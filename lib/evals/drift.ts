// Keystone eval corpus — replay one pill version against the whole corpus.
//
// Pure. Evaluation itself is the engine's `runEvals`; this module only decides
// WHAT is replayed and reports the result per case, so there is exactly one
// implementation of "replay a pill against its cases" in the codebase.
//
// The vocabulary is deliberate. An authored case's expectation is an expert's
// ground truth, so a mismatch is a failure. A derived case's expectation is
// what the organisation recorded at the time, so a mismatch against a LATER
// version may be a deliberate rule change — intended drift — and the report
// marks it (`versionDrift`) instead of calling it a regression. Hence
// "agreements" and "disagreements", never "passed" and "failed".

import { runEvals, type EvalCaseResult, type Pill } from "@/lib/engine";
import { corpusCases } from "./corpus";
import type {
  CorpusCase,
  CorpusCoverage,
  DriftCaseReport,
  DriftReport,
  EvalCorpus,
} from "./types";

function byCase(results: readonly EvalCaseResult[]): Map<string, EvalCaseResult[]> {
  const grouped = new Map<string, EvalCaseResult[]>();
  for (const result of results) {
    const forCase = grouped.get(result.caseId);
    if (forCase === undefined) {
      grouped.set(result.caseId, [result]);
    } else {
      forCase.push(result);
    }
  }
  return grouped;
}

function caseReport(entry: CorpusCase, results: readonly EvalCaseResult[], pill: Pill): DriftCaseReport {
  const base = {
    caseId: entry.id,
    agreements: results.filter((result) => result.pass).length,
    disagreements: results.filter((result) => !result.pass),
  };

  if (entry.authorship === "authored") {
    return { ...base, authorship: "authored" };
  }

  return {
    ...base,
    authorship: "derived",
    origin: entry.origin,
    versionDrift: entry.origin.recordedPillVersion !== pill.manifest.version,
  };
}

function coverage(pill: Pill, corpus: EvalCorpus, cases: readonly CorpusCase[]): CorpusCoverage {
  const asserted = new Set(cases.flatMap((entry) => Object.keys(entry.expected)));
  const ruleIds = pill.rules.map((rule) => rule.id);

  return {
    authoredCases: corpus.authored.length,
    derivedCases: corpus.derived.length,
    incidentsConsidered: corpus.incidentsConsidered,
    incidentsExcluded: corpus.excluded.length,
    totalRules: ruleIds.length,
    rulesAsserted: ruleIds.filter((ruleId) => asserted.has(ruleId)).length,
    rulesNotAsserted: ruleIds.filter((ruleId) => !asserted.has(ruleId)),
  };
}

/**
 * Replay `pill` against the whole corpus — the cases its experts wrote and the
 * cases its operational history produced — and report where the two agree.
 */
export function driftReport(pill: Pill, corpus: EvalCorpus): DriftReport {
  const cases = corpusCases(corpus);
  const summary = runEvals(pill, cases);
  const grouped = byCase(summary.results);

  const reports = cases.map((entry) => caseReport(entry, grouped.get(entry.id) ?? [], pill));

  return {
    pillId: pill.manifest.name,
    pillVersion: pill.manifest.version,
    pillStatus: pill.manifest.status,
    cases: reports,
    agreements: summary.passed,
    disagreements: summary.failed,
    coverage: coverage(pill, corpus, cases),
    excluded: corpus.excluded,
  };
}

/**
 * The report in one sentence, computed from its own counts so no screen can
 * word it as more than it is — a corpus with no derived cases says so.
 */
export function describeCorpus(report: DriftReport): string {
  const { authoredCases, derivedCases, incidentsConsidered, incidentsExcluded } = report.coverage;
  const authoredPart = `${authoredCases} authored ${authoredCases === 1 ? "case" : "cases"}`;
  const derivedPart = `${derivedCases} derived from closed incidents`;
  const historyPart = `${incidentsConsidered} ${incidentsConsidered === 1 ? "incident" : "incidents"} considered, ${incidentsExcluded} excluded`;
  return `${authoredPart}, ${derivedPart} (${historyPart}).`;
}
