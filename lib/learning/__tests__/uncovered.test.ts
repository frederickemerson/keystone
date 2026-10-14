// A solved problem no approved rule accounts for.
//
// The decisive test is the last one: it runs the real engine over the real
// record and finds the one incident that fires nothing. If a future rule ever
// starts covering it, that test fails rather than the screen quietly emptying.

import { describe, expect, it } from 'vitest';
import { loadAssets, loadIncidents, loadTimeline } from '@/lib/data';
import { loadAllPills } from '@/lib/pills/load';
import { ruleApplications, type ReplayScenario } from '@/components/registry/hub-utils';
import type { ExcludedIncidentFromReplay, ReplayCoverage } from '../recurrence';
import { uncoveredIncidents, uncoveredSentence } from '../uncovered';

const COVERAGE: ReplayCoverage = { replayed: ['INC-1', 'INC-2', 'INC-3'], excluded: [] };
const PILLS = ['technical-services-chilled-water-leak'];

describe('uncoveredIncidents', () => {
  it('calls a solved incident with no rule a candidate skill', () => {
    const report = uncoveredIncidents(
      [
        { id: 'INC-1', solved: true },
        { id: 'INC-2', solved: true },
      ],
      ['INC-2'],
      COVERAGE,
      PILLS,
    );
    expect(report.candidates).toEqual([{ incidentId: 'INC-1', classification: 'candidate_skill' }]);
    expect(report.unsolved).toEqual([]);
  });

  it('keeps an unsolved incident out of the candidates', () => {
    const report = uncoveredIncidents([{ id: 'INC-1', solved: false }], [], COVERAGE, PILLS);
    expect(report.candidates).toEqual([]);
    expect(report.unsolved).toEqual([{ incidentId: 'INC-1', classification: 'unsolved' }]);
  });

  it('never judges an incident the replay could not see', () => {
    const coverage: ReplayCoverage = {
      replayed: ['INC-1'],
      excluded: [{ incidentId: 'INC-9', reason: 'no_timeline', detail: 'no timeline' }],
    };
    const report = uncoveredIncidents(
      [
        { id: 'INC-1', solved: true },
        { id: 'INC-9', solved: true },
      ],
      ['INC-1'],
      coverage,
      PILLS,
    );
    expect(report.candidates).toEqual([]);
    expect(report.judged).toBe(1);
    expect(uncoveredSentence(report)).toContain('1 further incident could not be replayed');
  });

  it('refuses to judge coverage with no pill to judge against', () => {
    expect(() => uncoveredIncidents([{ id: 'INC-1', solved: true }], [], COVERAGE, [])).toThrow(
      /no approved pill/,
    );
  });

  it('a narrow search invents candidates a wide one does not', () => {
    // One pill's rules fired on INC-1 only; the other's on INC-2. Judged
    // against either alone, the other incident looks like a discovery.
    const incidents = [
      { id: 'INC-1', solved: true },
      { id: 'INC-2', solved: true },
    ];
    const narrow = uncoveredIncidents(incidents, ['INC-1'], COVERAGE, ['pill-a']);
    const wide = uncoveredIncidents(incidents, ['INC-1', 'INC-2'], COVERAGE, ['pill-a', 'pill-b']);
    expect(narrow.candidates.map((c) => c.incidentId)).toEqual(['INC-2']);
    expect(wide.candidates).toEqual([]);
  });

  it('says how many pills were searched, so a finding can be weighed', () => {
    const report = uncoveredIncidents([{ id: 'INC-1', solved: true }], [], COVERAGE, ['pill-a', 'pill-b']);
    expect(uncoveredSentence(report)).toContain('across all 2 approved pills');
    expect(uncoveredSentence(report)).toContain('1 of the 3 incidents');
  });

  it('reports plainly when nothing is uncovered', () => {
    const report = uncoveredIncidents([{ id: 'INC-1', solved: true }], ['INC-1'], COVERAGE, PILLS);
    expect(uncoveredSentence(report)).toContain('no solved problem the pills cannot account for');
  });

  it('says nothing could be judged when nothing replayed', () => {
    const report = uncoveredIncidents([], [], { replayed: [], excluded: [] }, PILLS);
    expect(uncoveredSentence(report)).toBe('No incident could be replayed, so nothing could be judged.');
  });
});

describe('the real record', () => {
  /** Exactly what the pages do: replay every timeline through every approved pill. */
  function realReport() {
    const assets = loadAssets();
    const incidents = loadIncidents();
    const scenarios: ReplayScenario[] = [];
    const excluded: ExcludedIncidentFromReplay[] = [];
    for (const incident of incidents) {
      const timeline = loadTimeline(incident.id);
      const asset = assets.find((a) => a.id === incident.asset_id);
      if (!timeline) {
        excluded.push({ incidentId: incident.id, reason: 'no_timeline', detail: 'no timeline' });
      } else if (!asset) {
        excluded.push({ incidentId: incident.id, reason: 'asset_not_found', detail: 'no asset' });
      } else {
        scenarios.push({ incident, asset, timeline });
      }
    }
    const approved = loadAllPills().filter((b) => b.pill.manifest.status === 'approved');
    const fired = new Set<string>();
    for (const bundle of approved) {
      for (const apps of Object.values(ruleApplications(bundle.pill, scenarios))) {
        for (const app of apps) fired.add(app.incidentId);
      }
    }
    return {
      report: uncoveredIncidents(
        incidents.map((i) => ({ id: i.id, solved: i.status === 'closed' && Boolean(i.outcome) })),
        [...fired],
        { replayed: scenarios.map((s) => s.incident.id), excluded },
        approved.map((b) => b.id),
      ),
      incidents,
    };
  }

  it('finds the energy anomaly the approved pills cannot account for', () => {
    const { report } = realReport();
    expect(report.candidates.map((c) => c.incidentId)).toEqual(['INC-2026-0923']);
    expect(report.unsolved).toEqual([]);
    expect(report.pillsSearched.length).toBeGreaterThan(1);
  });

  it('the candidate really is closed, really has an outcome, and really has a timeline', () => {
    const { report, incidents } = realReport();
    const candidate = incidents.find((i) => i.id === report.candidates[0].incidentId);
    expect(candidate?.status).toBe('closed');
    expect(candidate?.outcome?.length).toBeGreaterThan(0);
    expect(loadTimeline(candidate!.id)?.events.length).toBeGreaterThan(0);
  });

  it('every other replayed incident is covered, so the finding is not noise', () => {
    const { report } = realReport();
    expect(report.judged - report.candidates.length - report.unsolved.length).toBe(report.judged - 1);
  });
});
