"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Siren, Inbox } from "lucide-react";
import { useGovernanceStore } from "@/lib/governance/store";
import { SectionHeader, EmptyState, PageHeader } from "@/components/mosaic";
import { currentApproved, liveVersionOf, type PillVersion } from "@/lib/governance/versions";
import type { PillBundle } from "@/lib/pills/load";
import type { IncidentRecord, IncidentActionRecord } from "@/lib/data/schemas";
import { PillApprovalCard } from "./PillApprovalCard";
import { LiveNowCard } from "./LiveNowCard";
import { IncidentDecisionCard } from "./IncidentDecisionCard";
import { useCaptureView } from "@/components/incident/useCapture";
import { incidentOfCapture } from "@/lib/capture/note-flow";

function currentApprovedVersion(history: PillVersion[] | undefined): string | undefined {
  return history ? currentApproved(history)?.version : undefined;
}

export function ApprovalsQueue({
  bundles,
  incidents,
  replayEnd,
}: {
  bundles: PillBundle[];
  incidents: IncidentRecord[];
  /** Incidents with a recorded timeline (the room can replay them) → their number of events. */
  replayEnd: Record<string, number>;
}) {
  const [mounted, setMounted] = useState(false);
  // Versions approved on this screen: their cards leave the queue, so the next step shows here.
  const [justApproved, setJustApproved] = useState<{ pillId: string; version: string }[]>([]);
  const versions = useGovernanceStore((s) => s.versions);
  const currentActor = useGovernanceStore((s) => s.currentActor);
  const seedPills = useGovernanceStore((s) => s.seedPills);
  const captureView = useCaptureView();
  // The incident's applied pill ("domain/name") → its approved version live now.
  const liveAppliedVersion = (ref: string): string | undefined => {
    const bundle = bundles.find((b) => `${b.domain}/${b.name}` === ref);
    return bundle ? liveVersionOf(versions, bundle.id) : undefined;
  };
  // Where an approved change came from: its note's incident task, or the incident its correction closed.
  const originIncident = (v: PillVersion | undefined): string | undefined =>
    v?.capture ? incidentOfCapture(v.capture, captureView.notes, captureView.tasks) : v?.correction?.incidentId;

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
      <PageHeader
        title="Approvals"
        subtitle="Nothing executes without a named human."
      />

      {justApproved.map(({ pillId, version }) => {
        const bundle = bundles.find((b) => b.id === pillId);
        return bundle ? (
          <LiveNowCard
            key={`${pillId}@${version}`}
            bundle={bundle}
            version={version}
            stillLive={currentApprovedVersion(versions[pillId]) === version}
            incidents={incidents}
            replayEnd={replayEnd}
            originIncidentId={originIncident(versions[pillId]?.find((v) => v.version === version))}
            onDismiss={() => setJustApproved((prev) => prev.filter((p) => p.pillId !== pillId))}
          />
        ) : null;
      })}

      {/* (1) Pill version approvals */}
      <section className="space-y-3">
        <SectionHeader
          title="Pill versions awaiting approval"
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
                  onApproved={(pillId, v) =>
                    setJustApproved((prev) => [...prev.filter((p) => p.pillId !== pillId), { pillId, version: v }])
                  }
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
                rulePillId={bundles.find((b) => b.pill.rules.some((r) => r.id === action.rule_id))?.id}
                livePillVersion={liveAppliedVersion(incident.pill_applied)}
                currentActor={currentActor}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
