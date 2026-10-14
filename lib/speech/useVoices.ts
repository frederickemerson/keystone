'use client';

// The platform's voice list, which arrives asynchronously.
//
// `speechSynthesis.getVoices()` returns [] on the first call in Chrome and
// fills in later, firing `voicechanged`. Reading it once (as both callers used
// to) therefore gets nothing on a cold load and silently falls back to no
// voice at all, which is one more reason the audio was whatever the browser
// felt like. This subscribes instead.

import { useEffect, useState } from 'react';

export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const read = () => {
      try {
        setVoices(synth.getVoices());
      } catch {
        /* engine unavailable — stay with an empty list */
      }
    };
    read();
    synth.addEventListener?.('voiceschanged', read);
    return () => synth.removeEventListener?.('voiceschanged', read);
  }, []);

  return voices;
}
