"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Siren, Inbox } from "lucide-react";
import { useGovernanceStore } from "@/lib/governance/store";
import { roleLabel } from "@/lib/governance/access";
import { SectionHeader, EmptyState } from "@/components/mosaic";
import type { PillVersion } from "@/lib/governance/versions";
import type { PillBundle } from "@/lib/pills/load";
import type { IncidentRecord, IncidentActionRecord } from "@/lib/data/schemas";
import { PillApprovalCard } from "./PillApprovalCard";
import { IncidentDecisionCard } from "./IncidentDecisionCard";

export function ApprovalsQueue({
  bundles,
  incidents,
}: {
  bundles: PillBundle[];
  incidents: IncidentRecord[];
}) {
  const [mounted, setMounted] = useState(false);
  const versions = useGovernanceStore((s) => s.versions);
  const currentActor = useGovernanceStore((s) => s.currentActor);
  const seedPills = useGovernanceStore((s) => s.seedPills);

  useEffect(() => {
    seedPills(bundles.map((b) => ({ id: b.id, pill: b.pill })));
    setMounted(true);
  }, [bundles, seedPills]);

  // (1) Pill versions in Draft / Shadow awaiting a human decision.
  const candidates = useMemo(() => {
    const out: { bundle: PillBundle; versionKey: string; history: PillVersion[] }[] = [];
    for (const bundle of bundles) {
      const history = versions[bundle.id] ?? [];
      for (const v of history) {
        if (v.status === "Draft" || v.status === "Shadow") {
          out.push({ bundle, versionKey: v.version, history });
        }
      }
    }
    return out;
  }, [bundles, versions]);

  // (2) Incident action decisions pending (needs_approval / escalate).
  const pendingDecisions = useMemo(() => {
    const out: { incident: IncidentRecord; action: IncidentActionRecord }[] = [];
    for (const incident of incidents) {
      for (const action of incident.actions ?? []) {
        if (action.status === "needs_approval" || action.status === "escalate") {
          out.push({ incident, action });
        }
      }
    }
    return out;
  }, [incidents]);

  if (!mounted) {
    return <div className="text-xs text-ink-muted" aria-busy="true">Loading approvals…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>approvals</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every decision that must be approved or escalated by a named human — nothing executes
            without one.
          </p>
        </div>
      </header>

      {/* (1) Pill version approvals */}
      <section className="space-y-3">
        <SectionHeader
          title="Pill versions awaiting approval"
          description="Draft/Shadow versions with their human-readable diff, eval report and the approval gate."
          icon={<Layers className="size-4" aria-hidden="true" />}
        />
        {candidates.length === 0 ? (
          <EmptyState title="No pill versions awaiting approval" description="All proposed versions have been resolved." />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {candidates.map(({ bundle, versionKey, history }) => {
              const version = history.find((v) => v.version === versionKey)!;
              return (
                <PillApprovalCard
                  key={`${bundle.id}@${versionKey}`}
                  bundle={bundle}
                  version={version}
                  history={history}
                  currentActor={currentActor}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* (2) Incident action decisions */}
      <section className="space-y-3">
        <SectionHeader
          title="Incident action decisions pending"
          description="Actions requiring a human sign-off or escalation, linked to their incident room."
          icon={<Siren className="size-4" aria-hidden="true" />}
        />
        {pendingDecisions.length === 0 ? (
          <EmptyState icon={Inbox} title="No incident decisions pending" description="No actions are currently awaiting approval or escalation." />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {pendingDecisions.map(({ incident, action }) => (
              <IncidentDecisionCard
                key={`${incident.id}:${action.rule_id}`}
                incident={incident}
                action={action}
                currentActor={currentActor}
              />
            ))}
          </div>
        )}
      </section>

      <p className="text-[13px] text-ink-muted">
        Acting as {currentActor.name} ({roleLabel(currentActor.role)}). Buttons
        explain why they are disabled when your role lacks authority.
      </p>
    </div>
  );
}
