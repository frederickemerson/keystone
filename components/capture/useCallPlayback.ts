'use client';

// Pure-ish state machine + speech effect for the simulated onboarding call.
//
// Responsibilities:
//  - drive turns in order (idle -> active -> ended)
//  - speak each turn with window.speechSynthesis (Keystone vs expert voice via
//    pitch + voice selection); fall back to timed captions when speech is
//    unavailable or muted
//  - derive captured rule ids as a pure function of the current turn index
//    (every turn up to and including it), so jumps/skips match linear playback
//  - expose contradiction visibility/resolved flags derived from the active turn
//  - cancel speech on pause / unmount
//
// No network, no API key. Works fully offline.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TranscriptTurn } from '@/lib/data';

export type CallStatus = 'idle' | 'active' | 'ended';
export type Speed = 1 | 2 | 4;

export interface CallPlayback {
  status: CallStatus;
  turnIndex: number;
  paused: boolean;
  speed: Speed;
  muted: boolean;
  /** Transcript (call) time of the current turn, "HH:MM:SS" — never wall time. */
  callTime: string;
  revealedRuleIds: string[];
  contradictionVisible: boolean;
  contradictionResolved: boolean;
  currentTurn: TranscriptTurn | undefined;
  phase: string;
  accept: () => void;
  togglePause: () => void;
  skipNext: () => void;
  setSpeed: (s: Speed) => void;
  toggleMute: () => void;
  jumpTo: (t: string) => void;
}

const WORDS_PER_SEC = 2.8;
const MIN_TURN_MS = 1400;

function firstGeo(turns: TranscriptTurn[], t: string): number {
  const idx = turns.findIndex((turn) => (turn.t ?? '') >= t);
  return idx < 0 ? turns.length - 1 : idx;
}

/** Rule ids extracted from turns[0..turnIndex], de-duplicated in first-seen order. */
export function capturedRuleIds(
  turns: readonly Pick<TranscriptTurn, 'extracted_rule_ids'>[],
  turnIndex: number,
): string[] {
  const out: string[] = [];
  for (const turn of turns.slice(0, Math.max(0, turnIndex + 1))) {
    for (const id of turn.extracted_rule_ids ?? []) if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function useCallPlayback(args: {
  turns: TranscriptTurn[];
  /** Transcript `expert.name` — identifies the expert's turns (voice + captions). */
  expertName: string;
  phaseByTurn: string[];
  contradictionStartT: string;
  contradictionResolvedT: string;
}): CallPlayback {
  const { turns, expertName, phaseByTurn, contradictionStartT, contradictionResolvedT } = args;

  const [status, setStatus] = useState<CallStatus>('idle');
  const [turnIndex, setTurnIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [muted, setMuted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const turnCount = turns.length;
  const currentTurn = turns[turnIndex];
  const phase = phaseByTurn[turnIndex] ?? '';

  // Captured rule ids: every id extracted from turns 0..turnIndex, in order of
  // first appearance. A pure function of the turn index, so jumping to a key
  // moment shows exactly what linear playback would have captured by then.
  const revealedRuleIds = useMemo(
    () => (status === 'idle' ? [] : capturedRuleIds(turns, turnIndex)),
    [status, turns, turnIndex],
  );

  // Contradiction card appears when we reach the contradiction turn and (optionally)
  // the resolved distinguishing condition once the expert has answered.
  const currentT = currentTurn?.t ?? '';
  const contradictionVisible = status !== 'idle' && currentT >= contradictionStartT;
  const contradictionResolved = status !== 'idle' && currentT >= contradictionResolvedT;

  // Speech + advance scheduling for the current turn.
  useEffect(() => {
    if (status !== 'active' || paused) return;
    const turn = turns[turnIndex];
    if (!turn) return;

    const words = turn.text.split(/\s+/).filter(Boolean).length;
    const durationMs = Math.max(MIN_TURN_MS, (words / WORDS_PER_SEC) * 1000 / speed);
    let cancelled = false;

    const advance = () => {
      if (cancelled) return;
      setTurnIndex((i) => {
        const next = i + 1;
        if (next >= turnCount) {
          setStatus('ended');
          return i;
        }
        return next;
      });
    };

    const synth =
      typeof window !== 'undefined' ? window.speechSynthesis : undefined;

    if (synth && !muted) {
      try {
        const u = new SpeechSynthesisUtterance(turn.text);
        u.rate = speed;
        u.pitch = turn.speaker === expertName ? 0.55 : 1.0;
        const voices = synth.getVoices?.() ?? [];
        const pick = (langs: string[]) =>
          voices.find((v) => langs.some((l) => v.lang?.toLowerCase().startsWith(l)));
        const voice =
          turn.speaker === expertName
            ? pick(['en-us', 'en-au']) ?? voices[0]
            : pick(['en-gb', 'en-sg', 'en-uk']) ?? voices[0];
        if (voice) u.voice = voice;
        u.onend = advance;
        u.onerror = advance;
        synth.cancel();
        synth.speak(u);
        // Safety net in case onend never fires.
        safetyRef.current = setTimeout(advance, durationMs + 1500);
      } catch {
        timerRef.current = setTimeout(advance, durationMs);
      }
    } else {
      // Timed-caption fallback (muted or no speechSynthesis).
      timerRef.current = setTimeout(advance, durationMs);
    }

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      if (safetyRef.current) {
        clearTimeout(safetyRef.current);
        safetyRef.current = undefined;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* no-op */
        }
      }
    };
  }, [status, turnIndex, paused, muted, speed, turns, turnCount, expertName]);

  const accept = useCallback(() => {
    setStatus('active');
    setTurnIndex(0);
    setPaused(false);
    // Prime the speech engine inside the user gesture (some browsers gate TTS).
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* no-op */
      }
    }
  }, []);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  const skipNext = useCallback(() => {
    setTurnIndex((i) => {
      const next = i + 1;
      if (next >= turnCount) {
        setStatus('ended');
        return i;
      }
      return next;
    });
  }, [turnCount]);

  const setSpeed = useCallback((s: Speed) => setSpeedState(s), []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const jumpTo = useCallback(
    (t: string) => {
      if (status === 'idle') return;
      const idx = firstGeo(turns, t);
      setPaused(false);
      setTurnIndex(idx);
    },
    [status, turns],
  );

  return {
    status,
    turnIndex,
    paused,
    speed,
    muted,
    callTime: currentT,
    revealedRuleIds,
    contradictionVisible,
    contradictionResolved,
    currentTurn,
    phase,
    accept,
    togglePause,
    skipNext,
    setSpeed,
    toggleMute,
    jumpTo,
  };
}
