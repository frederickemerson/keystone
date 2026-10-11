import { User, ShieldCheck, BadgeCheck } from 'lucide-react';
import type { PillBundle } from '@/lib/pills/load';

function prettyRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const STATUS_TONE: Record<string, string> = {
  draft: 'border-line bg-surface-raised text-ink-muted',
  shadow: 'border-approval/30 bg-approval/10 text-approval',
  approved: 'border-recommend/30 bg-recommend/10 text-recommend',
  retired: 'border-line bg-surface-raised text-ink-muted line-through',
};

export function CanvasHeader({ pill }: { pill: PillBundle }) {
  const m = pill.pill.manifest;
  const status = m.status.toLowerCase();
  return (
    <header className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">{pill.domain}</p>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{m.name}</h1>
          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">v{m.version}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            STATUS_TONE[status] ?? STATUS_TONE.draft
          }`}
          role="status"
          aria-label={`Status: ${m.status}`}
        >
          {m.status}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RaciItem icon={<User className="size-3.5" aria-hidden="true" />} label="Owner" value={prettyRole(m.owner)} />
        <RaciItem icon={<ShieldCheck className="size-3.5" aria-hidden="true" />} label="Steward" value={prettyRole(m.steward)} />
        <RaciItem icon={<BadgeCheck className="size-3.5" aria-hidden="true" />} label="Approver" value={prettyRole(m.approver)} />
      </dl>
    </header>
  );
}

function RaciItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-raised/50 p-2.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-muted">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
