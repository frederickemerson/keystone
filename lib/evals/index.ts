// Keystone eval corpus — public entry point.
//
// Pure only. The filesystem-backed history lives behind its own import
// (`@/lib/evals/history`) so a client component can hold a corpus or a drift
// report without pulling node:fs into the bundle.

export type {
  AuthoredEvalCase,
  CorpusCase,
  CorpusCoverage,
  DerivationResult,
  DerivedCaseOrigin,
  DerivedEvalCase,
  DriftCaseReport,
  DriftReport,
  DropReason,
  DroppedRule,
  EvalCorpus,
  ExcludedIncident,
  ExclusionReason,
} from "./types";

export { isDecisionStatus } from "./types";

export {
  DERIVED_CASE_ID_PREFIX,
  deriveEvalCase,
  deriveEvalCases,
  derivedCaseId,
  evidenceAfter,
  expectationsFrom,
  type IncidentHistory,
} from "./derive";

export { authoredCase, buildCorpus, corpusCases } from "./corpus";

export { describeCorpus, driftReport } from "./drift";
