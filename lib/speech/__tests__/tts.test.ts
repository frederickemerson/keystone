// The provider chain and what it says when a provider is not usable.
//
// The point of these is that an unusable provider has to be reported with a
// reason, not silently skipped: a demo where the voice quietly degrades and
// nothing says why is the failure this chain exists to prevent.

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import {
  MAX_SPEECH_CHARS,
  OPENAI_TTS_MODEL,
  openAiTtsStatus,
  selectServerTts,
  serverTtsChain,
  serverTtsSummary,
  speechRequestSchema,
  synthesize,
  tokenhubTtsStatus,
  TOKENHUB_SPEECH_MODEL,
  TTS_ROLES,
} from '../tts';
import {
  MAX_CACHE_ENTRIES,
  readSpeech,
  resetSpeechCache,
  speechCacheSize,
  speechKey,
  writeSpeech,
} from '../cache';

const BOTH = { TOKENHUB_API_KEY: 'th', OPENAI_API_KEY: 'oa' };

describe('tokenhubTtsStatus', () => {
  it('is not configured without a key', () => {
    const status = tokenhubTtsStatus({});
    expect(status.state).toBe('not_configured');
  });

  it('with a key, reports why it still cannot be used and names the model it would use', () => {
    const status = tokenhubTtsStatus({ TOKENHUB_API_KEY: 'th' });
    expect(status.state).toBe('not_available');
    if (status.state === 'not_available') {
      expect(status.reason).toContain(TOKENHUB_SPEECH_MODEL);
      expect(status.reason).toContain('billing');
    }
  });

  it('never reports ready, because no adapter has been verified against it', () => {
    for (const env of [{}, { TOKENHUB_API_KEY: 'th' }]) {
      expect(tokenhubTtsStatus(env).state).not.toBe('ready');
    }
  });
});

describe('openAiTtsStatus', () => {
  it('is ready with a key, and records that the audio is made offshore', () => {
    const status = openAiTtsStatus({ OPENAI_API_KEY: 'oa' });
    expect(status).toEqual({ provider: 'openai_tts', state: 'ready', model: OPENAI_TTS_MODEL, region: 'us' });
  });

  it('is not configured without one', () => {
    expect(openAiTtsStatus({}).state).toBe('not_configured');
  });
});

describe('selectServerTts', () => {
  it('picks OpenAI while TokenHub is unreachable, rather than failing outright', () => {
    expect(selectServerTts(BOTH)?.provider).toBe('openai_tts');
  });

  it('is null when nothing is configured, so the caller falls back to the browser', () => {
    expect(selectServerTts({})).toBeNull();
  });

  it('keeps TokenHub first in the chain, so enabling it changes the choice', () => {
    expect(serverTtsChain(BOTH).map((s) => s.provider)).toEqual(['tokenhub_minimax', 'openai_tts']);
  });
});

describe('serverTtsSummary', () => {
  it('gives a reason for every provider that is not ready', () => {
    const summary = serverTtsSummary(BOTH);
    expect(summary.available).toBe(true);
    for (const p of summary.providers) expect(p.detail.length).toBeGreaterThan(0);
  });

  it('is unavailable, with reasons, when nothing is configured', () => {
    const summary = serverTtsSummary({});
    expect(summary.available).toBe(false);
    expect(summary.providers.map((p) => p.state)).toEqual(['not_configured', 'not_configured']);
  });

  it('leaks no secret into the summary', () => {
    const summary = serverTtsSummary({ TOKENHUB_API_KEY: 'sk-secret-th', OPENAI_API_KEY: 'sk-secret-oa' });
    expect(JSON.stringify(summary)).not.toContain('sk-secret');
  });
});

describe('speechRequestSchema', () => {
  it('accepts each role', () => {
    for (const role of TTS_ROLES) {
      expect(speechRequestSchema.safeParse({ text: 'Isolate the riser.', role }).success).toBe(true);
    }
  });

  it('refuses an unknown role, so a caller cannot invent a voice', () => {
    expect(speechRequestSchema.safeParse({ text: 'x y z', role: 'narrator' }).success).toBe(false);
  });

  it('refuses empty text and text past the cap', () => {
    expect(speechRequestSchema.safeParse({ text: '   ', role: 'expert' }).success).toBe(false);
    expect(speechRequestSchema.safeParse({ text: 'a'.repeat(MAX_SPEECH_CHARS + 1), role: 'expert' }).success).toBe(false);
  });

  it('allows the longest turn in the recorded transcript', () => {
    expect(speechRequestSchema.safeParse({ text: 'a'.repeat(MAX_SPEECH_CHARS), role: 'expert' }).success).toBe(true);
  });
});

describe('synthesize', () => {
  it('refuses a provider it has no adapter for, instead of pretending', async () => {
    await expect(
      synthesize(
        { text: 'Isolate the riser.', role: 'expert' },
        { provider: 'tokenhub_minimax', state: 'ready', model: TOKENHUB_SPEECH_MODEL, region: 'ap-singapore' },
      ),
    ).rejects.toThrow(/No adapter/);
  });
});

describe('the audio cache', () => {
  it('keys on the words, so a changed word is a different entry', () => {
    const base = { role: 'expert', model: 'm', voice: 'expert' };
    expect(speechKey({ ...base, text: 'isolate the riser' })).not.toBe(
      speechKey({ ...base, text: 'isolate the branch' }),
    );
  });

  it('keys on the role, so the interviewer never gets served the expert’s audio', () => {
    const base = { text: 'Does that change if the area is wet?', model: 'm', voice: 'v' };
    expect(speechKey({ ...base, role: 'expert' })).not.toBe(speechKey({ ...base, role: 'interviewer' }));
  });

  it('gives back exactly what was stored', () => {
    resetSpeechCache();
    const entry = {
      audio: new ArrayBuffer(8),
      contentType: 'audio/mpeg',
      source: { provider: 'openai_tts' as const, model: 'm', voice: 'onyx', region: 'us' },
    };
    writeSpeech('k', entry);
    expect(readSpeech('k')).toBe(entry);
    expect(readSpeech('absent')).toBeUndefined();
  });

  it('evicts the least recently used, not the oldest written', () => {
    resetSpeechCache();
    const entry = (n: number) => ({
      audio: new ArrayBuffer(n),
      contentType: 'audio/mpeg',
      source: { provider: 'openai_tts' as const, model: 'm', voice: 'onyx', region: 'us' },
    });
    for (let i = 0; i < MAX_CACHE_ENTRIES; i++) writeSpeech(`k${i}`, entry(i + 1));
    readSpeech('k0'); // touched, so it must survive
    writeSpeech('new', entry(1));
    expect(speechCacheSize()).toBe(MAX_CACHE_ENTRIES);
    expect(readSpeech('k0')).toBeDefined();
    expect(readSpeech('k1')).toBeUndefined();
  });
});
