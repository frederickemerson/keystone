'use client';

// "Hear the expert": speaks a provenance quote with window.speechSynthesis in a
// lower-pitched voice and exposes word-boundary progress for live captions.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ExpertVoiceState {
  supported: boolean;
  speaking: boolean;
  /** Text currently (or last) being spoken. */
  text: string | null;
  /** Character offset reached so far (for caption highlighting). */
  spokenTo: number;
}

function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  // Prefer a regional English voice close to the Singapore setting, else any English voice.
  return (
    voices.find((v) => /en-(sg|gb|au|in)/i.test(v.lang)) ?? voices.find((v) => v.default) ?? voices[0]
  );
}

export function useExpertVoice() {
  const [state, setState] = useState<ExpertVoiceState>({
    supported: false,
    speaking: false,
    text: null,
    spokenTo: 0,
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setState((s) => ({ ...s, supported }));
    if (supported) window.speechSynthesis.getVoices(); // warm the voice list
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setState((s) => ({ ...s, speaking: false }));
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      // No TTS: still show the caption so the quote is "heard" visually.
      setState({ supported: false, speaking: false, text, spokenTo: text.length });
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.6;
    u.rate = 0.95;
    const voice = pickVoice(synth);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.onboundary = (e) => {
      if (utteranceRef.current !== u) return;
      setState((s) => ({ ...s, spokenTo: e.charIndex + (e.charLength || 0) }));
    };
    u.onend = () => {
      if (utteranceRef.current !== u) return;
      setState((s) => ({ ...s, speaking: false, spokenTo: text.length }));
    };
    u.onerror = u.onend;
    utteranceRef.current = u;
    setState({ supported: true, speaking: true, text, spokenTo: 0 });
    synth.speak(u);
  }, []);

  return { ...state, speak, stop };
}
