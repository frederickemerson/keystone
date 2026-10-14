import { KpiStat, SectionHeader } from '@/components/mosaic';
import { loadAssets, loadIncidents, loadTimeline } from '@/lib/data';
import { loadAllPills } from '@/lib/pills/load';
import { runEvals } from '@/lib/engine';
import { AssetGrid } from '@/components/pulse/AssetGrid';
import { AttentionList } from '@/components/pulse/AttentionList';
import { NewSkillPanel, type CandidateView } from '@/components/pulse/NewSkillPanel';
import { ActiveIncidentsTable } from '@/components/pulse/ActiveIncidentsTable';
import { ClosedIncidentsList } from '@/components/pulse/ClosedIncidentsList';
import { PillCoverageStrip } from '@/components/pulse/PillCoverageStrip';
import { LiveGovernanceKpis } from '@/components/pulse/LiveGovernance';
import { OpenCaptureTasks } from '@/components/pulse/OpenCaptureTasks';
import { OverrideRate } from '@/components/pulse/OverrideRate';
import type { IncidentRecord } from '@/lib/data';
import { sessionRole } from '@/lib/auth/session';
import { scopeAssets, scopeIncidents } from '@/lib/governance/scope';
import { attentionList } from '@/lib/learning/attention';
import { uncoveredIncidents } from '@/lib/learning/uncovered';
import type { ExcludedIncidentFromReplay } from '@/lib/learning/recurrence';
import { ruleApplications, type ReplayScenario } from '@/components/registry/hub-utils';
import { StartHereCard } from '@/components/journey/StartHereCard';

// Stable demo clock so "time since detection" / durations are deterministic.
const DEMO_NOW = new Date('2026-10-11T11:30:00+08:00');

/**
 * How many rows the attention list shows before it says how many it is
 * holding back. Five, because the challenge owner's own report prompts on
 * "the top five issues that management should be looking into".
 */
const ATTENTION_SHOWN = 5;

/** Roles that could explain how an uncovered incident was actually solved. */
const NEW_SKILL_ROLES = ['chief_engineer', 'head_technical_services', 'asset_operations_manager'] as const;

function avgTimeToIsolate(incidents: IncidentRecord[]): number {
  const samples: number[] = [];
  for (const incident of incidents) {
    const ts02 = (incident.actions ?? []).find(
      (a) => a.rule_id === 'TS-02' && a.completed_at,
    );
    if (ts02?.completed_at) {
      const mins =
        (new Date(ts02.completed_at).getTime() - new Date(incident.opened_at).getTime()) / 60000;
      if (mins >= 0 && mins < 1440) samples.push(mins);
    }
  }
  if (samples.length === 0) return 0;
  return Math.round(samples.reduce((s, v) => s + v, 0) / samples.length);
}

// Downtime avoided = incidents where the re-energisation gate (TS-07) blocked
// premature action and no unplanned outage/downtime resulted (≈4h/event of
// switchgear inspection downtime averted by isolating before energisation).
function downtimeAvoidedHours(incidents: IncidentRecord[]): number {
  const PER_EVENT = 4;
  return incidents.reduce((total, incident) => {
    const blocked = (incident.actions ?? []).some((a) => a.status === 'blocked');
    if (!blocked) return total;
    const occurred =
      incident.status === 'closed' &&
      /downtime|outage/i.test(incident.outcome ?? '');
    return occurred ? total : total + PER_EVENT;
  }, 0);
}

// Replay agreement = the engine's own eval pass rate across approved pills.
// Every asserted field (status and deadline) in every eval case is replayed
// through the pill; the count is "x of y" assertions, not an invented score.
function replayAgreement(
  pills: ReturnType<typeof loadAllPills>,
): { passed: number; total: number } {
  let passed = 0;
  let total = 0;
  for (const { pill } of pills) {
    if (pill.manifest.status !== 'approved') continue;
    const summary = runEvals(pill, Object.values(pill.evals));
    passed += summary.passed;
    total += summary.passed + summary.failed;
  }
  return { passed, total };
}

export const metadata = { title: 'Portfolio pulse · Keystone' };

export default async function PortfolioPulsePage() {
  const assets = loadAssets();
  const incidents = loadIncidents();
  // Pill load errors are real data bugs — let them throw to the error boundary
  // rather than silently showing an empty portfolio.
  const pills = loadAllPills();

  const activeIncidents = incidents.filter((i) => i.status !== 'closed').length;
  const avgIsolate = avgTimeToIsolate(incidents);
  const awaitingApproval = incidents.reduce(
    (n, i) => n + (i.actions ?? []).filter((a) => a.status === 'needs_approval').length,
    0,
  );
  const pillsApproved = pills.filter(
    (p) => p.pill.manifest.status === 'approved',
  ).length;
  const agreement = replayAgreement(pills);
  const downtimeAvoided = downtimeAvoidedHours(incidents);

  // Aggregates above use the full records on the server; anything rendered
  // (and so serialised to the client) is scoped to the signed-in role first.
  const role = await sessionRole();
  const visibleAssets = scopeAssets(assets, role);
  const visibleIncidents = scopeIncidents(incidents, role);

  // The Technical Services pill is the one whose judgement is on display.
  const tsPillId = 'technical-services-chilled-water-leak';

  // What to look at first. Computed from the role-scoped incidents, so it can
  // never name an incident or an evidence item this viewer cannot already see.
  const evidenceLabels: Record<string, string> = {};
  for (const { pill } of pills) {
    for (const [key, entry] of Object.entries(pill.evidenceCatalog)) evidenceLabels[key] ??= entry.label;
  }
  const attention = attentionList(visibleIncidents, evidenceLabels, ATTENTION_SHOWN);
  const assetNames = Object.fromEntries(visibleAssets.map((a) => [a.id, a.name]));

  // Solved problems no approved rule accounts for.
  //
  // The replay runs on the FULL timelines, not the role-scoped ones, and
  // deliberately so. Scoping a timeline removes evidence a viewer may not see,
  // which removes the facts rules fire on — so a replay of a scoped timeline
  // would report incidents as uncovered that are covered perfectly well, and a
  // technician would be shown discoveries that do not exist. The engine's
  // answer has to be the true one. Nothing from it is rendered directly: the
  // candidates are filtered to the incidents this role can already see, and
  // the only fields shown are the incident's own description and outcome,
  // which scopeIncidents already governs. No evidence key is surfaced here.
  const replayScenarios: ReplayScenario[] = [];
  const replayExcluded: ExcludedIncidentFromReplay[] = [];
  for (const incident of incidents) {
    const timeline = loadTimeline(incident.id);
    const asset = assets.find((a) => a.id === incident.asset_id);
    if (!timeline) {
      replayExcluded.push({
        incidentId: incident.id,
        reason: 'no_timeline',
        detail: 'The incident has no timeline, so there is no evidence to replay.',
      });
    } else if (!asset) {
      replayExcluded.push({ incidentId: incident.id, reason: 'asset_not_found', detail: `No asset record for ${incident.asset_id}.` });
    } else {
      replayScenarios.push({ incident, asset, timeline });
    }
  }
  const approvedPills = pills.filter((p) => p.pill.manifest.status === 'approved');
  const firedIncidentIds = new Set<string>();
  for (const bundle of approvedPills) {
    for (const apps of Object.values(ruleApplications(bundle.pill, replayScenarios))) {
      for (const app of apps) firedIncidentIds.add(app.incidentId);
    }
  }
  const uncovered = uncoveredIncidents(
    incidents.map((i) => ({ id: i.id, solved: i.status === 'closed' && Boolean(i.outcome) })),
    [...firedIncidentIds],
    { replayed: replayScenarios.map((s) => s.incident.id), excluded: replayExcluded },
    approvedPills.map((p) => p.id),
  );
  const visibleById = new Map(visibleIncidents.map((i) => [i.id, i]));
  const candidates: CandidateView[] = uncovered.candidates.flatMap(({ incidentId }) => {
    const incident = visibleById.get(incidentId);
    if (!incident) return [];
    return [
      {
        incidentId,
        assetId: incident.asset_id,
        assetName: assetNames[incident.asset_id] ?? incident.asset_id,
        type: incident.type,
        description: incident.description,
        outcome: incident.outcome ?? '',
      },
    ];
  });

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8">
      <header className="space-y-1.5">
        <h1>Portfolio pulse</h1>
        <p className="text-sm text-ink-muted">
          Where judgement is applied, what awaits a human, and where coverage is missing.
        </p>
      </header>

      {/* Role-aware first step: the guided demo, or this person's part in it. */}
      <StartHereCard role={role} />

      {/* Header KPIs */}
      <section aria-label="Portfolio KPIs">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiStat label="Active incidents" value={activeIncidents} unit="open" />
          <KpiStat label="Avg time-to-isolate" value={avgIsolate} unit="min" />
          <KpiStat label="Decisions awaiting approval" value={awaitingApproval} />
          {/* Governed state (approve / rollback) lives in the governance store. */}
          <LiveGovernanceKpis
            pills={pills.map(({ id, pill }) => ({ id, pill }))}
            initial={{ approved: pillsApproved, agreement }}
          />
          <KpiStat label="Downtime avoided" value={downtimeAvoided} unit="hrs" />
        </div>
      </section>

      {/* What to look at first, with the reason — ordered in lib/learning/attention.ts */}
      <section className="space-y-3" aria-label="What to look at first">
        <SectionHeader title="What to look at first" />
        <AttentionList report={attention} assetNames={assetNames} />
      </section>

      {/* Solved problems no approved rule fired on — lib/learning/uncovered.ts */}
      <section className="space-y-3" aria-label="Is this a new skill?">
        <SectionHeader title="Is this a new skill?" />
        <NewSkillPanel report={uncovered} candidates={candidates} roles={NEW_SKILL_ROLES} />
      </section>

      {/* Questions Keystone is asking the signed-in role (gate blocks, close-outs) */}
      <section className="space-y-3" aria-label="Open capture tasks">
        <SectionHeader title="Open capture tasks" />
        <OpenCaptureTasks sessionRole={role} pills={pills.map(({ id, name, pill }) => ({ id, name, pill }))} />
      </section>

      {/* Asset grid */}
      <section className="space-y-3">
        <SectionHeader
          title="Assets"
        />
        <AssetGrid assets={visibleAssets} incidents={visibleIncidents} />
      </section>

      {/* Active incidents */}
      <section className="space-y-3">
        <SectionHeader
          title="Active incidents"
        />
        <ActiveIncidentsTable
          incidents={visibleIncidents}
          pillIds={Object.fromEntries(pills.map((p) => [`${p.domain}/${p.name}`, p.id]))}
        />
      </section>

      {/* Recent closed incidents */}
      <section className="space-y-3">
        <SectionHeader
          title="Recently closed"
        />
        <ClosedIncidentsList incidents={visibleIncidents} pillId={tsPillId} />
      </section>

      {/* Override rate — who went against a pill, and on which rule */}
      <section className="space-y-3" aria-label="Override rate">
        <SectionHeader title="Override rate" />
        <OverrideRate />
      </section>

      {/* Pill coverage strip */}
      <section className="space-y-3">
        <SectionHeader
          title="Pill coverage by asset type"
        />
        <PillCoverageStrip pills={pills} assets={visibleAssets} />
      </section>
    </div>
  );
}
