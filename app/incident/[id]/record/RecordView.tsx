'use client';

// Client body of the decision record: joins the server-scoped incident data
// with the governance store (approved versions, decisions, confirmations,
// audit) and renders the record for print, with a JSON download.

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import type { Pill } from '@/lib/engine';
import { useGovernanceStore } from '@/lib/governance/store';
import { currentApproved, pillAtVersion } from '@/lib/governance/versions';
import { roleLabel } from '@/lib/governance/access';
import { buildDecisionRecord, type RecordPillInput } from '@/lib/record/build';
import type { RecordScenario } from '@/lib/record/scenario.server';
import type { IncidentDecisionRecord } from '@/lib/record/types';
import { downloadFile } from '@/lib/export/download';
import { routes } from '@/lib/journey/routes';
import { PageHeader } from '@/components/mosaic/PageHeader';
import { useMounted } from '@/components/mosaic/useMounted';
import { RecordSections } from './RecordSections';

type Props = {
  scenario: RecordScenario;
  pills: { id: string; name: string; pill: Pill }[];
  role: string;
};

const EMPTY = {};

// Print only the record; the app shell stays on screen.
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .decision-record, .decision-record * { visibility: visible !important; }
  .decision-record { position: absolute; left: 0; top: 0; width: 100%; }
  .decision-record .no-print { display: none !important; }
  .decision-record section { break-inside: avoid-page; }
}`;

function useApprovedPills(pills: Props['pills']): RecordPillInput[] {
  const mounted = useMounted();
  const versions = useGovernanceStore((s) => s.versions);
  const seedPills = useGovernanceStore((s) => s.seedPills);
  useEffect(() => {
    seedPills(pills.map((p) => ({ id: p.id, pill: p.pill })));
  }, [pills, seedPills]);
  return useMemo(
    () =>
      pills.flatMap((p) => {
        const history = mounted ? versions[p.id] : undefined;
        // Before the store is readable, show the file version (what the store seeds).
        if (!history) return [{ pillId: p.id, pill: p.pill, version: p.pill.manifest.version }];
        const v = currentApproved(history);
        return v ? [{ pillId: p.id, pill: pillAtVersion(p.pill, v), version: v.version, approvedBy: v.approvedBy, approvedAt: v.approvedAt }] : [];
      }),
    [pills, mounted, versions],
  );
}

function jsonFilename(record: IncidentDecisionRecord): string {
  return `decision-record-${record.incident.id}-${record.generatedAt.slice(0, 16).replace(/:/g, '')}.json`;
}

export function RecordView({ scenario, pills, role }: Props) {
  const mounted = useMounted();
  const approved = useApprovedPills(pills);
  const decisions = useGovernanceStore((s) => s.decisions[scenario.incident.id]) ?? EMPTY;
  const confirmations = useGovernanceStore((s) => s.evidenceConfirmations[scenario.incident.id]) ?? EMPTY;
  const audit = useGovernanceStore((s) => s.audit);

  const record = useMemo(
    () =>
      buildDecisionRecord({
        ...scenario,
        pills: approved,
        decisions: mounted ? decisions : EMPTY,
        confirmations: mounted ? confirmations : EMPTY,
        audit: mounted ? audit : [],
        role,
        generatedAt: new Date().toISOString(),
      }),
    [scenario, approved, decisions, confirmations, audit, role, mounted],
  );

  const { incident } = record;
  return (
    <article className="decision-record mx-auto max-w-4xl space-y-8 pb-16">
      <style>{PRINT_CSS}</style>
      <PageHeader
        eyebrow={
          <>
            <span className="font-mono">{incident.id}</span>
            <span aria-hidden>·</span>
            <span>{incident.assetName}</span>
            <span aria-hidden>·</span>
            <span>Scoped for {roleLabel(role)}</span>
          </>
        }
        title="Decision record"
        subtitle="Which pill versions applied, what each gate decided and on what evidence, who decided, and what happened to the AI proposals."
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Link href={routes.incident(incident.id)} className="btn-pill min-h-11">
              <ArrowLeft aria-hidden className="size-4" /> Incident room
            </Link>
            <button
              type="button"
              className="btn-pill min-h-11"
              onClick={() => downloadFile(jsonFilename(record), `${JSON.stringify(record, null, 2)}\n`, 'application/json')}
            >
              <Download aria-hidden className="size-4" /> Download JSON
            </button>
            <button type="button" className="btn-pill btn-pill-primary min-h-11" onClick={() => window.print()}>
              <Printer aria-hidden className="size-4" /> Print or save as PDF
            </button>
          </div>
        }
      />
      <RecordSections record={record} />
      <footer className="border-t border-line pt-4 text-[13px] text-ink-muted">
        {record.notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </footer>
    </article>
  );
}
