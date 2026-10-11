'use client';

// Step 3 — version diff v1.2.0 → v1.3.0, rendered as human-readable lines
// ("TS-03 deadline_minutes 15 → 10") through the shared DiffView.

import { FileDiff } from 'lucide-react';
import { DiffView, EmptyState, SectionHeader } from '@/components/mosaic';
import { toDiffItems } from './learning-utils';

export function DiffPanel({
  from,
  to,
  changes,
}: {
  from: string;
  to: string;
  changes: readonly string[];
}) {
  return (
    <section aria-labelledby="learn-step-3-title" id="learn-step-3" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="3. What changed"
        description={`Diff v${from} → v${to} — one rule field, stated the way the expert said it.`}
        icon={<FileDiff className="size-4" />}
      />

      <div className="mt-3">
        {changes.length === 0 ? (
          <EmptyState
            icon={FileDiff}
            title="No rule changes yet"
            description="Propose a correction in step 2 to see the diff here."
          />
        ) : (
          <DiffView changes={toDiffItems(changes)} />
        )}
      </div>
    </section>
  );
}
