import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Hero } from '@/components/landing/Hero';
import { ProblemStory } from '@/components/landing/ProblemStory';
import { Replay } from '@/components/landing/Replay';
import { Promises } from '@/components/landing/Promises';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SafeBounded } from '@/components/landing/SafeBounded';
import { DemoVideo } from '@/components/landing/DemoVideo';
import { BrandBand } from '@/components/landing/BrandBand';
import { loadLandingFacts } from '@/components/landing/data';

export const metadata: Metadata = {
  title: 'Keystone — expert judgement, governed',
  description:
    "Keystone turns an expert's spoken know-how into governed, versioned Intelligence Pills.",
};

// Every quote, rule, name and timestamp on the page is read from the real
// pills and demo data. The route renders per request (the shell reads the
// session), so the facts are also loaded once when the module is evaluated:
// `next build` evaluates it while collecting page data, and a fact that has
// disappeared from the data fails the build instead of a visitor's request.
loadLandingFacts();

// Landing page. Rendered full-bleed (AppShell skips the sidebar on "/").
export default function LandingPage() {
  const facts = loadLandingFacts();
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <LandingHeader />
      <main id="main" className="flex-1">
        <Hero facts={facts.hero} />
        <ProblemStory facts={facts.problem} />
        <Replay facts={facts.replay} />
        <Promises />
        <HowItWorks hero={facts.hero} story={facts.story} />
        <SafeBounded classes={facts.classes} />
        <DemoVideo video={facts.video} />
      </main>
      <BrandBand />
    </div>
  );
}
