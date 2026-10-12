// Who plays which part in the guided demo, derived from DEMO_PATH (the story
// is the one source; nothing here lists names or roles by hand).

import { DEMO_PATH, type DemoStep } from '@/lib/journey';

/** Roles in the order the story first meets them. */
export function storyRoles(): string[] {
  return [...new Set(DEMO_PATH.map((s) => s.role))];
}

/** The steps a role plays, in story order. */
export function stepsFor(role: string): { step: DemoStep; index: number }[] {
  return DEMO_PATH.flatMap((step, index) => (step.role === role ? [{ step, index }] : []));
}

/** "Hear the expert, confirm the rule and propose it as a new version" (empty when not in the story). */
export function storyLine(role: string): string {
  const titles = stepsFor(role).map(({ step }, i) => (i === 0 ? step.title : step.title.charAt(0).toLowerCase() + step.title.slice(1)));
  if (titles.length <= 1) return titles.join('');
  return `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)}`;
}

/** Split personas into the story cast (story order) and everyone else (original order). */
export function splitCast<T extends { role: string }>(personas: readonly T[]): { cast: T[]; others: T[] } {
  const order = storyRoles();
  const cast = order.flatMap((role) => personas.filter((p) => p.role === role));
  const others = personas.filter((p) => !order.includes(p.role));
  return { cast, others };
}
