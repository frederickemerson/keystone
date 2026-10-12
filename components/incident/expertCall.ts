// The one expert call the app can play (/capture), so links to "hear the
// expert" are only offered for quotes that call actually contains.

import { routes } from '@/lib/journey/routes';

/** Transcript played on /capture. */
export const EXPERT_CALL_INTERVIEW_ID = 'ce-interview-2026-10-02';
/** Pill whose candidates that call drafts (the call's canvas hand-off). */
export const EXPERT_CALL_PILL_ID = 'technical-services-chilled-water-leak';

const CALL_TIME = /^\d{2}:\d{2}:\d{2}$/;

/** Link into the call at `timestamp`, or null when the quote is from another source or has no time. */
export function expertCallHref(source: string | undefined, timestamp: string | undefined): string | null {
  if (source !== EXPERT_CALL_INTERVIEW_ID || !timestamp || !CALL_TIME.test(timestamp)) return null;
  return routes.capture(timestamp);
}

/** A valid `?at=` seek for the call ("HH:MM:SS"), else undefined. */
export function parseCallTime(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && CALL_TIME.test(v) ? v : undefined;
}

/**
 * Tile state on the call from the pill's Canvas reviews (governance store):
 * confirmed or edited → true, rejected → false, not reviewed → absent.
 */
export function callTileStates(
  reviews: Readonly<Record<string, { outcome: 'confirmed' | 'edited' | 'rejected' }>>,
): Record<string, boolean> {
  return Object.fromEntries(Object.entries(reviews).map(([ruleId, r]) => [ruleId, r.outcome !== 'rejected']));
}
