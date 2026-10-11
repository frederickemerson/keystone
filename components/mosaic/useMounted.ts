'use client';

import { useSyncExternalStore } from 'react';

const subscribeNoop = () => () => {};

/**
 * False during SSR + hydration, true after. Gate reads of the persisted
 * (localStorage) governance store on it so server HTML and the first client
 * render match.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}
