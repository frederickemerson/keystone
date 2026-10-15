// Where everything in a scene is drawn.
//
// Geometry lives here rather than in the component because it is the part that
// can be wrong in a way nobody sees until a demo: a threat box pushed past the
// right edge, a path drawn to a floor that is not there, labels stacked on top
// of each other. All of that is arithmetic, so it is testable arithmetic, and
// the component is left with nothing to decide.
//
// The canvas is the same 400×212 as the hand-drawn chilled-water figure, so a
// generated situation and an authored one sit in a card at the same size.

import type { Scene } from './schema';

export const VIEW_W = 400;
export const VIEW_H = 212;

/** Slabs run between these, so a four-floor scene still has room to label. */
const FIRST_SLAB_Y = 44;
const LAST_SLAB_Y = 194;
/**
 * Where the bottom slab goes when something is drawn ON it rather than above
 * it. A threat box straddles its slab and its label and the measure sit under
 * that, which is about 46 units of canvas; at the usual bottom slab there are
 * 18. The first two-floor scene a model produced put the lift motor room's
 * cabinet half an inch below the picture.
 */
const LAST_SLAB_Y_WITH_CONTENT_BELOW = 150;
const LEFT = 20;
const RIGHT = 380;

/** The origin sits left of centre; what it threatens sits right of it. */
const ORIGIN_X = 196;
const THREAT_X = 300;
const THREAT_W = 56;

/**
 * Monospace advance width as a fraction of font size. Geist Mono, like most
 * monospace faces, is 0.6 em per character.
 */
const CHAR_EM = 0.6;

/**
 * The size a label has to be drawn at to fit the space it is given.
 *
 * A tag is supposed to be short — DB-27B, AHU-1 — but "lift motor room" is
 * what a model returns when the description has no tag in it, and at 8px that
 * is wider than the box it sits in. Shrinking is deterministic and keeps every
 * character; truncating would quietly change what the drawing says.
 */
export function fitFontSize(text: string, widthUnits: number, max: number, min = 5): number {
  if (!text.length) return max;
  const fits = (widthUnits * 0.92) / (text.length * CHAR_EM);
  return Math.max(min, Math.min(max, Math.round(fits * 10) / 10));
}

export interface SlabLayout {
  y: number;
  label: string;
  /** "L27 · bank tenant" when the level carries a note. */
  text: string;
}

export interface SceneLayout {
  slabs: SlabLayout[];
  /** The hatched band under the top slab, where a void or ceiling space is drawn. */
  void: { x: number; y: number; w: number; h: number } | null;
  origin: { x: number; y: number; label: string; place: string | null };
  /** Drops falling from the origin to the level it reaches. */
  fall: { x: number; from: number; to: number } | null;
  travel: { x1: number; x2: number; y: number; label: string } | null;
  threat: {
    x: number; y: number; w: number; h: number;
    tag: string; tagSize: number;
    state: string | null; stateSize: number;
    /** Drawn under the box, so it may be wider than the box itself. */
    label: string; labelSize: number;
  } | null;
  measure: { x1: number; x2: number; y: number; label: string } | null;
}

/** Evenly spaced slabs, top to bottom. Two floors use the full height. */
function slabY(index: number, count: number, bottom: number): number {
  if (count < 2) return FIRST_SLAB_Y;
  const step = (bottom - FIRST_SLAB_Y) / (count - 1);
  return Math.round(FIRST_SLAB_Y + step * index);
}

export function sceneLayout(scene: Scene): SceneLayout {
  const count = scene.levels.length;
  const deepest = count - 1;
  const onBottom =
    (scene.travel !== null && Math.min(scene.travel.level, deepest) === deepest) ||
    (scene.threat !== null && Math.min(scene.threat.level, deepest) === deepest);
  const bottom = onBottom ? LAST_SLAB_Y_WITH_CONTENT_BELOW : LAST_SLAB_Y;

  const slabs: SlabLayout[] = scene.levels.map((level, index) => ({
    y: slabY(index, count, bottom),
    label: level.label,
    text: level.note ? `${level.label} · ${level.note}` : level.label,
  }));

  const originY = slabs[Math.min(scene.origin.level, count - 1)].y;
  // The band belongs to the floor the trouble starts on, drawn just under its slab.
  const voidBand = scene.origin.place ? { x: LEFT, y: originY + 2, w: RIGHT - LEFT, h: 12 } : null;

  const travelLevel = scene.travel ? Math.min(scene.travel.level, count - 1) : null;
  const travelY = travelLevel === null ? null : slabs[travelLevel].y;
  const fall =
    travelY !== null && travelY > originY ? { x: ORIGIN_X + 5, from: originY + 16, to: travelY - 4 } : null;

  const threatLevel = scene.threat ? Math.min(scene.threat.level, count - 1) : null;
  const threatY = threatLevel === null ? null : slabs[threatLevel].y;

  // The path runs just under the floor it travels along, toward the threat when
  // there is one and to the right margin when there is not.
  const pathY = travelY !== null ? travelY + 10 : null;
  const travel =
    scene.travel && pathY !== null
      ? { x1: ORIGIN_X + 5, x2: threatY !== null ? THREAT_X : RIGHT - 24, y: pathY, label: scene.travel.label }
      : null;

  // The box straddles the slab it stands on, and never crosses the right margin.
  const threat =
    scene.threat && threatY !== null
      ? {
          x: Math.min(THREAT_X, RIGHT - THREAT_W),
          y: threatY - 26,
          w: THREAT_W,
          h: 54,
          tag: scene.threat.tag,
          tagSize: fitFontSize(scene.threat.tag, THREAT_W, 8),
          state: scene.threat.state,
          stateSize: fitFontSize(scene.threat.state ?? '', THREAT_W, 7),
          label: scene.threat.label,
          labelSize: fitFontSize(scene.threat.label, THREAT_W * 1.7, 7),
        }
      : null;

  // The unanswered measure sits under whatever it is a measure between, and
  // its caption, 15 below it, still has to be on the canvas.
  const measureY = Math.min((pathY ?? originY + 24) + 28, VIEW_H - 22);
  const measure = scene.measure ? { x1: 236, x2: 298, y: measureY, label: scene.measure } : null;

  return { slabs, void: voidBand, origin: { x: ORIGIN_X, y: originY, label: scene.origin.label, place: scene.origin.place }, fall, travel, threat, measure };
}
