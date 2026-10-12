import { describe, expect, it } from 'vitest';
import { anchorIdOf } from '../anchor';

describe('anchorIdOf', () => {
  it('reads the fragment of an href or a location hash', () => {
    expect(anchorIdOf('/incident/INC-1?step=10#blocked-gate')).toBe('blocked-gate');
    expect(anchorIdOf('#rule-TS-07')).toBe('rule-TS-07');
    expect(anchorIdOf('#rule%20x')).toBe('rule x');
  });

  it('returns null when there is no fragment, and never throws on bad encoding', () => {
    expect(anchorIdOf('/approvals')).toBeNull();
    expect(anchorIdOf('')).toBeNull();
    expect(anchorIdOf('#')).toBeNull();
    expect(anchorIdOf('#%E0%A4%A')).toBe('%E0%A4%A');
  });
});
