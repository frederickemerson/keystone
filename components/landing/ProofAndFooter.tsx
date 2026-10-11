import Link from 'next/link';
import { Sticker } from '@/components/mosaic';

/**
 * Proof strip. Only claims that are true of this repo:
 * - 161 tests: confirmed by `npx vitest run` (14 files, 161 passed) when this
 *   page was built, including the "required evidence invariant (safety)"
 *   suite in lib/engine/__tests__/evaluate.test.ts. Update if the suite changes.
 * - Native CodeBuddy skill: README "How it installs as a CodeBuddy skill" and
 *   docs/proof/04a-codebuddy-skill-invoked.png, 04b-codebuddy-skill-ts07-answer.png.
 * - Traced rules: counted from the approved pills' provenance at build time.
 */
const TEST_COUNT = 161;

export function ProofStrip({ rulesTraced, rulesTotal }: { rulesTraced: number; rulesTotal: number }) {
  const facts = [
    {
      lead: `${TEST_COUNT} automated tests`,
      rest: 'including safety invariants on the rule engine',
    },
    {
      lead: 'runs as a native CodeBuddy skill',
      rest: 'copied unchanged into CodeBuddy, the pill reached the same TS-07 decision as the engine',
    },
    {
      lead:
        rulesTraced === rulesTotal
          ? 'every rule traced to the expert’s words'
          : `${rulesTraced} of ${rulesTotal} rules traced to the expert’s words`,
      rest:
        rulesTraced === rulesTotal
          ? `all ${rulesTotal} rules cite a timestamped interview quote`
          : 'each traced rule cites a timestamped interview quote',
    },
  ];

  return (
    <section aria-labelledby="proof-title" className="mx-auto w-full max-w-[1240px] px-4 pb-24 sm:px-8 lg:pb-32">
      <h2 id="proof-title" className="sr-only">
        What stands behind it
      </h2>
      <ul className="grid divide-y divide-pencil border-y border-charcoal md:grid-cols-3 md:divide-x md:divide-y-0">
        {facts.map((f) => (
          <li key={f.lead} className="px-1 py-7 md:px-8 md:first:pl-0 md:last:pr-0">
            <p className="font-display-soft text-[24px] font-bold leading-[1.15] text-heading">{f.lead}</p>
            <p className="mt-2 text-[16px] leading-[1.5] text-ink-muted">{f.rest}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BrandBand() {
  return (
    <footer className="relative mt-auto rounded-t-[40px] bg-marker text-cocoa-ink sm:rounded-t-[56px]">
      <Sticker kind="star" size={54} rotate={-10} className="absolute -top-6 right-[12%]" />
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6 pb-12 pt-14 sm:px-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display-soft text-[34px] font-extrabold leading-[1.02] tracking-[-0.015em] sm:text-[44px]">
            built with CodeBuddy Code
          </p>
          <p className="mt-3 text-[18px] font-medium">Tencent Cloud AI CAN DO IT 2026</p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <Link
            href="/pulse"
            className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-cocoa-ink px-5 text-[15px] font-semibold hover:bg-cocoa-ink/10 focus-visible:outline-cocoa-ink"
          >
            see the portfolio pulse
          </Link>
        </div>
      </div>
    </footer>
  );
}
