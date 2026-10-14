// Spoken audio, kept so the same sentence is paid for once.
//
// The call speaks 56 turns and a viewer replays it; "hear the expert" speaks
// the same provenance quote every time the drawer opens. Synthesis is a metered
// network call, so without this a demo bills per playback and stutters while it
// waits. Keyed by the content, so a changed word is a different entry rather
// than a stale one.
//
// Deliberately in memory and per instance: the audio is derived data that can
// always be made again, so a cold start costs one call, not correctness.

import { createHash } from 'node:crypto';
import type { TtsSource } from './tts';

/** About 6 MB of mp3 at the ~13 KB a short turn measures — the whole call, several times over. */
export const MAX_CACHE_ENTRIES = 400;

export interface CachedSpeech {
  audio: ArrayBuffer;
  contentType: string;
  source: TtsSource;
}

/**
 * The cache key AND the HTTP ETag: synthesis is deterministic enough that the
 * same inputs may serve the same bytes, and a client that already holds this
 * hash does not need the audio again.
 */
export function speechKey(parts: { role: string; text: string; model: string; voice: string }): string {
  return createHash('sha256')
    .update([parts.role, parts.model, parts.voice, parts.text].join('\u0000'))
    .digest('hex')
    .slice(0, 32);
}

const entries = new Map<string, CachedSpeech>();

export function readSpeech(key: string): CachedSpeech | undefined {
  const hit = entries.get(key);
  if (!hit) return undefined;
  // Re-insert so the least recently USED is the one evicted, not the oldest written.
  entries.delete(key);
  entries.set(key, hit);
  return hit;
}

export function writeSpeech(key: string, value: CachedSpeech): void {
  entries.delete(key);
  entries.set(key, value);
  while (entries.size > MAX_CACHE_ENTRIES) {
    const oldest = entries.keys().next();
    if (oldest.done) break;
    entries.delete(oldest.value);
  }
}

/** Test seam, and the only way to empty it. */
export function resetSpeechCache(): void {
  entries.clear();
}

export function speechCacheSize(): number {
  return entries.size;
}
