// Outcome & Learning — server component. Loads the pill from pills/ and the
// incident whose outcome this loop closes (`?incident=`, default the demo
// incident) from data/, then hands plain serialisable props to the client flow.

import { notFound } from 'next/navigation';
import { LearningFlow } from '@/components/learning/LearningFlow';
import { loadIncident } from '@/lib/data';
import { loadPill } from '@/lib/pills/load';
import { sessionRole } from '@/lib/auth/session';
import { scopeIncident } from '@/lib/governance/scope';
import { DEMO_INCIDENT_ID } from '@/lib/journey';

export default async function LearningPage({
  params,
  searchParams,
}: {
  params: Promise<{ pillId: string }>;
  searchParams: Promise<{ incident?: string | string[] }>;
}) {
  const { pillId } = await params;
  const { incident: requested } = await searchParams;

  // Unknown (or hostile) ids are a 404 — loadPill resolves ids only from the
  // pills/ index. A real pill that fails to parse throws to app/error.tsx
  // rather than being disguised as "not found".
  const bundle = loadPill(pillId);
  if (!bundle) notFound();

  // Only an id that names a real incident is used; anything else is a 404
  // rather than silently showing another incident's outcome.
  const incidentId = typeof requested === 'string' && requested ? requested : DEMO_INCIDENT_ID;
  const incident = loadIncident(incidentId);
  if (!incident) notFound();

  // The incident is scoped to the signed-in role before it reaches the client.
  return <LearningFlow bundle={bundle} incident={scopeIncident(incident, await sessionRole())} />;
}
