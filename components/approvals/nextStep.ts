// What a version in review needs next, and who may do it. Each step carries
// the REAL authority check the store enforces (peerConfirmAuthority,
// shadowPromotionAuthority, canApprove), so the hand-off never claims someone
// can act when the store would refuse. No policy is restated here.

import { peerConfirmAuthority } from '@/lib/capture';
import type { PillEditPolicy } from '@/lib/governance/access';
import { canApprove, shadowPromotionAuthority, type ApprovalContext } from '@/lib/governance/approval';
import type { PillVersion } from '@/lib/governance/versions';
import type { ComparisonResult } from '@/lib/engine';
import type { Persona } from '@/lib/journey/handoff';

export type ApprovalStepKind = 'peer_confirm' | 'trial_run' | 'approve';

export interface ApprovalStep {
  kind: ApprovalStepKind;
  /** Verb phrase for the hand-off button ("approve"). */
  action: string;
  /** Sentence naming the step. */
  label: string;
  /** The authority check for this step. */
  isAllowed: (actor: Persona) => boolean;
}

export interface NextStepInput {
  version: PillVersion;
  /** Comparison against the approved version (same report the Approve button uses). */
  evalReport: Pick<ComparisonResult, 'regressions'>;
  context: ApprovalContext;
  /** For a version proposed from a frontline note: the pill's edit policy and whether its peer gate is met. */
  peer?: { policy: PillEditPolicy; gateMet: boolean };
}

/** The approval check for one actor, exactly as the Approve button and the store run it. */
export function approvalCheck(input: Pick<NextStepInput, 'version' | 'evalReport' | 'context'>, actor: Persona) {
  return canApprove(input.version, input.evalReport, actor, undefined, input.context);
}

/** The next step for a Draft or Shadow version; null when it is not in review. */
export function nextApprovalStep(input: NextStepInput): ApprovalStep | null {
  const { version, peer } = input;
  const v = `v${version.version}`;
  if (version.status === 'Draft' && version.capture && peer && !peer.gateMet) {
    const capture = version.capture;
    return {
      kind: 'peer_confirm',
      action: 'confirm as peer',
      label: `A peer checks the rule from the frontline note before ${v} can start its trial run.`,
      isAllowed: (actor) => peerConfirmAuthority(actor, capture.author, peer.policy, version.createdBy).allowed,
    };
  }
  if (version.status === 'Draft') {
    return {
      kind: 'trial_run',
      action: 'start the trial run',
      label: `${v} starts a trial run (Shadow) before anyone can approve it.`,
      isAllowed: (actor) => shadowPromotionAuthority(version, actor).allowed,
    };
  }
  if (version.status === 'Shadow') {
    return {
      kind: 'approve',
      action: 'approve',
      label: `A third person approves ${v}; then it goes live.`,
      isAllowed: (actor) => approvalCheck(input, actor).allowed,
    };
  }
  return null;
}
