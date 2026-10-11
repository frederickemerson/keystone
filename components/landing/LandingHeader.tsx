import Link from 'next/link';
import { BrandLogo } from '@/components/shell/BrandMark';

export const INCIDENT_ROOM_HREF = '/incident/INC-2026-1011?step=10';

/** Minimal landing header: the brand mark and the one call to action. */
export function LandingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 pt-5 sm:px-8 sm:pt-7">
      <Link
        href="/"
        aria-label="Keystone home"
        className="inline-flex items-center rounded-lg focus-visible:outline-offset-4"
      >
        <BrandLogo markSize={36} textClassName="text-[26px]" />
      </Link>
      <nav aria-label="Account" className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/sign-in"
          className="rounded-md text-[14px] font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-offset-4"
        >
          Sign in
        </Link>
        <Link href={INCIDENT_ROOM_HREF} className="btn-pill min-h-10 px-4 text-[14px] max-[380px]:px-3">
          Open the incident room
        </Link>
      </nav>
    </header>
  );
}
