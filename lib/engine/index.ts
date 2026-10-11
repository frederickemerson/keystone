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
  EvalField,
  EvalValue,
  ExpectedDecision,
  ScopeObject,
  AccessObject,
  PillStatus,
  EvalSummary,
  EvaluationResult,
  Evidence,
  EvidenceCatalog,
  EvidenceCatalogEntry,
  EvidenceItem,
  Incident,
  Operator,
  Pill,
  PillManifest,
  Provenance,
  ProvenanceMap,
  ProvenanceRuleEntry,
  Regression,
  Rule,
  RuleException,
  Sensitivity,
  TraceStep,
  ConditionTrace,
} from "./types";

export {
  type ConditionContext,
  resolvePath,
  evaluateOp,
  evaluateCondition,
  evaluateAll,
  evaluateAny,
} from "./conditions";

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
  parseEvalFile,
  type PillFiles,
} from "./schema";

export { evaluate } from "./evaluate";
export { counterfactual } from "./counterfactual";
export { runEvals, compareVersions, type ComparisonResult } from "./evals";
