'use client';

import { useEffect, useState } from 'react';

/**
 * True when the visitor asked for reduced motion. Starts false so the server
 * and first client render agree; everything this gates sits below the fold,
 * so a reduced-motion visitor never sees the switch.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return reduced;
}
