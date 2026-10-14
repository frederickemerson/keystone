'use client';

// "Hear the expert": speaks a provenance quote with window.speechSynthesis and
// exposes word-boundary progress for live captions. The voice is the best one
// the platform offers (lib/speech/voices), not the first English one in the
// list, and its pitch is left alone — see that module for why both mattered.

import { useCallback, useEffect, useRef, useState } from 'react';
import { rankVoices } from '@/lib/speech/voices';

export interface ExpertVoiceState {
  supported: boolean;
  speaking: boolean;
  /** Text currently (or last) being spoken. */
  text: string | null;
  /** Character offset reached so far (for caption highlighting). */
  spokenTo: number;
  /** The voice that spoke, so a caption can name it instead of just saying "synthetic". */
  voiceName: string | null;
}

/** The setting is Singapore; no platform ships an en-SG voice, so this only orders English ones. */
const EXPERT_LANG = 'en-SG';

function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  return rankVoices(synth.getVoices(), EXPERT_LANG)[0];
}

/**
 * TTS is usable only when both the engine and the utterance constructor exist
 * (some browsers / webviews / privacy modes expose one without the other).
 */
function speechAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

function cancelSpeech(): void {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* engine unavailable — nothing to cancel */
  }
}

export function useExpertVoice() {
  const [state, setState] = useState<ExpertVoiceState>({
    supported: false,
    speaking: false,
    text: null,
    spokenTo: 0,
    voiceName: null,
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const supported = speechAvailable();
    setState((s) => ({ ...s, supported }));
    if (supported) {
      try {
        window.speechSynthesis.getVoices(); // warm the voice list
      } catch {
        /* voices load lazily; pickVoice copes with none */
      }
    }
    return cancelSpeech;
  }, []);

  const stop = useCallback(() => {
    cancelSpeech();
    utteranceRef.current = null;
    setState((s) => ({ ...s, speaking: false }));
  }, []);

  const speak = useCallback((text: string) => {
    // No TTS (or it fails): still show the caption so the quote is "heard" visually.
    const captionOnly = () => {
      utteranceRef.current = null;
      setState({
        supported: false,
        speaking: false,
        text,
        spokenTo: text.length,
        voiceName: null,
      });
    };
    if (!speechAvailable()) {
      captionOnly();
      return;
    }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      // `pitch` left at its default: 0.6 was most of why this sounded synthetic.
      u.rate = 0.95;
      const voice = pickVoice(synth);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.onboundary = (e) => {
        if (utteranceRef.current !== u) return;
        setState((s) => ({
          ...s,
          spokenTo: e.charIndex + (e.charLength || 0),
        }));
      };
      u.onend = () => {
        if (utteranceRef.current !== u) return;
        setState((s) => ({ ...s, speaking: false, spokenTo: text.length }));
      };
      u.onerror = u.onend;
      utteranceRef.current = u;
      setState({ supported: true, speaking: true, text, spokenTo: 0, voiceName: voice?.name ?? null });
      synth.speak(u);
    } catch {
      captionOnly();
    }
  }, []);

  return { ...state, speak, stop };
}
