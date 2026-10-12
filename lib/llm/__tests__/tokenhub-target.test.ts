import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { getModelId, tokenhubTarget } from '../client';

afterEach(() => vi.unstubAllEnvs());

describe('TokenHub routing target', () => {
  it('routes to the dedicated endpoint id when configured, keeping the model id for attribution', () => {
    vi.stubEnv('TOKENHUB_ENDPOINT_ID', 'ep-45ssfma4');
    vi.stubEnv('MOSAIC_MODEL', 'hy4-preview');
    expect(tokenhubTarget()).toBe('ep-45ssfma4');
    expect(getModelId()).toBe('hy4-preview');
  });
  it('falls back to the model id without a dedicated endpoint', () => {
    vi.stubEnv('TOKENHUB_ENDPOINT_ID', '');
    expect(tokenhubTarget('hy4-preview')).toBe('hy4-preview');
  });
});
