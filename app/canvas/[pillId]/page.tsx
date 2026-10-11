import { SectionHeader } from '@/components/mosaic';
import { loadPill, type PillBundle } from '@/lib/pills/load';
import { loadContradictionFixture } from '@/lib/data';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { ContradictionCallout } from '@/components/canvas/ContradictionCallout';
import { DecisionCanvas } from '@/components/canvas/DecisionCanvas';

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ pillId: string }>;
}) {
  const { pillId } = await params;

  let pill: PillBundle | undefined;
  try {
    pill = loadPill(pillId);
  } catch {
    pill = undefined;
  }
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

  return (
    <div className="space-y-6">
      <CanvasHeader pill={pill} />

      {showContradiction ? (
        <ContradictionCallout contradiction={contradiction.contradiction} />
      ) : null}

      <SectionHeader
        title="Review rule candidates"
        description="Confirm, edit or reject each extracted rule. Every tile carries its provenance (quote + timestamp) and confirmation state. Decide every tile to enable publishing."
      />

      <DecisionCanvas pill={pill} />
    </div>
  );
}
