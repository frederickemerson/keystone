"use client";

import Link from "next/link";
import { CheckCircle2, Ban, Siren, ExternalLink } from "lucide-react";
import { useGovernanceStore } from "@/lib/governance/store";
import { type Actor } from "@/lib/governance/versions";
import { hasCapability, canEscalate, roleLabel } from "@/lib/governance/access";
import { StatusBadge, ActionClassChip } from "@/components/mosaic";
import type { ActionStatus } from "@/lib/engine/types";
import type { IncidentRecord, IncidentActionRecord } from "@/lib/data/schemas";

export function IncidentDecisionCard({
  incident,
  action,
  currentActor,
}: {
  incident: IncidentRecord;
  action: IncidentActionRecord;
  currentActor: Actor;
}) {
  const decideAction = useGovernanceStore((s) => s.decideAction);
  const recorded = useGovernanceStore(
    (s) => s.decisions[incident.id]?.[action.rule_id],
  );

  const status = action.status as ActionStatus;
  const isEscalate = status === "escalate";
  const isNeedsApproval = status === "needs_approval";

  const canApproveAction =
    isNeedsApproval && hasCapability(currentActor.role, "approve_requires_approval_actions");
  const canEscalateAction = isEscalate && canEscalate(currentActor.role);

  const missingEvidence = (action.missing_evidence ?? []).join(", ") || "—";

  function decide(outcome: "approved" | "rejected" | "escalated", note?: string) {
    decideAction({
      incidentId: incident.id,
      ruleId: action.rule_id,
      outcome,
      note,
      pillId: incident.pill_applied,
      pillVersion: incident.pill_version,
    });
  }

  return (
    <article className="card-paper space-y-3 p-6" aria-label={`Decision: ${incident.id} ${action.rule_id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/incident/${incident.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-accent"
          >
            {incident.id} <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
          <p className="truncate text-[13px] text-ink-muted">{incident.asset_name}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-ink-muted">Rule</dt>
        <dd className="font-mono text-ink">{action.rule_id}</dd>
        <dt className="text-ink-muted">Decision</dt>
        <dd className="text-ink">{action.decision}</dd>
        <dt className="text-ink-muted">Class</dt>
        <dd>
          <ActionClassChip actionClass={action.action_class} />
        </dd>
        <dt className="text-ink-muted">Missing evidence</dt>
        <dd className="text-ink">{missingEvidence}</dd>
        {action.escalate_to ? (
          <>
            <dt className="text-ink-muted">Escalate to</dt>
            <dd className="text-ink">
              {roleLabel(action.escalate_to.role)}
              {action.escalate_to.fallback ? ` (fallback: ${roleLabel(action.escalate_to.fallback)})` : ""}
            </dd>
          </>
        ) : null}
      </div>

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
    </article>
  );
}
