'use client';

// Publishes the sticky header's height as --shell-header-h on <html>, so
// anchors (scroll-padding-top) and the guide rail sit below it. On phones the
// header scrolls away (not sticky), so the offset is 0 there.

import { useEffect, type RefObject } from 'react';

export const HEADER_OFFSET_VAR = '--shell-header-h';

/** `mounted`: the header is rendered (false on the bare landing and sign-in pages). */
export function useStickyHeaderOffset(headerRef: RefObject<HTMLElement | null>, mounted: boolean): void {
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const publish = () => {
      const sticky = getComputedStyle(header).position === 'sticky';
      root.style.setProperty(HEADER_OFFSET_VAR, `${sticky ? Math.ceil(header.getBoundingClientRect().height) : 0}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    window.addEventListener('resize', publish);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
      root.style.removeProperty(HEADER_OFFSET_VAR);
    };
  }, [headerRef, mounted]);
}
