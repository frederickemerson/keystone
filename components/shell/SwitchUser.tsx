'use client';

// Header identity control: who is signed in, "Switch user" (personas from
// data/roles.json) and sign out. Replaces the old free role picker — the
// acting identity is the signed session, never a client-side choice.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { ROLES, roleLabel } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';
import { useSwitchUser, type SessionActor } from './session';

export function SwitchUser({ actor, className }: { actor: SessionActor; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const switchUser = useSwitchUser();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function choose(role: string) {
    if (role === actor.role) {
      setOpen(false);
      return;
    }
    setPending(role);
    await switchUser(role);
    setPending(null);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn('relative flex min-w-0 items-center gap-2.5 text-xs', className)}>
      <span className="hidden min-w-0 truncate text-[13px] text-ink-muted lg:inline" data-testid="signed-in-as">
        Signed in as <span className="font-medium text-ink">{actor.name}</span> · {roleLabel(actor.role)}
      </span>
      <button
        type="button"
        className="btn-pill text-xs"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound className="size-3.5" aria-hidden="true" />
        Switch user
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Switch user"
          className="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] text-ink-muted">Demo personas — switching re-issues your session.</p>
          {ROLES.map((r) => {
            const current = r.role === actor.role;
            return (
              <button
                key={r.role}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                disabled={pending !== null}
                onClick={() => void choose(r.role)}
                className={cn(
                  'flex w-full flex-col items-start rounded-lg px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-dew-drop disabled:opacity-60',
                  current && 'bg-dew-drop',
                )}
              >
                <span className="text-[13px] font-medium text-ink">
                  {r.person}
                  {current ? <span className="ml-1.5 text-[11px] font-normal text-ink-muted">(you)</span> : null}
                  {pending === r.role ? <span className="ml-1.5 text-[11px] font-normal text-ink-muted">Switching…</span> : null}
                </span>
                <span className="text-[12px] text-ink-muted">{r.label}</span>
              </button>
            );
          })}
          <form method="post" action="/api/auth/sign-out" className="mt-1 border-t border-line pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-dew-drop"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
