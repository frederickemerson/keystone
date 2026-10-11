import Link from 'next/link';
import { BrandMark } from '@/components/shell/BrandMark';

export const INCIDENT_ROOM_HREF = '/incident/INC-2026-1011?step=10';

/** Minimal landing header: the brand mark and the one call to action. */
export function LandingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 pt-5 sm:px-8 sm:pt-7">
      <Link
        href="/"
        aria-label="MOSAIC home"
        className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-offset-4"
      >
        <BrandMark size={38} />
        <span className="font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-heading">mosaic</span>
      </Link>
      <Link href={INCIDENT_ROOM_HREF} className="btn-pill min-h-10 px-4 text-[14px] max-[380px]:px-3">
        Open the incident room
      </Link>
    </header>
  );
}
