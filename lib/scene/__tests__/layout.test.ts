// Where a described situation gets drawn.
//
// Geometry is the part of "a model drew this" that fails quietly: a box past
// the right edge, a path to a floor that is not there, a caption line under
// the bottom slab. The renderer does no arithmetic, so all of it is here and
// all of it is checkable.

import { describe, expect, it } from 'vitest';
import { fitFontSize, sceneLayout, VIEW_H, VIEW_W } from '../layout';
import type { Scene } from '../schema';

function scene(overrides: Partial<Scene> = {}): Scene {
  return {
    title: 'Chilled-water coupling fails above a bank tenant',
    levels: [
      { label: 'L28', note: null },
      { label: 'L27', note: 'bank tenant' },
      { label: 'L26', note: null },
    ],
    origin: { level: 0, label: 'chilled water', place: 'ceiling void' },
    travel: { level: 1, label: 'conduit' },
    threat: { level: 1, label: 'riser cupboard', tag: 'DB-27B', state: 'live' },
    measure: 'how close is too close?',
    captions: ['Nothing unusual yet.', 'A coupling fails.'],
    ...overrides,
  };
}

describe('laying out a situation', () => {
  it('draws one slab per floor, top to bottom, inside the canvas', () => {
    for (const count of [2, 3, 4]) {
      const levels = Array.from({ length: count }, (_, index) => ({ label: `L${30 - index}`, note: null }));
      const layout = sceneLayout(scene({ levels, origin: { level: 0, label: 'pipe', place: null }, travel: null, threat: null }));
      expect(layout.slabs).toHaveLength(count);
      const ys = layout.slabs.map((slab) => slab.y);
      expect([...ys].sort((a, b) => a - b)).toEqual(ys);
      for (const y of ys) {
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(VIEW_H);
      }
    }
  });

  it('labels a floor with its note when it has one', () => {
    const layout = sceneLayout(scene());
    expect(layout.slabs[1].text).toBe('L27 · bank tenant');
    expect(layout.slabs[0].text).toBe('L28');
  });

  it('keeps what is at risk inside the right margin', () => {
    const layout = sceneLayout(scene());
    expect(layout.threat).not.toBeNull();
    expect(layout.threat!.x + layout.threat!.w).toBeLessThanOrEqual(VIEW_W - 20);
    expect(layout.threat!.y).toBeGreaterThan(0);
    expect(layout.threat!.y + layout.threat!.h).toBeLessThan(VIEW_H);
  });

  it('runs the path from where it started to what it threatens', () => {
    const layout = sceneLayout(scene());
    expect(layout.travel).not.toBeNull();
    expect(layout.travel!.x1).toBeGreaterThanOrEqual(layout.origin.x);
    expect(layout.travel!.x2).toBe(layout.threat!.x);
    expect(layout.travel!.y).toBeGreaterThan(layout.slabs[1].y);
  });

  it('falls only when the trouble reaches a floor below', () => {
    expect(sceneLayout(scene()).fall).not.toBeNull();
    const sameFloor = sceneLayout(scene({ travel: { level: 0, label: 'floor void' }, threat: null }));
    expect(sameFloor.fall).toBeNull();
  });

  it('draws nothing it was not given', () => {
    const bare = sceneLayout(scene({ travel: null, threat: null, measure: null, origin: { level: 0, label: 'tank', place: null } }));
    expect(bare.travel).toBeNull();
    expect(bare.threat).toBeNull();
    expect(bare.measure).toBeNull();
    expect(bare.void).toBeNull();
  });

  it('keeps the unsettled measure above the bottom floor', () => {
    const layout = sceneLayout(scene());
    expect(layout.measure).not.toBeNull();
    expect(layout.measure!.y).toBeLessThan(layout.slabs[layout.slabs.length - 1].y);
    expect(layout.measure!.x2).toBeLessThanOrEqual(VIEW_W - 20);
    // The measure is drawn, the number is not: that is what a session settles.
    expect(layout.measure!.label).not.toMatch(/\d/);
  });

  it('shrinks a long tag to fit its box instead of overflowing it', () => {
    const short = sceneLayout(scene());
    const long = sceneLayout(
      scene({ threat: { level: 1, label: 'lift motor room', tag: 'lift motor room', state: 'lift still running' } }),
    );
    expect(short.threat!.tagSize).toBe(8);
    expect(long.threat!.tagSize).toBeLessThan(8);
    // Every character still fits inside the box: monospace is 0.6 em wide.
    for (const t of [long.threat!, short.threat!]) {
      expect(t.tag.length * t.tagSize * 0.6).toBeLessThanOrEqual(t.w);
      expect((t.state ?? '').length * t.stateSize * 0.6).toBeLessThanOrEqual(t.w);
    }
  });

  it('never shrinks a label out of legibility', () => {
    expect(fitFontSize('x'.repeat(40), 56, 8)).toBe(5);
    expect(fitFontSize('', 56, 8)).toBe(8);
  });

  it('survives a level index at the end of the array', () => {
    const layout = sceneLayout(scene({ travel: { level: 2, label: 'riser' }, threat: { level: 2, label: 'pit', tag: 'LIFT-3', state: null } }));
    expect(layout.travel!.y).toBeGreaterThan(layout.slabs[2].y);
  });

  it('keeps every part of every shape of scene on the canvas', () => {
    // The first two-floor scene a model produced drew the threatened cabinet
    // below the bottom of the picture: a box straddles its slab, and the usual
    // bottom slab has no room under it.
    const shapes: Scene[] = [];
    for (const count of [2, 3, 4]) {
      const levels = Array.from({ length: count }, (_, index) => ({ label: `L${40 - index}`, note: 'plant room' }));
      for (let deep = 0; deep < count; deep++) {
        shapes.push(
          scene({
            levels,
            origin: { level: 0, label: 'cooling tower', place: 'roof' },
            travel: { level: deep, label: 'water down the wall' },
            threat: { level: deep, label: 'lift motor room', tag: 'LIFT-3', state: 'running' },
          }),
        );
      }
    }
    for (const shape of shapes) {
      const layout = sceneLayout(shape);
      const bottoms: number[] = [
        ...layout.slabs.map((slab) => slab.y),
        layout.threat ? layout.threat.y + layout.threat.h + 14 : 0,
        layout.travel ? layout.travel.y + 15 : 0,
        layout.measure ? layout.measure.y + 17 : 0,
      ];
      for (const y of bottoms) expect(y).toBeLessThanOrEqual(VIEW_H);
      if (layout.threat) expect(layout.threat.y).toBeGreaterThanOrEqual(0);
      const rights = [layout.threat ? layout.threat.x + layout.threat.w : 0, layout.measure?.x2 ?? 0, layout.travel?.x2 ?? 0];
      for (const x of rights) expect(x).toBeLessThanOrEqual(VIEW_W);
    }
  });
});
