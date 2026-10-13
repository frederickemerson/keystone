// Does the operational record show this rule's situation happening — and
// happening again?
//
// WHY THIS EXISTS
//
// Keppel's challenge owner named this triage as what expertise actually is:
// "when you have an anomaly, is it a typical problem every year? Or is this a
// one-time problem? ... this is a one-time problem, it's never going to happen
// again, so we just solve the problem — it's not an AI issue. But if it's a
// systemic problem, this is a recurring problem — now how can we have this as
// a skill?"
//
// A rule in a pill is a standing claim that its situation RECURS. This checks
// that claim against the record instead of taking it on faith.
//
// WHAT THIS DOES AND DOES NOT COMPUTE
//
// It does NOT replay anything. `ruleApplications()` already replays every
// recorded timeline through the deterministic engine, step by step, and that
// is the authoritative answer to "which incidents fired this rule" — so this
// module consumes that answer rather than deriving a second, divergent one.
//
// What it adds is the part the replay cannot see: the DENOMINATOR. The replay
// is handed only the incidents that could be replayed at all, so on its own
// "fired in two incidents" is unreadable — two out of two is a pattern, two
// out of fifty is noise. An incident that could not be replayed is reported as
// skipped, never as evidence that the situation did not occur. A closed
// incident with no timeline still carries a description and an outcome, and
// reading a rule firing out of those sentences would be exactly the string
// heuristic this project refuses.
//
// Pure: every input is passed in.

/**
 * How many distinct incidents must fire a rule before the record supports
 * calling its situation recurrent. Two is the smallest number that can tell
 * "happened again" from "happened once".
 */
export const SYSTEMIC_MIN_INCIDENTS = 2;

export type RecurrenceClass = "systemic" | "single" | "unseen";

/** Why an incident could not be put through the engine. */
export type RecurrenceExclusion = "no_timeline" | "timeline_has_no_events" | "asset_not_found";

export interface ExcludedIncidentFromReplay {
  readonly incidentId: string;
  readonly reason: RecurrenceExclusion;
  /** One sentence for the reader. */
  readonly detail: string;
}

/** Which incidents were actually put through the engine, and which were not. */
export interface ReplayCoverage {
  readonly replayed: readonly string[];
  readonly excluded: readonly ExcludedIncidentFromReplay[];
}

/** The identity of a rule being judged. */
export interface RuleIdentity {
  readonly id: string;
  readonly title: string;
}

export interface RuleRecurrence {
  readonly ruleId: string;
  readonly ruleTitle: string;
  /** Incidents whose replay fired this rule. */
  readonly firedIn: readonly string[];
  readonly classification: RecurrenceClass;
}

export interface RecurrenceReport {
  readonly rules: readonly RuleRecurrence[];
  readonly coverage: ReplayCoverage;
  /** replayed + excluded, so a reader can see no incident was dropped silently. */
  readonly considered: number;
}

function classify(firedCount: number): RecurrenceClass {
  if (firedCount === 0) return "unseen";
  return firedCount >= SYSTEMIC_MIN_INCIDENTS ? "systemic" : "single";
}

/**
 * Classify every rule against the replay that already happened.
 *
 * All three arguments are REQUIRED and none has a default. A report built
 * without the coverage would have to invent a denominator, and a report built
 * without the full rule list would quietly omit the rules that never fired —
 * which are the ones this is most useful for.
 */
export function recurrenceOf(
  rules: readonly RuleIdentity[],
  firedByRule: Readonly<Record<string, readonly string[]>>,
  coverage: ReplayCoverage,
): RecurrenceReport {
  const replayed = new Set(coverage.replayed);

  const judged = rules.map((rule) => {
    // Only incidents that were actually replayed may be named: anything else
    // would be a count the coverage cannot account for.
    const firedIn = (firedByRule[rule.id] ?? []).filter((id) => replayed.has(id));
    const unique = [...new Set(firedIn)];
    return { ruleId: rule.id, ruleTitle: rule.title, firedIn: unique, classification: classify(unique.length) };
  });

  return {
    rules: judged,
    coverage,
    considered: coverage.replayed.length + coverage.excluded.length,
  };
}

/** The skipped-incidents clause, or '' when every incident was replayed. */
function skippedClause(coverage: ReplayCoverage): string {
  const n = coverage.excluded.length;
  if (n === 0) return "";
  return ` ${n} further incident${n === 1 ? "" : "s"} could not be replayed and ${n === 1 ? "was" : "were"} not counted.`;
}

/**
 * One sentence a reader can check, denominator included.
 *
 * The denominator is not decoration: with a thin record "fired once" and
 * "fired in everything we have" are the same raw number.
 */
export function recurrenceSentence(entry: RuleRecurrence, report: RecurrenceReport): string {
  const n = entry.firedIn.length;
  const d = report.coverage.replayed.length;
  const skipped = skippedClause(report.coverage);

  if (d === 0) return `No incident could be replayed, so there is no evidence either way.${skipped}`;
  if (n === 0) {
    return `Fired in none of the ${d} incident${d === 1 ? "" : "s"} that could be replayed, so the record does not yet show this situation happening.${skipped}`;
  }
  if (entry.classification === "single") {
    return `Fired in 1 of the ${d} incident${d === 1 ? "" : "s"} that could be replayed (${entry.firedIn[0]}), so the record shows this once and does not yet show it recurring.${skipped}`;
  }
  return `Fired in ${n} of the ${d} incident${d === 1 ? "" : "s"} that could be replayed (${entry.firedIn.join(", ")}), so the record shows this situation recurring.${skipped}`;
}

/** Short label for a chip. */
export const RECURRENCE_LABEL: Record<RecurrenceClass, string> = {
  systemic: "Recurring",
  single: "Seen once",
  unseen: "Not in the record",
};
