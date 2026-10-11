'use client';

import { useEffect, useState, type RefObject } from 'react';
import { animate, useInView, useMotionValue } from 'motion/react';

/**
 * A 0 → 1 MotionValue that plays once when `ref` scrolls into view (or sits
 * at 1 from the start when motion is reduced). Pieces driven by scroll on
 * desktop take this as their progress on small screens.
 */
export function usePlayOnView(
  ref: RefObject<HTMLElement | null>,
  reduced: boolean,
  duration = 1.8,
  amount = 0.45,
) {
  const t = useMotionValue(reduced ? 1 : 0);
  const inView = useInView(ref, { once: true, amount });
  useEffect(() => {
    if (reduced) {
      t.set(1);
      return;
    }
    if (!inView) return;
    const controls = animate(t, 1, { duration, ease: 'linear' });
    return () => controls.stop();
  }, [inView, reduced, t, duration]);
  return t;
}

/** Whether a media query matches. False on the server and the first client render. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);
  return matches;
}
