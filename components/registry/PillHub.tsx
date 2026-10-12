'use client';

// The pill hub (/registry/[pillId]): who owns the pill, which version is live
// (from the governance store, not the files), every rule with its anchor and
// source, where it was applied, and the way out to canvas, learning and export.

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, ChevronRight, LayoutGrid } from 'lucide-react';
import { CHIP_BASE, PageHeader, SectionHeader, TONE_CHIP, pillDisplayName } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { Term } from '@/components/journey/Term';
import { personaFor, roleLabel } from '@/lib/governance/access';
import { useGovernanceStore } from '@/lib/governance/store';
import { compareSemver, currentApproved, pillAtVersion, type PillVersion } from '@/lib/governance/versions';
import { routes } from '@/lib/journey/routes';
import type { IncidentRecord } from '@/lib/data/schemas';
import type { PillBundle } from '@/lib/pills/load';
import { humanizeKey } from '@/components/incident/labels';
import { HubRuleList } from './HubRuleList';
import { PillDetailPanel } from './PillDetailPanel';
import { incidentsUsingPill, ruleApplications, rulesView, type ReplayScenario } from './hub-utils';

const EMPTY_HISTORY: PillVersion[] = [];

function Person({ role, label }: { role: string; label: string }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="text-[14px] text-ink">
        {personaFor(role).name} <span className="text-ink-muted">· {roleLabel(role)}</span>
      </dd>
    </div>
  );
}

export function PillHub({
  bundle,
  incidents,
  scenarios,
}: {
  bundle: PillBundle;
  /** Every incident, scoped to the viewer's role on the server. */
  incidents: IncidentRecord[];
  /** Incidents with a recorded timeline, scoped on the server, for the engine replay. */
  scenarios: ReplayScenario[];
}) {
  const mounted = useMounted();
  const router = useRouter();
  const seedPills = useGovernanceStore((s) => s.seedPills);
  const stored = useGovernanceStore((s) => s.versions[bundle.id]);

  useEffect(() => {
    seedPills([{ id: bundle.id, pill: bundle.pill }]);
  }, [bundle, seedPills]);

  // Before mount, the file pill (what the store seeds), so server and first client render match.
  const history = (mounted ? stored : undefined) ?? EMPTY_HISTORY;
  const live = currentApproved(history);
  const governed = useMemo(() => (live ? pillAtVersion(bundle.pill, live) : bundle.pill), [bundle.pill, live]);
  const liveVersion = live?.version ?? bundle.pill.manifest.version;
  const inReview = history
    .filter((v) => v.status === 'Draft' || v.status === 'Shadow')
    .sort((a, b) => compareSemver(a.version, b.version));

  const captures = useMemo(() => history.flatMap((v) => (v.capture ? [v.capture] : [])), [history]);
  const rows = useMemo(() => rulesView(governed, governed.rules, captures), [governed, captures]);
  const applications = useMemo(() => ruleApplications(governed, scenarios), [governed, scenarios]);
  const uses = useMemo(
    () => incidentsUsingPill(bundle.id, incidents, applications),
    [bundle.id, incidents, applications],
  );

  // A #rule-… link lands before the rules render from the store; re-apply it once they have.
  useEffect(() => {
    if (!mounted || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [mounted]);

  const m = bundle.pill.manifest;
  const name = pillDisplayName(bundle.name);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <PageHeader
          eyebrow={
            <nav aria-label="Breadcrumb" className="flex items-center gap-1">
              <Link href={routes.registry()} className="hover:text-ink hover:underline">
                Pills
              </Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span className="text-ink">{name}</span>
            </nav>
          }
          title={name}
          subtitle={
            <p>
              An <Term k="pill">Intelligence Pill</Term> for {humanizeKey(bundle.domain.replace(/-/g, '_'))}.{' '}
              <span className="font-medium text-ink">v{liveVersion}</span> is live
              {live?.approvedBy ? `, approved by ${live.approvedBy.name}` : ''} · {governed.rules.length} rules.
            </p>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href={routes.canvas(bundle.id)} className="btn-pill text-xs">
                <LayoutGrid className="size-3.5" aria-hidden="true" /> Review in canvas
              </Link>
              <Link href={routes.learning(bundle.id)} className="btn-pill text-xs">
                <BookOpen className="size-3.5" aria-hidden="true" /> Learning and approval
              </Link>
            </div>
          }
        />

        <section className="space-y-3" aria-labelledby="hub-overview">
          <h2 id="hub-overview" className="sr-only">
            Overview
          </h2>
          <dl className="card-paper grid gap-4 p-5 sm:grid-cols-3">
            <Person role={m.owner} label="Owner" />
            <Person role={m.steward} label="Steward (keeps it healthy)" />
            <Person role={m.approver} label="Approver (signs off versions)" />
          </dl>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-ink-muted">
              <Term k="version">Versions</Term>:
            </span>
            <span className={`${CHIP_BASE} ${TONE_CHIP.recommend}`}>v{liveVersion} · live</span>
            {inReview.map((v) => (
              <Link
                key={v.version}
                href={routes.approvals()}
                className={`${CHIP_BASE} ${TONE_CHIP.approval} hover:underline`}
              >
                v{v.version} · {v.status === 'Shadow' ? 'trial run' : 'draft'}
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Where it was applied"
            description="Incidents that recorded this pill when they opened, or whose replay triggers its rules."
            actions={
              <Link href={routes.incidents()} className="text-[13px] font-medium text-ink hover:underline">
                All incidents
              </Link>
            }
          />
          {uses.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No recorded incident has used this pill yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {uses.map((u) => (
                <li key={u.incident.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
                  <Link href={routes.incident(u.incident.id)} className="font-mono font-medium text-ink hover:underline">
                    {u.incident.id}
                  </Link>
                  <span className="text-ink">{humanizeKey(u.incident.subtype)}</span>
                  <span className="text-ink-muted">· {u.incident.asset_name}</span>
                  <span className="text-ink-muted">· {humanizeKey(u.incident.status)}</span>
                  <span className="ml-auto text-[12px] text-ink-muted">
                    {u.recordedVersion ? `Opened under v${u.recordedVersion}` : 'Applied alongside another pill'}
                    {u.triggeredRules.length > 0 ? ` · ${u.triggeredRules.length} rules triggered` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="What it decides"
            description={`The ${governed.rules.length} rules of v${liveVersion}, each with the words it came from.`}
          />
          <HubRuleList pillId={bundle.id} rows={rows} applications={applications} />
        </section>
      </div>

      <PillDetailPanel bundle={bundle} history={history} onClose={() => router.push(routes.registry())} />
    </div>
  );
}
