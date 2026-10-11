import Link from 'next/link';
import { MarginNote, MarkerHighlight } from '@/components/mosaic';
import { HeroNotebook } from './HeroNotebook';
import { INCIDENT_ROOM_HREF } from './LandingHeader';
import type { HeroFacts } from './data';

export function Hero({ facts }: { facts: HeroFacts }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid w-full max-w-[1240px] items-center gap-x-10 gap-y-12 px-4 pb-20 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:pb-28 lg:pt-12"
    >
      <div className="min-w-0">
        <MarginNote size="lg" rotate={-3} className="mb-3 ml-1 text-[28px] sm:text-[32px]">
          dear keppel,
        </MarginNote>
        <h1
          id="hero-title"
          className="font-display-soft font-extrabold lowercase text-heading"
          style={{
            fontSize: 'clamp(2.75rem, 1.4rem + 4.6vw, 5.5rem)',
            fontWeight: 800,
            lineHeight: 0.98,
            letterSpacing: '-0.025em',
          }}
        >
          the chief engineer retires in december. his judgement doesn’t.
        </h1>
        <p className="mt-7 max-w-[34rem] text-[19px] leading-[1.55] text-ink sm:text-[20px]">
          MOSAIC turns an expert’s spoken know-how into{' '}
          <span className="whitespace-nowrap">
            <MarkerHighlight>governed</MarkerHighlight>,
          </span>{' '}
          versioned Intelligence Pills: rules your
          team can apply to a live incident, each one traced back to the words it came from.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={INCIDENT_ROOM_HREF}
            className="btn-pill min-h-12 border-2 px-6 text-[16px] font-semibold"
          >
            open the incident room
          </Link>
          <Link href="/capture" className="btn-pill min-h-12 border-[1px] border-charcoal/45 bg-transparent px-6 text-[16px] shadow-none">
            hear the onboarding call
          </Link>
        </div>
      </div>

      <HeroNotebook facts={facts} />
    </section>
  );
}
