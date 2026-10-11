// MOSAIC deterministic rule engine — public entry point.

export type {
  ActionClass,
  ActionDecision,
  ActionStatus,
  Asset,
  AssetOverrides,
  Condition,
  Confidence,
  CounterfactualResult,
  EscalateTarget,
  EvalCase,
  EvalCaseResult,
  EvalSummary,
  EvaluationResult,
  Evidence,
  EvidenceItem,
  Incident,
  Operator,
  Pill,
  PillManifest,
  ProvenanceMap,
  Regression,
  Rule,
  RuleException,
  Sensitivity,
  TraceStep,
  ConditionTrace,
} from "./types.js";

export {
  type ConditionContext,
  resolvePath,
  evaluateOp,
  evaluateCondition,
  evaluateAll,
  evaluateAny,
} from "./conditions.js";

export {
  conditionSchema,
  ruleSchema,
  manifestSchema,
  provenanceSchema,
  evalCaseSchema,
  escalateTargetSchema,
  actionClassSchema,
  sensitivitySchema,
  extractFrontmatter,
  parsePill,
  type PillFiles,
} from "./schema.js";

export { evaluate } from "./evaluate.js";
export { counterfactual } from "./counterfactual.js";
export { runEvals, compareVersions, type ComparisonResult } from "./evals.js";
