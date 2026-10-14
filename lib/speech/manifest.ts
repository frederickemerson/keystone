// Audio rendered ahead of time, for text that is fixed.
//
// Why: the recorded expert call is 56 turns. Synthesising those on playback
// costs 56 metered calls, and the live-AI budget allows 10 a minute
// (lib/ratelimit/policies LIMITS.llm) — so a viewer pressing "accept call"
// would be rate-limited inside the first minute, every time. The transcript
// never changes, so its audio never changes: it is rendered once by
// scripts/prerender-speech.mjs, committed under public/speech, and served as a
// static file. No key, no quota, no network beyond the page's own origin, and
// it works with the venue wifi down.
//
// Three tiers, in this order: this manifest for fixed text, POST /api/speech
// for anything typed at runtime, then the browser's own voice if neither can
// answer (lib/speech/voices). Each tier is named in the UI, so what you are
// hearing is never a mystery.
//
// Client-safe: no node APIs, so the lookup key is the text itself rather than
// a hash the browser cannot compute.

import entries from '@/data/speech/manifest.json';
import type { TtsRole } from './roles';

export interface SpeechManifestEntry {
  role: TtsRole;
  /** Verbatim text this audio speaks. The lookup key, with the role. */
  text: string;
  /** Path under public/, e.g. "/speech/expert-0007.mp3". */
  file: string;
  model: string;
  voice: string;
  /** Where it was synthesised, carried through so the UI can still say so. */
  region: string;
  bytes: number;
}

export interface SpeechManifest {
  generatedAt: string;
  entries: SpeechManifestEntry[];
}

const manifest = entries as SpeechManifest;

function key(role: TtsRole, text: string): string {
  return `${role}\u0000${text.trim()}`;
}

const byKey = new Map(manifest.entries.map((e) => [key(e.role, e.text), e]));

/** The pre-rendered audio for this exact text, or undefined. */
export function prerendered(role: TtsRole, text: string): SpeechManifestEntry | undefined {
  return byKey.get(key(role, text));
}

export function manifestSize(): number {
  return byKey.size;
}

export function manifestGeneratedAt(): string {
  return manifest.generatedAt;
}
