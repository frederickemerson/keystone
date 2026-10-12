"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Ban, Siren, ExternalLink } from "lucide-react";
import { useGovernanceStore } from "@/lib/governance/store";
import { type Actor } from "@/lib/governance/versions";
import { decisionAuthority, roleLabel } from "@/lib/governance/access";
import { StatusBadge, ActionClassChip } from "@/components/mosaic";
import type { ActionStatus } from "@/lib/engine/types";
import type { IncidentRecord, IncidentActionRecord } from "@/lib/data/schemas";
import { routes } from "@/lib/journey/routes";
import { suggestHandoff } from "@/lib/journey/handoff";
import { HandoffButton } from "@/components/journey/HandoffButton";

export function IncidentDecisionCard({
  incident,
  action,
  rulePillId,
  currentActor,
}: {
  incident: IncidentRecord;
  action: IncidentActionRecord;
  /** The pill that defines this action's rule (for the rule link), when known. */
  rulePillId?: string;
  currentActor: Actor;
}) {
  const decideAction = useGovernanceStore((s) => s.decideAction);
  const [refusal, setRefusal] = useState<string | null>(null);
  const recorded = useGovernanceStore(
    (s) => s.decisions[incident.id]?.[action.rule_id],
  );

  const status = action.status as ActionStatus;
  const isEscalate = status === "escalate";
  const isNeedsApproval = status === "needs_approval";

  // Same policy the governance store enforces on decideAction.
  const canApproveAction = isNeedsApproval && decisionAuthority(currentActor.role, "approved").allowed;
  const canEscalateAction = isEscalate && decisionAuthority(currentActor.role, "escalated").allowed;

  // Dead end -> hand-off: the same decision authority, run for the demo cast.
  const neededOutcome = isNeedsApproval ? "approved" : isEscalate ? "escalated" : null;
  const canAct = isNeedsApproval ? canApproveAction : isEscalate ? canEscalateAction : true;
  const handoffTo =
    neededOutcome && !canAct && !recorded
      ? suggestHandoff((a) => decisionAuthority(a.role, neededOutcome).allowed, currentActor)
      : undefined;

  const missingCount = (action.missing_evidence ?? []).length;
  const missingEvidence = (action.missing_evidence ?? []).join(", ") || "—";

  function decide(outcome: "approved" | "rejected" | "escalated", note?: string) {
    // The store enforces the same authority the buttons show (and audits a
    // refusal); a refusal is surfaced, not thrown into React.
    try {
      decideAction({
        incidentId: incident.id,
        ruleId: action.rule_id,
        outcome,
        note,
        pillId: incident.pill_applied,
        pillVersion: incident.pill_version,
      });
      setRefusal(null);
    } catch (err) {
      setRefusal((err as Error).message);
    }
  }

  return (
    <article className="card-paper space-y-3 p-5" aria-label={`Decision: ${incident.id} ${action.rule_id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-[13px]">
          <Link
            href={routes.incident(incident.id)}
            className="inline-flex items-center gap-1 font-mono font-medium text-ink hover:text-accent"
          >
            {incident.id} <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
          <span className="truncate text-ink-muted">· {incident.asset_name}</span>
        </p>
        <StatusBadge status={status} />
      </div>

      <h3 className="text-pretty text-[15px] font-medium leading-snug text-ink">{action.decision}</h3>

      <div className="flex flex-wrap items-center gap-1.5">
        {rulePillId ? (
          <Link
            href={routes.pill(rulePillId, action.rule_id)}
            className="rounded-full border border-line bg-dew-drop px-2 py-0.5 font-mono text-[11px] text-ink underline-offset-2 hover:underline"
          >
            <span className="sr-only">Rule </span>
            {action.rule_id}
          </Link>
        ) : (
          <span className="rounded-full border border-line bg-dew-drop px-2 py-0.5 font-mono text-[11px] text-ink">
            <span className="sr-only">Rule </span>
            {action.rule_id}
          </span>
        )}
        <ActionClassChip actionClass={action.action_class} />
        {missingCount > 0 ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-blocked/40 bg-blocked-tint px-2 py-0.5 text-[11px] font-medium text-blocked"
            title={missingEvidence}
          >
            <span className="tabular-nums">{missingCount}</span> missing:
            <span className="font-mono font-normal">{missingEvidence}</span>
          </span>
        ) : (
          <span className="text-[11px] text-ink-muted">No missing evidence</span>
        )}
      </div>

      {action.escalate_to ? (
        <p className="text-[13px] text-ink">
          <span className="text-ink-muted">Escalate to </span>
          <span className="font-medium">{roleLabel(action.escalate_to.role)}</span>
          {action.escalate_to.fallback ? (
            <span className="text-ink-muted"> · fallback {roleLabel(action.escalate_to.fallback)}</span>
          ) : null}
        </p>
      ) : null}

      {recorded ? (
        <p className="rounded-lg bg-dew-drop px-3 py-1.5 text-xs text-ink">
          Recorded: <span className="font-medium">{recorded.outcome}</span> by {recorded.actor.name} ·{" "}
          {new Date(recorded.at).toLocaleString("en-GB")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {isNeedsApproval ? (
          <>
            <button
              type="button"
              onClick={() => decide("approved")}
              disabled={!canApproveAction}
              title={canApproveAction ? undefined : `Role ${roleLabel(currentActor.role)} cannot approve requires_approval actions`}
              className="btn-pill btn-pill-primary"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> Approve
            </button>
            <button
              type="button"
              onClick={() => decide("rejected")}
              disabled={!canApproveAction}
              title={canApproveAction ? undefined : `Role ${roleLabel(currentActor.role)} cannot reject requires_approval actions`}
              className="btn-pill"
            >
              <Ban className="size-3.5" aria-hidden="true" /> Reject
            </button>
          </>
        ) : null}

        {isEscalate ? (
          <button
            type="button"
            onClick={() => decide("escalated")}
            disabled={!canEscalateAction}
            title={canEscalateAction ? undefined : `Role ${roleLabel(currentActor.role)} cannot escalate`}
            className="btn-pill border-escalate-mark bg-escalate-tint text-escalate"
          >
            <Siren className="size-3.5" aria-hidden="true" /> Escalate
          </button>
        ) : null}
      </div>
      {handoffTo ? (
        <HandoffButton
          to={handoffTo}
          href={routes.approvals()}
          action={isNeedsApproval ? "approve" : "escalate"}
          reason={`${roleLabel(currentActor.role)} cannot ${isNeedsApproval ? "approve" : "escalate"} this action.`}
        />
      ) : null}
      {refusal ? (
        <p role="alert" className="text-xs text-blocked">
          Not recorded: {refusal}
        </p>
      ) : null}
    </article>
  );
}
