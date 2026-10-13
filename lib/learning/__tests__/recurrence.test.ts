// Does the operational record show this rule's situation recurring?
//
// This is a CLAIM CHECK, so the tests care most about the two ways it could
// lie: naming an incident that was never replayed, and shrinking the
// denominator so "once" reads like "always".

import { describe, expect, it } from 'vitest';
import { ruleApplications, type ReplayScenario } from '@/components/registry/hub-utils';
import { loadAssets, loadIncidents, loadTimeline } from '@/lib/data';
import { loadPill } from '@/lib/pills/load';
import {
  RECURRENCE_LABEL,
  recurrenceOf,
  recurrenceSentence,
  SYSTEMIC_MIN_INCIDENTS,
  type ExcludedIncidentFromReplay,
  type ReplayCoverage,
} from '../recurrence';

const PILL_ID = 'technical-services-chilled-water-leak';

function pill() {
  const bundle = loadPill(PILL_ID);
  if (!bundle) throw new Error(`fixture pill ${PILL_ID} is missing`);
  return bundle.pill;
}

/** The registry page's replay, including the incidents it has to leave out. */
function realReplay() {
  const assets = loadAssets();
  const scenarios: ReplayScenario[] = [];
  const excluded: ExcludedIncidentFromReplay[] = [];
  for (const incident of loadIncidents()) {
    const timeline = loadTimeline(incident.id);
    const asset = assets.find((a) => a.id === incident.asset_id);
    if (!timeline) {
      excluded.push({ incidentId: incident.id, reason: 'no_timeline', detail: 'No timeline to replay.' });
    } else if (!asset) {
      excluded.push({ incidentId: incident.id, reason: 'asset_not_found', detail: 'No asset record.' });
    } else {
      scenarios.push({ incident, asset, timeline });
    }
  }
  const applications = ruleApplications(pill(), scenarios);
  const firedByRule = Object.fromEntries(
    Object.entries(applications).map(([ruleId, apps]) => [ruleId, apps.map((a) => a.incidentId)]),
  );
  const coverage: ReplayCoverage = { replayed: scenarios.map((s) => s.incident.id), excluded };
  return { firedByRule, coverage };
}

describe('recurrence over the real incident record', () => {
  const { firedByRule, coverage } = realReplay();
  const report = recurrenceOf(pill().rules, firedByRule, coverage);

  it('accounts for every incident: replayed plus skipped, with a reason for each skip', () => {
    // Not a vacuous pass — something really was replayed.
    expect(report.coverage.replayed.length).toBeGreaterThan(0);
    expect(report.considered).toBe(loadIncidents().length);
    for (const skip of report.coverage.excluded) {
      expect(skip.reason).toBeTruthy();
      expect(skip.detail.length).toBeGreaterThan(5);
    }
    const replayed = new Set(report.coverage.replayed);
    for (const skip of report.coverage.excluded) expect(replayed.has(skip.incidentId)).toBe(false);
  });

  it('covers every rule in the pill exactly once, including the ones that never fired', () => {
    const ids = report.rules.map((r) => r.ruleId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(pill().rules.map((r) => r.id)));
  });

  it('never names an incident it did not replay', () => {
    const replayed = new Set(report.coverage.replayed);
    for (const rule of report.rules) {
      for (const id of rule.firedIn) expect(replayed.has(id)).toBe(true);
    }
  });

  it('classifies straight from the count', () => {
    for (const rule of report.rules) {
      const n = rule.firedIn.length;
      const expected = n === 0 ? 'unseen' : n >= SYSTEMIC_MIN_INCIDENTS ? 'systemic' : 'single';
      expect(rule.classification, `${rule.ruleId} fired in ${n}`).toBe(expected);
      expect(RECURRENCE_LABEL[rule.classification]).toBeTruthy();
    }
  });

  it('discriminates: the record backs some rules and is silent on others', () => {
    // All one bucket would make the signal worthless, and the likeliest cause
    // would be a replay that quietly fired nothing at all.
    const classes = new Set(report.rules.map((r) => r.classification));
    expect(classes.has('systemic')).toBe(true);
    expect(classes.has('unseen')).toBe(true);
  });

  it('agrees with the engine replay it was given, rule for rule', () => {
    for (const rule of report.rules) {
      expect([...rule.firedIn].sort()).toEqual([...new Set(firedByRule[rule.ruleId] ?? [])].sort());
    }
  });
});

describe('the sentence a reader checks', () => {
  const rules = [{ id: 'R-1', title: 'A rule' }];

  it('states the denominator, so one-of-one cannot read as always', () => {
    const report = recurrenceOf(rules, { 'R-1': ['INC-A'] }, { replayed: ['INC-A'], excluded: [] });
    expect(report.rules[0].classification).toBe('single');
    expect(recurrenceSentence(report.rules[0], report)).toContain('1 of the 1 incident');
  });

  it('says plainly when nothing could be replayed, rather than implying the situation never occurs', () => {
    const report = recurrenceOf(rules, {}, { replayed: [], excluded: [] });
    expect(recurrenceSentence(report.rules[0], report)).toContain('No incident could be replayed');
  });

  it('reports a skipped incident as skipped, never as evidence of absence', () => {
    const report = recurrenceOf(rules, { 'R-1': ['INC-A'] }, {
      replayed: ['INC-A'],
      excluded: [{ incidentId: 'INC-B', reason: 'no_timeline', detail: 'No timeline to replay.' }],
    });
    const sentence = recurrenceSentence(report.rules[0], report);
    expect(sentence).toContain('1 further incident could not be replayed');
    expect(report.considered).toBe(2);
  });

  it('drops a fired id the coverage cannot account for, instead of inflating the count', () => {
    // A caller handing in a stale applications map must not be able to make a
    // rule look recurrent against a denominator that never saw those incidents.
    const report = recurrenceOf(rules, { 'R-1': ['INC-A', 'INC-GHOST'] }, { replayed: ['INC-A'], excluded: [] });
    expect(report.rules[0].firedIn).toEqual(['INC-A']);
    expect(report.rules[0].classification).toBe('single');
  });
});
