'use client';

import { useState } from 'react';
import { LlmBadge } from '@/components/mosaic/LlmBadge';
import type { Generation } from '@/lib/llm/attribution';
import type { CandidateParse } from '@/lib/llm/candidates';
import type { CaptureProps } from './types';

export function LiveExtractionPanel({ transcript, rules }: Pick<CaptureProps, 'transcript' | 'rules'>) {
  const [result, setResult] = useState<Generation<CandidateParse> | null>(null);
  const [loading, setLoading] = useState(false);
  async function extract() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/llm/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: transcript.interview_id, turns: transcript.turns.map(({ t, speaker, text }) => ({ t, speaker, text })) }),
        signal: AbortSignal.timeout(50_000),
      });
      if (!response.ok) throw new Error('request-failed');
      setResult(await response.json());
    } catch {
      setResult({ data: { candidates: rules.map((rule) => ({ rule, status: 'draft', requiresExpertConfirmation: true })), rejected: [] }, source: 'recorded', provider: 'fixtures', model: 'hy4-preview', latencyMs: 0, attempts: [], reason: 'Live request unavailable; showing the recorded candidates.' });
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface p-4" aria-label="Optional live extraction" aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-pill text-xs" disabled={loading} onClick={extract}>
          {loading ? 'Drafting live…' : 'Re-extract live'}
        </button>
        <span role="status"><LlmBadge result={result} /></span>
        {result ? <button type="button" className="btn-pill text-xs" onClick={() => setResult(null)}>Dismiss preview</button> : null}
      </div>
      <p className="text-xs text-ink-muted">Optional preview from the full recorded transcript (up to four live candidates). The offline call below stays unchanged.</p>
      {result ? (
        <div className="space-y-3">
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
