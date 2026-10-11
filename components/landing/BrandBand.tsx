import Link from 'next/link';
import { Sticker } from '@/components/mosaic';
import { BrandLogo } from '@/components/shell/BrandMark';

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
