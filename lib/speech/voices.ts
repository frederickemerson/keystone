// Choosing a speech-synthesis voice that sounds like a person.
//
// Why this exists: both places that spoke (the expert call and "hear the
// expert") picked a voice with `voices.find(v => v.lang.startsWith('en-us'))`
// and then set `pitch` to 0.55. Taking the FIRST voice whose language matches
// takes whatever order the platform happens to list — on macOS that set
// includes Albert, Bahh, Trinoids and Zarvox, which are novelty voices, not
// narration voices — and pitch-shifting a voice down is most of what makes
// synthesis sound mechanical. The result was a robot, from two causes that had
// nothing to do with which voices were available.
//
// The Web Speech API exposes no quality field, so the ranking below uses the
// signals it DOES carry, strongest first, rather than guessing from names:
//
//   - `name` containing "(Premium)" or "(Enhanced)": macOS's own quality
//     grading, which it writes into the voice name. The platform's label, not
//     our opinion of it.
//   - `localService === false`: a network voice. In Chrome these are Google's
//     ("Google UK English Male"), which are markedly more natural than the
//     stock on-device set.
//   - `default === true`: the platform's own pick for the language.
//
// NARRATION_VOICES only adds a bonus and never disqualifies, so a good voice
// nobody listed here can still win on the signals above; it exists so that on
// a machine with only on-device voices we land on Samantha rather than Bahh.

/** The fields of `SpeechSynthesisVoice` the ranking reads, so it is testable without a browser. */
export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

/**
 * On-device voices built for reading prose, across macOS, Windows and Android.
 * A bonus only — see the note above.
 */
const NARRATION_VOICES: readonly string[] = [
  'Samantha', 'Alex', 'Ava', 'Allison', 'Susan', 'Tom', 'Victoria', 'Serena', 'Zoe', 'Evan', 'Nathan',
  'Daniel', 'Kate', 'Oliver', 'Karen', 'Lee', 'Moira', 'Tessa', 'Fiona', 'Rishi', 'Veena',
  'Microsoft Zira', 'Microsoft David', 'Microsoft Mark', 'Microsoft Aria', 'Microsoft Guy',
];

const PREMIUM = 400;
const ENHANCED = 300;
const NETWORK = 200;
const NARRATION = 100;
const PLATFORM_DEFAULT = 50;
const EXACT_LANG = 30;
const SAME_LANGUAGE = 10;

/** Compares language tags case-insensitively: "en-GB" and "en-gb" are the same tag. */
function sameTag(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** "en-GB" -> "en". */
function base(tag: string): string {
  return tag.toLowerCase().split('-')[0] ?? '';
}

/**
 * How well a voice suits reading a person's words aloud, higher is better.
 * Exported for the test that pins the ordering of the signals.
 */
export function voiceScore(voice: VoiceLike, preferredLang: string): number {
  let score = 0;
  if (/\(premium\)/i.test(voice.name)) score += PREMIUM;
  else if (/\(enhanced\)/i.test(voice.name)) score += ENHANCED;
  if (!voice.localService) score += NETWORK;
  if (NARRATION_VOICES.some((n) => voice.name.includes(n))) score += NARRATION;
  if (voice.default) score += PLATFORM_DEFAULT;
  if (sameTag(voice.lang, preferredLang)) score += EXACT_LANG;
  else if (base(voice.lang) === base(preferredLang)) score += SAME_LANGUAGE;
  return score;
}

/**
 * The best voices for `preferredLang`, best first, limited to that base
 * language. Voices in another language are left out entirely rather than
 * ranked low: an English sentence read by a German voice is worse than silence.
 *
 * Ties break on name so the same machine picks the same voice every run — a
 * demo that sounds different on the second take is a bug.
 */
export function rankVoices<T extends VoiceLike>(voices: readonly T[], preferredLang: string): T[] {
  return voices
    .filter((v) => base(v.lang) === base(preferredLang))
    .map((v) => ({ v, score: voiceScore(v, preferredLang) }))
    .sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name))
    .map((entry) => entry.v);
}

/**
 * Two distinguishable voices: one for the expert, one for the interviewer.
 *
 * The call used to tell them apart by setting the expert's pitch to 0.55,
 * which is exactly what made him sound synthetic. Two different voices carry
 * the distinction for free, and `pitch` is left alone. `interviewer` is null
 * when the platform offers only one English voice, and the caller then speaks
 * both parts in it — captions already name the speaker.
 */
export function pickCallVoices<T extends VoiceLike>(
  voices: readonly T[],
  expertLang: string,
  interviewerLang: string,
): { expert: T | null; interviewer: T | null } {
  const expert = rankVoices(voices, expertLang)[0] ?? rankVoices(voices, 'en')[0] ?? null;
  const interviewer =
    rankVoices(voices, interviewerLang).find((v) => v.name !== expert?.name) ??
    rankVoices(voices, 'en').find((v) => v.name !== expert?.name) ??
    null;
  return { expert, interviewer: interviewer ?? null };
}
