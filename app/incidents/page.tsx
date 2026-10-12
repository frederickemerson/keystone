// Incidents — server component. Every incident, scoped to the signed-in role
// before it is rendered, with the pills it applied and links to its room and
// decision record.

import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { CHIP_BASE, PageHeader, TONE_CHIP, pillDisplayName, type Tone } from '@/components/mosaic';
import { humanizeKey } from '@/components/incident/labels';
import { pillsAppliedTo } from '@/components/registry/hub-utils';
import { listTimelineIds, loadIncidents } from '@/lib/data';
import type { IncidentRecord } from '@/lib/data/schemas';
import { loadAllPills } from '@/lib/pills/load';
import { sessionRole } from '@/lib/auth/session';
import { scopeIncidents } from '@/lib/governance/scope';
import { routes } from '@/lib/journey/routes';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<IncidentRecord['status'], Tone> = {
  active: 'escalate',
  monitoring: 'approval',
  closed: 'neutral',
};
const STATUS_ORDER: IncidentRecord['status'][] = ['active', 'monitoring', 'closed'];

const SGT_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Singapore',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function IncidentsPage() {
  const incidents = scopeIncidents(loadIncidents(), await sessionRole()).sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.opened_at.localeCompare(a.opened_at),
  );
  // The room replays a recorded timeline; incidents closed before replays were kept have none.
  const withReplay = new Set(listTimelineIds());
  const bundles = loadAllPills();
  const pills = bundles.map((b) => ({ id: b.id, ruleIds: b.pill.rules.map((r) => r.id) }));
  const nameOf = (id: string) => {
    const b = bundles.find((x) => x.id === id);
    return b ? pillDisplayName(b.name) : id;
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        title="Incidents"
        subtitle="Every incident Keystone has applied pills to. Open one to replay its evidence and see which rules held."
      />
      <ul className="space-y-3">
        {incidents.map((incident) => (
          <li key={incident.id} className="card-paper flex flex-wrap items-start gap-x-6 gap-y-3 p-5">
            <div className="min-w-0 flex-1 basis-72 space-y-1">
              <p className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-mono font-medium text-ink">{incident.id}</span>
                <span className={`${CHIP_BASE} ${TONE_CHIP[STATUS_TONE[incident.status]]}`}>
                  {humanizeKey(incident.status)}
                </span>
                <span className="text-ink-muted">Opened {SGT_DATE.format(new Date(incident.opened_at))}</span>
              </p>
              <h2 className="text-[17px] font-semibold leading-snug text-heading">{humanizeKey(incident.subtype)}</h2>
              <p className="text-[13px] text-ink-muted">
                {incident.asset_name} · {incident.location}
              </p>
            </div>
            <div className="min-w-0 basis-64 space-y-1.5">
              <p className="text-[12px] text-ink-muted">Pills applied</p>
              <ul className="flex flex-wrap gap-1.5">
                {pillsAppliedTo(incident, pills).map((p) => (
                  <li key={p.pillId}>
                    <Link href={routes.pill(p.pillId)} className={`${CHIP_BASE} ${TONE_CHIP.neutral} hover:underline`}>
                      {nameOf(p.pillId)}
                      {p.version ? <span className="font-normal">· v{p.version} at open</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {withReplay.has(incident.id) ? (
              <div className="flex flex-wrap gap-2 self-center">
                <Link href={routes.incidentRecord(incident.id)} className="btn-pill text-xs">
                  <FileText className="size-3.5" aria-hidden="true" /> Decision record
                </Link>
                <Link href={routes.incident(incident.id)} className="btn-pill btn-pill-primary text-xs">
                  Open room <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <p className="max-w-56 self-center text-[12px] text-ink-muted">
                No evidence replay was recorded for this incident.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
