import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/shell/BrandMark';

export const INCIDENT_ROOM_HREF = '/incident/INC-2026-1011?step=10';

const SECTIONS = [
  { href: '#problem-title', label: 'The problem' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#safe-title', label: 'Safety' },
  { href: '#video-title', label: 'Demo' },
];

/** Landing header, laid over the hero photograph (white on dark). */
export function LandingHeader() {
  return (
    <header className="relative z-20 flex w-full items-center justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-6">
      <Link
        href="/"
        aria-label="Keystone home"
        className="inline-flex items-center rounded-lg focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <BrandLogo markSize={30} textClassName="text-[22px]" tone="onDark" />
      </Link>
      <nav aria-label="Sections" className="hidden items-center gap-7 lg:flex">
        {SECTIONS.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="rounded-md text-[14px] text-white/80 transition-colors hover:text-white focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {s.label}
          </a>
        ))}
      </nav>
      <nav aria-label="Account" className="flex items-center gap-3 sm:gap-5">
        <Link
          href="/sign-in"
          className="hidden whitespace-nowrap rounded-md text-[14px] font-medium text-white/85 sm:inline transition-colors hover:text-white focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Sign in
        </Link>
        <Link
          href={INCIDENT_ROOM_HREF}
          className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-4 text-[14px] font-medium text-[#1d1a2b] shadow-sm transition-colors hover:bg-white focus-visible:outline-offset-4 focus-visible:outline-white max-[380px]:px-3"
        >
          Try the demo <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
