import { CheckCircle2, Ban, Clock, Siren, MinusCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ActionStatus } from '@/lib/engine/types';

const MAP: Record<ActionStatus, { label: string; icon: LucideIcon; tone: string }> = {
  allowed: {
    label: 'Allowed',
    icon: CheckCircle2,
    tone: 'border-recommend/30 bg-recommend/10 text-recommend',
  },
  blocked: {
    label: 'Blocked',
    icon: Ban,
    tone: 'border-escalate/40 bg-escalate/15 text-escalate',
  },
  needs_approval: {
    label: 'Needs approval',
    icon: Clock,
    tone: 'border-approval/30 bg-approval/10 text-approval',
  },
  escalate: {
    label: 'Escalate',
    icon: Siren,
    tone: 'border-escalate/30 bg-escalate/10 text-escalate',
  },
  not_applicable: {
    label: 'Not applicable',
    icon: MinusCircle,
    tone: 'border-line bg-surface-raised text-ink-muted',
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ActionStatus;
  className?: string;
}) {
  const { label, icon: Icon, tone } = MAP[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tone,
        className,
      )}
      role="status"
      aria-label={`Status: ${label}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
