"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRightCircle, ShieldAlert, Ban, AlertTriangle } from "lucide-react";
import { useGovernanceStore } from "@/lib/governance/store";
import {
  currentApproved,
  diffVersions,
  findVersion,
  pillAtVersion,
  type Actor,
  type PillVersion,
} from "@/lib/governance/versions";
import { canApprove } from "@/lib/governance/approval";
import { hasCapability, roleLabel } from "@/lib/governance/access";
import { compareVersions, runEvals } from "@/lib/engine";
import { SectionHeader, DiffView, KpiStat } from "@/components/mosaic";
import type { PillBundle } from "@/lib/pills/load";
import { changesToDiffItems } from "../registry/registry-utils";

export function PillApprovalCard({
  bundle,
  version,
  history,
  currentActor,
}: {
  bundle: PillBundle;
  version: PillVersion;
  history: PillVersion[];
  currentActor: Actor;
}) {
  const approveVersion = useGovernanceStore((s) => s.approveVersion);
  const promoteToShadow = useGovernanceStore((s) => s.promoteToShadow);

  const [overrideReason, setOverrideReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const cases = Object.values(bundle.pill.evals);
  const approved = currentApproved(history);
  const parent =
    (version.parentVersion ? findVersion(history, version.parentVersion) : approved) ?? version;
  const diff = diffVersions(parent, version);

  const candidatePill = pillAtVersion(bundle.pill, version);
  const approvedPill = approved ? pillAtVersion(bundle.pill, approved) : candidatePill;
  const comparison = compareVersions(approvedPill, candidatePill, cases);
  const candidateSummary = runEvals(candidatePill, cases);

  const evalReport = { regressions: comparison.regressions };
  const check = canApprove(version, evalReport, currentActor);
  const canPromote =
    version.status === "Draft" &&
    (hasCapability(currentActor.role, "promote_pill_version") ||
      currentActor.role === version.approverRole);

  const overrideReady =
    comparison.regressions.length > 0 &&
    currentActor.role === version.approverRole &&
    overrideReason.trim().length > 0;

  function onApprove() {
    const result = approveVersion(bundle.id, version.version, evalReport, undefined);
    setMessage(
      result.allowed
        ? `v${version.version} approved.`
        : `Blocked: ${result.blockers.join("; ")}`,
    );
  }

  function onOverride() {
    const result = approveVersion(bundle.id, version.version, evalReport, {
      reason: overrideReason,
    });
    setMessage(
      result.allowed
        ? `v${version.version} approved with override — ${overrideReason}`
        : `Override blocked: ${result.blockers.join("; ")}`,
    );
  }

  function onPromote() {
    promoteToShadow(bundle.id, version.version);
    setMessage(`v${version.version} promoted to Shadow.`);
  }

  return (
    <article className="space-y-4 rounded-xl border border-line bg-surface p-4" aria-label={`Approval: ${bundle.id} v${version.version}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            {bundle.domain}/{bundle.name}
          </h3>
          <p className="font-mono text-[11px] text-ink-muted">
            v{version.version} · {version.status} · authored by {version.createdBy.name}
          </p>
        </div>
        <span className="rounded-full border border-line bg-surface-raised px-2 py-0.5 text-[11px] text-ink-muted">
          {version.reason}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiStat label="Eval pass" value={`${candidateSummary.passed}/${candidateSummary.passed + candidateSummary.failed}`} />
        <KpiStat label="Regressions" value={comparison.regressions.length} />
        <KpiStat label="Improvements" value={comparison.improvements.length} />
        <KpiStat label="Rules changed" value={diff.changes.length} />
      </div>

      <SectionHeader title="Human-readable changes" description={`v${diff.from} → v${diff.to}`} />
      {diff.changes.length === 0 ? (
        <p className="text-xs text-ink-muted">No rule changes (metadata only).</p>
      ) : (
        <DiffView changes={changesToDiffItems(diff.changes)} />
      )}

      {comparison.regressions.length > 0 ? (
        <div className="rounded-lg border border-escalate/30 bg-escalate/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-escalate">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> Eval regressions
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] text-ink">
            {comparison.regressions.map((r) => (
              <li key={`${r.caseId}:${r.ruleId}:${r.field}`}>
                {r.caseId}/{r.ruleId} {r.field}: expected {r.expected ?? "none"}, now {r.newActual ?? "none"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SectionHeader title="Approval gate" />
      {check.allowed ? (
        <p className="flex items-center gap-1.5 text-xs text-recommend">
          <CheckCircle2 className="size-3.5" aria-hidden="true" /> Clear to approve.
        </p>
      ) : (
        <ul className="space-y-1">
          {check.blockers.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-escalate">
              <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={!check.allowed}
          title={check.allowed ? undefined : check.blockers.join(" | ")}
          className="inline-flex items-center gap-1.5 rounded-md bg-recommend px-3 py-1.5 text-xs font-medium text-recommend-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle2 className="size-3.5" aria-hidden="true" /> Approve
        </button>

        <button
          type="button"
          onClick={onPromote}
          disabled={!canPromote}
          title={
            canPromote
              ? undefined
              : version.status !== "Draft"
                ? "Only Draft versions can enter Shadow"
                : `Role ${roleLabel(currentActor.role)} cannot promote to Shadow`
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowRightCircle className="size-3.5" aria-hidden="true" /> Promote to Shadow
        </button>

        {/* The governance store is append-only and has no reject primitive; a
            proposed version is retired by leaving it in Draft or rolling back. */}
        <button
          type="button"
          disabled
          title="Governance store is append-only — reject by leaving the version in Draft or rolling back the approved version."
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted opacity-40"
        >
          <Ban className="size-3.5" aria-hidden="true" /> Reject
        </button>
      </div>

      {comparison.regressions.length > 0 ? (
        <div className="rounded-lg border border-approval/30 bg-approval/5 p-3">
          <label className="flex items-center gap-1.5 text-xs font-medium text-approval">
            <ShieldAlert className="size-3.5" aria-hidden="true" /> Override with reason
            <span className="text-ink-muted">(only {roleLabel(version.approverRole)})</span>
          </label>
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={2}
            placeholder="Explain why the regression(s) are accepted…"
            className="mt-1.5 w-full rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
          />
          <button
            type="button"
            onClick={onOverride}
            disabled={!overrideReady}
            title={
              overrideReady
                ? undefined
                : currentActor.role !== version.approverRole
                  ? `Only ${roleLabel(version.approverRole)} may override regressions`
                  : "Enter a reason to override"
            }
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-approval px-3 py-1.5 text-xs font-medium text-approval-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShieldAlert className="size-3.5" aria-hidden="true" /> Override &amp; Approve
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-md bg-surface-raised px-3 py-1.5 text-xs text-ink" role="status">
          {message}
        </p>
      ) : null}
    </article>
  );
}
