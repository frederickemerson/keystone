'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { SwitchUser } from '@/components/shell/SwitchUser';
import { useSessionBinding, type SessionActor } from '@/components/shell/session';
import { AuditLogDrawer } from '@/components/shell/AuditLogDrawer';
import { BrandLogo } from '@/components/shell/BrandMark';
import { MobileNav, SidebarNav } from '@/components/shell/PrimaryNav';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { HashScroll } from '@/components/shell/HashScroll';
import { useStickyHeaderOffset } from '@/components/shell/useStickyHeaderOffset';
import { GuideProvider } from '@/components/journey/GuideProvider';
import { GuidePanel } from '@/components/journey/GuidePanel';
import { GuideChip } from '@/components/journey/GuideChip';
import { GlossaryButton } from '@/components/journey/GlossaryButton';
import { JourneyBar } from '@/components/journey/JourneyBar';
import type { CrumbNames } from '@/lib/guide/nav';

export { NAV_ITEMS } from '@/lib/guide/nav';

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-offset-4" aria-label="Keystone home">
      <BrandLogo
        tone="onDark"
        markSize={compact ? 26 : 30}
        textClassName={compact ? 'text-[20px]' : 'text-[23px]'}
        subtitle={compact ? undefined : 'Intelligence Pills'}
      />
    </Link>
  );
}

/** Full-bleed public pages with their own header (no sidebar shell). */
const BARE_ROUTES = new Set(['/', '/sign-in']);

export function AppShell({
  children,
  session,
  names,
}: {
  children: React.ReactNode;
  session: SessionActor | null;
  /** Display names for ids in paths (breadcrumbs), resolved on the server. */
  names: CrumbNames;
}) {
  const pathname = usePathname();
  const [auditOpen, setAuditOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const bare = BARE_ROUTES.has(pathname);
  useStickyHeaderOffset(headerRef, !bare);
  // The signed session is the acting identity for every governance check.
  useSessionBinding(session);

  // The landing page (/) and sign-in are full-bleed with their own header;
  // every app screen gets the sidebar shell. The brand mark links back to /.
  if (bare) return <>{children}</>;

  const role = session?.role ?? null;

  return (
    <GuideProvider currentRole={role}>
      <div data-app-shell className="flex min-h-dvh bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-card"
        >
          Skip to content
        </a>
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-night md:flex">
          <div className="px-5 pb-7 pt-6">
            <Wordmark />
          </div>
          <SidebarNav />
          <p className="border-t border-white/10 px-5 py-4 text-[12px] leading-snug text-white/60">
            Expert judgement, versioned and governed. Gates are fixed code; AI only drafts.
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Phones: the top bar and nav sit on night like the desktop sidebar,
              and nothing is sticky (the screen is short). */}
          <header ref={headerRef} className="z-30 border-b border-line bg-canvas/90 backdrop-blur-md md:sticky md:top-0">
            <div className="flex h-14 items-center gap-2 bg-night px-4 md:h-16 md:bg-transparent md:px-8">
              <div className="shrink-0 md:hidden">
                <Wordmark compact />
              </div>
              <Breadcrumbs names={names} className="hidden md:block" />
              {/* On phones the header buttons collapse to icons (40px targets);
                  the accessible names stay. */}
              <div className="ml-auto flex min-w-0 items-center gap-2">
                <GuideChip />
                <GlossaryButton />
                {session ? <SwitchUser actor={session} /> : null}
                <button
                  type="button"
                  onClick={() => setAuditOpen(true)}
                  aria-haspopup="dialog"
                  aria-label="Audit log"
                  className="btn-pill text-xs max-sm:size-10 max-sm:px-0"
                >
                  <ScrollText className="size-3.5" aria-hidden="true" />
                  <span className="max-sm:hidden">Audit log</span>
                </button>
              </div>
            </div>
            <MobileNav />
            <div className="px-4 py-1.5 md:border-t md:border-line md:px-8">
              <JourneyBar />
            </div>
          </header>

          {/* The guide is docked, never floating over the page: a rail beside
              main on wide screens, a bar at the bottom of this column below. */}
          <div className="flex min-w-0 flex-1">
            <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-10 pt-6 outline-none md:px-8 md:pt-8">
              <Breadcrumbs names={names} className="mb-4 md:hidden" />
              {children}
            </main>
            <GuidePanel currentRole={role} placement="rail" />
          </div>
          <GuidePanel currentRole={role} placement="bar" />
        </div>

        <HashScroll />
        <AuditLogDrawer open={auditOpen} onClose={() => setAuditOpen(false)} />
      </div>
    </GuideProvider>
  );
}
