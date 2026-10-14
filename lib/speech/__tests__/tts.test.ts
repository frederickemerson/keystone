// The provider chain and what it says when a provider is not usable.
//
// The point of these is that an unusable provider has to be reported with a
// reason, not silently skipped: a demo where the voice quietly degrades and
// nothing says why is the failure this chain exists to prevent.

import { afterEach, describe, expect, it, vi } from 'vitest';

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
  TOKENHUB_TTS_PATH,
  TOKENHUB_TTS_REGION,
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
    expect(tokenhubTtsStatus({}).state).toBe('not_configured');
  });

  it('is ready with a key, naming the speech model it serves', () => {
    expect(tokenhubTtsStatus({ TOKENHUB_API_KEY: 'th' })).toEqual({
      provider: 'tokenhub_minimax',
      state: 'ready',
      model: TOKENHUB_SPEECH_MODEL,
      region: TOKENHUB_TTS_REGION,
    });
  });

  it('does not claim Singapore for this path', () => {
    // The dedicated CHAT service is Singapore-routed; synthesis goes through
    // the international gateway, and conflating the two would be a false
    // residency claim.
    expect(TOKENHUB_TTS_REGION).not.toMatch(/singapore|ap-/i);
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
  it('prefers TokenHub when both are configured', () => {
    expect(selectServerTts(BOTH)?.provider).toBe('tokenhub_minimax');
  });

  it('falls back to OpenAI when TokenHub has no key', () => {
    expect(selectServerTts({ OPENAI_API_KEY: 'oa' })?.provider).toBe('openai_tts');
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

describe('synthesize, against TokenHub', () => {
  const READY = {
    provider: 'tokenhub_minimax' as const,
    state: 'ready' as const,
    model: TOKENHUB_SPEECH_MODEL,
    region: TOKENHUB_TTS_REGION,
  };
  const ENV = { TOKENHUB_API_KEY: 'th', TOKENHUB_BASE_URL: 'https://gateway.test/v1' };
  const REQUEST = { text: 'Isolate the riser.', role: 'expert' as const };

  afterEach(() => vi.unstubAllGlobals());

  function respond(body: unknown, status = 200) {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status });
    });
    return calls;
  }

  const audioHex = 'ff'.repeat(200);

  it('posts to the synthesis path, which is not under /audio', async () => {
    const calls = respond({ base_resp: { status_code: 0 }, data: { audio: audioHex } });
    await synthesize(REQUEST, READY, ENV);
    expect(calls[0].url).toBe(`https://gateway.test/v1/${TOKENHUB_TTS_PATH}`);
    expect(calls[0].url).not.toContain('/audio/');
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.model).toBe(TOKENHUB_SPEECH_MODEL);
    expect(sent.text).toBe(REQUEST.text);
    expect(sent.output_format).toBe('hex');
  });

  it('gives each role its own voice', async () => {
    const calls = respond({ base_resp: { status_code: 0 }, data: { audio: audioHex } });
    const expert = await synthesize({ ...REQUEST, role: 'expert' }, READY, ENV);
    await synthesize({ ...REQUEST, role: 'interviewer' }, READY, ENV);
    const voices = calls.map((call) => JSON.parse(String(call.init.body)).voice_setting.voice_id);
    expect(voices[0]).not.toBe(voices[1]);
    expect(expert.source.voice).toBe(voices[0]);
  });

  it('decodes the inline audio and stamps where it came from', async () => {
    respond({ base_resp: { status_code: 0 }, data: { audio: audioHex } });
    const spoken = await synthesize(REQUEST, READY, ENV);
    expect(spoken.contentType).toBe('audio/mpeg');
    expect(spoken.audio.byteLength).toBe(200);
    expect(spoken.source.provider).toBe('tokenhub_minimax');
    expect(spoken.source.region).toBe(TOKENHUB_TTS_REGION);
  });

  it('treats a 200 carrying a refusal as a failure', async () => {
    // The gateway answers 200 with a non-zero status_code; the HTTP status
    // alone would let this through as success and ship silence.
    respond({ base_resp: { status_code: 1004, status_msg: 'insufficient balance' }, data: {} });
    await expect(synthesize(REQUEST, READY, ENV)).rejects.toThrow(/insufficient balance/);
  });

  it('refuses a body with no audio in it', async () => {
    respond({ base_resp: { status_code: 0 }, data: {} });
    await expect(synthesize(REQUEST, READY, ENV)).rejects.toThrow(/no audio/i);
  });

  it('refuses audio that is not hex, rather than decoding noise', async () => {
    respond({ base_resp: { status_code: 0 }, data: { audio: 'https://example.test/a.mp3' } });
    await expect(synthesize(REQUEST, READY, ENV)).rejects.toThrow(/no audio/i);
  });

  it('refuses a suspiciously short payload', async () => {
    respond({ base_resp: { status_code: 0 }, data: { audio: 'ffff' } });
    await expect(synthesize(REQUEST, READY, ENV)).rejects.toThrow(/no audio/i);
  });

  it('propagates an HTTP failure', async () => {
    respond({}, 502);
    await expect(synthesize(REQUEST, READY, ENV)).rejects.toThrow(/502/);
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
