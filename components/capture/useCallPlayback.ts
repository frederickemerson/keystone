'use client';

// Pure-ish state machine + speech effect for the simulated onboarding call.
//
// Responsibilities:
//  - drive turns in order (idle -> active -> ended)
//  - speak each turn through lib/speech/useVoice, which plays the audio
//    pre-rendered for this transcript (lib/speech/manifest) and falls back to
//    the browser's own voice only if that is unavailable; fall back to timed
//    captions when muted
//  - derive captured rule ids as a pure function of the current turn index
//    (every turn up to and including it), so jumps/skips match linear playback
//  - expose contradiction visibility/resolved flags derived from the active turn
//  - cancel speech on pause / unmount
//
// No network, no API key. Works fully offline.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TranscriptTurn } from '@/lib/data';
import { useVoice } from '@/lib/speech/useVoice';

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
  /** Where the voice speaking right now came from, so the caption can name it. */
  voiceLabel: string | null;
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

  const voice = useVoice();

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

    if (!muted) {
      // Advance when the voice finishes, but never before the caption has had
      // its reading time: a line that fails or ends instantly must not skip
      // the call. The safety net stays for a voice whose end never fires.
      const startedAt = Date.now();
      const minReadMs = Math.min(durationMs, Math.max(MIN_TURN_MS, durationMs * 0.6));
      voice.speak(turn.text, turn.speaker === expertName ? 'expert' : 'interviewer', {
        onEnded: () => {
          if (cancelled) return;
          const wait = minReadMs - (Date.now() - startedAt);
          if (wait <= 0) advance();
          else timerRef.current = setTimeout(advance, wait);
        },
      });
      safetyRef.current = setTimeout(advance, durationMs + 2_500);
    } else {
      // Timed-caption fallback.
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
      voice.stop();
    };
    // `voice` is a stable pair of callbacks; including the whole object would
    // restart the line on every progress tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, turnIndex, paused, muted, speed, turns, turnCount, expertName]);

  const accept = useCallback(() => {
    setStatus('active');
    setTurnIndex(0);
    setPaused(false);
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
    voiceLabel: voice.source?.label ?? null,
    accept,
    togglePause,
    skipNext,
    setSpeed,
    toggleMute,
    jumpTo,
  };
}
