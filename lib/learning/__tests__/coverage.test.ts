// What the record captures that no rule reads.
//
// The failure that matters here is a FALSE FINDING: reporting one pill's scope
// boundary as an enterprise blind spot. Several of these tests exist only to
// pin that down.

import { describe, expect, it } from 'vitest';
import { evidenceUses } from '@/lib/connectors/evidence-uses';
import { loadAllTimelines } from '@/lib/data';
import { loadAllPills } from '@/lib/pills/load';
import { blindSpots, coverageSentence, observedEvidence } from '../coverage';

function realInputs() {
  const pills = loadAllPills();
  const uses = evidenceUses(pills.map((b) => ({ id: b.id, pill: b.pill })));
  const observed = observedEvidence(loadAllTimelines());
  const labels: Record<string, string> = {};
  for (const { pill } of pills) {
    for (const [key, entry] of Object.entries(pill.evidenceCatalog)) labels[key] ??= entry.label;
  }
  return { observed, uses, labels, pillIds: pills.map((p) => p.id) };
}

describe('blind spots over the real record', () => {
  const { observed, uses, labels, pillIds } = realInputs();
  const report = blindSpots(observed, uses, labels, pillIds);

  it('accounts for every observed key exactly once', () => {
    expect(report.observedCount).toBe(Object.keys(observed).length);
    expect(report.coveredCount + report.uncovered.length).toBe(report.observedCount);
    // Not vacuous: the record really does carry evidence.
    expect(report.observedCount).toBeGreaterThan(0);
  });

  it('never reports a key that some rule does read', () => {
    for (const entry of report.uncovered) expect(uses[entry.key] ?? []).toHaveLength(0);
  });

  it('only reports keys the record actually shows, with the incidents that showed them', () => {
    for (const entry of report.uncovered) {
      expect(observed[entry.key]).toBeDefined();
      expect(entry.seenIn.length).toBeGreaterThan(0);
      expect([...entry.seenIn]).toEqual([...new Set(entry.seenIn)]);
    }
  });

  it('orders by how often the record repeats the fact', () => {
    const counts = report.uncovered.map((u) => u.seenIn.length);
    expect([...counts]).toEqual([...counts].sort((a, b) => b - a));
  });

  it('finds something, and not everything — a real gap, not a broken join', () => {
    // All-covered would mean the feature says nothing; all-uncovered would mean
    // the uses map never matched, which is the likeliest way this breaks.
    expect(report.uncovered.length).toBeGreaterThan(0);
    expect(report.coveredCount).toBeGreaterThan(0);
  });

  it('judged across every pill, not one — a narrower scope invents findings', () => {
    const technical = loadAllPills().filter((p) => p.id.startsWith('technical-services'));
    const narrow = blindSpots(
      observed,
      evidenceUses(technical.map((b) => ({ id: b.id, pill: b.pill }))),
      labels,
      technical.map((p) => p.id),
    );
    // Searching fewer pills can only ever find MORE "gaps", and those extra
    // ones are other pills' business rather than anybody's blind spot.
    expect(narrow.uncovered.length).toBeGreaterThan(report.uncovered.length);
    const wide = new Set(report.uncovered.map((u) => u.key));
    for (const entry of report.uncovered) expect(narrow.uncovered.map((u) => u.key)).toContain(entry.key);
    expect(narrow.uncovered.some((u) => !wide.has(u.key))).toBe(true);
  });

  it('states how wide the search was, so the finding can be weighed', () => {
    expect(report.pillsConsidered).toEqual(pillIds);
    const sentence = coverageSentence(report);
    expect(sentence).toContain(`${report.uncovered.length} of the ${report.observedCount}`);
    expect(sentence).toContain(`${pillIds.length} approved pill`);
  });
});

describe('the fold and the edges', () => {
  const timeline = (incidentId: string, keys: string[][]) =>
    ({
      incident_id: incidentId,
      events: keys.map((ks, i) => ({
        id: `${incidentId}-${i}`,
        evidence_updates: Object.fromEntries(ks.map((k) => [k, { value: true, confirmed: true }])),
      })),
    }) as never;

  it('records each incident once per key, however many events mention it', () => {
    const observed = observedEvidence([timeline('INC-A', [['k1'], ['k1', 'k2']]), timeline('INC-B', [['k1']])]);
    expect(observed.k1).toEqual(['INC-A', 'INC-B']);
    expect(observed.k2).toEqual(['INC-A']);
  });

  it('treats a prototype-shaped key as ordinary data', () => {
    const observed = observedEvidence([timeline('INC-A', [['__proto__']])]);
    expect(Object.prototype.hasOwnProperty.call(observed, '__proto__')).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('says plainly when there is nothing to compare', () => {
    const report = blindSpots({}, {}, {}, ['p1']);
    expect(report.uncovered).toEqual([]);
    expect(coverageSentence(report)).toContain('No evidence has been recorded yet');
  });

  it('says so when the pill reads everything the record keeps', () => {
    const report = blindSpots({ k1: ['INC-A'] }, { k1: [{ pillId: 'p1', ruleId: 'R-1', gating: true }] }, {}, ['p1']);
    expect(report.uncovered).toEqual([]);
    expect(coverageSentence(report)).toContain('Every one of the 1 facts');
  });

  it('falls back to the key when no pill declares a label', () => {
    const report = blindSpots({ odd_key: ['INC-A'] }, {}, {}, ['p1']);
    expect(report.uncovered[0]).toMatchObject({ key: 'odd_key', label: 'odd_key' });
  });
});
