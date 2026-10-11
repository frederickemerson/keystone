import { CheckCircle2, ShieldAlert, Siren, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ActionClass } from '@/lib/engine/types';

const MAP: Record<ActionClass, { label: string; icon: LucideIcon; tone: string }> = {
  recommend: {
    label: 'Recommend',
    icon: CheckCircle2,
    tone: 'border-recommend/30 bg-recommend/10 text-recommend',
  },
  requires_approval: {
    label: 'Requires approval',
    icon: ShieldAlert,
    tone: 'border-approval/30 bg-approval/10 text-approval',
  },
  must_escalate: {
    label: 'Must escalate',
    icon: Siren,
    tone: 'border-escalate/30 bg-escalate/10 text-escalate',
  },
};

export function ActionClassChip({
  actionClass,
  className,
}: {
  actionClass: ActionClass;
  className?: string;
}) {
  const { label, icon: Icon, tone } = MAP[actionClass];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tone,
        className,
      )}
      role="status"
      aria-label={`Action class: ${label}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
