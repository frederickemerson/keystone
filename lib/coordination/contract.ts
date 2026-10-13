// Cross-pill coordination contract — the shape of data/coordination.yaml.
//
// data/coordination.yaml is the authored source of truth for the one fact no
// single pill holds: that a named obligation in one domain depends on a gate in
// another. This module is the schema for that file plus the projection of it
// that the browser needs (see ./policy for why a projection exists at all).
//
// Pure and client-safe: a schema and two projections, no I/O, no clock.

import { z } from "@/lib/zod";

/**
 * Accountability slot a pill's SKILL.md frontmatter names, in order of
 * proximity to the work. Adjudication of a cross-pill conflict is derived by
 * walking these slots — never authored into the detector's output.
 */
export const ADJUDICATION_BASES = ["steward", "approver"] as const;
export type AdjudicationBasis = (typeof ADJUDICATION_BASES)[number];

/** A pill id ("<domain>-<name>") plus a rule id inside it. */
export const ruleRefSchema = z.strictObject({
  pill: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)+$/),
  rule: z.string().regex(/^[A-Z]{2}-\d{2}$/),
});

export type RuleRef = z.infer<typeof ruleRefSchema>;

export const conflictClassSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9_]+$/),
  /** Sentence-case label for the panel heading. */
  label: z.string().min(4),
  /** What this class of collision is, in the expert's terms. */
  description: z.string().min(40),
  /** The predicate in words. The code in ./detect is the authority; this says what it means. */
  predicate: z.string().min(40),
  /** A realistic input that makes the predicate FALSE. A class without one is vacuous. */
  falsified_when: z.string().min(40),
});

/**
 * The expectations the contract test pins against the real pills and
 * data/roles.json. These are assertions about authored content, not runtime
 * state — the detector computes its own values and never reads these.
 */
export const groundingSchema = z.strictObject({
  incident: z.string().regex(/^INC-\d{4}-\d{4}$/),
  asset_type: z.string().regex(/^[a-z0-9_]+$/),
  /**
   * The gate rule's FULL effective gating set in this context: base
   * required_evidence union the add_required_evidence of every matching
   * exception. The contract test asserts EQUALITY with the engine's own set.
   */
  unresolved_until: z.array(z.string().regex(/^[a-z0-9_]+$/)).min(1),
  expected_adjudicator: z.strictObject({
    role: z.string().regex(/^[a-z0-9_]+$/),
    basis: z.enum(ADJUDICATION_BASES),
  }),
});

export const conflictLinkSchema = z
  .strictObject({
    id: z.string().regex(/^XP-\d{2}$/),
    class: z.string().regex(/^[a-z0-9_]+$/),
    /** The rule that puts a human on a clock. */
    obligation: ruleRefSchema,
    /** The rule that governs what that human has to speak to. */
    gate: ruleRefSchema,
    /** Why the obligation depends on the gate — the authored link, shown in the panel. */
    dependency: z.string().min(60),
    grounding: groundingSchema,
  })
  .refine((link) => link.obligation.pill !== link.gate.pill, {
    message: "a cross-pill conflict must name two different pills",
  });

export const coordinationFileSchema = z
  .strictObject({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    classes: z.array(conflictClassSchema).min(1),
    conflicts: z.array(conflictLinkSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const classIds = new Set(file.classes.map((c) => c.id));
    for (const conflict of file.conflicts) {
      if (!classIds.has(conflict.class)) {
        ctx.addIssue({
          code: "custom",
          path: ["conflicts", conflict.id, "class"],
          message: `conflict ${conflict.id} names class "${conflict.class}", which is not declared`,
        });
      }
    }
  });

export type CoordinationFile = z.infer<typeof coordinationFileSchema>;
export type ConflictClass = z.infer<typeof conflictClassSchema>;
export type ConflictLink = z.infer<typeof conflictLinkSchema>;

// ---------------------------------------------------------------------------
// Runtime projection
// ---------------------------------------------------------------------------

/**
 * The subset of the contract the detector and the panel read at runtime: the
 * authored link and the labels the panel prints. The authored prose
 * (description / predicate / falsified_when) and the pinned grounding stay in
 * data/coordination.yaml, where the contract test is their only consumer.
 */
export const coordinationPolicySchema = z.strictObject({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  classes: z
    .array(z.strictObject({ id: z.string().regex(/^[a-z0-9_]+$/), label: z.string().min(4) }))
    .min(1),
  conflicts: z
    .array(
      z.strictObject({
        id: z.string().regex(/^XP-\d{2}$/),
        class: z.string().regex(/^[a-z0-9_]+$/),
        obligation: ruleRefSchema,
        gate: ruleRefSchema,
        dependency: z.string().min(60),
      }),
    )
    .min(1),
});

export type CoordinationPolicy = z.infer<typeof coordinationPolicySchema>;

/** Project the authored file onto the runtime policy. Used by the contract test. */
export function projectPolicy(file: CoordinationFile): CoordinationPolicy {
  return {
    version: file.version,
    classes: file.classes.map((c) => ({ id: c.id, label: c.label })),
    conflicts: file.conflicts.map((c) => ({
      id: c.id,
      class: c.class,
      obligation: c.obligation,
      gate: c.gate,
      dependency: c.dependency,
    })),
  };
}
