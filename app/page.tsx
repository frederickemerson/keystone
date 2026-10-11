import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Hero } from '@/components/landing/Hero';
import { ProblemFlow } from '@/components/landing/ProblemFlow';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SafeBounded } from '@/components/landing/SafeBounded';
import { BrandBand, ProofStrip } from '@/components/landing/ProofAndFooter';
import { loadLandingFacts } from '@/components/landing/data';

export const metadata: Metadata = {
  title: 'MOSAIC — expert judgement, governed',
  description:
    "MOSAIC turns an expert's spoken know-how into governed, versioned Intelligence Pills.",
};

// Landing page. Rendered full-bleed (AppShell skips the sidebar on "/").
// Every quote, rule and count below is read from the real pills at build time.
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
        <ProblemFlow />
        <HowItWorks pillId={facts.hero.pillId} />
        <SafeBounded classes={facts.classes} />
        <ProofStrip rulesTraced={facts.rulesTraced} rulesTotal={facts.rulesTotal} />
      </main>
      <BrandBand />
    </div>
  );
}
