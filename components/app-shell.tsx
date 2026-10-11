'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { RoleSwitcher } from '@/components/shell/RoleSwitcher';
import { AuditLogDrawer } from '@/components/shell/AuditLogDrawer';
import { BrandMark, NavScribble } from '@/components/shell/BrandMark';

export const NAV_ITEMS = [
  { href: '/', label: 'Portfolio Pulse', purpose: 'Portfolio-wide posture at a glance' },
  {
    href: '/capture',
    label: 'Expert Call',
    purpose: 'Capture expert judgement from an onboarding interview',
  },
  {
    href: '/canvas/technical-services-chilled-water-leak',
    label: 'Decision Canvas',
    purpose: 'Review, edit and confirm extracted rule candidates',
  },
  { href: '/registry', label: 'Pill Registry', purpose: 'Versioned pills and their lifecycle state' },
  {
    href: '/incident/INC-2026-1011',
    label: 'Incident Room',
    purpose: 'Apply approved pills to a live incident with deterministic gates',
  },
  { href: '/approvals', label: 'Approvals', purpose: 'Queue of decisions awaiting a named human' },
  {
    href: '/learning/technical-services-chilled-water-leak',
    label: 'Learning',
    purpose: 'Outcome capture, version diff, evals and rollback',
  },
] as const;

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-offset-4"
      aria-label="MOSAIC home"
    >
      <BrandMark size={compact ? 30 : 36} />
      <span className="flex flex-col">
        <span
          className={cn(
            'font-display-soft font-bold leading-none text-heading',
            compact ? 'text-[22px]' : 'text-[27px]',
          )}
        >
          mosaic
        </span>
        {compact ? null : (
          <span className="mt-1 text-xs leading-none text-ink-muted">intelligence pills</span>
        )}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-dew-drop md:flex">
        <div className="px-5 pb-6 pt-6">
          <Wordmark />
        </div>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.purpose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-10 items-center rounded-lg px-3 text-[15px] transition-colors duration-150',
                      active
                        ? 'font-medium text-ink'
                        : 'text-ink-muted hover:bg-cream-paper/70 hover:text-ink',
                    )}
                  >
                    <span className="relative">
                      {item.label}
                      {active ? (
                        <NavScribble className="absolute -bottom-[7px] left-[-3%] h-[8px] w-[106%]" />
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Brand band: marker orange, 56px top radius (DESIGN.md §8). */}
        <div className="mt-4 rounded-t-[56px] bg-marker px-6 pb-5 pt-7">
          <p className="font-hand text-[24px] font-bold leading-[1.05] text-cocoa-ink" style={{ rotate: '-2deg' }}>
            expert judgement,
            <br />
            governed
          </p>
          <p className="mt-1 text-[11px] font-medium text-cocoa-ink">MOSAIC v1</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas px-4 md:px-8">
          <div className="md:hidden">
            <Wordmark compact />
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <RoleSwitcher />
            <button type="button" onClick={() => setAuditOpen(true)} className="btn-pill text-xs">
              <ScrollText className="size-3.5" aria-hidden="true" />
              Audit log
            </button>
          </div>
        </header>

        {/* Small screens: the sidebar is hidden, so nav scrolls horizontally. */}
        <nav aria-label="Primary" className="border-b border-line bg-dew-drop md:hidden">
          <ul className="flex gap-1 overflow-x-auto px-3 py-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
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

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <AuditLogDrawer open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}
