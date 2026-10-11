// MOSAIC governance — version approval gate + shadow-mode records.
// Pure + client-safe.

import type { ActionDecision, ActionStatus, ComparisonResult } from "@/lib/engine";
import { hasCapability, sameIdentity } from "./access";
import type { Actor, PillVersion } from "./versions";

export interface ApprovalOverride {
  /** Why the approver accepts the regressions. Required, non-empty. */
  reason: string;
}

export interface ApprovalCheck {
  allowed: boolean;
  /** Human-readable reasons approval is blocked (empty when allowed). */
  blockers: string[];
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
}

/**
 * Can `actor` approve `version`, given the eval comparison against the
 * currently approved version (engine compareVersions)?
 *
 * - Only Draft/Shadow versions can be approved.
 * - Separation of duties: the author can never approve their own version.
 *   Identities are compared canonically (identityKey), so case, whitespace,
 *   zero-width and Unicode-compatibility variants of a name are the same human.
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
  const blockers: string[] = [];

  if (version.status !== "Draft" && version.status !== "Shadow") {
    blockers.push(`v${version.version} is ${version.status}; only Draft or Shadow versions can be approved`);
  }

  if (sameIdentity(actor.name, version.createdBy.name)) {
    blockers.push(`Separation of duties: ${actor.name} authored v${version.version} and cannot approve it`);
  }

  if (
    context.liveApprovedVersion !== undefined &&
    version.parentVersion !== context.liveApprovedVersion &&
    (version.status === "Draft" || version.status === "Shadow")
  ) {
    blockers.push(
      `v${version.version} was proposed from v${version.parentVersion ?? "∅"} but v${context.liveApprovedVersion} is now approved — re-propose from v${context.liveApprovedVersion}`,
    );
  }

  const authorised = actor.role === version.approverRole || hasCapability(actor.role, "promote_pill_version");
  if (!authorised) {
    blockers.push(`Role ${actor.role} is not authorised to approve pill versions (approver: ${version.approverRole})`);
  }

  let regressions = 0;
  let overridden = false;
  if (!evalReport) {
    blockers.push("No eval report — replay evals against the approved version before approving");
  } else {
    regressions = evalReport.regressions.length;
    if (regressions > 0) {
      const canOverride =
        actor.role === version.approverRole && typeof override?.reason === "string" && override.reason.trim().length > 0;
      if (canOverride) {
        overridden = true;
      } else {
        const cases = evalReport.regressions.map((r) => `${r.caseId}/${r.ruleId}`).join(", ");
        blockers.push(
          `${regressions} eval regression${regressions === 1 ? "" : "s"} (${cases}) — only ${version.approverRole} may override, with a reason`,
        );
      }
    }
  }

  return { allowed: blockers.length === 0, blockers, regressions, overridden };
}

// ---------------------------------------------------------------------------
// Shadow mode
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
