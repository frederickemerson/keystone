import { cn } from '@/lib/ui/cn';

export function TranscriptLine({
  speaker,
  timestamp,
  text,
  probeId,
  extractedRuleIds,
  active = false,
  className,
}: {
  speaker: string;
  timestamp: string;
  text: string;
  probeId?: string | null;
  extractedRuleIds?: string[];
  /** Live-caption highlight state. */
  active?: boolean;
  className?: string;
}) {
  const rules = extractedRuleIds ?? [];
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        active ? 'border-accent bg-accent/5 ring-1 ring-accent/30' : 'border-line bg-surface',
        className,
      )}
      aria-current={active ? 'true' : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-ink">{speaker}</span>
        <span className="tabular-nums text-ink-muted">{timestamp}</span>
        {probeId ? (
          <span className="rounded bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
            probe {probeId}
          </span>
        ) : null}
        {active ? (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            live
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-sm leading-relaxed text-ink">{text}</p>

      {rules.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1" aria-label="Extracted rule candidates">
          {rules.map((id) => (
            <span
              key={id}
              className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent"
            >
              {id}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
