'use client';

// Client component for the Expert Onboarding Call. Receives serialisable props
// from the server page and owns playback + layout. Reuses mosaic components.
// Confirming a rule here is the Decision Canvas review itself (governance
// store reviewRule), so the verdict carries over; `seekTo` (?at=) starts the
// call at that moment.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Play } from 'lucide-react';
import { PageHeader } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { HandoffButton } from '@/components/journey/HandoffButton';
import type { Pill, Rule } from '@/lib/engine/types';
import { pillEditAuthority } from '@/lib/governance/access';
import { reviewKey, useGovernanceStore, type RuleReviewOutcome, type RuleReviewRecord } from '@/lib/governance/store';
import { currentApproved } from '@/lib/governance/versions';
import { suggestHandoff } from '@/lib/journey/handoff';
import { routes } from '@/lib/journey/routes';
import { callTileStates } from '@/components/incident/expertCall';
import { computePhaseByTurn } from './phases';
import { useCallPlayback } from './useCallPlayback';
import { CallPanel } from './CallPanel';
import { CapturedPanel } from './CapturedPanel';
import { LiveExtractionPanel } from './LiveExtractionPanel';
import type { CaptureProps } from './types';

const NO_REVIEWS: Record<string, RuleReviewRecord> = {};

export function ExpertCallClient(
  props: CaptureProps & {
    /** The target pill's file version, to seed the governance store (Canvas reviews live there). */
    pill: Pill | null;
    /** "HH:MM:SS" from ?at=: offer to start the call at that moment. */
    seekTo?: string;
  },
) {
  const { transcript, rules, provenance, contradiction, pillId, pillName, pill, seekTo } = props;
  const mounted = useMounted();
  const router = useRouter();

  const phaseByTurn = useMemo(
    () => computePhaseByTurn(transcript.turns),
    [transcript],
  );

  const contradictionStartT =
    transcript.turns.find((t) => t.probe_id === 'P28')?.t ?? '00:23:10';
  const contradictionResolvedT = contradiction.contradiction.resolution.resolved_at;

  const playback = useCallPlayback({
    turns: transcript.turns,
    expertName: transcript.expert.name,
    phaseByTurn,
    contradictionStartT,
    contradictionResolvedT,
  });

  // ?at=: once the call is accepted (here or in the call panel), jump to that moment once.
  const [pendingSeek, setPendingSeek] = useState(seekTo);
  const { status, jumpTo } = playback;
  useEffect(() => {
    if (status !== 'active' || !pendingSeek) return;
    jumpTo(pendingSeek);
    setPendingSeek(undefined);
  }, [status, pendingSeek, jumpTo]);

  // Canvas reviews from the governance store: the same record the Decision Canvas reads.
  const seedPills = useGovernanceStore((s) => s.seedPills);
  const currentActor = useGovernanceStore((s) => s.currentActor);
  const history = useGovernanceStore((s) => s.versions[pillId]);
  const allReviews = useGovernanceStore((s) => s.ruleReviews);
  const reviewRule = useGovernanceStore((s) => s.reviewRule);
  useEffect(() => {
    if (pill) seedPills([{ id: pillId, pill }]);
  }, [pill, pillId, seedPills]);
  const live = mounted && history ? currentApproved(history) : undefined;
  const reviews = (live && allReviews[reviewKey(pillId, live.version)]) || NO_REVIEWS;
  const tileStates = useMemo(() => callTileStates(reviews), [reviews]);

  const policy = pill
    ? { owner: pill.manifest.owner, steward: pill.manifest.steward, approver: pill.manifest.approver, access: pill.manifest.access }
    : null;
  const authority = policy && mounted ? pillEditAuthority(currentActor.role, policy) : { allowed: false };
  const canReview = authority.allowed && live !== undefined;
  const handoffTo =
    mounted && policy && !authority.allowed
      ? suggestHandoff((a) => pillEditAuthority(a.role, policy).allowed, currentActor)
      : undefined;

  const [reviewError, setReviewError] = useState<string | null>(null);
  const review = (ruleId: string, outcome: RuleReviewOutcome) => {
    setReviewError(null);
    try {
      reviewRule({ pillId, ruleId, outcome });
    } catch (err) {
      setReviewError((err as Error).message);
    }
  };

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

      <PageHeader
        eyebrow={
          <>
            <span>Expert call</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[12px]">{transcript.interview_id}</span>
          </>
        }
        title="Expert onboarding call"
        subtitle="Rule candidates appear as the expert speaks, each linked to its transcript span. Confirming one here records it on the decision canvas."
        actions={
          <Link href={routes.canvas(pillId)} className="btn-pill text-xs">
            <LayoutGrid className="size-3.5" aria-hidden="true" /> Review on the decision canvas
          </Link>
        }
      />
      {pendingSeek && playback.status === 'idle' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line-strong/70 bg-surface px-4 py-3">
          <p className="min-w-0 flex-1 text-[14px] text-ink">
            You came here for the moment at <span className="font-mono tabular-nums">{pendingSeek}</span>.
          </p>
          <button type="button" onClick={playback.accept} autoFocus className="btn-pill btn-pill-primary text-xs">
            <Play className="size-3.5" aria-hidden="true" /> Play from {pendingSeek}
          </button>
        </div>
      ) : null}
      {mounted && !authority.allowed ? (
        handoffTo ? (
          <HandoffButton
            to={handoffTo}
            href={routes.capture(seekTo)}
            action="confirm these rules"
            reason={`${handoffTo.name} confirms these rules; you can listen.`}
            className="rounded-xl border border-line bg-dew-drop/60 px-4 py-3"
          />
        ) : (
          <p className="text-[13px] text-ink-muted">You can listen; confirming rules needs someone who may edit this pill.</p>
        )
      ) : null}
      {reviewError ? (
        <p role="alert" className="text-[13px] text-blocked">
          Not recorded: {reviewError}
        </p>
      ) : null}
      <LiveExtractionPanel transcript={transcript} rules={rules} liveProvider={props.liveProvider} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <CallPanel
          playback={playback}
          expert={expert}
          contradiction={contradiction.contradiction}
          turns={transcript.turns}
          revealedRules={revealedRules}
          pillId={pillId}
          pillName={pillName}
          duration={transcript.duration}
          focusAccept={!pendingSeek}
        />
        <CapturedPanel
          rules={rules}
          provenance={provenance}
          playback={playback}
          totalRules={rules.length}
          confirmed={tileStates}
          onConfirm={canReview ? (id) => review(id, 'confirmed') : undefined}
          onEdit={canReview ? (id) => router.push(routes.canvas(pillId, id)) : undefined}
          onReject={canReview ? (id) => review(id, 'rejected') : undefined}
        />
      </div>
    </div>
  );
}
