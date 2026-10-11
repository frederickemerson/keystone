import { Ban } from 'lucide-react';
import { CHIP_BASE, HandArrow, PillLabel, Sticker, TONE_CHIP } from '@/components/mosaic';
import { cn } from '@/lib/ui/cn';
import type { HeroFacts } from './data';
import styles from './landing.module.css';

/**
 * "The whole product in one image": the expert's handwritten line on a page of
 * a paper notebook, an arrow, and the typeset rule MOSAIC compiled from it.
 * All text comes from the real pill (TS-07 in the chilled-water pill).
 */
export function HeroNotebook({ facts }: { facts: HeroFacts }) {
  return (
    <figure aria-label={`The expert’s quote becomes safety gate ${facts.ruleId}`} className="relative mx-auto w-full max-w-[560px] pb-4 pt-14 lg:mx-0 lg:ml-auto">
      <figcaption className="sr-only">
        {facts.expert} said, at {facts.timestamp} of the onboarding interview: “{facts.quoteFragment}”.
        MOSAIC compiled it into rule {facts.ruleId}, {facts.ruleTitle}, which stays blocked until{' '}
        {facts.gateEvidence.join(', ')} are confirmed.
      </figcaption>

      {/* Name-label sticker, slapped on the notebook cover corner. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute right-[-4px] top-0 z-20 w-[210px] sm:right-[-20px] sm:w-[240px]',
          styles.labelIn,
        )}
      >
        <PillLabel
          variant="typeset"
          name={facts.pillName}
          pillClass={facts.pillClass}
          version={facts.version}
          rotate={4}
          size="md"
        />
      </div>

      <Sticker
        kind="droplet"
        size={46}
        rotate={-12}
        className="absolute -left-3 top-16 z-20 sm:-left-6"
      />

      <div aria-hidden="true" className={cn('relative', styles.notebookIn)}>
        {/* The page beneath, for a sense of a bound book. */}
        <div className="absolute inset-0 translate-x-2 translate-y-2.5 rotate-[1.2deg] rounded-[14px] border-[1.5px] border-charcoal bg-dew-drop" />

        <div
          className={cn(
            'relative overflow-hidden rounded-[14px] border-[1.5px] border-charcoal bg-[#fffdf8] shadow-lift',
            styles.ruled,
          )}
        >
          {/* Binding holes down the left edge. */}
          <div className="absolute inset-y-0 left-0 flex w-9 flex-col justify-around border-r border-dashed border-pencil py-6">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="mx-auto block size-3 rounded-full border border-shadow-mist bg-canvas" />
            ))}
          </div>

          <div className="relative pb-[100px] pl-[72px] pr-6 pt-[157px] sm:pr-10">
            <p
              className="font-hand text-[30px] font-semibold leading-[40px] text-marker-ink sm:text-[34px]"
              style={{ rotate: '-1.2deg' }}
            >
              {facts.quoteFragment}
            </p>
            <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink-muted">
              {facts.expert} · <span className="font-mono text-[12px]">{facts.timestamp}</span>
            </p>
          </div>
        </div>
      </div>

      {/* The system's voice: crisp, typeset, untilted. */}
      <div aria-hidden="true" className="relative z-10 -mt-[72px] ml-auto w-[94%] sm:w-[82%]">
        {/* Arrow from the handwriting down into the typeset rule. */}
        <HandArrow
          direction="down-right"
          className="absolute -left-[58px] -top-[34px] z-20 h-[44px] w-[88px] max-sm:hidden"
        />
        <div className="card-paper px-5 py-4 shadow-lift">
          <div className="flex items-start gap-2.5">
            <span className="shrink-0 whitespace-nowrap rounded-[5px] border border-line-strong bg-dew-drop px-1.5 py-0.5 font-mono text-[12px] font-medium text-ink">
              {facts.ruleId}
            </span>
            <span className="min-w-0 font-display text-[17px] font-semibold leading-tight tracking-[-0.02em] text-heading">
              {facts.ruleTitle}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className={cn(CHIP_BASE, TONE_CHIP.blocked, 'font-semibold')}>
              <Ban className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
              Blocked until
            </span>
            {facts.gateEvidence.map((key) => (
              <span
                key={key}
                className="rounded-full border border-line px-2 py-[3px] font-mono text-[12px] leading-none text-ink"
              >
                {key}
              </span>
            ))}
          </div>
        </div>
        <Sticker kind="shield" size={44} rotate={10} className="absolute -bottom-4 -right-3" />
      </div>
    </figure>
  );
}
