'use client';

// "Hand to <person> →": replaces a disabled button or a "read-only" dead end
// with the next step. The persona comes from suggestHandoff(<real authority
// check>), so this never claims someone can act when the store would refuse.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { roleLabel } from '@/lib/governance/access';
import type { Persona } from '@/lib/journey';
import { useSwitchUser } from '@/components/shell/session';
import { cn } from '@/lib/ui/cn';

interface HandoffButtonProps {
  to: Persona;
  /** Where the next person acts; defaults to staying on this screen. */
  href?: string;
  /** Why the current person cannot do it, shown before the button. */
  reason?: string;
  /** Verb phrase for the button, e.g. "approve". Default: "continue". */
  action?: string;
  className?: string;
}

export function HandoffButton({ to, href, reason, action = 'continue', className }: HandoffButtonProps) {
  const switchUser = useSwitchUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handOff() {
    setBusy(true);
    try {
      await switchUser(to.role);
      if (href) router.push(href);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 text-sm', className)}>
      {reason ? <p className="min-w-0 text-ink-muted">{reason}</p> : null}
      <button
        type="button"
        onClick={handOff}
        disabled={busy}
        className="btn-pill min-h-10 gap-1.5 px-4 text-[14px]"
        aria-label={`Switch to ${to.name}, ${roleLabel(to.role)}, to ${action}`}
      >
        Hand to {to.name} <span className="text-ink-muted">· {roleLabel(to.role)}</span>
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
