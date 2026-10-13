// Cross-pill conflict detection — pure, deterministic, no model input.
//
// The Incident Room already runs two pills side by side. Side by side is
// co-location, not coordination: neither pill can see that its own rule and a
// rule in the other domain cannot both be honoured. This module is the part
// that can see it.
//
// Three inputs, three sources, all structured:
//   the authored LINK          data/coordination.yaml (via ./policy)
//   every fact about the rules the deterministic engine (lib/engine)
//   the human who adjudicates  data/roles.json (via ./adjudicate)
//
// The dependency arrow is one-way: lib/coordination imports lib/engine, and
// lib/engine never imports lib/coordination (lib/engine/__tests__/boundary.test.ts
// polices the engine's own imports; __tests__/boundary.test.ts here polices
// this direction). Calling the engine rather than re-deriving its logic is the
// point: a gate's effective gating set must be the ENGINE's set, not a second
// copy of the same rules that can drift from it.

import type { ConditionContext } from "@/lib/engine/conditions";
import { evaluate, evaluateRule } from "@/lib/engine/evaluate";
import type {
  ActionClass,
  ActionStatus,
  Asset,
  Evidence,
  EvaluationResult,
  Incident,
  Pill,
  Sensitivity,
} from "@/lib/engine/types";
import { resolveAdjudicator, type AdjudicationOutcome } from "./adjudicate";
import type { CoordinationPolicy, RuleRef } from "./contract";

/** A pill as the room holds it: the approved version it is evaluating. */
export interface CoordinationPill {
  pillId: string;
  pillVersion: string;
  pill: Pill;
}

export interface CoordinationInput {
  pills: readonly CoordinationPill[];
  asset: Asset;
  incident: Incident;
  evidence: Evidence;
}

/** One side of a conflict: a rule, as the engine decided it on this incident. */
export interface ConflictFace {
  pillId: string;
  pillVersion: string;
  /** Pill manifest name, e.g. "incident-comms". */
  pillName: string;
  ruleId: string;
  ruleTitle: string;
  /** The rule's authored sensitivity — what the panel must clear a viewer for. */
  sensitivity: Sensitivity;
  actionClass: ActionClass;
  status: ActionStatus;
  triggered: boolean;
  /** Effective deadline in minutes (after asset overrides); null when the rule carries none. */
  deadlineMinutes: number | null;
  ownerRole: string;
  /** Effective escalation target (exception > asset override > base). */
  escalateToRole: string;
  /**
   * The rule's FULL effective gating set: base required_evidence union the
   * add_required_evidence of every matching exception, straight from the
   * engine. Sorted, so the panel and the tests read the same order.
   */
  gatingSet: string[];
  /** The subset of gatingSet the engine counts as missing (absent, unconfirmed or false). */
  outstanding: string[];
  /**
   * Each gating key's label from its pill's own evidence.yaml, so the sentence
   * below and the chips in the room say the same words the pill does.
   */
  gatingLabels: Readonly<Record<string, string>>;
}

/** One authored link, evaluated against this incident at this point in the evidence. */
export interface CoordinationCheck {
  conflictId: string;
  classId: string;
  classLabel: string;
  /** The authored reason the obligation depends on the gate. */
  dependency: string;
  /** null when the pill is not in this room at an approved version, or the rule is not in it. */
  obligation: ConflictFace | null;
  gate: ConflictFace | null;
  /** True when the class predicate holds on these two faces. */
  inConflict: boolean;
  /** One computed sentence: the collision, or exactly why there is none. */
  reason: string;
  /** Who must settle it. Null unless `inConflict` — nobody is named for a conflict that is not live. */
  adjudication: AdjudicationOutcome | null;
}

// ---------------------------------------------------------------------------
// Conflict classes
// ---------------------------------------------------------------------------

/**
 * A class predicate, applied only once both faces exist. A class belongs here
 * only if it can be FALSE on input that really occurs — see each entry's
 * `falsified_when` in data/coordination.yaml, and the counterexample test in
 * __tests__/detect.test.ts. contract.test.ts asserts every class the policy
 * declares has an entry here.
 */
export const CLASS_PREDICATES: Readonly<Record<string, (obligation: ConflictFace, gate: ConflictFace) => boolean>> =
  Object.freeze({
    /**
     * A human is on a clock for something the other domain's gate has not
     * cleared. False the moment the gate's whole effective gating set is
     * satisfied — which is what happens at the end of INC-2026-1011, once the
     * LEW signs off.
     */
    deadline_before_gate_clears: (obligation, gate) =>
      obligation.triggered &&
      gate.triggered &&
      obligation.deadlineMinutes !== null &&
      gate.outstanding.length > 0,
  });

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Evaluate every authored link in `policy` against this incident. Returns one
 * check per link, in authored order — including the links that are NOT in
 * conflict, each carrying the computed reason, so the panel can say that the
 * cross-pill check ran and found nothing rather than going quiet.
 *
 * Both arguments are required: a default policy would let a caller silently
 * coordinate nothing, and a default evidence set would let a caller silently
 * coordinate on an empty incident.
 */
export function coordinate(policy: CoordinationPolicy, input: CoordinationInput): CoordinationCheck[] {
  const ctx: ConditionContext = { evidence: input.evidence, asset: input.asset, incident: input.incident };
  const byId = new Map(input.pills.map((entry) => [entry.pillId, entry]));
  // One engine pass per pill named by the policy, reused across both faces.
  const evaluated = new Map<string, EvaluationResult>();
  const resultFor = (entry: CoordinationPill): EvaluationResult => {
    const cached = evaluated.get(entry.pillId);
    if (cached !== undefined) return cached;
    const result = evaluate(entry.pill, input.asset, input.incident, input.evidence);
    evaluated.set(entry.pillId, result);
    return result;
  };

  return policy.conflicts.map((link) => {
    const classLabel = policy.classes.find((c) => c.id === link.class)?.label ?? link.class;
    const obligation = faceFor(link.obligation, byId, ctx, resultFor);
    const gate = faceFor(link.gate, byId, ctx, resultFor);
    const base = {
      conflictId: link.id,
      classId: link.class,
      classLabel,
      dependency: link.dependency,
      obligation: obligation.face,
      gate: gate.face,
    };

    if (obligation.face === null || gate.face === null) {
      const absent = [obligation, gate].flatMap((side) => (side.face === null ? [side.absence] : []));
      return { ...base, inConflict: false, reason: absent.join(" "), adjudication: null };
    }

    const predicate = CLASS_PREDICATES[link.class];
    if (predicate === undefined) {
      return {
        ...base,
        inConflict: false,
        reason: `Not checked: conflict class "${link.class}" has no predicate in lib/coordination.`,
        adjudication: null,
      };
    }

    const inConflict = predicate(obligation.face, gate.face);
    if (!inConflict) {
      return { ...base, inConflict, reason: noConflictReason(obligation.face, gate.face), adjudication: null };
    }

    const obligationPill = byId.get(link.obligation.pill);
    const gatePill = byId.get(link.gate.pill);
    // Both are present: a face only exists when its pill does.
    const adjudication =
      obligationPill && gatePill
        ? resolveAdjudicator(obligationPill.pill, gatePill.pill, [
            obligation.face.sensitivity,
            gate.face.sensitivity,
          ])
        : null;

    return { ...base, inConflict, reason: conflictReason(obligation.face, gate.face), adjudication };
  });
}

// ---------------------------------------------------------------------------
// Faces
// ---------------------------------------------------------------------------

/** A face, or the sentence saying why the room cannot show one. */
interface FaceLookup {
  face: ConflictFace | null;
  absence: string;
}

function faceFor(
  ref: RuleRef,
  byId: ReadonlyMap<string, CoordinationPill>,
  ctx: ConditionContext,
  resultFor: (entry: CoordinationPill) => EvaluationResult,
): FaceLookup {
  const entry = byId.get(ref.pill);
  if (entry === undefined) {
    return { face: null, absence: `Pill ${ref.pill} is not in this room at an approved version, so ${ref.rule} cannot be checked.` };
  }
  const rule = entry.pill.rules.find((r) => r.id === ref.rule);
  if (rule === undefined) {
    return { face: null, absence: `Rule ${ref.rule} is not in ${ref.pill} v${entry.pillVersion}.` };
  }

  const { trace, requiredEvidence } = evaluateRule(rule, ctx);
  const decision = resultFor(entry).actions.find((a) => a.ruleId === rule.id);
  const gatingSet = [...requiredEvidence].sort();
  const catalog = entry.pill.evidenceCatalog;
  // Own keys only, like the engine reads evidence: a key named "__proto__" must
  // never pick up an inherited member as its label.
  const gatingLabels = Object.fromEntries(
    gatingSet.map((key) => [key, (Object.hasOwn(catalog, key) ? catalog[key].label : undefined) ?? key]),
  );

  return {
    face: {
      pillId: entry.pillId,
      pillVersion: entry.pillVersion,
      pillName: entry.pill.manifest.name,
      ruleId: rule.id,
      ruleTitle: trace.ruleTitle,
      sensitivity: rule.sensitivity,
      actionClass: trace.actionClass,
      status: trace.status,
      triggered: trace.triggered,
      // The engine's effective deadline (asset overrides applied). A rule that
      // has not triggered has no decision, so nothing is on a clock.
      deadlineMinutes: decision?.deadline ?? null,
      ownerRole: rule.owner,
      escalateToRole: trace.escalateTo.role,
      gatingSet,
      outstanding: [...trace.missingEvidence].sort(),
      gatingLabels,
    },
    absence: "",
  };
}

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------

function sentenceList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Gating keys named as their pill names them. */
function labelled(face: ConflictFace, keys: readonly string[]): string {
  return sentenceList(keys.map((key) => face.gatingLabels[key] ?? key));
}

function conflictReason(obligation: ConflictFace, gate: ConflictFace): string {
  return (
    `${obligation.ruleId} is due within ${obligation.deadlineMinutes} min, ` +
    `and ${gate.ruleId} does not clear until ${labelled(gate, gate.outstanding)} ` +
    `${gate.outstanding.length === 1 ? "is" : "are"} confirmed.`
  );
}

function noConflictReason(obligation: ConflictFace, gate: ConflictFace): string {
  if (!obligation.triggered) return `No conflict: ${obligation.ruleId} has not triggered on this evidence.`;
  if (!gate.triggered) return `No conflict: ${gate.ruleId} has not triggered on this evidence.`;
  if (obligation.deadlineMinutes === null) {
    return `No conflict: ${obligation.ruleId} carries no deadline, so nobody is on a clock.`;
  }
  const n = gate.gatingSet.length;
  return `No conflict: ${gate.ruleId}'s gate is clear — all ${n} gating ${n === 1 ? "key" : "keys"} are confirmed.`;
}
