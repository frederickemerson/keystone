// Outcome & Learning — server component. Loads the pill from pills/ and the
// closed incident from data/, then hands plain serialisable props to the
// client flow. No client-side data fetching.

import { EmptyState } from '@/components/mosaic';
import { LearningFlow } from '@/components/learning/LearningFlow';
import { loadIncident } from '@/lib/data';
import { loadPill, type PillBundle } from '@/lib/pills/load';

/** The incident this learning loop closes the loop on (SPEC §1 step 3). */
const INCIDENT_ID = 'INC-2026-1011';

export default async function LearningPage({ params }: { params: Promise<{ pillId: string }> }) {
  const { pillId } = await params;

  let bundle: PillBundle | undefined;
  try {
    bundle = loadPill(pillId);
  } catch {
    bundle = undefined;
  }

  if (!bundle) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Outcome &amp; Learning</h1>
        <EmptyState
          title={`Pill “${pillId}” could not be loaded`}
          description="It may not exist in pills/, or its package is not yet parseable by the engine."
        />
      </div>
    );
  }

  return <LearningFlow bundle={bundle} incident={loadIncident(INCIDENT_ID) ?? null} />;
}
