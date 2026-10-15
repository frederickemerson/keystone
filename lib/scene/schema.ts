// A situation, as structure rather than as a picture.
//
// The point of this file. "Describe a situation and it draws it" is the kind
// of feature that invites asking a model for SVG, which would mean shipping
// whatever markup it felt like emitting and hoping it looked like a building.
// Keystone does not work that way anywhere else and it does not work that way
// here: the model fills in a form, this schema refuses the form if it is wrong,
// and lib/scene/layout turns the accepted form into geometry. Nothing a model
// writes reaches the renderer except as values of these fields.
//
// The vocabulary is the one the hand-drawn chilled-water figure already uses,
// generalised: floors stacked top to bottom, something that goes wrong on one
// of them, something it travels along, something it threatens, and the measure
// nobody has settled yet — which is the question a rule would answer. That
// grammar covers most of what goes wrong in a building (a leak, a smell, smoke,
// a flooded pit, a hot aisle) without pretending to draw anything at all.

import { z } from '@/lib/zod';

/** Levels are indexed top to bottom, as they are drawn. */
const levelIndex = z.number().int().min(0).max(3);

const label = z.string().trim().min(1).max(40);
const sentence = z.string().trim().min(1).max(120);

export const sceneSchema = z
  .object({
    /** What the situation is called, in the words of the person who described it. */
    title: z.string().trim().min(1).max(70),
    /** Two to four floors, drawn in the order given. */
    levels: z
      .array(
        z.object({
          /** Short floor label, e.g. "L28" or "B2". */
          label,
          /** What is on it that matters, e.g. "bank tenant" or "data hall". */
          note: label.nullable(),
        }),
      )
      .min(2)
      .max(4),
    /** What goes wrong, and where. */
    origin: z.object({
      level: levelIndex,
      /** The thing that failed, e.g. "chilled-water coupling". */
      label,
      /** Where on that level, e.g. "ceiling void". */
      place: label.nullable(),
    }),
    /** Where it gets to, and along what. Null when it stays where it started. */
    travel: z
      .object({
        level: levelIndex,
        /** What carries it, e.g. "conduit" or "floor void". */
        label,
      })
      .nullable(),
    /** What is now at risk. Null when nothing identifiable is. */
    threat: z
      .object({
        level: levelIndex,
        /** The thing at risk, e.g. "riser cupboard". */
        label,
        /** Its tag, e.g. "DB-27B". */
        tag: label,
        /** One word for its state, e.g. "live" or "occupied". */
        state: label.nullable(),
      })
      .nullable(),
    /**
     * The measure the situation turns on and nobody has settled — "how close is
     * too close?". It is drawn unlabelled by a number on purpose: the number is
     * what a teaching session is for, so the drawing must not answer it.
     */
    measure: sentence.nullable(),
    /** The beats, in order, as the drawn scenario's captions are. */
    captions: z.array(sentence).min(2).max(5),
  })
  .superRefine((scene, ctx) => {
    // Every level reference has to point at a floor that is actually drawn.
    const last = scene.levels.length - 1;
    const refs: [number | undefined, string][] = [
      [scene.origin.level, 'origin'],
      [scene.travel?.level, 'travel'],
      [scene.threat?.level, 'threat'],
    ];
    for (const [level, field] of refs) {
      if (level !== undefined && level > last) {
        ctx.addIssue({ code: 'custom', message: `${field} names level ${level}, and there are ${scene.levels.length}`, path: [field, 'level'] });
      }
    }
    // Water does not run uphill, and neither does anything else this draws.
    if (scene.travel && scene.travel.level < scene.origin.level) {
      ctx.addIssue({ code: 'custom', message: 'travel is above the origin', path: ['travel', 'level'] });
    }
  });

export type Scene = z.infer<typeof sceneSchema>;

/**
 * The same shape as a decode-time contract for providers that support strict
 * JSON-schema output. Everything is required and nullable rather than optional,
 * which is what strict mode allows, and it constrains generation only — the
 * caller still validates the result against `sceneSchema`.
 */
export const sceneWireSchema = z.strictObject({
  title: z.string(),
  levels: z.array(z.strictObject({ label: z.string(), note: z.string().nullable() })),
  origin: z.strictObject({ level: z.number(), label: z.string(), place: z.string().nullable() }),
  travel: z.strictObject({ level: z.number(), label: z.string() }).nullable(),
  threat: z
    .strictObject({ level: z.number(), label: z.string(), tag: z.string(), state: z.string().nullable() })
    .nullable(),
  measure: z.string().nullable(),
  captions: z.array(z.string()),
});
