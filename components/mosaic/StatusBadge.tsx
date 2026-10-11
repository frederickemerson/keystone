import { CheckCircle2, Ban, Clock, Siren, MinusCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ActionStatus } from '@/lib/engine/types';
import { CHIP_BASE, TONE_CHIP, type Tone } from './tones';

const MAP: Record<ActionStatus, { label: string; icon: LucideIcon; tone: Tone }> = {
  allowed: { label: 'Allowed', icon: CheckCircle2, tone: 'recommend' },
  blocked: { label: 'Blocked', icon: Ban, tone: 'blocked' },
  needs_approval: { label: 'Needs approval', icon: Clock, tone: 'approval' },
  escalate: { label: 'Escalate', icon: Siren, tone: 'escalate' },
  not_applicable: { label: 'Not applicable', icon: MinusCircle, tone: 'neutral' },
};

export function StatusBadge({
  status,
  size = 'md',
  className,
}: {
  status: ActionStatus;
  /** `lg` for the gate verdict on an action card. */
  size?: 'md' | 'lg';
  className?: string;
}) {
  const { label, icon: Icon, tone } = MAP[status];
  return (
    <span
      className={cn(
        CHIP_BASE,
        TONE_CHIP[tone],
        status === 'blocked' && 'font-semibold',
        size === 'lg' && 'gap-2 px-3 py-1.5 text-[13px]',
        className,
      )}
      role="status"
      aria-label={`Status: ${label}`}
    >
      <Icon className={size === 'lg' ? 'size-4' : 'size-3.5'} strokeWidth={2.25} aria-hidden="true" />
      {label}
    </span>
  );
}
