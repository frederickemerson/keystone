'use client';

// Client side of the demo session. The server layout verifies the signed
// cookie and passes the actor down; this binds it into the governance store
// (the identity every SoD / grant check uses) and provides "Switch user".

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGovernanceStore } from '@/lib/governance/store';
import { UNRESOLVED_ROLE } from '@/lib/governance/access';

export interface SessionActor {
  role: string;
  name: string;
}

/**
 * Bind the session actor into the governance store. The first binding happens
 * during the shell's first client render — before any screen reads the store —
 * so no screen ever sees a non-session identity; later changes (a switch made
 * in another tab, a refreshed session) are synced after render.
 */
export function useSessionBinding(actor: SessionActor | null): void {
  if (typeof window !== 'undefined' && actor) {
    const state = getGovernanceStore().getState();
    if (state.currentActor.role === UNRESOLVED_ROLE) state.setRole(actor.role);
  }
  const role = actor?.role;
  useEffect(() => {
    if (!role) return;
    const state = getGovernanceStore().getState();
    if (state.currentActor.role !== role) state.setRole(role);
  }, [role]);
}

/** Sign-in URL that comes back to `next` (default: the current screen), with a persona preselected. */
export function signInHref(role?: string, next?: string): string {
  const params = new URLSearchParams({ next: next ?? `${window.location.pathname}${window.location.search}` });
  if (role) params.set('as', role);
  return `/sign-in?${params.toString()}`;
}

/**
 * Switch user. One click while the session is valid (every persona shares the
 * demo passcode the session already proved); otherwise — expired or missing
 * session — via /sign-in, coming back to this screen (or to `then`).
 *
 * `then`: the screen to open as the new persona. That is a full document
 * navigation, not router.push(): the new cookie changes what every server
 * component renders, so the client router cache (prefetched routes) is stale,
 * and a push issued alongside the refresh can be dropped by it.
 *
 * Resolves true when the switch happened, false when it went to /sign-in.
 */
export function useSwitchUser(): (role: string, then?: string) => Promise<boolean> {
  const router = useRouter();
  return async (role: string, then?: string) => {
    let ok = false;
    try {
      const res = await fetch('/api/auth/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      router.push(signInHref(role, then));
      return false;
    }
    // The new cookie is set; act as the new persona now.
    getGovernanceStore().getState().setRole(role);
    if (then) {
      window.location.assign(then);
    } else {
      // Stay here: re-render the server components re-scoped to the new role.
      router.refresh();
    }
    return true;
  };
}
