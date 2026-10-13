// Pill hub — server component. Loads one pill from pills/ and every incident
// (with its recorded timeline, when it has one), scoped to the signed-in role
// before anything reaches the client. The client hub reads the governed
// version from the store and replays the timelines through the engine.

import { notFound } from 'next/navigation';
import { PillHub } from '@/components/registry/PillHub';
import type { ReplayScenario } from '@/components/registry/hub-utils';
import type { ExcludedIncidentFromReplay, ReplayCoverage } from '@/lib/learning/recurrence';
import { blindSpots, observedEvidence } from '@/lib/learning/coverage';
import { evidenceUses } from '@/lib/connectors/evidence-uses';
import { loadAssets, loadIncidents, loadTimeline } from '@/lib/data';
import { loadAllPills, loadPill } from '@/lib/pills/load';
import { sessionRole } from '@/lib/auth/session';
import { scopeAsset, scopeIncidents, scopeTimeline } from '@/lib/governance/scope';
import { pillTitle } from '@/components/mosaic/pillTitle';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ pillId: string }> }) {
  const { pillId } = await params;
  const pill = loadPill(decodeURIComponent(pillId));
  return { title: `${pill ? pillTitle(pill) : decodeURIComponent(pillId)} · Keystone` };
}

export default async function PillHubPage({ params }: { params: Promise<{ pillId: string }> }) {
  const { pillId } = await params;
  // Unknown (or hostile) ids are a 404: loadPill resolves ids only from the pills/ index.
  const bundle = loadPill(pillId);
  if (!bundle) notFound();

  const role = await sessionRole();
  const incidents = scopeIncidents(loadIncidents(), role);
  const assets = loadAssets();
  // An incident that cannot be replayed is recorded with its reason rather
  // than dropped. The replay alone cannot show its own denominator, and
  // "fired in two incidents" means nothing until a reader knows out of how
  // many — so the rules list reports both.
  const scenarios: ReplayScenario[] = [];
  const excluded: ExcludedIncidentFromReplay[] = [];
  for (const incident of incidents) {
    const timeline = loadTimeline(incident.id);
    const asset = assets.find((a) => a.id === incident.asset_id);
    if (!timeline) {
      excluded.push({
        incidentId: incident.id,
        reason: 'no_timeline',
        detail: 'The incident has no timeline, so there is no evidence to replay.',
      });
    } else if (!asset) {
      excluded.push({
        incidentId: incident.id,
        reason: 'asset_not_found',
        detail: `No asset record for ${incident.asset_id}.`,
      });
    } else {
      scenarios.push({ incident, asset: scopeAsset(asset, role), timeline: scopeTimeline(timeline, role) });
    }
  }
  const coverage: ReplayCoverage = { replayed: scenarios.map((s) => s.incident.id), excluded };

  // Facts the record keeps that no rule reads. Searched across EVERY approved
  // pill: a key this pill ignores is usually another pill's business, and
  // judging it against one pill would report scope boundaries as findings.
  // Read from the same role-scoped timelines as the replay, so the report can
  // never surface an evidence key this viewer is not allowed to see.
  const pills = loadAllPills();
  const labels: Record<string, string> = {};
  for (const { pill: p } of pills) {
    for (const [key, entry] of Object.entries(p.evidenceCatalog)) labels[key] ??= entry.label;
  }
  const gaps = blindSpots(
    observedEvidence(scenarios.map((s) => s.timeline)),
    evidenceUses(pills.map((b) => ({ id: b.id, pill: b.pill }))),
    labels,
    pills.map((b) => b.id),
  );

  return (
    <PillHub bundle={bundle} incidents={incidents} scenarios={scenarios} coverage={coverage} gaps={gaps} />
  );
}
