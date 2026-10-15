// The form a model has to fill in to get a situation drawn.
//
// The hand-drawn chilled-water figure is the benchmark: if this vocabulary
// cannot express the situation somebody drew by hand, it is not a grammar for
// situations, it is a grammar for one situation.

import { describe, expect, it } from 'vitest';
import scenario from '@/data/teach/scenario.json';
import { sceneSchema, type Scene } from '../schema';

/** The authored figure (components/teach/ScenarioStage), written as a scene. */
const CHILLED_WATER: Scene = {
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
  captions: scenario.stages.slice(0, 5).map((stage) => stage.caption),
};

describe('a described situation', () => {
  it('can express the situation somebody drew by hand', () => {
    const parsed = sceneSchema.safeParse(CHILLED_WATER);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.captions).toEqual(scenario.stages.map((stage) => stage.caption));
  });

  it('refuses a level that is not drawn', () => {
    const parsed = sceneSchema.safeParse({ ...CHILLED_WATER, threat: { ...CHILLED_WATER.threat!, level: 3 } });
    expect(parsed.success).toBe(false);
  });

  it('refuses trouble that travels upward', () => {
    const parsed = sceneSchema.safeParse({
      ...CHILLED_WATER,
      origin: { ...CHILLED_WATER.origin, level: 2 },
      travel: { level: 0, label: 'conduit' },
      threat: null,
    });
    expect(parsed.success).toBe(false);
  });

  it('needs at least two floors and allows at most four', () => {
    expect(sceneSchema.safeParse({ ...CHILLED_WATER, levels: [{ label: 'L1', note: null }] }).success).toBe(false);
    expect(
      sceneSchema.safeParse({
        ...CHILLED_WATER,
        levels: ['L1', 'L2', 'L3', 'L4', 'L5'].map((label) => ({ label, note: null })),
      }).success,
    ).toBe(false);
  });

  it('bounds every string, so a long label cannot be drawn off the edge', () => {
    const long = 'x'.repeat(200);
    expect(sceneSchema.safeParse({ ...CHILLED_WATER, origin: { ...CHILLED_WATER.origin, label: long } }).success).toBe(false);
    expect(sceneSchema.safeParse({ ...CHILLED_WATER, captions: [long, long] }).success).toBe(false);
    expect(sceneSchema.safeParse({ ...CHILLED_WATER, title: long }).success).toBe(false);
  });

  it('takes a situation that stays where it started', () => {
    const parsed = sceneSchema.safeParse({ ...CHILLED_WATER, travel: null, threat: null, measure: null });
    expect(parsed.success).toBe(true);
  });

  it('needs the beats of what happened, not one line', () => {
    expect(sceneSchema.safeParse({ ...CHILLED_WATER, captions: ['only one'] }).success).toBe(false);
    expect(sceneSchema.safeParse({ ...CHILLED_WATER, captions: [] }).success).toBe(false);
  });
});
