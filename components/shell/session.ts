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

/** Sign-in URL that comes back to the current screen, with a persona preselected. */
export function signInHref(role?: string): string {
  const next = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ next });
  if (role) params.set('as', role);
  return `/sign-in?${params.toString()}`;
}

/**
 * Switch user. One click while the session is valid (every persona shares the
 * demo passcode the session already proved); otherwise — expired or missing
 * session — via /sign-in, coming back to this screen.
 */
export function useSwitchUser(): (role: string) => Promise<void> {
  const router = useRouter();
  return async (role: string) => {
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
      router.push(signInHref(role));
      return;
    }
    // The new cookie is set; act as the new persona now and re-render the
    // server components so their props are re-scoped to the new role.
    getGovernanceStore().getState().setRole(role);
    router.refresh();
  };
}
