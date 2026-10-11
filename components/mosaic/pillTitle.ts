// Human title of a pill, from its manifest `name` (the authoritative id,
// e.g. "chilled-water-leak" → "Chilled water leak"). Sentence case per
// DESIGN.md; acronyms come from the shared token table.

import { humanizeKey } from '@/components/incident/labels';

export function pillDisplayName(name: string): string {
  return humanizeKey(name.replace(/-+/g, '_'));
}

export function pillTitle(bundle: { name: string }): string {
  return pillDisplayName(bundle.name);
}
