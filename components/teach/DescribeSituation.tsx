'use client';

// Describe a situation nobody has drawn yet.
//
// Why it sits beside the pills. The chooser could only offer situations
// somebody had already drawn, which made the screen's answer to "can it do my
// scenario?" a promise rather than a demonstration. This card is the
// demonstration: type what happened in your building, and the same grammar the
// chilled-water figure is drawn in gets filled in for it.
//
// What the model does here is narrow on purpose. It does not draw: it fills in
// the fields of lib/scene/schema, which refuses anything that is not a
// situation — levels that do not exist, trouble that travels upward, a caption
// longer than a caption. The renderer only ever sees values that passed. If
// nothing passes, nothing is drawn and the card says so.
//
// And a drawing is all this is. It is not a pill, it writes no rule, and no
// gate will ever read it. The card says that where it cannot be missed,
// because a picture of your own incident is exactly the kind of thing a
// demonstration lets you believe more about than it should.

import { useState } from 'react';
import { Loader2, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { SceneDiagram } from '@/components/scene/SceneDiagram';
import { generationLabel } from '@/lib/llm/attribution';
import type { Generation } from '@/lib/llm/attribution';
import type { Scene } from '@/lib/scene/schema';

const PLACEHOLDER =
  'A cooling tower on the roof overflows overnight. Water runs down the plant-room wall toward the lift motor room on L40.';

/** What the route answers with when it will not show a drawing of something else. */
const UNREACHABLE = 'The drawing service could not be reached, so nothing has been drawn.';

type State =
  | { kind: 'idle' }
  | { kind: 'writing' }
  | { kind: 'drawing' }
  | { kind: 'drawn'; scene: Scene; badge: string }
  | { kind: 'refused'; reason: string };

export function DescribeSituation() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [description, setDescription] = useState('');

  const draw = async () => {
    const said = description.trim();
    if (said.length < 12) return;
    setState({ kind: 'drawing' });
    try {
      const response = await fetch('/api/llm/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: said }),
      });
      const body = (await response.json()) as (Generation<Scene> & { error?: string }) | { error: string };
      if (!response.ok || !('data' in body)) {
        setState({ kind: 'refused', reason: ('error' in body && body.error) || UNREACHABLE });
        return;
      }
      // A recorded answer is refused here for the same reason the route has no
      // fixture: it would be a drawing of somebody else's situation.
      if (body.source !== 'live') {
        setState({ kind: 'refused', reason: body.reason ?? UNREACHABLE });
        return;
      }
      setState({ kind: 'drawn', scene: body.data, badge: generationLabel(body) });
    } catch {
      setState({ kind: 'refused', reason: UNREACHABLE });
    }
  };

  return (
    <article className="flex flex-col rounded-xl border border-dashed border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">Describe a situation</h3>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
          {state.kind === 'drawn' ? 'A drawing only' : 'Nothing drawn yet'}
        </span>
      </div>

      {state.kind === 'idle' ? (
        <button
          type="button"
          onClick={() => setState({ kind: 'writing' })}
          className="mt-3 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-cream-paper px-6 py-10 text-center transition-colors hover:border-marker/50 hover:bg-dew-drop focus-visible:outline-offset-4"
        >
          <span className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          <span className="max-w-[34ch] text-[13px] leading-relaxed text-ink-muted">
            Say what happened in your building, in your own words, and it will be drawn the same way the one
            beside it is.
          </span>
        </button>
      ) : null}

      {state.kind === 'writing' || state.kind === 'drawing' ? (
        <div className="mt-3 flex flex-1 flex-col">
          <label htmlFor="describe-situation" className="text-[13px] text-ink-muted">
            What happened, and what was it getting toward?
          </label>
          <textarea
            id="describe-situation"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={6}
            maxLength={1200}
            disabled={state.kind === 'drawing'}
            placeholder={PLACEHOLDER}
            className="mt-2 w-full flex-1 resize-none rounded-xl border border-line bg-cream-paper p-3 text-[14px] leading-relaxed text-ink placeholder:text-ink-muted/70 focus-visible:outline-offset-2 disabled:opacity-60"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={draw}
              disabled={state.kind === 'drawing' || description.trim().length < 12}
              className="btn-pill btn-pill-primary text-xs disabled:opacity-50"
            >
              {state.kind === 'drawing' ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Drawing…
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" aria-hidden="true" /> Draw this situation
                </>
              )}
            </button>
            {state.kind === 'writing' ? (
              <button type="button" onClick={() => setState({ kind: 'idle' })} className="btn-pill text-xs">
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.kind === 'drawn' ? (
        <div className="mt-3 flex flex-1 flex-col">
          <SceneDiagram scene={state.scene} idPrefix="scene-described" />
          <p className="mt-3 text-[14px] font-medium leading-snug text-ink">{state.scene.title}</p>
          <ol className="mt-2 space-y-1 text-[13px] leading-snug text-ink-muted">
            {state.scene.captions.map((caption, index) => (
              <li key={caption}>
                <span className="font-mono text-[11px] text-ink-muted">{index + 1}</span> {caption}
              </li>
            ))}
          </ol>
          <p className="mt-3 font-mono text-[11px] text-ink-muted">{state.badge}</p>
        </div>
      ) : null}

      {state.kind === 'refused' ? (
        <p className="mt-3 flex-1 rounded-xl border border-dashed border-line bg-cream-paper p-4 text-[13px] leading-relaxed text-ink-muted">
          {state.reason}
        </p>
      ) : null}

      <div className="mt-auto pt-4">
        {state.kind === 'drawn' || state.kind === 'refused' ? (
          <button
            type="button"
            onClick={() => setState({ kind: 'writing' })}
            className="btn-pill text-xs"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Describe another
          </button>
        ) : null}
        <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
          A drawing, and only a drawing. It is not a pill, it writes no rule, and no gate reads it — teaching
          from a situation nobody has captured yet is not built.
        </p>
      </div>
    </article>
  );
}
