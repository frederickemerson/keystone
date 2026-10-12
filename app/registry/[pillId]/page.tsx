// Pill hub — server component. Loads one pill from pills/ and every incident
// (with its recorded timeline, when it has one), scoped to the signed-in role
// before anything reaches the client. The client hub reads the governed
// version from the store and replays the timelines through the engine.

import { notFound } from 'next/navigation';
import { PillHub } from '@/components/registry/PillHub';
import type { ReplayScenario } from '@/components/registry/hub-utils';
import { loadAssets, loadIncidents, loadTimeline } from '@/lib/data';
import { loadPill } from '@/lib/pills/load';
import { sessionRole } from '@/lib/auth/session';
import { scopeAsset, scopeIncidents, scopeTimeline } from '@/lib/governance/scope';

export const dynamic = 'force-dynamic';

export default async function PillHubPage({ params }: { params: Promise<{ pillId: string }> }) {
  const { pillId } = await params;
  // Unknown (or hostile) ids are a 404: loadPill resolves ids only from the pills/ index.
  const bundle = loadPill(pillId);
  if (!bundle) notFound();

  const role = await sessionRole();
  const incidents = scopeIncidents(loadIncidents(), role);
  const assets = loadAssets();
  const scenarios: ReplayScenario[] = incidents.flatMap((incident) => {
    const timeline = loadTimeline(incident.id);
    const asset = assets.find((a) => a.id === incident.asset_id);
    return timeline && asset
      ? [{ incident, asset: scopeAsset(asset, role), timeline: scopeTimeline(timeline, role) }]
      : [];
  });

  return <PillHub bundle={bundle} incidents={incidents} scenarios={scenarios} />;
}
