// What the operational record captures that no approved pill reads yet.
//
// WHY THIS EXISTS
//
// Keppel's challenge owner gave this as an example of a result that would
// already be worth having: "you can show in a simple workflow where you can
// introduce a skill to help me to **ask the right questions** or **identify a
// problem better that I did — maybe could have been a blind spot**."
//
// A pill is the expert's answer to the questions they thought to ask. The
// operational record is a separate witness: connectors, technicians and
// tenants keep recording facts whether or not a rule reads them. Where the two
// disagree — a fact captured again and again that no rule consults — the pill
// has a gap the expert may not know about, and that gap is the next
// interview's agenda.
//
// WHAT IS AUTHORITATIVE
//
// Both sides are structural. A rule "reads" a key when it names it in a
// trigger condition, an exception condition or required evidence — which
// lib/connectors/evidence-uses.ts already computes, so this consumes that
// rather than re-deriving a second answer. A key is "observed" when a timeline
// event records it under `evidence_updates`, which is the engine's own
// vocabulary (enforced by lib/data/__tests__/consistency.test.ts). Nothing
// here reads an incident's prose, and nothing here asks a model.
//
// SCOPE MATTERS, AND IS NOT OPTIONAL
//
// This is only honest across EVERY approved pill. A key that one pill ignores
// is usually just another pill's business — `anchor_tenant_affected` is not a
// blind spot in a technical-services pill, it is tenant experience's. Judged
// per pill the list is 17 keys and mostly noise; judged across the pills it is
// 7, and they are real. The pills considered are therefore carried in the
// report, so a reader can see how wide the claim is.
//
// Pure: every input is passed in.

import type { EvidenceUse } from "@/lib/connectors/evidence-uses";
import type { Timeline } from "@/lib/data/schemas";

/** A fact the record keeps, and the incidents that recorded it. */
export interface ObservedKey {
  readonly key: string;
  /** The catalogue's human label, or the key when no pill declares one. */
  readonly label: string;
  /** Incidents whose timeline recorded this key, in first-seen order. */
  readonly seenIn: readonly string[];
}

export interface CoverageReport {
  /**
   * Observed facts that no rule in any considered pill reads — sorted by how
   * many incidents recorded them, because a fact the record keeps repeating is
   * a better question than one it mentioned once.
   */
  readonly uncovered: readonly ObservedKey[];
  /** Observed facts that at least one rule does read. */
  readonly coveredCount: number;
  /** Distinct keys the record showed at all: coveredCount + uncovered.length. */
  readonly observedCount: number;
  /** Which pills were searched. A narrower set means a wider-looking gap. */
  readonly pillsConsidered: readonly string[];
}

/**
 * Evidence keys recorded by these timelines, mapped to the incidents that
 * recorded them.
 *
 * A fold, not a translation: `evidence_updates` is already the engine's
 * vocabulary, so the keys pass through unchanged. Built through a Map so a key
 * like `__proto__` becomes an own property instead of rewriting a prototype.
 */
export function observedEvidence(timelines: readonly Timeline[]): Record<string, string[]> {
  const seen = new Map<string, string[]>();
  for (const timeline of timelines) {
    for (const event of timeline.events) {
      for (const key of Object.keys(event.evidence_updates)) {
        const incidents = seen.get(key) ?? [];
        if (!incidents.includes(timeline.incident_id)) incidents.push(timeline.incident_id);
        seen.set(key, incidents);
      }
    }
  }
  return Object.fromEntries(seen);
}

/**
 * The facts the record keeps that no rule reads.
 *
 * Every argument is REQUIRED and none defaults. `uses` in particular must be
 * computed over every approved pill: passing one pill's uses would report that
 * pill's scope boundaries as enterprise blind spots, which is both wrong and
 * the kind of wrong that looks like a finding.
 */
export function blindSpots(
  observed: Readonly<Record<string, readonly string[]>>,
  uses: Readonly<Record<string, readonly EvidenceUse[]>>,
  labels: Readonly<Record<string, string>>,
  pillsConsidered: readonly string[],
): CoverageReport {
  const uncovered: ObservedKey[] = [];
  let coveredCount = 0;

  for (const [key, seenIn] of Object.entries(observed)) {
    if ((uses[key] ?? []).length > 0) {
      coveredCount += 1;
      continue;
    }
    uncovered.push({ key, label: labels[key] ?? key, seenIn });
  }

  // Most-recorded first; ties by key so the order is stable for a reader.
  uncovered.sort((a, b) => b.seenIn.length - a.seenIn.length || a.key.localeCompare(b.key));

  return {
    uncovered,
    coveredCount,
    observedCount: coveredCount + uncovered.length,
    pillsConsidered,
  };
}

/** One sentence stating the finding and how wide the search was. */
export function coverageSentence(report: CoverageReport): string {
  const pills = report.pillsConsidered.length;
  const scope = `across ${pills} approved pill${pills === 1 ? "" : "s"}`;
  if (report.observedCount === 0) return `No evidence has been recorded yet, so there is nothing to compare ${scope}.`;
  if (report.uncovered.length === 0) {
    return `Every one of the ${report.observedCount} facts the record captures is read by a rule ${scope}.`;
  }
  return `${report.uncovered.length} of the ${report.observedCount} facts the record captures ${report.uncovered.length === 1 ? "is" : "are"} read by no rule ${scope}.`;
}
