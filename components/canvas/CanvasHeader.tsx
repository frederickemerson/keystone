'use client';

import type { PillBundle } from '@/lib/pills/load';
import type { PillStatus } from '@/lib/engine';
import { CHIP_BASE, PageHeader, PersonaName, PillLabel, TONE_CHIP, type Tone } from '@/components/mosaic';
import { DEMO_PERSONAS, roleLabel } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';
import { useLivePill } from './useLivePill';

const STATUS_TONE: Record<PillStatus, Tone> = {
  draft: 'neutral',
  shadow: 'approval',
  approved: 'recommend',
  retired: 'neutral',
};

const STATUS_LABEL: Record<PillStatus, string> = {
  draft: 'Draft',
  shadow: 'Shadow',
  approved: 'Approved',
  retired: 'Retired',
};

/** "Technical Services" from the "technical-services" domain slug. */
function domainLabel(domain: string): string {
  return domain
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function personOrRole(role: string): string {
  return DEMO_PERSONAS[role] ?? roleLabel(role);
}

export function CanvasHeader({
  pill,
  title,
  description,
}: {
  pill: PillBundle;
  title: string;
  description?: string;
}) {
  const m = pill.pill.manifest;
  // Live version + status from the governance store (approvals / rollbacks),
  // not the version frozen in the pill files.
  const live = useLivePill(pill);
  return (
    <PageHeader
      eyebrow={
        <>
          <span>Decision canvas</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[12px]">
            {pill.domain}/{pill.name}
          </span>
        </>
      }
      title="Review rule candidates"
      subtitle={description}
      meta={
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
          <span>Steward</span>
          <span className="text-ink">
            <PersonaName role={m.steward} />
          </span>
          {live.pending.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Pending:{' '}
                {live.pending.map((p, i) => (
                  <span key={p.version} className="font-mono text-[12px] text-ink">
                    {i > 0 ? ', ' : ''}v{p.version} {p.status}
                  </span>
                ))}
              </span>
            </>
          ) : null}
        </p>
      }
      actions={
        <PillLabel
          name={title}
          pillClass={domainLabel(pill.domain)}
          version={live.version}
          owner={personOrRole(m.owner)}
          approver={personOrRole(m.approver)}
          status={
            <span
              className={cn(CHIP_BASE, TONE_CHIP[STATUS_TONE[live.status]], live.status === 'retired' && 'line-through')}
              role="status"
              aria-label={`Live version v${live.version}, status: ${live.status}`}
            >
              {STATUS_LABEL[live.status]}
            </span>
          }
          className="w-[24rem] max-w-full"
        />
      }
    />
  );
}
