import { basename } from 'node:path';
import { SectionHeader, pillTitle } from '@/components/mosaic';
import { loadPill } from '@/lib/pills/load';
import { loadContradictionFixture, loadTranscript } from '@/lib/data';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { ContradictionCallout } from '@/components/canvas/ContradictionCallout';
import { DecisionCanvas } from '@/components/canvas/DecisionCanvas';

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ pillId: string }>;
}) {
  const { pillId } = await params;

  // Parse errors throw to the error boundary (see app/error.tsx); a genuinely
  // unknown id returns undefined and gets the friendly not-found message below.
  const pill = loadPill(pillId);
  if (!pill) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Decision Canvas</h1>
        <p className="rounded-lg border border-dashed border-line bg-surface/50 px-4 py-8 text-center text-sm text-ink-muted">
          Pill “{pillId}” could not be loaded. It may not exist or its package is not yet parseable.
        </p>
      </div>
    );
  }

  const contradiction = loadContradictionFixture();
  const showContradiction = Object.keys(pill.pill.provenance).includes(
    contradiction.contradiction.rule_id,
  );

  // Plain-language distinguishing condition, in the expert's words, from the
  // source transcript's recorded resolution of this same rule.
  const transcript = loadTranscript(basename(contradiction.source_transcript, '.json'));
  const recorded = transcript?.contradiction_detected.resolution;
  const plainCondition =
    recorded && recorded.resolved_rule_id === contradiction.contradiction.rule_id
      ? recorded.distinguishing_condition
      : undefined;

  return (
    <div className="space-y-6">
      <CanvasHeader pill={pill} title={pillTitle(pill)} />

      {showContradiction ? (
        <ContradictionCallout contradiction={contradiction.contradiction} plainCondition={plainCondition} />
      ) : null}

      <SectionHeader
        title="Review rule candidates"
        description="Confirm, edit or reject each extracted rule. Every tile carries its provenance (quote + timestamp) and confirmation state. Decide every tile to enable publishing."
      />

      <DecisionCanvas pill={pill} />
    </div>
  );
}
