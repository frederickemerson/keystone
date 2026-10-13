// Keystone governance — the override-rate KPI. Pure + client-safe.
//
// docs/SUBMISSION.md §6.3 listed this metric as "proposed for the pilot, not
// built". This is the built version: it reads the append-only audit log and
// counts how often a named human decided against the pill, who did it, and on
// which rule. It is the figure a pilot would run the programme on — the rules
// drifting away from practice show up as repeat overrides of one rule id.
//
// The classification is structural: AUDIT_SIGNAL is a total map over
// AuditAction, so a new audit action does not compile until someone decides
// what it means here. Nothing in this file reads a reason, a detail or a title.
//
// What the log cannot say is deliberately left out. An audit event records what
// a person did, not what the engine had decided, so "approved past a blocked
// gate" is not derivable here — and it cannot happen anyway: Approve is never
// enabled on a blocked or must-escalate action (components/incident/permissions
// .ts), and escalation is the gate routing to a named human, not a bypass. The
// one override a human can record on a gate is refusing a recommended action.

import type { AuditAction, AuditEvent, AuditLog } from "./audit";

/** What one audit action contributes to the override figure. */
export type OverrideSignal =
  /** A named human refused an action the pill recommended — the override. */
  | "decision_overrode_pill"
  /** A named human approved the action the pill put up for approval. */
  | "decision_followed_pill"
  /** Routed to a named human. The gate working, never an override. */
  | "decision_escalated"
  /** Held open until missing evidence is confirmed. */
  | "decision_held_for_evidence"
  /** A version approved over an eval regression, with the approver's reason on record. */
  | "approval_overrode_evals"
  /** A version approved with no regression to accept. */
  | "approval_followed_evals"
  /** An approved version withdrawn. */
  | "approved_version_withdrawn"
  /** Governance refused the attempt — it never took effect. */
  | "refused_by_governance"
  /** Carries nothing about overrides. */
  | "not_counted";

/**
 * Every audit action, classified. Total over AuditAction on purpose: adding a
 * name to AUDIT_ACTIONS (or to CAPTURE_AUDIT_ACTIONS) breaks the build here
 * until it is classified, so no action can quietly land outside the figure.
 */
export const AUDIT_SIGNAL: Record<AuditAction, OverrideSignal> = {
  role_switched: "not_counted",
  pill_seeded: "not_counted",
  version_proposed: "not_counted",
  version_proposal_blocked: "refused_by_governance",
  version_shadowed: "not_counted",
  version_shadow_blocked: "refused_by_governance",
  shadow_run_recorded: "not_counted",
  version_approved: "approval_followed_evals",
  version_approval_blocked: "refused_by_governance",
  version_approval_overridden: "approval_overrode_evals",
  version_rolled_back: "approved_version_withdrawn",
  version_rollback_blocked: "refused_by_governance",
  action_approved: "decision_followed_pill",
  action_rejected: "decision_overrode_pill",
  action_escalated: "decision_escalated",
  action_evidence_requested: "decision_held_for_evidence",
  action_decision_blocked: "refused_by_governance",
  evidence_confirmed: "not_counted",
  evidence_confirmation_blocked: "refused_by_governance",
  outcome_recorded: "not_counted",
  outcome_blocked: "refused_by_governance",
  // One action covers confirmed, edited and rejected rule tiles, so it cannot
  // tell an expert agreeing from an expert overruling the rule. Left out rather
  // than guessed from the detail text (see the integration note on audit.ts).
  rule_reviewed: "not_counted",
  rule_review_blocked: "refused_by_governance",
  demo_reset: "not_counted",
  snapshot_discarded: "not_counted",
  capture_task_created: "not_counted",
  capture_task_answered: "not_counted",
  capture_task_dismissed: "not_counted",
  capture_task_blocked: "refused_by_governance",
  voice_note_recorded: "not_counted",
  voice_note_blocked: "refused_by_governance",
  readback_confirmed: "not_counted",
  readback_corrected: "not_counted",
  readback_blocked: "refused_by_governance",
  draft_from_note_proposed: "not_counted",
  draft_from_note_blocked: "refused_by_governance",
  peer_confirmed: "not_counted",
  peer_disputed: "not_counted",
  peer_confirm_blocked: "refused_by_governance",
  drafts_from_note_recorded: "not_counted",
  voice_note_amended: "not_counted",
};

/** The four signals that make up the denominator: one recorded human decision each. */
const DECISION_SIGNALS: ReadonlySet<OverrideSignal> = new Set<OverrideSignal>([
  "decision_overrode_pill",
  "decision_followed_pill",
  "decision_escalated",
  "decision_held_for_evidence",
]);

export interface OverrideActorRow {
  /** Named human (as the audit log recorded them). */
  actor: string;
  role: string;
  overrides: number;
  /** Decisions this person recorded — their own denominator. */
  decisions: number;
}

export interface OverrideRuleRow {
  ruleId: string;
  /** The pill the events named, when they named one. */
  pillId?: string;
  overrides: number;
  decisions: number;
}

export interface ApprovalOverrideCount {
  /** Version approvals recorded. */
  total: number;
  /** Of those, the ones approved over an eval regression. */
  overEvalRegressions: number;
}

export interface OverrideSummary {
  /** Gate decisions a named human recorded — the denominator. */
  decisions: number;
  /** Of those, the ones that went against the pill (a recommended action refused). */
  overrides: number;
  /** Gate routings to a named human. Counted apart: the gate worked. */
  escalations: number;
  /** Decisions held open for evidence the gate is waiting on. */
  evidenceHolds: number;
  approvals: ApprovalOverrideCount;
  /** Approved versions withdrawn (rolled back). */
  rollbacks: number;
  /** Attempts governance refused outright. Never overrides — they did not happen. */
  refusedAttempts: number;
  /** Everyone who recorded a decision, most overrides first. */
  byActor: readonly OverrideActorRow[];
  /** Every rule a decision named, most overrides first — where the rules meet resistance. */
  byRule: readonly OverrideRuleRow[];
}

export const EMPTY_OVERRIDE_SUMMARY: OverrideSummary = {
  decisions: 0,
  overrides: 0,
  escalations: 0,
  evidenceHolds: 0,
  approvals: { total: 0, overEvalRegressions: 0 },
  rollbacks: 0,
  refusedAttempts: 0,
  byActor: [],
  byRule: [],
};

/**
 * The events of the current run: everything after the last demo_reset.
 *
 * resetDemo() returns versions, decisions and shadow runs to the seed but keeps
 * the append-only log (the audit drawer draws the reset as a run divider and
 * labels the events below it as earlier runs). A figure counted over the whole
 * log would report overrides for decisions the rest of the app no longer holds.
 */
export function currentRun(log: AuditLog): AuditEvent[] {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    if (log[i].action === "demo_reset") return log.slice(i + 1);
  }
  return log.slice();
}

/** Counts being accumulated; only ever a local inside summariseOverrides. */
type Tally = { overrides: number; decisions: number };

/** Most overrides first, then most decisions, then the key — a stable order to render. */
function byOverridesThen<T extends Tally>(key: (row: T) => string) {
  return (a: T, b: T): number =>
    b.overrides - a.overrides || b.decisions - a.decisions || key(a).localeCompare(key(b));
}

/**
 * The override figure for `log`, counted over the current run only. Pure: the
 * same log always gives the same summary, and the log is never touched.
 */
export function summariseOverrides(log: AuditLog): OverrideSummary {
  const events = currentRun(log);
  const actors = new Map<string, Tally & { actor: string; role: string }>();
  const rules = new Map<string, Tally & { ruleId: string; pillId?: string }>();
  const summary = {
    decisions: 0,
    overrides: 0,
    escalations: 0,
    evidenceHolds: 0,
    approvals: { total: 0, overEvalRegressions: 0 },
    rollbacks: 0,
    refusedAttempts: 0,
  };

  for (const event of events) {
    // A log written by a newer build could carry an action this one has not
    // classified; it must not be counted as anything.
    const signal: OverrideSignal = AUDIT_SIGNAL[event.action] ?? "not_counted";
    const overrode = signal === "decision_overrode_pill";

    if (DECISION_SIGNALS.has(signal)) {
      summary.decisions += 1;
      if (overrode) summary.overrides += 1;
      if (signal === "decision_escalated") summary.escalations += 1;
      if (signal === "decision_held_for_evidence") summary.evidenceHolds += 1;

      // Name and role together: two roles are two actors, as the log records them.
      const actorKey = `${event.actor}\u0000${event.role}`;
      const actorRow = actors.get(actorKey) ?? { actor: event.actor, role: event.role, overrides: 0, decisions: 0 };
      actorRow.decisions += 1;
      if (overrode) actorRow.overrides += 1;
      actors.set(actorKey, actorRow);

      if (event.ruleId) {
        const ruleRow = rules.get(event.ruleId) ?? { ruleId: event.ruleId, overrides: 0, decisions: 0 };
        ruleRow.decisions += 1;
        if (overrode) ruleRow.overrides += 1;
        // First pill named for this rule wins; rule ids are namespaced per pill.
        if (ruleRow.pillId === undefined && event.pillId) ruleRow.pillId = event.pillId;
        rules.set(event.ruleId, ruleRow);
      }
      continue;
    }

    if (signal === "approval_followed_evals" || signal === "approval_overrode_evals") {
      summary.approvals.total += 1;
      if (signal === "approval_overrode_evals") summary.approvals.overEvalRegressions += 1;
    } else if (signal === "approved_version_withdrawn") {
      summary.rollbacks += 1;
    } else if (signal === "refused_by_governance") {
      summary.refusedAttempts += 1;
    }
  }

  return {
    ...summary,
    byActor: [...actors.values()].sort(byOverridesThen((r) => r.actor)),
    byRule: [...rules.values()].sort(byOverridesThen((r) => r.ruleId)),
  };
}

/** The label every surface uses for this figure. */
export const OVERRIDE_RATE_LABEL = "Override rate";

/** What it counts, in one line. */
export const OVERRIDE_RATE_SUBTITLE =
  "Gate decisions where a named human went against the pill, counted from the append-only audit log.";

/**
 * Below this many decisions a percentage is precision the log cannot carry:
 * one more decision would move it by more than five points.
 */
export const MIN_RATE_DENOMINATOR = 20;

/** "2 of 7" — the figure itself: the count and the denominator it came from. */
export function formatOverrideCount(summary: OverrideSummary): string {
  return `${summary.overrides} of ${summary.decisions}`;
}

/** The whole-number percentage, once enough decisions have been recorded to carry one; null until then. */
export function overridePercent(summary: OverrideSummary): number | null {
  if (summary.decisions < MIN_RATE_DENOMINATOR) return null;
  return Math.round((summary.overrides / summary.decisions) * 100);
}

/** The line under the figure: what it counts, and what it is not. */
export function overrideRateNote(summary: OverrideSummary): string {
  if (summary.decisions === 0) {
    return "No overrides recorded yet — nothing has been decided on a gate in this run.";
  }
  const percent = overridePercent(summary);
  if (percent === null) {
    return `Counts of recorded decisions, not a rate — under ${MIN_RATE_DENOMINATOR} decisions, one more would move a percentage by over five points.`;
  }
  return `${percent}% of ${summary.decisions} recorded decisions.`;
}

/** "1 of 4 decisions" — the figure read out for a screen reader or a tooltip. */
export function describeOverrideRate(summary: OverrideSummary): string {
  return `${OVERRIDE_RATE_LABEL} ${formatOverrideCount(summary)} decisions`;
}
