// Keystone eval corpus — types for cases DERIVED from operational history.
//
// A pill ships hand-written eval cases under pills/<domain>/<name>/evals/.
// This module adds the other half of the corpus: a case derived from a CLOSED
// incident's own record, so an approved pill is continuously regression-tested
// against what actually happened — with nobody authoring a case.
//
// Two invariants shape every type here:
//
//  1. A derived case is never mistaken for an expert's. `authorship` is a
//     REQUIRED discriminator on both arms of CorpusCase, so a consumer cannot
//     render a case without having decided which kind it holds, and only the
//     derived arm carries an origin.
//  2. A derived case never carries an expectation that was not recorded. When
//     a closed incident's record does not determine the expected decisions,
//     the incident is EXCLUDED with a reason — nothing is inferred, mapped or
//     guessed into an expectation.

import type { ActionStatus, EvalCase, EvalCaseResult, PillStatus } from "@/lib/engine";

// ---------------------------------------------------------------------------
// Corpus cases
// ---------------------------------------------------------------------------

/** An eval case an expert wrote, as shipped in the pill's evals/ folder. */
export type AuthoredEvalCase = EvalCase & { readonly authorship: "authored" };

/** Why one recorded action did not become an assertion. The case may still be
 *  derived — the drop is recorded on its origin, never silently swallowed. */
export type DropReason =
  | "rule_not_in_pill"
  | "status_not_a_decision_status"
  | "conflicting_recorded_statuses";

export interface DroppedRule {
  readonly ruleId: string;
  readonly reason: DropReason;
  /** The sentence shown next to the derived case. */
  readonly detail: string;
}

/** Where a derived case came from: which incident, and at which event of its
 *  timeline the evidence was read. */
export interface DerivedCaseOrigin {
  readonly incidentId: string;
  /** The timeline event the evidence snapshot was folded up to. */
  readonly eventId: string;
  readonly eventAt: string;
  readonly timelineVersion: string;
  /** The pill version the incident was decided under, as the incident records
   *  it. A disagreement against a LATER version may be intended drift rather
   *  than a regression, so the report never conflates the two. */
  readonly recordedPillVersion: string;
  readonly droppedRules: readonly DroppedRule[];
}

/** An eval case derived from a closed incident. Carries its own origin, so it
 *  stays identifiable even when separated from the corpus it came from.
 *  Deliberately NOT an authored eval file: the engine's `evalCaseSchema` is
 *  strict and rejects these extra fields, which is the behaviour we want. */
export type DerivedEvalCase = EvalCase & {
  readonly authorship: "derived";
  readonly origin: DerivedCaseOrigin;
};

export type CorpusCase = AuthoredEvalCase | DerivedEvalCase;

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

/**
 * Why an incident did not become an eval case. Every considered incident ends
 * up either derived or excluded with at least one of these — the ledger is
 * total, so "0 derived" can never be shown without the reasons beside it.
 */
export type ExclusionReason =
  | "incident_not_closed"
  | "no_closed_at"
  | "no_timeline"
  | "timeline_has_no_events"
  | "timestamp_not_parseable"
  | "timeline_extends_past_close"
  | "asset_not_found"
  | "no_recorded_actions"
  | "no_determinable_expectation"
  | "case_id_collision";

export interface ExcludedIncident {
  readonly incidentId: string;
  /** Every reason that applies, in a fixed check order — not just the first. */
  readonly reasons: readonly ExclusionReason[];
  /** The reasons as sentences, for the reader. */
  readonly detail: string;
}

export interface DerivationResult {
  readonly derived: readonly DerivedEvalCase[];
  readonly excluded: readonly ExcludedIncident[];
  /** Incidents examined — always derived.length + excluded.length. */
  readonly incidentsConsidered: number;
}

/** The full regression corpus for one pill: what experts wrote, what
 *  operational history yielded, and what history could not yield. */
export interface EvalCorpus {
  readonly authored: readonly AuthoredEvalCase[];
  readonly derived: readonly DerivedEvalCase[];
  readonly excluded: readonly ExcludedIncident[];
  readonly incidentsConsidered: number;
}

// ---------------------------------------------------------------------------
// Drift report
// ---------------------------------------------------------------------------

interface DriftCaseBase {
  readonly caseId: string;
  /** Assertions that matched. */
  readonly agreements: number;
  /** Assertions that did not, in the engine's own expected/actual wording. */
  readonly disagreements: readonly EvalCaseResult[];
}

/** One corpus case's outcome. A union, so no screen can print a derived case's
 *  row without its origin, or an authored row with one. */
export type DriftCaseReport =
  | (DriftCaseBase & { readonly authorship: "authored" })
  | (DriftCaseBase & {
      readonly authorship: "derived";
      readonly origin: DerivedCaseOrigin;
      /** The replayed version is not the version this incident was decided
       *  under, so a disagreement here may be a deliberate rule change. */
      readonly versionDrift: boolean;
    });

/**
 * How much of the pill the corpus actually exercises.
 *
 * Note: `lib/governance/coverage.ts` uses "coverage" for which ASSET TYPES a
 * pill's scope covers. This is a different measure — how many of the pill's
 * RULES any case asserts — and is named for rules throughout so the two are
 * never read as one number.
 */
export interface CorpusCoverage {
  readonly authoredCases: number;
  readonly derivedCases: number;
  readonly incidentsConsidered: number;
  readonly incidentsExcluded: number;
  readonly totalRules: number;
  readonly rulesAsserted: number;
  /** Rules no case in the corpus asserts — the pill's blind spots. */
  readonly rulesNotAsserted: readonly string[];
}

export interface DriftReport {
  readonly pillId: string;
  readonly pillVersion: string;
  /** The replayed pill's lifecycle status, so a report from a draft or shadow
   *  version is never shown as the approved version's. */
  readonly pillStatus: PillStatus;
  readonly cases: readonly DriftCaseReport[];
  readonly agreements: number;
  readonly disagreements: number;
  readonly coverage: CorpusCoverage;
  readonly excluded: readonly ExcludedIncident[];
}

// ---------------------------------------------------------------------------
// Decision statuses
// ---------------------------------------------------------------------------

/**
 * The engine's decision statuses, as a lookup.
 *
 * `Record<ActionStatus, true>` is the authority: TypeScript fails the build if
 * a status is missing, and the excess-property check fails it if anything that
 * is not a status is added. The set therefore cannot drift from the engine's
 * own union.
 */
const DECISION_STATUSES: Readonly<Record<ActionStatus, true>> = {
  allowed: true,
  blocked: true,
  needs_approval: true,
  escalate: true,
  not_applicable: true,
};

/** Whether a recorded status string is one of the engine's decision statuses.
 *  Own keys only, so "constructor" or "__proto__" never pass as a status. */
export function isDecisionStatus(status: string): status is ActionStatus {
  return Object.hasOwn(DECISION_STATUSES, status);
}
