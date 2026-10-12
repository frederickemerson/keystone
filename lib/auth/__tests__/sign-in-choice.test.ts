import { describe, expect, it } from 'vitest';
import { DEMO_PATH } from '@/lib/journey';
import { isKnownRole } from '@/lib/governance/access';
import { initialPersona, resolveSignIn } from '../sign-in-choice';

describe('sign-in default', () => {
  it('preselects only an explicit, known ?as= role (never a leftover session)', () => {
    expect(initialPersona(undefined, isKnownRole)).toBeNull();
    expect(initialPersona('', isKnownRole)).toBeNull();
    expect(initialPersona('not_a_role', isKnownRole)).toBeNull();
    expect(initialPersona('technician', isKnownRole)).toBe('technician');
  });

  it('refuses to sign in without a choice', () => {
    expect(resolveSignIn({ guide: false, role: null, next: '/pulse' }).kind).toBe('invalid');
  });

  it('signs in as the chosen persona to the requested screen', () => {
    expect(resolveSignIn({ guide: false, role: 'technician', next: '/approvals' })).toEqual({
      kind: 'persona',
      role: 'technician',
      next: '/approvals',
    });
  });

  it('starts the guided demo as the first step persona on its screen, whatever was selected', () => {
    expect(resolveSignIn({ guide: true, role: 'technician', next: '/pulse' })).toEqual({
      kind: 'guide',
      role: DEMO_PATH[0].role,
      next: DEMO_PATH[0].href,
    });
  });
});
