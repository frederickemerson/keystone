import { basename } from 'node:path';
import { notFound } from 'next/navigation';
import { pillTitle } from '@/components/mosaic';
import { loadPill } from '@/lib/pills/load';
import { loadContradictionFixture, loadTranscript } from '@/lib/data';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { ContradictionCallout } from '@/components/canvas/ContradictionCallout';
import { DecisionCanvas } from '@/components/canvas/DecisionCanvas';
import { NoteDrafts } from '@/components/canvas/NoteDrafts';

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ pillId: string }>;
}) {
  const { pillId } = await params;

  // Unknown (or hostile) ids are a 404: loadPill only resolves ids from the
  // pills/ index, never a filesystem path. Parse errors of a real pill throw
  // to the error boundary (app/error.tsx).
  const pill = loadPill(pillId);
  if (!pill) notFound();

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
      <CanvasHeader
        pill={pill}
        title={pillTitle(pill)}
        description="Confirm, edit or reject each drafted rule. Decide every tile to publish."
      />

      {showContradiction ? (
        <ContradictionCallout contradiction={contradiction.contradiction} plainCondition={plainCondition} />
      ) : null}

      <NoteDrafts pill={pill} />

      <DecisionCanvas pill={pill} />
    </div>
  );
}
