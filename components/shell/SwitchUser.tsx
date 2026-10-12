'use client';

// Header identity control: who is signed in, "Switch user" (personas from
// data/roles.json) and sign out. Replaces the old free role picker — the
// acting identity is the signed session, never a client-side choice.

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { ROLES, roleLabel } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';
import { useSwitchUser, type SessionActor } from './session';

/** Enabled menu items, in DOM order (the roving-focus set of the ARIA menu pattern). */
function menuItems(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])'));
}

export function SwitchUser({ actor, className }: { actor: SessionActor; className?: string }) {
  // `open` carries where focus lands when the menu opens (ARIA menu button:
  // Enter/Space/ArrowDown → current persona or first item, ArrowUp → last).
  const [open, setOpen] = useState<false | 'current' | 'first' | 'last'>(false);
  const [pending, setPending] = useState<string | null>(null);
  const switchUser = useSwitchUser();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close and hand focus back to the trigger (keyboard dismissals only; a
  // pointer press outside leaves focus where the pointer put it).
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const items = menuItems(menuRef.current);
    const current = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]:not([disabled])');
    const target = open === 'last' ? items.at(-1) : open === 'current' ? (current ?? items[0]) : items[0];
    target?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
    // Focus is placed once per opening, not on every re-render while open.
  }, [Boolean(open)]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(event.key === 'ArrowUp' ? 'last' : 'first');
    }
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = menuItems(menuRef.current);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = items[(index + 1) % items.length];
        break;
      case 'ArrowUp':
        next = items[(index - 1 + items.length) % items.length];
        break;
      case 'Home':
        next = items[0];
        break;
      case 'End':
        next = items.at(-1);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case 'Tab':
        // Tab leaves a menu: close it and let focus move on naturally.
        setOpen(false);
        return;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  };

  async function choose(role: string) {
    if (role === actor.role) {
      close(true);
      return;
    }
    setPending(role);
    await switchUser(role);
    setPending(null);
    close(true);
  }

  return (
    <div ref={rootRef} className={cn('relative flex min-w-0 items-center gap-2.5 text-xs', className)}>
      <span className="hidden min-w-0 truncate text-[13px] text-ink-muted lg:inline" data-testid="signed-in-as">
        Signed in as <span className="font-medium text-ink">{actor.name}</span> · {roleLabel(actor.role)}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="btn-pill min-w-0 text-xs max-sm:min-h-10 max-sm:px-2.5"
        aria-haspopup="menu"
        aria-expanded={Boolean(open)}
        aria-controls={open ? 'switch-user-menu' : undefined}
        aria-label={`Switch user (signed in as ${actor.name})`}
        onClick={() => (open ? close(false) : setOpen('current'))}
        onKeyDown={onTriggerKeyDown}
      >
        <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
        {/* Below lg the "Signed in as" line is hidden, so the trigger names the person. */}
        <span className="min-w-0 max-w-[8rem] truncate lg:hidden" data-testid="signed-in-name">
          {actor.name}
        </span>
        <span className="hidden lg:inline">Switch user</span>
        <ChevronDown className="size-3.5 shrink-0 max-sm:hidden" aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id="switch-user-menu"
          role="menu"
          aria-label="Switch user"
          onKeyDown={onMenuKeyDown}
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
                tabIndex={-1}
                disabled={pending !== null}
                onClick={() => void choose(r.role)}
                className={cn(
                  'flex w-full flex-col items-start rounded-lg px-2.5 py-1.5 text-left outline-offset-[-2px] transition-colors duration-150 hover:bg-dew-drop focus-visible:bg-dew-drop disabled:opacity-60',
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
              tabIndex={-1}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink outline-offset-[-2px] hover:bg-dew-drop focus-visible:bg-dew-drop"
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
