// Keystone eval corpus — the pill's authored cases plus the cases derived from
// its operational history, assembled into one replayable corpus. Pure.

import type { EvalCase, Pill } from "@/lib/engine";
import { deriveEvalCases, type IncidentHistory } from "./derive";
import type {
  AuthoredEvalCase,
  DerivedEvalCase,
  EvalCorpus,
  ExcludedIncident,
} from "./types";

/** Tag a pill-shipped eval case as what it is: an expert's. */
export function authoredCase(evalCase: EvalCase): AuthoredEvalCase {
  return { ...evalCase, authorship: "authored" };
}

/**
 * The regression corpus for one pill.
 *
 * Both inputs are required. A corpus built from the pill alone would be the
 * authored cases silently presented as the whole corpus, which is the claim
 * this module exists to stop.
 */
export function buildCorpus(pill: Pill, history: IncidentHistory): EvalCorpus {
  const authored = Object.values(pill.evals).map(authoredCase);
  const authoredIds = new Set(authored.map((entry) => entry.id));

  const derivation = deriveEvalCases(pill, history);

  // A derived id can only collide with an authored one if a pill ships a case
  // named like a derived case. Replaying both under one id would merge two
  // different expectations, so the derived case stands down and says so.
  const derived: DerivedEvalCase[] = [];
  const excluded: ExcludedIncident[] = [...derivation.excluded];
  for (const entry of derivation.derived) {
    if (authoredIds.has(entry.id)) {
      excluded.push({
        incidentId: entry.origin.incidentId,
        reasons: ["case_id_collision"],
        detail: `An authored eval case is already called "${entry.id}".`,
      });
      continue;
    }
    derived.push(entry);
  }

  return {
    authored,
    derived,
    excluded,
    incidentsConsidered: derivation.incidentsConsidered,
  };
}

/** Every case to replay, authored first — the order the report rows keep. */
export function corpusCases(corpus: EvalCorpus): (AuthoredEvalCase | DerivedEvalCase)[] {
  return [...corpus.authored, ...corpus.derived];
}
