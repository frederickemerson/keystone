'use client';

// After a navigation to `…#id`, bring the element into view below the sticky
// header (it may render after the route does). Covers full page loads, client
// navigations and in-page hash changes. The guide also calls scrollToAnchor
// directly for same-screen steps (a pushState fires no hashchange).

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { anchorIdOf, scrollToAnchor } from '@/lib/guide/anchor';

export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    let cancel: (() => void) | undefined;
    // The URL (and its hash) is committed by the time the frame runs.
    const frame = requestAnimationFrame(() => {
      const id = anchorIdOf(window.location.hash);
      if (id) cancel = scrollToAnchor(id);
    });
    return () => {
      cancelAnimationFrame(frame);
      cancel?.();
    };
  }, [pathname]);

  useEffect(() => {
    let cancel: (() => void) | undefined;
    const onHash = () => {
      cancel?.();
      const id = anchorIdOf(window.location.hash);
      cancel = id ? scrollToAnchor(id) : undefined;
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      cancel?.();
    };
  }, []);

  return null;
}
