"use client";

import { Download, PackageCheck, History, ShieldAlert } from "lucide-react";
import { useGovernanceStore, shadowKey, personaFor } from "@/lib/governance/store";
import { currentApproved } from "@/lib/governance/versions";
import { shadowSummary } from "@/lib/governance/approval";
import { SectionHeader, EmptyState } from "@/components/mosaic";
import type { PillBundle } from "@/lib/pills/load";
import type { PillVersion, VersionStatus } from "@/lib/governance/versions";
import { roleLabel } from "@/lib/governance/access";
import { assetRefsFor, maxSensitivity, skillFrontmatter } from "./registry-utils";

function plainList(items: readonly string[] | undefined): string {
  return items && items.length > 0 ? items.join(", ") : "—";
}

function roleList(roles: readonly string[] | undefined): string {
  return plainList(roles?.map(roleLabel));
}

const VERSION_TONE: Record<VersionStatus, string> = {
  Draft: "border-na/35 bg-na-tint text-na",
  Shadow: "border-approval/40 bg-approval-tint text-approval",
  Approved: "border-recommend/40 bg-recommend-tint text-recommend",
  Retired: "border-na/35 bg-na-tint text-na line-through",
};

function VersionBadge({ status }: { status: VersionStatus }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${VERSION_TONE[status]}`}>
      {status}
    </span>
  );
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function PillDetailPanel({
  bundle,
  history,
  onClose,
}: {
  bundle: PillBundle;
  history: PillVersion[];
  onClose: () => void;
}) {
  const shadowRuns = useGovernanceStore((s) => s.shadowRuns);

  const approved = currentApproved(history);
  const focus = approved ?? history[history.length - 1];
  const sk =
    approved && shadowRuns[shadowKey(bundle.id, approved.version)]
      ? shadowSummary(shadowRuns[shadowKey(bundle.id, approved.version)])
      : { agreements: 0, total: 0, label: "No shadow runs yet" };

  const manifest = bundle.pill.manifest;
  const sensitivity = focus ? maxSensitivity(focus) : "internal";

  function handleExport() {
    const payload = {
      "SKILL.md": `${skillFrontmatter(manifest)}\n\n${bundle.skillBody}`,
      "rules.yaml": bundle.pill.rules,
      "provenance.json": bundle.pill.provenance,
      evals: bundle.pill.evals,
      CHANGELOG: bundle.changelog,
    };
    triggerDownload(`${bundle.id}.pill.json`, JSON.stringify(payload, null, 2));
  }

  const installName = bundle.name;
  const installPath = bundle.path;

  return (
    <aside
      aria-label={`Pill detail: ${bundle.domain}/${bundle.name}`}
      className="card-paper flex h-full w-full flex-col gap-5 overflow-y-auto p-6 lg:w-[28rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-ink-muted">{bundle.domain}</p>
          <h2 className="truncate text-lg font-semibold text-ink">{bundle.name}</h2>
          <p className="font-mono text-xs tabular-nums text-ink-muted">v{focus?.version ?? manifest.version}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-pill text-xs"
          aria-label="Close detail panel"
        >
          Close
        </button>
      </div>

      {/* Sensitivity / access scope */}
      <section className="space-y-2">
        <SectionHeader title="Sensitivity & access" />
        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-ink-muted">Highest sensitivity</dt>
          <dd className="flex items-center gap-1 text-ink">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            {sensitivity}
          </dd>
          <dt className="text-ink-muted">Default sensitivity</dt>
          <dd className="text-ink">{manifest.access.sensitivity_default ?? "—"}</dd>
          <dt className="text-ink-muted">Roles allowed</dt>
          <dd className="text-ink">{roleList(manifest.access.roles_allowed)}</dd>
          <dt className="text-ink-muted">Read-only</dt>
          <dd className="text-ink">{roleList(manifest.access.roles_read_only)}</dd>
          <dt className="text-ink-muted">Denied</dt>
          <dd className="text-ink">{roleList(manifest.access.denied)}</dd>
          <dt className="text-ink-muted">Asset types</dt>
          <dd className="text-ink">{plainList(manifest.scope.asset_types)}</dd>
          <dt className="text-ink-muted">Assets covered</dt>
          <dd className="font-mono text-[11px] text-ink [overflow-wrap:anywhere]">
            {focus ? plainList(assetRefsFor(focus)) : "—"}
          </dd>
          <dt className="text-ink-muted">Incident types</dt>
          <dd className="text-ink">{plainList(manifest.scope.incident_types)}</dd>
          <dt className="text-ink-muted">Systems</dt>
          <dd className="text-ink">{plainList(manifest.scope.systems)}</dd>
          <dt className="text-ink-muted">Geography</dt>
          <dd className="text-ink">{manifest.scope.geographic_scope ?? "—"}</dd>
          <dt className="text-ink-muted">Standards</dt>
          <dd className="text-ink">{plainList(manifest.scope.standards)}</dd>
          <dt className="text-ink-muted">RACI</dt>
          <dd className="text-ink">
            {personaFor(manifest.owner).name} / {personaFor(manifest.steward).name} /{" "}
            {personaFor(manifest.approver).name}
          </dd>
          <dt className="text-ink-muted">Shadow</dt>
          <dd className="text-ink">{sk.label}</dd>
        </dl>
      </section>

      {/* Version history timeline */}
      <section className="space-y-3">
        <SectionHeader title="Version history" icon={<History className="size-4" aria-hidden="true" />} />
        {history.length === 0 ? (
          <EmptyState title="No versions" description="This pill has not been seeded yet." />
        ) : (
          <ol className="relative space-y-3 border-l border-line pl-4">
            {[...history]
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
              .map((v) => (
                <li key={v.version} className="relative">
                  <span className="absolute -left-[1.30rem] top-1 size-2 rounded-full bg-accent" aria-hidden="true" />
                  <div className="rounded-lg border border-line bg-dew-drop/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold tabular-nums text-ink">v{v.version}</span>
                      <VersionBadge status={v.status} />
                    </div>
                    <p className="mt-1 text-xs text-ink">{v.reason}</p>
                    <p className="mt-1.5 text-[11px] text-ink-muted">
                      Created by {v.createdBy.name} ({v.createdBy.role}) ·{" "}
                      {new Date(v.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {v.approvedBy ? (
                      <p className="text-[11px] text-recommend">
                        Approved by {v.approvedBy.name} ({v.approvedBy.role})
                      </p>
                    ) : null}
                    {v.rollbackOf ? (
                      <p className="text-[11px] text-approval">Rolled back to v{v.rollbackOf}</p>
                    ) : null}
                  </div>
                </li>
              ))}
          </ol>
        )}
      </section>

      {/* Portability: export + install */}
      <section className="space-y-2">
        <SectionHeader title="Portability" icon={<PackageCheck className="size-4" aria-hidden="true" />} />
        <button
          type="button"
          onClick={handleExport}
          className="btn-pill"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Export pill (.json bundle)
        </button>
        <p className="text-[11px] text-ink-muted">
          Downloads a portable JSON bundle of SKILL.md, rules, provenance, evals and CHANGELOG.
        </p>
        <div className="rounded-lg border border-line bg-dew-drop/50 p-3">
          <p className="text-xs font-medium text-ink">Install as a CodeBuddy skill</p>
          <pre className="mt-1.5 overflow-x-auto rounded bg-canvas p-2 font-mono text-[11px] text-ink">
            {`mkdir -p .codebuddy/skills/${installName}\ncp -r ${installPath}/* .codebuddy/skills/${installName}/`}
          </pre>
        </div>
      </section>
    </aside>
  );
}
