// "Hand to <person> →": who should act next when the current persona cannot.
// It never re-states policy: the caller passes the REAL authority check
// (pillEditAuthority, peerConfirmAuthority, shadowPromotionAuthority, the
// approval check, …) and this picks the demo persona it allows.

import { personaFor, ROLES } from '@/lib/governance/access';

export interface Persona {
  name: string;
  role: string;
}

/** The demo cast, in the order the story meets them. Preferred over other allowed roles. */
export const DEMO_CAST: readonly string[] = [
  'chief_engineer',
  'technician',
  'technical_services_lead',
  'senior_technician',
  'asset_operations_manager',
  'head_technical_services',
];

/**
 * The persona to hand to: the first demo-cast role the check allows, else any
 * roles.json role it allows, never `current` itself. Undefined when nobody can.
 */
export function suggestHandoff(isAllowed: (actor: Persona) => boolean, current?: Persona): Persona | undefined {
  const others = (role: string) => role !== current?.role;
  const cast = DEMO_CAST.filter(others).map(personaFor);
  const rest = ROLES.map((r) => r.role)
    .filter((role) => others(role) && !DEMO_CAST.includes(role))
    .map(personaFor);
  return [...cast, ...rest].find((p) => isAllowed(p));
}
