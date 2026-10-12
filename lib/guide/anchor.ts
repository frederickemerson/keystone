// Hash anchors: bring `#id` into view below the sticky header after a
// navigation. The element may render after the route does (client screens
// hydrate, guide targets appear once an action creates them), so the scroll
// waits for it for a short while, then gives up quietly.

/** How long to wait for an anchor's element to appear before giving up. */
export const ANCHOR_WAIT_MS = 4000;

/** The fragment id of an href or location hash ("" / "#" -> null). Decoded; never throws. */
export function anchorIdOf(hrefOrHash: string): string | null {
  const at = hrefOrHash.indexOf('#');
  if (at === -1) return null;
  const raw = hrefOrHash.slice(at + 1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll element `id` to the top of the viewport (the root's
 * `scroll-padding-top` keeps it below the sticky header), waiting up to
 * `waitMs` for it to render. Returns a cancel function.
 */
export function scrollToAnchor(id: string, waitMs: number = ANCHOR_WAIT_MS): () => void {
  if (typeof document === 'undefined') return () => {};
  let done = false;
  let observer: MutationObserver | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    done = true;
    observer?.disconnect();
    if (timer !== undefined) clearTimeout(timer);
  };

  const attempt = (): boolean => {
    const el = document.getElementById(id);
    if (!el) return false;
    stop();
    // After layout settles (the new screen may still be painting).
    requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
    return true;
  };

  if (!attempt()) {
    observer = new MutationObserver(() => {
      if (!done) attempt();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    timer = setTimeout(stop, waitMs);
  }
  return stop;
}
