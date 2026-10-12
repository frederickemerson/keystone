'use client';

// The guided demo's state for the whole shell: the floating panel, the
// header's "Resume" chip, the journey bar and Pulse's start-here card read it.
// Moving to a step switches to that step's persona (the real session switch)
// and opens its screen. State lives in sessionStorage (lib/guide/state).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_PATH, type DemoStep } from '@/lib/journey';
import {
  browserSessionStorage,
  guideReducer,
  readGuideState,
  writeGuideState,
  type GuideAction,
  type GuideState,
} from '@/lib/guide/state';
import { useSwitchUser } from '@/components/shell/session';

interface GuideContextValue {
  state: GuideState | null;
  /** Stored state has been read (false during the first render after load). */
  ready: boolean;
  step: DemoStep | undefined;
  /** A step change is in flight (switching persona / navigating). */
  busy: boolean;
  /** Open step `index`: switch to its persona when needed, then go to its screen. */
  goTo: (index: number) => Promise<void>;
  start: () => Promise<void>;
  close: () => void;
  resume: () => void;
  end: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function useGuide(): GuideContextValue {
  const value = useContext(GuideContext);
  if (!value) throw new Error('useGuide must be used inside <GuideProvider>');
  return value;
}

export function GuideProvider({ currentRole, children }: { currentRole: string | null; children: ReactNode }) {
  const router = useRouter();
  const switchUser = useSwitchUser();
  const [state, setState] = useState<GuideState | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // Read after mount: the server render has no storage, so the first client
  // render must match it (no tour), then the stored tour appears.
  useEffect(() => {
    setState(readGuideState(browserSessionStorage()));
    setReady(true);
  }, []);

  const apply = useCallback((action: GuideAction) => {
    setState((prev) => {
      const next = guideReducer(prev, action);
      writeGuideState(browserSessionStorage(), next);
      return next;
    });
  }, []);

  const goTo = useCallback(
    async (index: number) => {
      const target = DEMO_PATH[index];
      if (!target) return;
      apply({ type: 'goto', step: index });
      setBusy(true);
      try {
        // Same person: a client navigation. Another person: the switch opens
        // the step's screen itself (full navigation; a failed switch goes via
        // /sign-in and back). The step is saved first, so the panel resumes.
        if (target.role === currentRole) router.push(target.href);
        else await switchUser(target.role, target.href);
      } finally {
        setBusy(false);
      }
    },
    [apply, currentRole, router, switchUser],
  );

  const value = useMemo<GuideContextValue>(
    () => ({
      state,
      ready,
      step: state ? DEMO_PATH[state.step] : undefined,
      busy,
      goTo,
      start: () => goTo(0),
      close: () => apply({ type: 'close' }),
      resume: () => apply({ type: 'resume' }),
      end: () => apply({ type: 'end' }),
    }),
    [state, ready, busy, goTo, apply],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}
