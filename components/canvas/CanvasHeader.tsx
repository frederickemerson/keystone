'use client';

import type { ReactNode } from 'react';
import { User, ShieldCheck, BadgeCheck } from 'lucide-react';
import type { PillBundle } from '@/lib/pills/load';
import type { PillStatus } from '@/lib/engine';
import { PersonaName } from '@/components/mosaic';
import { useLivePill } from './useLivePill';

const STATUS_TONE: Record<PillStatus, string> = {
  draft: 'border-line bg-surface-raised text-ink-muted',
  shadow: 'border-approval/30 bg-approval/10 text-approval',
  approved: 'border-recommend/30 bg-recommend/10 text-recommend',
  retired: 'border-line bg-surface-raised text-ink-muted line-through',
};

export function CanvasHeader({ pill, title }: { pill: PillBundle; title: string }) {
  const m = pill.pill.manifest;
  // Live version + status from the governance store (approvals / rollbacks),
  // not the version frozen in the pill files.
  const live = useLivePill(pill);
  return (
    <header className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">{pill.domain}</p>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
            {pill.name} · live v{live.version}
            {live.pending.map((p) => (
              <span key={p.version}>
                {' '}
                · v{p.version} {p.status}
              </span>
            ))}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[live.status]}`}
          role="status"
          aria-label={`Live version v${live.version}, status: ${live.status}`}
        >
          v{live.version} {live.status}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RaciItem icon={<User className="size-3.5" aria-hidden="true" />} label="Owner" role={m.owner} />
        <RaciItem icon={<ShieldCheck className="size-3.5" aria-hidden="true" />} label="Steward" role={m.steward} />
        <RaciItem icon={<BadgeCheck className="size-3.5" aria-hidden="true" />} label="Approver" role={m.approver} />
      </dl>
    </header>
  );
}

function RaciItem({ icon, label, role }: { icon: ReactNode; label: string; role: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-raised/50 p-2.5">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-ink">
        <PersonaName role={role} />
      </dd>
    </div>
  );
}
