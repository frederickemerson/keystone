'use client';

// Client component for the Expert Onboarding Call. Receives serialisable props
// from the server page and owns playback + layout. Reuses mosaic components.

import { useMemo } from 'react';
import { SectionHeader } from '@/components/mosaic';
import type { Rule } from '@/lib/engine/types';
import { computePhaseByTurn } from './phases';
import { useCallPlayback } from './useCallPlayback';
import { CallPanel } from './CallPanel';
import { CapturedPanel } from './CapturedPanel';
import type { CaptureProps } from './types';

export function ExpertCallClient(props: CaptureProps) {
  const { transcript, rules, provenance, contradiction, pillId, pillName } = props;

  const phaseByTurn = useMemo(
    () => computePhaseByTurn(transcript.turns),
    [transcript],
  );

  const contradictionStartT =
    transcript.turns.find((t) => t.probe_id === 'P28')?.t ?? '00:23:10';
  const contradictionResolvedT = contradiction.contradiction.resolution.resolved_at;

  const playback = useCallPlayback({
    turns: transcript.turns,
    phaseByTurn,
    contradictionStartT,
    contradictionResolvedT,
  });

  const expert = {
    name: transcript.expert.name,
    role: transcript.expert.role,
    asset: transcript.expert.assets_managed[0] ?? 'Harbourfront One',
    retiring: 'retiring Dec 2026',
  };

  const revealedRules = useMemo<Rule[]>(
    () =>
      playback.revealedRuleIds
        .map((id) => rules.find((r) => r.id === id))
        .filter((r): r is Rule => Boolean(r)),
    [playback.revealedRuleIds, rules],
  );

  return (
    <div className="space-y-6">
      {/* Locally-scoped keyframe for the "rule tile animates in" effect. Defined
          here (not in globals.css) to keep all capture-screen code within
          components/capture. Honors reduced-motion. */}
      <style>{`
        @keyframes mosaic-capture-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mosaic-capture-in { animation: mosaic-capture-in 0.5s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .mosaic-capture-in { animation: none; }
        }
      `}</style>

      <SectionHeader
        title="Expert Onboarding Call"
        description="Simulated voice interview — fully offline. MOSAIC extracts rule candidates, each linked to the exact transcript span."
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <CallPanel
          playback={playback}
          expert={expert}
          contradiction={contradiction.contradiction}
          turns={transcript.turns}
          revealedRules={revealedRules}
          pillId={pillId}
          pillName={pillName}
        />
        <CapturedPanel
          rules={rules}
          provenance={provenance}
          playback={playback}
          totalRules={rules.length}
        />
      </div>
    </div>
  );
}
