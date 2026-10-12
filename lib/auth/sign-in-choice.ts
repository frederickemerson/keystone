// Who the sign-in form signs in as. Only an explicit choice counts: a persona
// picked on the page, a `?as=` hand-off link, or the guided demo's first
// persona. A leftover session cookie never preselects anyone, so pressing
// Enter on a fresh form cannot sign in as a person the visitor did not pick.

import { DEMO_PATH } from '@/lib/journey';

/** The persona to preselect: the `?as=` role when it is a known role, else nobody. */
export function initialPersona(as: string | undefined, isKnownRole: (role: string) => boolean): string | null {
  return as && isKnownRole(as) ? as : null;
}

export type SignInIntent =
  | { kind: 'guide'; role: string; next: string }
  | { kind: 'persona'; role: string; next: string }
  | { kind: 'invalid'; error: string };

/** Resolve a submit: the guided demo starts as its first step's persona on that step's screen. */
export function resolveSignIn(input: { guide: boolean; role: string | null; next: string }): SignInIntent {
  if (input.guide) {
    const first = DEMO_PATH[0];
    return { kind: 'guide', role: first.role, next: first.href };
  }
  if (!input.role) return { kind: 'invalid', error: 'Choose a person to sign in as, or start the guided demo.' };
  return { kind: 'persona', role: input.role, next: input.next };
}
