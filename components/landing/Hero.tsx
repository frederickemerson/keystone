import Link from 'next/link';
import { MarkerHighlight } from '@/components/mosaic';
import { HeroNotebook } from './HeroNotebook';
import { INCIDENT_ROOM_HREF } from './LandingHeader';
import type { HeroFacts } from './data';

export function Hero({ facts }: { facts: HeroFacts }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid w-full max-w-[1240px] items-center gap-x-10 gap-y-12 px-4 pb-20 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:pb-24 lg:pt-12"
    >
      <div className="min-w-0">
        <p className="mb-5 text-[15px] font-semibold text-ink-muted">
          Expert judgement. Governed.
        </p>
        <h1
          id="hero-title"
          className="font-display font-bold text-heading"
          style={{
            fontSize: 'clamp(2.75rem, 1.4rem + 4.1vw, 5rem)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          The expert retires.<br />
          His judgement stays.
        </h1>
        <p className="mt-7 max-w-[32rem] text-[19px] leading-[1.5] text-ink sm:text-[20px]">
          Turn spoken know-how into <MarkerHighlight>governed</MarkerHighlight> Intelligence Pills — reusable rules, traced to the expert.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={INCIDENT_ROOM_HREF}
            className="btn-pill btn-pill-primary min-h-12 px-6 text-[16px] font-semibold"
          >
            Open the incident room
          </Link>
          <Link href="/capture" className="btn-pill min-h-12 border-[1px] border-charcoal/45 bg-transparent px-6 text-[16px] shadow-none">
            Hear the onboarding call
          </Link>
        </div>
      </div>

      <HeroNotebook facts={facts} />
    </section>
  );
}
