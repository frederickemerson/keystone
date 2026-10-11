import type { ReactNode } from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

/**
 * An expert's words, as captured. The quote body is typeset for readability;
 * only the attribution is handwritten (marginalia), with the transcript
 * timestamp on a small typeset sticker. "Hear the expert" is an outlined pill.
 */
export function ExpertQuote({
  quote,
  expert,
  role,
  timestamp,
  source,
  onPlay,
  playLabel = 'Hear the expert',
  action,
  size = 'md',
  className,
}: {
  quote: ReactNode;
  /** Who said it, e.g. "Tan Wei Ming". Rendered handwritten. */
  expert: string;
  /** Optional typeset role line, e.g. "Chief Engineer". */
  role?: string;
  /** Transcript timestamp, e.g. "00:14:32". */
  timestamp?: string;
  /** Source id shown in mono beside the timestamp (e.g. "interview-01"). */
  source?: string;
  /** Renders the "Hear the expert" pill button. */
  onPlay?: () => void;
  playLabel?: string;
  /** Custom slot in place of / beside the play button. */
  action?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <figure className={cn('relative', className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-1 -top-3 select-none font-display-soft text-[44px] font-bold leading-none text-marker"
      >
        “
      </span>
      <blockquote
        className={cn(
          'pl-6 text-ink',
          size === 'sm' ? 'text-[14px] leading-[1.55]' : 'text-[15px] leading-[1.6]',
        )}
      >
        <p>{quote}</p>
      </blockquote>
      <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 pl-6">
        <span className="inline-flex items-baseline gap-2">
          <span
            className="font-hand text-[20px] font-semibold leading-none text-marker-ink"
            style={{ rotate: '-1.5deg' }}
          >
            <span aria-hidden="true">— </span>
            {expert}
          </span>
          {role ? <span className="text-xs text-ink-muted">{role}</span> : null}
        </span>
        {timestamp ? (
          <span
            className="inline-flex items-center gap-1 rounded-[5px] border border-line-strong bg-dew-drop px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-ink shadow-sticker"
            style={{ rotate: '1deg' }}
          >
            {source ? <span className="text-ink-muted">{source} ·</span> : null}
            <time>{timestamp}</time>
          </span>
        ) : null}
        {onPlay || action ? (
          <span className="ml-auto flex items-center gap-2">
            {action}
            {onPlay ? (
              <button type="button" onClick={onPlay} className="btn-pill text-xs">
                <Volume2 className="size-3.5" aria-hidden="true" />
                {playLabel}
              </button>
            ) : null}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
