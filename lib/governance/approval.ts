// Keystone governance — version approval gate, Shadow promotion, rollback
// authority + shadow-mode records. Pure + client-safe.

import type { ActionDecision, ActionStatus, ComparisonResult } from "@/lib/engine";
import { hasCapability, roleLabel, sameIdentity } from "./access";
import type { Actor, PillVersion } from "./versions";

export interface ApprovalOverride {
  /** Why the approver accepts the regressions. Required, non-empty. */
  reason: string;
}

/** Why approval is blocked: a stable code the UI can act on, plus the plain-English sentence. */
export type ApprovalBlockerCode =
  | "not_shadowed"
  | "not_in_review"
  | "no_trial_runs"
  | "author_cannot_approve"
  | "shadow_promoter_cannot_approve"
  | "author_shadowed_own"
  | "stale_base"
  | "not_authorised"
  | "no_eval_report"
  | "regressions";

export interface ApprovalBlocker {
  code: ApprovalBlockerCode;
  message: string;
}

export interface ApprovalCheck {
  allowed: boolean;
  /** Plain-English reasons approval is blocked (empty when allowed), in the same order as `reasons`. */
  blockers: string[];
  /** The same reasons, with their codes. */
  reasons: ApprovalBlocker[];
  regressions: number;
  /** True when regressions exist but an authorised override let approval through. */
  overridden: boolean;
}

export interface ApprovalContext {
  /**
   * Version currently Approved for the pill. When given, a version proposed
   * from any other base is stale: approving it would silently discard the
   * approved version's rules (lost update), so it must be re-proposed.
   */
  liveApprovedVersion?: string;
  /**
   * How many trial runs (Shadow replays of past incidents) are recorded for
   * the version. A Shadow version with none has not been trialled, so it
   * cannot be approved. Fail-closed: when not given, it counts as zero.
   */
  trialRuns?: number;
}

/**
 * Can `actor` approve `version`, given the eval comparison against the
 * currently approved version (engine compareVersions)?
 *
 * Separation of duties: three different people (DECISIONS.md D2). The author
 * proposes, a second person puts the version into Shadow
 * (shadowPromotionAuthority refuses the author), and a third person approves:
 * - only a Shadow version can be approved (a Draft has not run anywhere),
 *   and only once at least one trial run is on record (context.trialRuns);
 * - the approver is neither the author nor the person who promoted the
 *   version to Shadow. Identities are compared canonically (identityKey), so
 *   case, whitespace, zero-width and Unicode-compatibility variants of a name
 *   are the same human.
 * - The version must derive from the currently approved version (when known).
 * - Authority: the pill's approver role (manifest `approver`), or a role whose
 *   roles.json grants include pill version promotion.
 * - Eval regressions block approval, unless the pill's approver role (for both
 *   seed pills: head_technical_services) explicitly overrides with a reason.
 */
export function canApprove(
  version: PillVersion,
  evalReport: Pick<ComparisonResult, "regressions"> | null,
  actor: Actor,
  override?: ApprovalOverride,
  context: ApprovalContext = {},
): ApprovalCheck {
  const reasons: ApprovalBlocker[] = [];
  const block = (code: ApprovalBlockerCode, message: string) => void reasons.push({ code, message });
  const v = `v${version.version}`;

  if (version.status === "Draft") {
    block("not_shadowed", `${v} is still a Draft. It must run in Shadow before anyone can approve it`);
  } else if (version.status !== "Shadow") {
    block("not_in_review", `${v} is ${version.status}, so there is nothing to approve`);
  } else if ((context.trialRuns ?? 0) < 1) {
    block("no_trial_runs", `${v} has no trial run on record. Replay it against past incidents in Shadow before approving`);
  }

  if (sameIdentity(actor.name, version.createdBy.name)) {
    block("author_cannot_approve", `Separation of duties: ${actor.name} wrote ${v}, so someone else must approve it`);
  }
  // Defence in depth: the store never lets an author promote their own
  // version, but a version that claims it can never be approved either.
  if (version.shadowedBy && sameIdentity(version.shadowedBy.name, version.createdBy.name)) {
    block(
      "author_shadowed_own",
      `Separation of duties: ${version.createdBy.name} both wrote ${v} and put it into Shadow, so it needs an independent Shadow run`,
    );
  }
  if (version.shadowedBy && sameIdentity(actor.name, version.shadowedBy.name)) {
    block(
      "shadow_promoter_cannot_approve",
      `Separation of duties: ${actor.name} put ${v} into Shadow, so someone else must approve it`,
    );
  }

  if (
    context.liveApprovedVersion !== undefined &&
    version.parentVersion !== context.liveApprovedVersion &&
    (version.status === "Draft" || version.status === "Shadow")
  ) {
    block(
      "stale_base",
      `${v} was proposed from v${version.parentVersion ?? "∅"} but v${context.liveApprovedVersion} is now approved — re-propose from v${context.liveApprovedVersion}`,
    );
  }

  const authorised = actor.role === version.approverRole || hasCapability(actor.role, "promote_pill_version");
  if (!authorised) {
    block("not_authorised", `${roleLabel(actor.role)} is not authorised to approve pill versions (approver: ${roleLabel(version.approverRole)})`);
  }

  let regressions = 0;
  let overridden = false;
  if (!evalReport) {
    block("no_eval_report", "No eval report — replay evals against the approved version before approving");
  } else {
    regressions = evalReport.regressions.length;
    if (regressions > 0) {
      const canOverride =
        actor.role === version.approverRole && typeof override?.reason === "string" && override.reason.trim().length > 0;
      if (canOverride) {
        overridden = true;
      } else {
        const cases = evalReport.regressions.map((r) => `${r.caseId}/${r.ruleId}`).join(", ");
        block(
          "regressions",
          `${regressions} eval regression${regressions === 1 ? "" : "s"} (${cases}) — only ${roleLabel(version.approverRole)} may override, with a reason`,
        );
      }
    }
  }

  return {
    allowed: reasons.length === 0,
    blockers: reasons.map((r) => r.message),
    reasons,
    regressions,
    overridden,
  };
}

// ---------------------------------------------------------------------------
// Shadow promotion + rollback authority
// ---------------------------------------------------------------------------

export interface ShadowPromotionAuthority {
  allowed: boolean;
  /** Why not, when not allowed. */
  reason?: string;
}

/**
 * May `actor` put `version` into Shadow? Shadow is the first step of pill
 * promotion, so it needs the same authority as approval: the pill's approver
 * role, or a role whose roles.json grants include pill version promotion
 * (e.g. the steward's shadow-to-approved sign-off). The author can never
 * promote their own version. The single policy both the UI buttons and the
 * governance store enforce.
 */
export function shadowPromotionAuthority(version: PillVersion, actor: Actor): ShadowPromotionAuthority {
  if (version.status !== "Draft") {
    return { allowed: false, reason: `Only Draft versions enter Shadow (v${version.version} is ${version.status})` };
  }
  if (!(actor.role === version.approverRole || hasCapability(actor.role, "promote_pill_version"))) {
    return {
      allowed: false,
      reason: `Role ${actor.role} has no pill-promotion grant and cannot put v${version.version} into Shadow (approver: ${version.approverRole})`,
    };
  }
  if (sameIdentity(actor.name, version.createdBy.name)) {
    return {
      allowed: false,
      reason: `Separation of duties: ${actor.name} wrote v${version.version}, so someone else must put it into Shadow`,
    };
  }
  return { allowed: true };
}

export interface RollbackAuthority {
  allowed: boolean;
  /** Why not, when not allowed. */
  reason?: string;
}

/**
 * May `actor` roll the pill back to `target`'s rules, retiring `current` (the
 * live Approved version)? Needs the rollback grant, or the pill's approver
 * role. A rollback puts rules live without a fresh approval, so it must not be
 * a way around separation of duties: the actor can be neither the author nor
 * the Shadow promoter of the version being retired, nor of the version whose
 * rules are being restored.
 */
export function rollbackAuthority(
  target: PillVersion | undefined,
  current: PillVersion | undefined,
  actor: Actor,
): RollbackAuthority {
  const granted =
    hasCapability(actor.role, "rollback_pill") || (target !== undefined && actor.role === target.approverRole);
  if (!granted) return { allowed: false, reason: `${roleLabel(actor.role)} is not authorised to roll back pills` };
  const involved: [PillVersion | undefined, string][] = [
    [current, "retire"],
    [target, "restore"],
  ];
  for (const [v, verb] of involved) {
    // A rollback version carries rules that already passed the gate under
    // three people; its creator only restored them, so it is not "authored".
    if (!v || v.rollbackOf !== undefined) continue;
    if (sameIdentity(actor.name, v.createdBy.name)) {
      return { allowed: false, reason: `Separation of duties: ${actor.name} wrote v${v.version}, so someone else must ${verb} it` };
    }
    if (v.shadowedBy && sameIdentity(actor.name, v.shadowedBy.name)) {
      return {
        allowed: false,
        reason: `Separation of duties: ${actor.name} put v${v.version} into Shadow, so someone else must ${verb} it`,
      };
    }
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Shadow mode records
// ---------------------------------------------------------------------------

/** One incident replayed through the approved and the shadow version side by side. */
export interface ShadowRun {
  incidentId: string;
  /** ruleId → status under the approved version. */
  approvedDecision: Record<string, ActionStatus>;
  /** ruleId → status under the shadow version. */
  shadowDecision: Record<string, ActionStatus>;
  agree: boolean;
  at: string;
}

function statusMap(actions: readonly ActionDecision[]): Record<string, ActionStatus> {
  const out: Record<string, ActionStatus> = {};
  for (const a of actions) out[a.ruleId] = a.status;
  return out;
}

/** Build a shadow-run record from two engine evaluations of the same incident. */
export function makeShadowRun(
  incidentId: string,
  approved: readonly ActionDecision[],
  shadow: readonly ActionDecision[],
  at: string = new Date().toISOString(),
): ShadowRun {
  const approvedDecision = statusMap(approved);
  const shadowDecision = statusMap(shadow);
  const ruleIds = new Set([...Object.keys(approvedDecision), ...Object.keys(shadowDecision)]);
  const agree = [...ruleIds].every(
    (id) => (approvedDecision[id] ?? "not_applicable") === (shadowDecision[id] ?? "not_applicable"),
  );
  return { incidentId, approvedDecision, shadowDecision, agree, at };
}

export interface ShadowSummary {
  agreements: number;
  total: number;
  /** e.g. "4/4 agreements" */
  label: string;
}

export function shadowSummary(runs: readonly ShadowRun[]): ShadowSummary {
  const agreements = runs.filter((r) => r.agree).length;
  return { agreements, total: runs.length, label: `${agreements}/${runs.length} agreements` };
}
