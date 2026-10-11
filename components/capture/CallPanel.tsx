'use client';

// Left column — the simulated call. Three states: idle (incoming call), active
// (in-call UI with waveform, live captions, controls, jump menu, contradiction
// card), and ended (summary + CTA to the Decision Canvas).

import Link from 'next/link';
import {
  Phone,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { TranscriptLine, KpiStat } from '@/components/mosaic';
import type { TranscriptTurn } from '@/lib/data';
import type { Rule } from '@/lib/engine/types';
import type { CallPlayback, Speed } from './useCallPlayback';
import { PHASE_ORDER } from './phases';
import type { PhaseLabel } from './phases';
import { computeCoverage } from './CoverageMeter';
import { ContradictionCard } from './ContradictionCard';

type Contradiction = import('@/lib/data').ContradictionFixture['contradiction'];

const SPEEDS: Speed[] = [1, 2, 4];
const JUMP_MOMENTS = [
  { t: '00:14:32', label: '00:14:32 — LEW rule (TS-07)' },
  { t: '00:23:10', label: '00:23:10 — Contradiction caught' },
];

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function Waveform({ active, expert }: { active: boolean; expert: boolean }) {
  const heights = [45, 75, 100, 60, 85];
  return (
    <span className="inline-flex h-5 items-end gap-0.5" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full',
            expert ? 'bg-recommend' : 'bg-accent',
            active ? 'animate-pulse' : 'opacity-40',
            'motion-reduce:animate-none',
          )}
          style={{ height: active ? `${h}%` : '30%', animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

function PhaseChips({ current }: { current: string }) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Interview phase">
      {PHASE_ORDER.map((p, i) => {
        const isCurrent = p === current;
        return (
          <li
            key={p}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
              isCurrent
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-line text-ink-muted',
            )}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {i + 1}. {p}
          </li>
        );
      })}
    </ol>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-full border border-line bg-surface-raised text-ink transition-colors hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  );
}

export function CallPanel({
  playback,
  expert,
  contradiction,
  turns,
  revealedRules,
  pillId,
  pillName,
}: {
  playback: CallPlayback;
  expert: { name: string; role: string; asset: string; retiring: string };
  contradiction: Contradiction;
  turns: TranscriptTurn[];
  revealedRules: Rule[];
  pillId: string;
  pillName: string;
}) {
  const { status } = playback;

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
      aria-label="Expert onboarding call"
    >
      {status === 'idle' ? (
        <IdleView expert={expert} onAccept={playback.accept} />
      ) : status === 'ended' ? (
        <EndedView
          playback={playback}
          coverage={computeCoverage(revealedRules).overall}
          pillId={pillId}
          pillName={pillName}
        />
      ) : (
        <ActiveView playback={playback} expert={expert} contradiction={contradiction} turns={turns} />
      )}
    </section>
  );
}

function IdleView({
  expert,
  onAccept,
}: {
  expert: { name: string; role: string; asset: string; retiring: string };
  onAccept: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span className="relative grid size-20 place-items-center rounded-full bg-accent/15">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/20 motion-reduce:animate-none" />
        <Phone className="size-8 text-accent" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-widest text-ink-muted">Incoming onboarding call</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">{expert.name}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {expert.role} · {expert.asset} · {expert.retiring}
        </p>
      </div>
      <button
        type="button"
        onClick={onAccept}
        autoFocus
        className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 text-base font-semibold text-accent-ink shadow-sm transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:transform-none"
      >
        <Phone className="size-5" aria-hidden="true" />
        Accept call
      </button>
      <p className="text-[11px] text-ink-muted">
        Simulated, fully offline voice call — no network, no API key.
      </p>
    </div>
  );
}

function ActiveView({
  playback,
  expert,
  contradiction,
  turns,
}: {
  playback: CallPlayback;
  expert: { name: string; role: string; asset: string; retiring: string };
  contradiction: Contradiction;
  turns: TranscriptTurn[];
}) {
  const { currentTurn, paused, muted, speed, turnIndex } = playback;
  const running = playback.status === 'active' && !paused;
  const isExpert = currentTurn?.speaker === expert.name;
  const extracted = currentTurn?.extracted_rule_ids ?? [];

  return (
    <>
      {/* Header: avatar, name, timer, phase */}
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/15 font-semibold text-accent">
          {expert.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{expert.name}</p>
          <p className="truncate text-xs text-ink-muted">
            {expert.role} · {expert.asset}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-line bg-surface-raised px-3 py-1.5">
          <Clock className="size-3.5 text-ink-muted" aria-hidden="true" />
          <span className="tabular-nums text-sm font-medium text-ink">{fmt(playback.elapsedSec)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Waveform active={running} expert={isExpert} />
        <span className="text-xs font-medium text-ink">
          {isExpert ? expert.name : 'MOSAIC'} {running ? 'is speaking…' : paused ? 'paused' : ''}
        </span>
        <span className="ml-auto rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-ink-muted">
          {playback.phase}
        </span>
      </div>

      <PhaseChips current={playback.phase as PhaseLabel} />

      {/* Live caption (always visible, polite live region for screen readers) */}
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-accent/30 bg-accent/5 p-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink">{currentTurn?.speaker}</span>
          {currentTurn?.t ? (
            <span className="tabular-nums text-xs text-ink-muted">{currentTurn.t}</span>
          ) : null}
        </div>
        <p className="mt-1 text-base leading-relaxed text-ink">{currentTurn?.text}</p>
        {extracted.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1" aria-label="Extracted rule candidates">
            {extracted.map((id) => (
              <span
                key={id}
                className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent"
              >
                {id}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Contradiction card */}
      {playback.contradictionVisible ? (
        <ContradictionCard data={contradiction} resolved={playback.contradictionResolved} />
      ) : null}

      {/* Running transcript log (historical context; the live region above is the
          single aria-live source). */}
      <div aria-hidden="true" className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
        {turns.slice(0, turnIndex + 1).map((turn, i) => (
          <TranscriptLine
            key={i}
            speaker={turn.speaker}
            timestamp={turn.t}
            text={turn.text}
            probeId={turn.probe_id ?? null}
            extractedRuleIds={turn.extracted_rule_ids}
            active={i === turnIndex}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <ControlButton label={paused ? 'Resume' : 'Pause'} onClick={playback.togglePause}>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </ControlButton>
        <ControlButton label="Skip to next turn" onClick={playback.skipNext}>
          <SkipForward className="size-4" />
        </ControlButton>
        <ControlButton
          label={muted ? 'Unmute (captions continue)' : 'Mute (captions continue)'}
          onClick={playback.toggleMute}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </ControlButton>

        <div
          className="ml-auto flex items-center gap-1 rounded-full border border-line bg-surface-raised p-1"
          role="group"
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => playback.setSpeed(s)}
              aria-pressed={speed === s}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                speed === s ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink',
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Jump to key moments */}
      <details className="rounded-lg border border-line bg-surface-raised/50 p-2.5 text-sm">
        <summary className="cursor-pointer select-none text-xs font-medium text-ink-muted">
          Jump to key moments
        </summary>
        <div className="mt-2 flex flex-col gap-1">
          {JUMP_MOMENTS.map((m) => (
            <button
              key={m.t}
              type="button"
              onClick={() => playback.jumpTo(m.t)}
              className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-left text-xs text-ink hover:border-accent"
            >
              {m.label}
            </button>
          ))}
        </div>
      </details>
    </>
  );
}

function EndedView({
  playback,
  coverage,
  pillId,
  pillName,
}: {
  playback: CallPlayback;
  coverage: number;
  pillId: string;
  pillName: string;
}) {
  const rulesCaptured = playback.revealedRuleIds.length;
  const contradictionsResolved = playback.contradictionResolved ? 1 : 0;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-recommend" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-ink">Call complete</h2>
      </div>
      <p className="text-sm text-ink-muted">
        The interview is transcribed and {rulesCaptured} rule candidates were extracted, each
        linked to its transcript span. Review and confirm them on the Decision Canvas.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiStat label="Duration" value={fmt(playback.elapsedSec)} />
        <KpiStat label="Rules captured" value={rulesCaptured} />
        <KpiStat label="Contradictions resolved" value={contradictionsResolved} />
        <KpiStat label="Coverage" value={`${coverage}%`} />
      </div>

      <Link
        href={`/canvas/${pillId}`}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:transform-none"
      >
        Review on Decision Canvas →
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <p className="text-[11px] text-ink-muted">
        {pillName} · {pillId}
      </p>
    </div>
  );
}
