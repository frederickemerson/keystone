'use client';

// One hook for everything Keystone says out loud.
//
// Three tiers, tried in this order, each named in the UI so a listener always
// knows what they are hearing:
//
//   1. prerendered — a static file for text that never changes (the recorded
//      call). No key, no quota, no network beyond this origin. See
//      lib/speech/manifest for why this tier has to exist.
//   2. server — POST /api/speech, for text typed at runtime. Metered, so the
//      answer is cached by content on both sides.
//   3. browser — window.speechSynthesis, the best voice the platform offers
//      (lib/speech/voices). Always available, never as good, and labelled as
//      such rather than passed off as the same thing.
//
// Progress is reported as a 0..1 fraction rather than a character offset: real
// audio has no word-boundary events, and a fraction drives a caption just as
// well from either source.

import { useCallback, useEffect, useRef, useState } from 'react';
import { prerendered } from './manifest';
import type { TtsRole } from './roles';
import { rankVoices } from './voices';

export type VoiceTier = 'prerendered' | 'server' | 'browser';

export interface VoiceSource {
  tier: VoiceTier;
  /** What the UI shows: "GPT-4o mini TTS · onyx · pre-rendered" or "Browser voice (Samantha)". */
  label: string;
  model?: string;
  voice?: string;
  region?: string;
}

export interface VoiceState {
  speaking: boolean;
  /** The text being spoken, or the last one spoken. */
  text: string | null;
  /** How far through that text, 0..1. */
  progress: number;
  source: VoiceSource | null;
  /** Set when every tier refused, so the caller can show a reason rather than silence. */
  error: string | null;
}

/** The setting is Singapore; no platform ships an en-SG voice, so this only orders English ones. */
const BROWSER_LANG = 'en-SG';

/** Blob URLs for audio bought from /api/speech, so one session pays once. */
const blobCache = new Map<string, string>();

function cacheKey(role: TtsRole, text: string): string {
  return `${role}\u0000${text.trim()}`;
}

function speechAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function useVoice() {
  const [state, setState] = useState<VoiceState>({
    speaking: false,
    text: null,
    progress: 0,
    source: null,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Bumped on every stop and every new line, so a slow fetch that lands late
  // cannot start playing over whatever is speaking now.
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    generationRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current = null;
    }
    utteranceRef.current = null;
    try {
      if (speechAvailable()) window.speechSynthesis.cancel();
    } catch {
      /* engine unavailable — nothing to cancel */
    }
    setState((s) => ({ ...s, speaking: false }));
  }, []);

  useEffect(() => stop, [stop]);

  const speak = useCallback(
    (text: string, role: TtsRole, opts?: { onEnded?: () => void }) => {
      stop();
      const generation = generationRef.current;
      const current = () => generationRef.current === generation;
      const trimmed = text.trim();
      if (!trimmed) return;

      const finish = () => {
        if (!current()) return;
        setState((s) => ({ ...s, speaking: false, progress: 1 }));
        opts?.onEnded?.();
      };

      const playUrl = (url: string, source: VoiceSource) => {
        if (!current()) return;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.ontimeupdate = () => {
          if (!current() || !audio.duration) return;
          setState((s) => ({ ...s, progress: Math.min(1, audio.currentTime / audio.duration) }));
        };
        audio.onended = finish;
        audio.onerror = () => {
          if (current()) browserVoice('The audio file could not be played.');
        };
        setState({ speaking: true, text: trimmed, progress: 0, source, error: null });
        void audio.play().catch(() => {
          // Autoplay refused until the viewer interacts: the browser voice is
          // gated the same way, so report rather than silently retry.
          if (current()) setState((s) => ({ ...s, speaking: false, error: 'Press play to allow audio.' }));
        });
      };

      const browserVoice = (reason: string | null) => {
        if (!current()) return;
        if (!speechAvailable()) {
          // No tier can speak. Show the whole caption at once so the words are
          // still read, and say why there is no sound.
          setState({
            speaking: false,
            text: trimmed,
            progress: 1,
            source: null,
            error: reason ?? 'This browser cannot speak.',
          });
          opts?.onEnded?.();
          return;
        }
        try {
          const synth = window.speechSynthesis;
          synth.cancel();
          const utterance = new SpeechSynthesisUtterance(trimmed);
          const voice = rankVoices(synth.getVoices(), BROWSER_LANG)[0];
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          }
          // `pitch` left alone on purpose — see lib/speech/voices.
          utterance.rate = 0.98;
          utterance.onboundary = (event) => {
            if (!current() || utteranceRef.current !== utterance) return;
            setState((s) => ({ ...s, progress: Math.min(1, event.charIndex / trimmed.length) }));
          };
          utterance.onend = finish;
          utterance.onerror = finish;
          utteranceRef.current = utterance;
          setState({
            speaking: true,
            text: trimmed,
            progress: 0,
            source: {
              tier: 'browser',
              label: voice ? `Browser voice (${voice.name})` : 'Browser voice',
              voice: voice?.name,
            },
            error: reason,
          });
          synth.speak(utterance);
        } catch {
          finish();
        }
      };

      // Tier 1: a file rendered ahead of time.
      const fixed = prerendered(role, trimmed);
      if (fixed) {
        playUrl(fixed.file, {
          tier: 'prerendered',
          label: `${fixed.model} · ${fixed.voice} · pre-rendered`,
          model: fixed.model,
          voice: fixed.voice,
          region: fixed.region,
        });
        return;
      }

      // Tier 2: bought once, replayed from the blob.
      const key = cacheKey(role, trimmed);
      const cached = blobCache.get(key);
      if (cached) {
        playUrl(cached, { tier: 'server', label: 'Synthesised voice (cached)' });
        return;
      }

      setState({ speaking: false, text: trimmed, progress: 0, source: null, error: null });
      void (async () => {
        try {
          const response = await fetch('/api/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: trimmed, role }),
          });
          if (!response.ok) {
            browserVoice(
              response.status === 503
                ? 'No speech service is configured, so this is the browser’s own voice.'
                : 'The speech service could not answer, so this is the browser’s own voice.',
            );
            return;
          }
          const model = response.headers.get('X-Speech-Model') ?? 'synthesised';
          const voice = response.headers.get('X-Speech-Voice') ?? role;
          const region = response.headers.get('X-Speech-Region') ?? undefined;
          const url = URL.createObjectURL(await response.blob());
          blobCache.set(key, url);
          playUrl(url, {
            tier: 'server',
            label: `${model} · ${voice}${region ? ` · ${region}` : ''}`,
            model,
            voice,
            region,
          });
        } catch {
          browserVoice('The speech service could not be reached, so this is the browser’s own voice.');
        }
      })();
    },
    [stop],
  );

  return { ...state, speak, stop };
}
