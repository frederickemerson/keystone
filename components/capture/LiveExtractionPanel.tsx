'use client';

import { useEffect, useRef, useState } from 'react';
import { LlmBadge } from '@/components/mosaic/LlmBadge';
import { LLM_CLIENT_WAIT_MS, type Generation } from '@/lib/llm/attribution';
import type { CandidateParse } from '@/lib/llm/candidates';
import { requestLive } from '@/lib/llm/live-request';
import type { CaptureProps } from './types';

const WAIT_S = LLM_CLIENT_WAIT_MS / 1000;

type Props = Pick<CaptureProps, 'transcript' | 'rules' | 'liveProvider'>;

export function LiveExtractionPanel({ transcript, rules, liveProvider }: Props) {
  const [result, setResult] = useState<Generation<CandidateParse> | null>(null);
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

  async function extract() {
    const controller = new AbortController();
    inFlight.current = controller;
    setResult(null);
    setElapsed(0);
    setStartedAt(Date.now());
    try {
      const generation = await requestLive<CandidateParse>('/api/llm/extract', {
        interviewId: transcript.interview_id, turns: transcript.turns.map(({ t, speaker, text }) => ({ t, speaker, text })),
      }, {
        signal: controller.signal,
        fallback: (reason) => ({
          data: { candidates: rules.map((rule) => ({ rule, status: 'draft', requiresExpertConfirmation: true })), rejected: [] },
          source: 'recorded', provider: 'fixtures', model: 'hy4-preview', latencyMs: 0, attempts: [], reason,
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

  const outcome = result?.reason ?? (result?.source === 'live' ? 'Live model output — a draft, not an approval.' : null);
  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface px-4 py-3" aria-label="Optional live extraction" aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button" className="btn-pill text-xs" disabled={loading} onClick={extract}
          title={liveProvider ? `Tries ${liveProvider} first; falls back to the recorded output.` : 'No live provider is configured; shows the recorded output.'}
        >
          {liveProvider
            ? (loading ? `Drafting with ${liveProvider}…` : 'Re-extract live')
            : (loading ? 'Loading recorded draft…' : 'Show recorded draft')}
        </button>
        <span role="status" className="text-xs text-ink-muted">
          {loading
            ? (liveProvider ? <span className="tabular-nums">{elapsed} s of {WAIT_S} s, then the recorded output</span> : 'Loading recorded output')
            : <LlmBadge result={result} />}
        </span>
        {result ? <button type="button" className="btn-pill text-xs" onClick={() => setResult(null)}>Dismiss preview</button> : null}
        <p className="text-xs text-ink-muted">{liveProvider ? 'Optional · up to four live candidates' : 'No live provider configured'} · the recorded call below is unchanged</p>
      </div>
      {result ? (
        <div className="space-y-3">
          {outcome ? <p className="text-xs text-ink-muted">{result.source === 'live' ? 'Live' : 'Recorded'} · {outcome}</p> : null}
          <p className="text-xs font-medium text-approval">Draft — requires {transcript.expert.name}’s review and named human approval. Not applied to a pill or copied to the Decision Canvas.</p>
          {result.data.candidates.length === 0 ? <p className="text-xs text-ink-muted">No rule candidates extracted.</p> : null}
          {result.data.candidates.map(({ rule }) => (
            <details key={rule.id} className="rounded-lg border border-line p-3">
              <summary className="cursor-pointer text-sm">Draft · {rule.id} · {rule.title}</summary>
              <p className="mt-2 text-xs">{rule.decision}</p>
              <p className="mt-2 text-xs text-ink-muted">Source references (verify against transcript): {rule.provenance.join(', ')}</p>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-[11px]">{JSON.stringify(rule, null, 2)}</pre>
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
}
