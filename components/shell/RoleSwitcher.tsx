'use client';

// App-shell role switcher bound to the governance store, so the acting role is
// shared across every screen (registry, approvals, incident room, pulse).
// The store value is read only after mount: the persisted store can rehydrate
// to a different actor than the server rendered, which would otherwise cause a
// hydration mismatch.

import { useEffect, useState } from 'react';
import { personaFor, useGovernanceStore } from '@/lib/governance/store';
import { ROLES } from '@/lib/governance/access';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

/** Matches the store's seed actor so server HTML and the first client render agree. */
const DEFAULT_ACTOR = personaFor('asset_operations_manager');

export function RoleSwitcher({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const currentActor = useGovernanceStore((s) => s.currentActor);
  const setRole = useGovernanceStore((s) => s.setRole);

  useEffect(() => setMounted(true), []);

  const actor = mounted ? currentActor : DEFAULT_ACTOR;

  return (
    <label className={cn('flex min-w-0 items-center gap-2.5 text-xs text-ink-muted', className)}>
      <span className="hidden truncate text-[13px] text-ink-muted lg:inline">
        Acting as <span className="font-medium text-ink">{actor.name}</span>
      </span>
      <span className="relative inline-flex">
        <select
          value={actor.role}
          onChange={(event) => setRole(event.target.value)}
          aria-label="Current role"
          className="min-h-9 cursor-pointer appearance-none rounded-full border-[1.5px] border-ink bg-surface py-1 pl-3.5 pr-8 text-xs font-medium text-ink shadow-button transition-colors duration-150 hover:bg-dew-drop"
        >
          {ROLES.map((r) => (
            <option key={r.role} value={r.role}>
              {r.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}
