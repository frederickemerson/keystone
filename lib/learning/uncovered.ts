// A problem somebody solved that no pill has a rule for.
//
// WHY THIS EXISTS
//
// This is the third of the three things Keppel's challenge owner said his team
// has not solved: "how do we then capture if there's a new skill discovered by
// the agents? Because it's something, it's a problem that we've never faced
// before and we've actually solved that problem. So is this a new skill? So
// how does that then get captured back into the system?"
//
// Everything else in Keystone that starts a capture is started by a PERSON: a
// technician writes a note, a reader disputes an agent's answer, an expert
// proposes a correction. Nothing noticed on its own that the record contained
// a solved problem the governed rules could not account for. This does.
//
// HOW IT DECIDES, AND WHY IT IS NOT A GUESS
//
// The authoritative signal is the replay. `ruleApplications()` puts every
// recorded timeline through the deterministic engine step by step; an incident
// that comes out of that with NO rule triggered is one the governed pills have
// nothing to say about. Nothing here reads a description or an outcome for
// meaning — reading "is this a new skill?" out of prose would be exactly the
// string heuristic this project refuses. The only thing the outcome field is
// used for is whether it is present at all.
//
// Then one distinction, which is the challenge owner's own:
//
//   closed, with an outcome  → somebody solved it. A CANDIDATE new skill: the
//                              record holds what was done but not the
//                              reasoning, and the reasoning is the skill.
//   still open               → nobody has solved it yet, so there is no skill
//                              to capture. It is a gap, reported separately.
//
// SEARCHED ACROSS EVERY APPROVED PILL, NEVER ONE
//
// Judged against a single pill, almost every incident looks uncovered, because
// a tenant-communications incident is not the technical-services pill's
// business. That makes scope boundaries look like discoveries. So the caller
// must pass the rules that fired across EVERY approved pill, and must name the
// pills it searched — searching none is refused outright rather than reporting
// the whole record as undiscovered knowledge.
//
// Pure: every input is passed in.

import type { ReplayCoverage } from "./recurrence";

/** What this module needs to know about one incident. No prose is read. */
export interface JudgedIncident {
  readonly id: string;
  /** Closed AND carrying a recorded outcome: somebody finished it. */
  readonly solved: boolean;
}

export type CoverageClass = "covered" | "candidate_skill" | "unsolved";

export interface UncoveredIncident {
  readonly incidentId: string;
  readonly classification: Exclude<CoverageClass, "covered">;
}

export interface UncoveredReport {
  /** Solved, and no approved rule fired: the record is missing a skill. */
  readonly candidates: readonly UncoveredIncident[];
  /** Not solved, and no approved rule fired: a gap, not yet a skill. */
  readonly unsolved: readonly UncoveredIncident[];
  /** Incidents the replay actually judged. */
  readonly judged: number;
  /** Incidents that could not be replayed, so could not be judged either way. */
  readonly coverage: ReplayCoverage;
  readonly pillsSearched: readonly string[];
}

/**
 * Incidents the governed rules cannot account for.
 *
 * All four arguments are REQUIRED and none has a default. `firedIncidentIds`
 * with a default would silently mean "nothing fired anywhere", turning every
 * incident into a discovery; `pillsSearched` with a default would hide how
 * narrow the search was, which is the one thing a reader has to know before
 * believing a finding.
 *
 * @throws if no pill was searched — a search with nothing to search would
 * report the entire record as undiscovered knowledge.
 */
export function uncoveredIncidents(
  incidents: readonly JudgedIncident[],
  firedIncidentIds: readonly string[],
  coverage: ReplayCoverage,
  pillsSearched: readonly string[],
): UncoveredReport {
  if (pillsSearched.length === 0) {
    throw new Error("uncoveredIncidents: refusing to judge coverage with no approved pill to judge against");
  }
  const replayed = new Set(coverage.replayed);
  const fired = new Set(firedIncidentIds);

  const candidates: UncoveredIncident[] = [];
  const unsolved: UncoveredIncident[] = [];
  for (const incident of incidents) {
    // Only what the engine actually saw. An incident with no timeline is
    // reported as unjudgeable by `coverage`, never as a discovery.
    if (!replayed.has(incident.id)) continue;
    if (fired.has(incident.id)) continue;
    const row = {
      incidentId: incident.id,
      classification: incident.solved ? ("candidate_skill" as const) : ("unsolved" as const),
    };
    (incident.solved ? candidates : unsolved).push(row);
  }

  return { candidates, unsolved, judged: replayed.size, coverage, pillsSearched };
}

/** The skipped-incidents clause, or '' when every incident was replayed. */
function skippedClause(coverage: ReplayCoverage): string {
  const n = coverage.excluded.length;
  if (n === 0) return "";
  return ` ${n} further incident${n === 1 ? "" : "s"} could not be replayed and ${n === 1 ? "was" : "were"} not judged either way.`;
}

/**
 * One sentence a reader can check, denominator and search breadth included.
 *
 * Both matter. "One incident no rule covers" means something quite different
 * out of four than out of four hundred, and it means nothing at all until a
 * reader knows how many pills were searched.
 */
export function uncoveredSentence(report: UncoveredReport): string {
  const pills = report.pillsSearched.length;
  const scope = `across all ${pills} approved pill${pills === 1 ? "" : "s"}`;
  const skipped = skippedClause(report.coverage);

  if (report.judged === 0) return `No incident could be replayed, so nothing could be judged.${skipped}`;
  const n = report.candidates.length;
  if (n === 0) {
    return `Every one of the ${report.judged} incident${report.judged === 1 ? "" : "s"} that could be replayed fired at least one rule ${scope}, so the record shows no solved problem the pills cannot account for.${skipped}`;
  }
  return `${n} of the ${report.judged} incident${report.judged === 1 ? "" : "s"} that could be replayed fired no rule at all ${scope}, and ${n === 1 ? "was" : "were"} solved anyway — so the record holds the outcome but not the judgement that produced it.${skipped}`;
}
