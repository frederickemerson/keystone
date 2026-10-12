'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { SwitchUser } from '@/components/shell/SwitchUser';
import { useSessionBinding, type SessionActor } from '@/components/shell/session';
import { AuditLogDrawer } from '@/components/shell/AuditLogDrawer';
import { BrandLogo } from '@/components/shell/BrandMark';

export const NAV_ITEMS = [
  { href: '/pulse', label: 'Portfolio pulse', purpose: 'Portfolio-wide posture at a glance' },
  {
    href: '/capture',
    label: 'Expert call',
    purpose: 'Capture expert judgement from an onboarding interview',
  },
  {
    href: '/canvas/technical-services-chilled-water-leak',
    label: 'Decision canvas',
    purpose: 'Review, edit and confirm extracted rule candidates',
  },
  { href: '/registry', label: 'Pill registry', purpose: 'Versioned pills and their lifecycle state' },
  {
    href: '/incident/INC-2026-1011',
    label: 'Incident room',
    purpose: 'Apply approved pills to a live incident with deterministic gates',
  },
  { href: '/approvals', label: 'Approvals', purpose: 'Queue of decisions awaiting a named human' },
  {
    href: '/learning/technical-services-chilled-water-leak',
    label: 'Learning',
    purpose: 'Outcome capture, version diff, evals and rollback',
  },
] as const;

/** A nav item is active for any route in its section (e.g. every /canvas/*). */
function isActive(pathname: string, href: string): boolean {
  const section = `/${href.split('/')[1]}`;
  return pathname === section || pathname.startsWith(`${section}/`);
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-offset-4"
      aria-label="Keystone home"
    >
      <BrandLogo
        markSize={compact ? 28 : 32}
        textClassName={compact ? 'text-[21px]' : 'text-[25px]'}
        subtitle={compact ? undefined : 'Intelligence Pills'}
      />
    </Link>
  );
}

/** Full-bleed public pages with their own header (no sidebar shell). */
const BARE_ROUTES = new Set(['/', '/sign-in']);

export function AppShell({ children, session }: { children: React.ReactNode; session: SessionActor | null }) {
  const pathname = usePathname();
  const [auditOpen, setAuditOpen] = useState(false);
  // The signed session is the acting identity for every governance check.
  useSessionBinding(session);

  // The landing page (/) and sign-in are full-bleed with their own header;
  // every app screen gets the sidebar shell. The brand mark links back to /.
  if (BARE_ROUTES.has(pathname)) return <>{children}</>;

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-card"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-dew-drop md:flex">
        <div className="px-5 pb-6 pt-6">
          <Wordmark />
        </div>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.purpose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-10 items-center rounded-lg px-3 text-[15px] transition-colors duration-150',
                      active
                        ? 'bg-cream-paper font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]'
                        : 'text-ink-muted hover:bg-cream-paper/60 hover:text-ink',
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-marker"
                      />
                    ) : null}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Brand band: marker orange, 56px top radius (DESIGN.md §8). Typeset —
            no handwriting inside the app. Full cocoa ink on #ff6f1e is 6.0:1;
            never fade it with opacity (cocoa/80 drops to 4.3:1, below AA). */}
        <div className="mt-4 rounded-t-[56px] bg-marker px-7 pb-5 pt-7">
          <p className="font-display-soft text-[19px] font-semibold leading-[1.15] text-cocoa-ink">
            Expert judgement,
            <br />
            governed.
          </p>
          <p className="mt-2 font-mono text-[11px] font-medium text-cocoa-ink">Keystone v1</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas px-4 md:px-8">
          <div className="shrink-0 md:hidden">
            <Wordmark compact />
          </div>
          {/* On phones the two header buttons collapse to icons (40px targets)
              so the bar fits 360px screens; the accessible name stays. */}
          <div className="ml-auto flex min-w-0 items-center gap-2">
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
        </header>

        {/* Small screens: the sidebar is hidden, so nav scrolls horizontally. */}
        <nav aria-label="Primary" className="border-b border-line bg-dew-drop md:hidden">
          <ul className="flex gap-1 overflow-x-auto px-3 py-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-9 items-center rounded-full px-3 text-[13px]',
                      active ? 'border-[1.5px] border-ink bg-surface font-medium text-ink' : 'text-ink-muted',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 outline-none md:px-8 md:py-8">{children}</main>
      </div>

      <AuditLogDrawer open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}
