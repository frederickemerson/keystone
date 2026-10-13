'use client';

// Live elicitation: ask the provider chain for the next probe over the call so
// far, and for a contradiction against what the expert has already said.
//
// Everything here is a suggestion. The call keeps playing its recorded script;
// nothing on this panel is captured, confirmed or applied, and a probe has no
// rule fields, so there is nothing in it a gate could read.

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, MessageSquareQuote } from 'lucide-react';
import { LlmBadge } from '@/components/mosaic/LlmBadge';
import { LLM_CLIENT_WAIT_MS, type Generation } from '@/lib/llm/attribution';
import type { ProbeDraft } from '@/lib/llm/interview';
import { requestLive } from '@/lib/llm/live-request';
import { probePhase } from './phases';
import type { CaptureProps } from './types';

const WAIT_S = LLM_CLIENT_WAIT_MS / 1000;

type Props = Pick<CaptureProps, 'transcript' | 'rules' | 'liveProvider'> & {
  /** The turn the call is on: the interviewer only ever sees the call so far. */
  turnIndex: number;
  /** Rule ids captured so far (playback `revealedRuleIds`). */
  revealedRuleIds: string[];
};

/** The reason shown instead of a probe when the request itself did not land. */
type Outcome = Generation<ProbeDraft | null>;

export function LiveProbePanel({ transcript, rules, liveProvider, turnIndex, revealedRuleIds }: Props) {
  const [result, setResult] = useState<Outcome | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const inFlight = useRef<AbortController | null>(null);
  const loading = startedAt !== null;

  useEffect(() => {
    if (startedAt === null) return;
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(tick);
  }, [startedAt]);
  useEffect(() => () => inFlight.current?.abort(), []);

  const capturedRules = revealedRuleIds
    .map((id) => rules.find((rule) => rule.id === id))
    .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    .map((rule) => ({ rule_id: rule.id, title: rule.title, decision: rule.decision }));
  // A probe is only an elicitation probe if it is compared against what is
  // already captured, so the server requires at least one captured rule.
  const ready = capturedRules.length > 0;

  async function probe() {
    const controller = new AbortController();
    inFlight.current = controller;
    setResult(null);
    setElapsed(0);
    setStartedAt(Date.now());
    try {
      const generation = await requestLive<ProbeDraft | null>('/api/llm/probe', {
        interviewId: transcript.interview_id,
        expertName: transcript.expert.name,
        capturedRules,
        turns: transcript.turns.slice(0, turnIndex + 1).map((turn) => ({
          t: turn.t, speaker: turn.speaker, text: turn.text,
          ...(turn.probe_id ? { probe_id: turn.probe_id } : {}),
          ...(turn.extracted_rule_ids?.length ? { rule_ids: turn.extracted_rule_ids } : {}),
        })),
      }, {
        signal: controller.signal,
        // No invented probe on the client: if the request did not land, the
        // panel shows why and nothing else.
        fallback: (reason) => ({
          data: null, source: 'recorded', provider: 'fixtures', model: 'hy4-preview', latencyMs: 0, attempts: [], reason,
        }),
      });
      setResult(generation);
    } catch {
      // Aborted by unmount; nothing to show.
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setStartedAt(null);
      }
    }
  }

  const draft = result?.data ?? null;
  const phase = draft ? probePhase(draft.probe.probe_id) : undefined;
  const label = liveProvider
    ? (loading ? `Probing with ${liveProvider}…` : 'Ask for the next probe')
    : (loading ? 'Loading recorded probe…' : 'Show the recorded probe');

  return (
    <section
      className="space-y-3 rounded-xl border border-line bg-surface px-4 py-3"
      aria-label="Live elicitation probe"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button" className="btn-pill text-xs" disabled={loading || !ready} onClick={probe}
          title={
            ready
              ? (liveProvider
                ? `Tries ${liveProvider} first over the call so far; falls back to the recorded probe.`
                : 'No live provider is configured; shows the recorded probe.')
              : 'Available once the call has captured its first rule.'
          }
        >
          <MessageSquareQuote className="size-3.5" aria-hidden="true" /> {label}
        </button>
        {/* Empty until something has actually been produced: a badge before the
            first request would label output that does not exist yet. */}
        <span role="status" className="text-xs text-ink-muted">
          {loading
            ? (liveProvider
              ? <span className="tabular-nums">{elapsed} s of {WAIT_S} s, then the recorded probe</span>
              : 'Loading recorded output')
            : result ? <LlmBadge result={result} /> : null}
        </span>
        {result ? (
          <button type="button" className="btn-pill text-xs" onClick={() => setResult(null)}>Dismiss probe</button>
        ) : null}
        <p className="text-xs text-ink-muted">
          {ready
            ? `Next probe + contradiction check over ${turnIndex + 1} turns and ${capturedRules.length} captured rule${capturedRules.length === 1 ? '' : 's'}`
            : 'Available once the call has captured its first rule'}
        </p>
      </div>

      {result?.reason ? (
        <p className="text-xs text-ink-muted">{result.source === 'live' ? 'Live' : 'Recorded'} · {result.reason}</p>
      ) : null}

      {draft ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-approval">
            Draft suggestion — Keystone has not asked this, and it confirms nothing. {transcript.expert.name} answers
            it on the call; only his answer is captured.
          </p>
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs text-ink-muted">
              Suggested probe · <span className="font-mono">{draft.probe.probe_id}</span>
              {phase ? <> · {phase}</> : null}
              {draft.probe.targets_rule_id ? <> · on <span className="font-mono">{draft.probe.targets_rule_id}</span></> : null}
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink">“{draft.probe.question}”</p>
            <p className="mt-1.5 text-xs text-ink-muted">{draft.probe.intent}</p>
          </div>

          {draft.contradiction ? (
            <div className="rounded-lg border border-approval/40 bg-approval-tint p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-approval">
                <AlertTriangle className="size-4" aria-hidden="true" /> Contradiction found against what he already said
              </p>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                {[draft.contradiction.statement_a, draft.contradiction.statement_b].map((statement, i) => (
                  <div key={statement.t} className="rounded-lg border border-line bg-surface p-3">
                    <p className="text-xs font-medium text-ink-muted">
                      Statement {i === 0 ? 'A' : 'B'} · <span className="tabular-nums">{statement.t}</span> · {statement.speaker}
                    </p>
                    <blockquote className="mt-1.5 border-l-2 border-approval/50 pl-2.5 text-[13px] leading-relaxed text-ink">
                      “{statement.text_fragment}”
                    </blockquote>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[13px] font-semibold text-ink">Proposed distinguishing condition — keeps both statements</p>
              <p className="mt-1 font-mono text-[13px] leading-relaxed text-ink">{draft.contradiction.distinguishing_condition}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                A · {draft.contradiction.statement_a_generalised}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                B · {draft.contradiction.statement_b_specific}
              </p>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink">
                Resolution probe · “{draft.contradiction.resolution_probe}”
              </p>
              <p className="mt-2 text-xs text-approval">
                Unresolved until {transcript.expert.name} answers · status {draft.contradiction.confirmation_status.replace(/_/g, ' ')}
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No contradiction found in what he has said so far.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
