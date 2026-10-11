import { KpiStat, SectionHeader } from '@/components/mosaic';
import { loadAssets, loadIncidents } from '@/lib/data';
import { loadAllPills } from '@/lib/pills/load';
import { runEvals } from '@/lib/engine';
import { AssetGrid } from '@/components/pulse/AssetGrid';
import { ActiveIncidentsTable } from '@/components/pulse/ActiveIncidentsTable';
import { ClosedIncidentsList } from '@/components/pulse/ClosedIncidentsList';
import { PillCoverageStrip } from '@/components/pulse/PillCoverageStrip';
import type { IncidentRecord } from '@/lib/data';

// Stable demo clock so "time since detection" / durations are deterministic.
const DEMO_NOW = new Date('2026-10-11T11:30:00+08:00');

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

export default function PortfolioPulsePage() {
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

  // The Technical Services pill is the one whose judgement is on display.
  const tsPillId = 'technical-services-chilled-water-leak';

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Portfolio Pulse</h1>
        <p className="text-sm text-ink-muted">
          Live posture across the Keppel-style portfolio — where judgement is applied, what is
          awaiting a human, and where pills do not yet cover an asset type.
        </p>
      </header>

      {/* Header KPIs */}
      <section aria-label="Portfolio KPIs">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiStat label="Active incidents" value={activeIncidents} unit="open" />
          <KpiStat label="Avg time-to-isolate" value={avgIsolate} unit="min" />
          <KpiStat label="Decisions awaiting approval" value={awaitingApproval} />
          <KpiStat label="Pills approved" value={pillsApproved} />
          <KpiStat label="Replay agreement" value={`${agreement.passed} of ${agreement.total}`} />
          <KpiStat label="Downtime avoided" value={downtimeAvoided} unit="hrs" />
        </div>
      </section>

      {/* Asset grid */}
      <section className="space-y-3">
        <SectionHeader
          title="Assets"
          description="Four portfolio assets with their Keppel-native efficiency attributes and live incident state."
        />
        <AssetGrid assets={assets} incidents={incidents} />
      </section>

      {/* Active incidents */}
      <section className="space-y-3">
        <SectionHeader
          title="Active incidents"
          description="Severity, detection age, the unresolved owner, evidence coverage (count, not a percentage) and the pill in use."
        />
        <ActiveIncidentsTable incidents={incidents} />
      </section>

      {/* Recent closed incidents */}
      <section className="space-y-3">
        <SectionHeader
          title="Recently closed"
          description="Outcome-captured incidents feeding the Learning loop."
        />
        <ClosedIncidentsList incidents={incidents} pillId={tsPillId} />
      </section>

      {/* Pill coverage strip */}
      <section className="space-y-3">
        <SectionHeader
          title="Pill coverage by asset type"
          description="Which Intelligence Pills declare coverage of each asset type. Gaps are where a new pill or asset overlay is needed."
        />
        <PillCoverageStrip pills={pills} assets={assets} />
      </section>
    </div>
  );
}
