import Link from 'next/link';
import { Sticker } from '@/components/mosaic';
import { BrandLogo } from '@/components/shell/BrandMark';

// Verified by `npx vitest run`; update when the suite changes.
const TEST_COUNT = 161;

export function ProofStrip({ rulesTraced, rulesTotal }: { rulesTraced: number; rulesTotal: number }) {
  const facts = [
    {
      lead: `${TEST_COUNT} automated tests`,
      rest: 'Safety gates and governance, checked.',
    },
    {
      lead: 'Native CodeBuddy skill',
      rest: 'Verified against the engine’s TS-07 decision.',
    },
    {
      lead: `${rulesTraced} of ${rulesTotal} rules traced`,
      rest: 'Each traced rule cites the expert’s timestamped words.',
    },
  ];

  return (
    <section aria-labelledby="proof-title" className="mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-8 lg:pb-24">
      <h2 id="proof-title" className="sr-only">
        What stands behind it
      </h2>
      <ul className="grid divide-y divide-pencil border-y border-charcoal md:grid-cols-3 md:divide-x md:divide-y-0">
        {facts.map((f) => (
          <li key={f.lead} className="px-1 py-7 md:px-8 md:first:pl-0 md:last:pr-0">
            <p className="font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-heading">{f.lead}</p>
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
          <BrandLogo tone="onBrand" markSize={28} textClassName="text-[22px]" className="mb-6" />
          <p className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">
            Built with CodeBuddy Code
          </p>
          <p className="mt-3 text-[18px] font-medium">Tencent Cloud AI CAN DO IT 2026</p>
          <p className="mt-2 text-[13px]">Demo data; all people, assets and incidents are fictional.</p>
        </div>
        <Link
          href="/pulse"
          className="inline-flex min-h-11 w-fit shrink-0 items-center rounded-full border-[1.5px] border-cocoa-ink px-5 text-[15px] font-semibold hover:bg-cocoa-ink/10 focus-visible:outline-cocoa-ink"
        >
          See the portfolio pulse
        </Link>
      </div>
    </footer>
  );
}
