// Keystone cross-pill coordination — public entry point.
//
// Pure and deterministic, like the engine it reads: no I/O, no clock, no model
// input. Coordination output is a statement about two pills' rules and the
// human who must settle them; it is never a pill, never a gate decision, and
// never something an LLM can change.

export {
  ADJUDICATION_BASES,
  coordinationFileSchema,
  coordinationPolicySchema,
  projectPolicy,
  type AdjudicationBasis,
  type ConflictClass,
  type ConflictLink,
  type CoordinationFile,
  type CoordinationPolicy,
  type RuleRef,
} from "./contract";

export { COORDINATION_POLICY } from "./policy";

export {
  resolveAdjudicator,
  sharedAccountability,
  type Adjudication,
  type AdjudicationCandidate,
  type AdjudicationOutcome,
  type SkippedAdjudicator,
} from "./adjudicate";

export {
  CLASS_PREDICATES,
  coordinate,
  type ConflictFace,
  type CoordinationCheck,
  type CoordinationInput,
  type CoordinationPill,
} from "./detect";
