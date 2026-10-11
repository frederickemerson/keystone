"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Boxes } from "lucide-react";
import { useGovernanceStore, shadowKey, personaFor } from "@/lib/governance/store";
import { currentApproved, type PillVersion } from "@/lib/governance/versions";
import { shadowSummary } from "@/lib/governance/approval";
import { runEvals } from "@/lib/engine";
import { PillCard, SectionHeader, EmptyState, KpiStat } from "@/components/mosaic";
import type { PillCardData, PillStatus } from "@/components/mosaic/types";
import type { PillBundle } from "@/lib/pills/load";
import { PillDetailPanel } from "./PillDetailPanel";
import { assetRefsFor, nextReviewDate } from "./registry-utils";

const STATUSES: PillStatus[] = ["Draft", "Shadow", "Approved", "Retired"];

interface Prepared {
  bundle: PillBundle;
  card: PillCardData;
  history: PillVersion[];
}

export function RegistryExplorer({ bundles }: { bundles: PillBundle[] }) {
  const [mounted, setMounted] = useState(false);
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const versions = useGovernanceStore((s) => s.versions);
  const shadowRuns = useGovernanceStore((s) => s.shadowRuns);
  const seedPills = useGovernanceStore((s) => s.seedPills);

  useEffect(() => {
    seedPills(bundles.map((b) => ({ id: b.id, pill: b.pill })));
    setMounted(true);
  }, [bundles, seedPills]);

  const domains = useMemo(
    () => Array.from(new Set(bundles.map((b) => b.domain))).sort(),
    [bundles],
  );

  const prepared = useMemo<Prepared[]>(() => {
    return bundles.map((bundle) => {
      const history: PillVersion[] = versions[bundle.id] ?? [];
      const approved = currentApproved(history);
      const latest = history[history.length - 1];
      const focus = approved ?? latest;
      const version = focus?.version ?? bundle.pill.manifest.version;
      const status: PillStatus = (focus?.status ?? "Draft") as PillStatus;

      const evalPill = focus ? { ...bundle.pill, rules: focus.rules } : bundle.pill;
      const evalCases = Object.values(bundle.pill.evals);
      const summary = runEvals(evalPill, evalCases);
      const evalPass = { pass: summary.passed, total: summary.passed + summary.failed };

      const assets = focus ? assetRefsFor(focus) : [];
      const sk = approved
        ? shadowSummary(shadowRuns[shadowKey(bundle.id, approved.version)] ?? [])
        : { agreements: 0, total: 0, label: "No shadow runs" };

      const pendingCorrections = history.filter(
        (v) => v.status === "Draft" || v.status === "Shadow",
      ).length;

      const card: PillCardData = {
        name: bundle.name,
        domain: bundle.domain,
        version,
        status,
        owner: personaFor(bundle.pill.manifest.owner).name,
        steward: personaFor(bundle.pill.manifest.steward).name,
        approver: personaFor(bundle.pill.manifest.approver).name,
        assetsCovered: assets,
        evalPass,
        shadowAgreements: sk.agreements,
        pendingCorrections,
        nextReviewDate: nextReviewDate(approved?.approvedAt),
      };
      return { bundle, card, history };
    });
  }, [bundles, versions, shadowRuns]);

  const filtered = useMemo(
    () =>
      prepared.filter(
        (p) =>
          (domainFilter === "all" || p.bundle.domain === domainFilter) &&
          (statusFilter === "all" || p.card.status === statusFilter),
      ),
    [prepared, domainFilter, statusFilter],
  );

  const selected = prepared.find((p) => p.bundle.id === selectedId) ?? null;

  if (!mounted) {
    return <div className="text-xs text-ink-muted" aria-busy="true">Loading registry…</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1>pill registry</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Every Intelligence Pill, its lifecycle state and health at a glance.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Registry summary">
          <KpiStat label="Pills" value={prepared.length} />
          <KpiStat
            label="Approved"
            value={prepared.filter((p) => p.card.status === "Approved").length}
          />
          <KpiStat
            label="Awaiting review"
            value={prepared.reduce((n, p) => n + p.card.pendingCorrections, 0)}
          />
          <KpiStat
            label="Shadow runs"
            value={Object.values(shadowRuns).reduce((n, r) => n + r.length, 0)}
          />
        </section>

        <section className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Filter className="size-3.5" aria-hidden="true" />
            <span>Filter</span>
          </div>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            aria-label="Filter by domain"
            className="rounded-pill border border-line-strong bg-surface px-3.5 py-1.5 text-[13px] text-ink"
          >
            <option value="all">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="rounded-pill border border-line-strong bg-surface px-3.5 py-1.5 text-[13px] text-ink"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </section>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No pills match these filters"
            description="Try clearing the domain or status filter."
          />
        ) : (
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
            {filtered.map((p) => (
              <li key={p.bundle.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.bundle.id)}
                  className="block w-full rounded-card text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-marker-ink"
                  aria-pressed={selectedId === p.bundle.id}
                >
                  <PillCard data={p.card} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? (
        <PillDetailPanel
          bundle={selected.bundle}
          history={selected.history}
          onClose={() => setSelectedId(null)}
        />
      ) : (
        <div className="hidden w-[28rem] shrink-0 lg:block">
          <SectionHeader title="Pill detail" description="Select a pill to see its version history and portability options." />
        </div>
      )}
    </div>
  );
}
