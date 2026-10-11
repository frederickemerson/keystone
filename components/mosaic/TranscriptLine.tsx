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
        'rounded-xl border px-4 py-3 transition-[background-color,border-color] duration-200',
        active ? 'border-line-strong bg-dew-drop shadow-card' : 'border-line bg-surface',
        className,
      )}
      aria-current={active ? 'true' : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-ink">{speaker}</span>
        <span className="font-mono tabular-nums text-ink-muted">{timestamp}</span>
        {probeId ? (
          <span className="rounded-full border border-line bg-dew-drop px-2 py-0.5 text-[11px] font-medium text-ink-muted">
            Probe <span className="font-mono">{probeId}</span>
          </span>
        ) : null}
        {active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-canvas">
            <span className="size-1.5 rounded-full bg-marker" aria-hidden="true" />
            Live
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{text}</p>

      {rules.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1" aria-label="Extracted rule candidates">
          {rules.map((id) => (
            <span
              key={id}
              className="rounded-full border border-line-strong bg-surface px-2 py-0.5 font-mono text-[11px] font-medium text-ink"
            >
              {id}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
