// Outcome & Learning — server component. Loads the pill from pills/ and the
// closed incident from data/, then hands plain serialisable props to the
// client flow. No client-side data fetching.

import { notFound } from 'next/navigation';
import { LearningFlow } from '@/components/learning/LearningFlow';
import { loadIncident } from '@/lib/data';
import { loadPill } from '@/lib/pills/load';
import { sessionRole } from '@/lib/auth/session';
import { scopeIncident } from '@/lib/governance/scope';

/** The incident this learning loop closes the loop on (SPEC §1 step 3). */
const INCIDENT_ID = 'INC-2026-1011';

export default async function LearningPage({ params }: { params: Promise<{ pillId: string }> }) {
  const { pillId } = await params;

  // Unknown (or hostile) ids are a 404 — loadPill resolves ids only from the
  // pills/ index. A real pill that fails to parse throws to app/error.tsx
  // rather than being disguised as "not found".
  const bundle = loadPill(pillId);
  if (!bundle) notFound();

  // The incident is scoped to the signed-in role before it reaches the client.
  const incident = loadIncident(INCIDENT_ID);
  return <LearningFlow bundle={bundle} incident={incident ? scopeIncident(incident, await sessionRole()) : null} />;
}
