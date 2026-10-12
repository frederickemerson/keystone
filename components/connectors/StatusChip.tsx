import type { ConnectorStatus } from '@/lib/connectors/contract';
import { STATUS_LEGEND } from '@/lib/connectors/registry';
import { cn } from '@/lib/ui/cn';
import { CHIP_BASE, TONE_CHIP, type Tone } from '@/components/mosaic/tones';

const TONE: Record<ConnectorStatus, Tone> = {
  live: 'recommend',
  simulated: 'approval',
  adapter_not_configured: 'neutral',
  planned: 'neutral',
};

export function StatusChip({ status, className }: { status: ConnectorStatus; className?: string }) {
  return (
    <span className={cn(CHIP_BASE, TONE_CHIP[TONE[status]], status === 'planned' && 'border-dashed', className)}>
      {STATUS_LEGEND[status].label}
    </span>
  );
}
