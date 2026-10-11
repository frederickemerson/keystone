'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/ui/cn';
import { RoleSwitcher } from '@/components/shell/RoleSwitcher';
import { AuditLogDrawer } from '@/components/shell/AuditLogDrawer';

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <span className="grid size-7 place-items-center rounded bg-accent text-[11px] font-bold text-accent-ink">
            M
          </span>
          <span className="text-sm font-semibold tracking-tight">MOSAIC</span>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-ink-muted">v1</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-surface-raised font-medium text-ink'
                    : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3 text-[11px] leading-relaxed text-ink-muted">
          Turn expert judgement into governed, versioned Intelligence Pills.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
          <div className="md:hidden text-sm font-semibold">MOSAIC</div>
          <div className="ml-auto flex items-center gap-2">
            <RoleSwitcher />
            <button
              type="button"
              onClick={() => setAuditOpen(true)}
              className="rounded-md border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink hover:border-accent"
            >
              Audit log
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>

      <AuditLogDrawer open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}
