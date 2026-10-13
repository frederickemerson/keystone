// Who adjudicates a cross-pill conflict — derived, never authored.
//
// A cross-pill conflict is nobody's to settle inside either domain: each pill's
// own escalation target owns one half of it. The human who can settle it is the
// one BOTH pills already answer to — the accountability their SKILL.md
// frontmatter names (steward, then approver) — and that human must also be
// cleared to read both halves. A role that cannot see one face cannot weigh it.
//
// Every input is structured: the pill manifests for accountability,
// data/roles.json (via lib/governance/access) for the person, their clearance
// and their escalation grant. Nothing here parses prose.

import type { Pill, Sensitivity } from "@/lib/engine/types";
import { canEscalate, canSee, isKnownRole, personaFor, roleLabel } from "@/lib/governance/access";
import { ADJUDICATION_BASES, type AdjudicationBasis } from "./contract";

/** A role both pills name in the same accountability slot. */
export interface AdjudicationCandidate {
  role: string;
  basis: AdjudicationBasis;
}

export interface Adjudication extends AdjudicationCandidate {
  /** The named human, from data/roles.json. */
  person: string;
  /** The role's label, from data/roles.json. */
  label: string;
}

/** A nearer candidate that was passed over, with the computed reason. */
export interface SkippedAdjudicator extends AdjudicationCandidate {
  label: string;
  reason: string;
}

export interface AdjudicationOutcome {
  /** The human who must adjudicate, or null when no jointly accountable role qualifies. */
  chosen: Adjudication | null;
  /** Candidates passed over, nearest accountability first. */
  skipped: SkippedAdjudicator[];
}

/**
 * Roles both pills name in the same accountability slot, nearest to the work
 * first. A slot where the two pills disagree is not shared accountability and
 * is skipped silently — neither named human answers for both bodies of
 * judgement.
 */
export function sharedAccountability(a: Pill, b: Pill): AdjudicationCandidate[] {
  return ADJUDICATION_BASES.filter((basis) => a.manifest[basis] === b.manifest[basis]).map((basis) => ({
    role: a.manifest[basis],
    basis,
  }));
}

/**
 * Why a candidate cannot adjudicate, or null when they can. Checked in the
 * order a reader would: do they exist, may they escalate at all, and are they
 * cleared for every sensitivity in the conflict.
 */
function disqualification(role: string, sensitivities: readonly Sensitivity[]): string | null {
  if (!isKnownRole(role)) return `is not defined in data/roles.json`;
  if (!canEscalate(role)) return `holds no escalation grant in data/roles.json`;
  const blind = sensitivities.filter((level) => !canSee(role, level));
  if (blind.length > 0) {
    return `is not cleared for ${blind.join(" or ")} content, so cannot weigh both sides`;
  }
  return null;
}

/**
 * The human who must adjudicate a conflict between two pills, given every
 * sensitivity level the conflict's faces carry. Deterministic: same pills and
 * same sensitivities, same answer. `chosen` is null when no shared
 * accountability survives — the panel then says so rather than naming someone
 * who cannot settle it.
 */
export function resolveAdjudicator(
  obligationPill: Pill,
  gatePill: Pill,
  sensitivities: readonly Sensitivity[],
): AdjudicationOutcome {
  const skipped: SkippedAdjudicator[] = [];
  for (const candidate of sharedAccountability(obligationPill, gatePill)) {
    const reason = disqualification(candidate.role, sensitivities);
    if (reason === null) {
      return {
        chosen: { ...candidate, person: personaFor(candidate.role).name, label: roleLabel(candidate.role) },
        skipped,
      };
    }
    skipped.push({ ...candidate, label: roleLabel(candidate.role), reason });
  }
  return { chosen: null, skipped };
}
