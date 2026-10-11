'use client';

import { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import type { ConditionContext } from '@/lib/engine/conditions';
import type { Pill } from '@/lib/engine/types';
import { evidenceConfirmAuthority } from '@/lib/governance/access';
import type { EvidenceConfirmationRecord } from '@/lib/governance/store';
import { suggestionKeys, suggestResponseSchema, type EvidenceSuggestion } from '@/lib/jev/suggestions';
import { cn } from '@/lib/ui/cn';

/** Suggestions below this probability are counted, not shown as chips. */
export const SUGGESTION_MIN_PROBABILITY = 0.5;
const CLIENT_TIMEOUT_MS = 5_000;

export interface SuggestionPill {
  pillId: string;
  pillVersion: string;
  pill: Pill;
}

interface Tagged extends EvidenceSuggestion {
  pillId: string;
  pillVersion: string;
  confirmableBy: string[];
}

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'unavailable'; reason: string }
  | { phase: 'ready'; model: string; latencyMs: number; suggestions: Tagged[] };

/**
 * "Suggested · unconfirmed" evidence chips for one timeline event, from Jev.
 * A chip is a probability — it never changes a gate. "Confirm" records the
 * evidence as confirmed by the acting human through the governance store
 * (role must be in the key's evidence.yaml confirmable_by); "Dismiss" hides it.
 */
export function EvidenceSuggestions({
  incidentId,
  eventId,
  pills,
  ctx,
  role,
  confirmations,
  onConfirm,
}: {
  incidentId: string;
  eventId: string;
  pills: readonly SuggestionPill[];
  ctx: ConditionContext;
  role: string;
  confirmations: Readonly<Record<string, EvidenceConfirmationRecord>>;
  onConfirm: (s: Tagged, model: string) => void;
}) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const requests = pills
    .map((p) => ({ ...p, keys: suggestionKeys(p.pill, ctx) }))
    .filter((p) => p.keys.length > 0);

  const ask = async () => {
    setState({ phase: 'loading' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const results = await Promise.all(
        requests.map(async (p) => {
          const res = await fetch('/api/jev/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incidentId, eventId, pillId: p.pillId, keys: p.keys }),
            signal: controller.signal,
          });
          const parsed = suggestResponseSchema.safeParse(await res.json().catch(() => null));
          return parsed.success ? { p, body: parsed.data } : null;
        }),
      );
      const ok = results.flatMap((r) => (r && r.body.available ? [{ p: r.p, body: r.body }] : []));
      if (ok.length === 0) {
        const reason = results.find((r) => r && !r.body.available);
        setState({
          phase: 'unavailable',
          reason: reason && !reason.body.available ? reason.body.reason : 'Suggestions unavailable',
        });
        return;
      }
      setState({
        phase: 'ready',
        model: ok[0].body.model,
        latencyMs: Math.max(...ok.map((o) => o.body.latencyMs)),
        suggestions: ok
          .flatMap(({ p, body }) =>
            body.suggestions.map((s) => ({
              ...s,
              pillId: p.pillId,
              pillVersion: p.pillVersion,
              confirmableBy: p.pill.evidenceCatalog[s.key]?.confirmable_by ?? [],
            })),
          )
          .sort((a, b) => b.probability - a.probability),
      });
    } catch {
      setState({ phase: 'unavailable', reason: 'Suggestions unavailable' });
    } finally {
      clearTimeout(timer);
    }
  };

  if (requests.length === 0 && state.phase === 'idle') return null;

  if (state.phase === 'idle' || state.phase === 'loading') {
    return (
      <button
        type="button"
        onClick={ask}
        disabled={state.phase === 'loading'}
        className="mt-2 inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-muted hover:text-ink disabled:opacity-60"
      >
        <Sparkles className="size-3" aria-hidden="true" />
        {state.phase === 'loading' ? 'Asking Jev…' : 'Suggest evidence · Jev'}
      </button>
    );
  }

  if (state.phase === 'unavailable') {
    return <p className="mt-2 text-[11px] text-ink-muted">Suggestions unavailable ({state.reason}).</p>;
  }

  const shown = state.suggestions.filter(
    (s) => s.probability >= SUGGESTION_MIN_PROBABILITY && !dismissed.has(s.key),
  );
  const below = state.suggestions.filter((s) => s.probability < SUGGESTION_MIN_PROBABILITY).length;

  return (
    <div className="mt-2 space-y-1.5" aria-label="Evidence suggestions (unconfirmed)">
      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
        <Sparkles className="size-3" aria-hidden="true" />
        <span>
          Jev · {(state.latencyMs / 1000).toFixed(1)} s
        </span>
        <span className="font-mono">({state.model})</span>
        <span>· suggestions only, never gate</span>
      </p>
      {shown.length === 0 ? (
        <p className="text-[11px] text-ink-muted">No evidence suggested above {SUGGESTION_MIN_PROBABILITY}.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shown.map((s) => {
            const confirmed = confirmations[s.key];
            const authority = evidenceConfirmAuthority(role, s.confirmableBy);
            return (
              <li
                key={s.key}
                className={cn(
                  'flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]',
                  confirmed ? 'border-recommend/40 bg-recommend-tint' : 'border-dashed border-line bg-dew-drop',
                )}
              >
                <span className={cn('font-medium', confirmed ? 'text-recommend' : 'text-ink-muted')}>
                  {confirmed ? 'Confirmed' : 'Suggested · unconfirmed'}
                </span>
                <span className="text-ink">{s.label}</span>
                <span className="font-mono tabular-nums text-ink">{s.probability.toFixed(2)}</span>
                {confirmed ? (
                  <span className="text-ink-muted">by {confirmed.actor.name}</span>
                ) : (
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirm(s, state.model)}
                      disabled={!authority.allowed}
                      title={authority.allowed ? `Record ${s.key} as confirmed by you` : authority.reason}
                      className="inline-flex items-center gap-0.5 rounded-full border border-line-strong bg-surface px-2 py-0.5 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="size-3" aria-hidden="true" />
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissed((d) => new Set([...d, s.key]))}
                      className="inline-flex items-center gap-0.5 rounded-full border border-line px-2 py-0.5 text-ink-muted hover:text-ink"
                    >
                      <X className="size-3" aria-hidden="true" />
                      Dismiss
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {below > 0 ? <p className="text-[11px] text-ink-muted">{below} key(s) below {SUGGESTION_MIN_PROBABILITY} not shown.</p> : null}
    </div>
  );
}
