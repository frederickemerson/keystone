import { CheckCircle2, ShieldAlert, Siren, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ActionClass } from '@/lib/engine/types';
import { CHIP_BASE, TONE_CHIP, type Tone } from './tones';

const MAP: Record<ActionClass, { label: string; icon: LucideIcon; tone: Tone }> = {
  recommend: { label: 'Recommend', icon: CheckCircle2, tone: 'recommend' },
  requires_approval: { label: 'Requires approval', icon: ShieldAlert, tone: 'approval' },
  must_escalate: { label: 'Must escalate', icon: Siren, tone: 'escalate' },
};

/**
 * The rule's authored action class. Rendered outlined (paper fill) so it reads
 * as a property of the rule, distinct from the filled-tint live StatusBadge.
 */
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
      className={cn(CHIP_BASE, TONE_CHIP[tone], 'bg-surface', className)}
      role="status"
      aria-label={`Action class: ${label}`}
    >
      <Icon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
      {label}
    </span>
  );
}
