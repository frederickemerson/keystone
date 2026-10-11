'use client';

// App-shell role switcher bound to the governance store, so the acting role is
// shared across every screen (registry, approvals, incident room, pulse).
// The store value is read only after mount: the persisted store can rehydrate
// to a different actor than the server rendered, which would otherwise cause a
// hydration mismatch.

import { useEffect, useState } from 'react';
import { personaFor, useGovernanceStore } from '@/lib/governance/store';
import { ROLES } from '@/lib/governance/access';
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
    <label className={cn('flex items-center gap-2 text-xs text-ink-muted', className)}>
      <span className="uppercase tracking-widest">Role</span>
      <select
        value={actor.role}
        onChange={(event) => setRole(event.target.value)}
        aria-label="Current role"
        className="rounded-md border border-line bg-surface-raised px-2 py-1 text-xs text-ink"
      >
        {ROLES.map((r) => (
          <option key={r.role} value={r.role}>
            {r.label}
          </option>
        ))}
      </select>
      <span className="truncate text-ink">{actor.name}</span>
    </label>
  );
}
