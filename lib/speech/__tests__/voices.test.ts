// What a listener hears is decided here, so these pin the ordering of the
// signals rather than the score numbers.

import { describe, expect, it } from 'vitest';
import { pickCallVoices, rankVoices, voiceScore, type VoiceLike } from '../voices';

function voice(name: string, lang: string, extra: Partial<VoiceLike> = {}): VoiceLike {
  return { name, lang, localService: true, default: false, ...extra };
}

/** macOS as it actually is on a machine with no Premium voices installed. */
const MACOS_STOCK: VoiceLike[] = [
  voice('Albert', 'en-US'),
  voice('Bad News', 'en-US'),
  voice('Bahh', 'en-US'),
  voice('Daniel', 'en-GB'),
  voice('Fred', 'en-US'),
  voice('Samantha', 'en-US', { default: true }),
  voice('Trinoids', 'en-US'),
  voice('Zarvox', 'en-US'),
];

describe('rankVoices', () => {
  it('does not hand back a novelty voice when a narration voice exists', () => {
    expect(rankVoices(MACOS_STOCK, 'en-US')[0]?.name).toBe('Samantha');
  });

  it('prefers a network voice over the on-device default', () => {
    const voices = [...MACOS_STOCK, voice('Google US English', 'en-US', { localService: false })];
    expect(rankVoices(voices, 'en-US')[0]?.name).toBe('Google US English');
  });

  it("prefers the platform's own Premium grading over a network voice", () => {
    const voices = [
      voice('Google US English', 'en-US', { localService: false }),
      voice('Ava (Premium)', 'en-US'),
    ];
    expect(rankVoices(voices, 'en-US')[0]?.name).toBe('Ava (Premium)');
  });

  it('ranks Premium above Enhanced of the same voice', () => {
    const voices = [voice('Evan (Enhanced)', 'en-US'), voice('Evan (Premium)', 'en-US')];
    expect(rankVoices(voices, 'en-US').map((v) => v.name)).toEqual([
      'Evan (Premium)',
      'Evan (Enhanced)',
    ]);
  });

  it('leaves out another language rather than ranking it low', () => {
    const voices = [voice('Anna', 'de-DE', { localService: false, default: true }), voice('Samantha', 'en-US')];
    expect(rankVoices(voices, 'en-US').map((v) => v.name)).toEqual(['Samantha']);
  });

  it('keeps a same-language voice from another region, below an exact match', () => {
    expect(rankVoices([voice('Daniel', 'en-GB'), voice('Samantha', 'en-US')], 'en-US')[0]?.name).toBe(
      'Samantha',
    );
    expect(rankVoices([voice('Daniel', 'en-GB')], 'en-US').map((v) => v.name)).toEqual(['Daniel']);
  });

  it('picks the same voice every run, so a second take sounds like the first', () => {
    const a = rankVoices(MACOS_STOCK, 'en-US');
    const b = rankVoices([...MACOS_STOCK].reverse(), 'en-US');
    expect(a.map((v) => v.name)).toEqual(b.map((v) => v.name));
  });

  it('has nothing to offer when the platform lists no voices', () => {
    expect(rankVoices([], 'en-US')).toEqual([]);
  });
});

describe('voiceScore', () => {
  it('scores a tagged-language match above a bare base-language match', () => {
    expect(voiceScore(voice('X', 'en-US'), 'en-US')).toBeGreaterThan(voiceScore(voice('X', 'en-GB'), 'en-US'));
  });

  it('is case-insensitive about language tags, as browsers are inconsistent about them', () => {
    expect(voiceScore(voice('X', 'EN-us'), 'en-US')).toBe(voiceScore(voice('X', 'en-US'), 'en-US'));
  });
});

describe('pickCallVoices', () => {
  it('gives the two speakers different voices, which is what tells them apart', () => {
    const { expert, interviewer } = pickCallVoices(MACOS_STOCK, 'en-US', 'en-GB');
    expect(expert?.name).toBe('Samantha');
    expect(interviewer?.name).toBe('Daniel');
  });

  it('falls back to one voice for both parts rather than going silent', () => {
    const only = [voice('Samantha', 'en-US', { default: true })];
    const { expert, interviewer } = pickCallVoices(only, 'en-US', 'en-GB');
    expect(expert?.name).toBe('Samantha');
    expect(interviewer).toBeNull();
  });

  it('returns nothing at all when the platform has no English voice', () => {
    const { expert, interviewer } = pickCallVoices([voice('Anna', 'de-DE')], 'en-US', 'en-GB');
    expect(expert).toBeNull();
    expect(interviewer).toBeNull();
  });
});
