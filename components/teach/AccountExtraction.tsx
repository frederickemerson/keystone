'use client';

// Reading the account the expert actually wrote.
//
// Why this exists: the redesign's headline is "one deliberately wide question
// first", and for a while the answer to that question went nowhere. It marked
// a square on the coverage board and was never read. Every claim the exercise
// produced came from taps. That made the opening question decorative, and it
// also meant the centrepiece of the demo had no model in it at all.
//
// So the account goes to the same extractor the recorded call uses
// (POST /api/llm/extract), under the same rule as everywhere else in Keystone:
// what comes back is a DRAFT, it carries no authority, and the deterministic
// engine never reads it. The expert confirms or rejects each candidate.
//
// One deliberate difference from /capture's panel: a recorded fixture is never
// shown as a reading of something typed here. That rule, and why it is not
// obvious, lives in lib/teach/extraction where it can be tested.

import { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { CandidateParse } from '@/lib/llm/candidates';
import type { Rule } from '@/lib/engine/types';
import { accountExtractionOutcome, UNREACHABLE_REASON } from '@/lib/teach/extraction';

/** The interview id stamped on provenance from a teaching session. */
export const TEACH_INTERVIEW_ID = 'teach-session';

export interface AccountExtractionProps {
  account: string;
  /** Confirmed candidates, for the host to carry into the draft. */
  onConfirm: (rule: Rule) => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; rules: Rule[]; rejected: CandidateParse['rejected']; provider: string; model: string }
  | { kind: 'unavailable'; reason: string };

export function AccountExtraction({ account, onConfirm }: AccountExtractionProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [handled, setHandled] = useState<Record<string, 'confirmed' | 'rejected'>>({});

  const run = async () => {
    setState({ kind: 'working' });
    try {
      const response = await fetch('/api/llm/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: TEACH_INTERVIEW_ID,
          // One turn, at offset zero: this account is the whole of what was said.
          turns: [{ t: '00:00:00', speaker: 'expert', text: account }],
        }),
      });

      const body = response.ok
        ? ((await response.json()) as {
            data: CandidateParse;
            source: 'live' | 'recorded';
            provider: string;
            model: string;
            reason?: string;
          })
        : undefined;

      // The decision lives in lib/teach/extraction, with the reason it exists.
      const outcome = accountExtractionOutcome({ status: response.status, ...body });
      if (outcome.kind === 'unavailable') {
        setState({ kind: 'unavailable', reason: outcome.reason });
        return;
      }
      setState({
        kind: 'done',
        rules: outcome.parse.candidates.map((candidate) => candidate.rule),
        rejected: outcome.parse.rejected,
        provider: outcome.provider,
        model: outcome.model,
      });
    } catch {
      setState({ kind: 'unavailable', reason: UNREACHABLE_REASON });
    }
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium text-ink">What a model read in your account</h2>
        {state.kind === 'idle' ? (
          <button type="button" onClick={run} className="btn-pill text-xs">
            <Sparkles className="size-3.5" aria-hidden="true" /> Read it back
          </button>
        ) : null}
      </header>

      {state.kind === 'idle' ? (
        <p className="mt-2 text-[13px] leading-snug text-ink-muted">
          Optional, and it changes nothing on its own. Whatever it finds is a draft you confirm or throw away; the
          gates never read it.
        </p>
      ) : null}

      {state.kind === 'working' ? (
        <p className="mt-2 text-[13px] text-ink-muted" aria-live="polite">
          Reading…
        </p>
      ) : null}

      {state.kind === 'unavailable' ? (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted" role="status">
          {state.reason}
        </p>
      ) : null}

      {state.kind === 'done' ? (
        <>
          <p className="mt-2 font-mono text-[11px] text-ink-muted">
            {state.provider} · {state.model} · draft, pending your confirmation
          </p>
          {state.rejected.length > 0 ? (
            <p className="mt-1.5 text-[12px] leading-snug text-ink-muted">
              {state.rejected.length} candidate{state.rejected.length === 1 ? ' was' : 's were'} thrown out by the
              guard before you saw {state.rejected.length === 1 ? 'it' : 'them'}:{' '}
              {state.rejected.map((r) => r.reason).join('; ')}.
            </p>
          ) : null}
          {state.rules.length === 0 ? (
            <p className="mt-2 text-[13px] leading-snug text-ink-muted">
              It found nothing it could put in rule shape. That is a valid answer, and it is better than inventing
              one.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {state.rules.map((rule) => {
                const verdict = handled[rule.id];
                return (
                  <li
                    key={rule.id}
                    className={cn(
                      'rounded-lg border px-3.5 py-3',
                      verdict === 'confirmed'
                        ? 'border-charcoal bg-dew-drop'
                        : verdict === 'rejected'
                          ? 'border-line bg-cream-paper opacity-55'
                          : 'border-line bg-cream-paper',
                    )}
                  >
                    <p className="text-[14px] leading-snug text-ink">{rule.title}</p>
                    <p className="mt-1 text-[13px] leading-snug text-ink-muted">{rule.decision}</p>
                    {verdict ? (
                      <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                        {verdict === 'confirmed' ? 'you confirmed this' : 'you threw this away'}
                      </p>
                    ) : (
                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          className="btn-pill text-xs"
                          onClick={() => {
                            setHandled((prev) => ({ ...prev, [rule.id]: 'confirmed' }));
                            onConfirm(rule);
                          }}
                        >
                          <Check className="size-3.5" aria-hidden="true" /> That is right
                        </button>
                        <button
                          type="button"
                          className="btn-pill text-xs"
                          onClick={() => setHandled((prev) => ({ ...prev, [rule.id]: 'rejected' }))}
                        >
                          <X className="size-3.5" aria-hidden="true" /> No
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
