import type { ReactNode } from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

/**
 * An expert's words, as captured. The quote body is typeset for readability.
 * In the app the attribution is a quiet typeset line
 * ("Tan Wei Ming · Chief Engineer · 00:14:32"). The landing page may opt in to
 * `attribution="handwritten"` (marginalia name + timestamp sticker).
 * "Hear the expert" is an outlined pill.
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
  attribution = 'typeset',
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
  /** `typeset` (default, all app screens) or `handwritten` (landing page only). */
  attribution?: 'typeset' | 'handwritten';
  className?: string;
}) {
  const handwritten = attribution === 'handwritten';
  return (
    <figure className={cn('relative', className)}>
      {handwritten ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-1 -top-3 select-none font-display-soft text-[44px] font-bold leading-none text-marker"
        >
          “
        </span>
      ) : null}
      <blockquote
        className={cn(
          'text-ink',
          handwritten ? 'pl-6' : 'border-l-2 border-line-strong/50 pl-4',
          size === 'sm' ? 'text-[14px] leading-[1.55]' : 'text-[15px] leading-[1.6]',
        )}
      >
        <p>{handwritten ? quote : <>“{quote}”</>}</p>
      </blockquote>
      <figcaption
        className={cn('mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2', handwritten ? 'pl-6' : 'pl-[18px]')}
      >
        {handwritten ? (
          <>
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
          </>
        ) : (
          <span className="text-[13px] leading-snug text-ink-muted">
            <span aria-hidden="true">— </span>
            <span className="font-medium text-ink">{expert}</span>
            {role ? <> · {role}</> : null}
            {timestamp ? (
              <>
                {' · '}
                {source ? <span className="font-mono text-[12px]">{source} </span> : null}
                <time className="font-mono text-[12px] tabular-nums">{timestamp}</time>
              </>
            ) : null}
          </span>
        )}
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
