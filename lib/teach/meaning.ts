// What an answer means, in the pill's own vocabulary.
//
// This used to be a lookup table in lib/teach/draft keyed by claim token, hand
// written for the one exercise that existed. That worked exactly as long as
// every exercise was hand written, and it was the thing stopping the exercise
// from being generated from a pill: a derived question produces derived claim
// tokens, and no hand-written table can know them.
//
// So the meaning travels ON the choice. One source of truth, authored or
// derived, and nothing to drift against.

import { z } from '@/lib/zod';
import { RULE_PARTS, type RulePart } from './parts';

export const claimMeaningSchema = z
  .object({
    /** The field of a Rule this answer settles. */
    part: z.enum(RULE_PARTS),
    /** Free text, for a decision or a forbidden action. */
    text: z.string().trim().min(1).max(600).optional(),
    /** An evidence key declared in the pill's evidence.yaml. */
    evidenceKey: z.string().trim().min(1).max(80).optional(),
    /** A role, for escalate_to. */
    role: z.string().trim().min(1).max(80).optional(),
    /** Minutes, or null for "no fixed clock". Absent means this answer says nothing about timing. */
    minutes: z.number().int().min(0).max(10_080).nullable().optional(),
    /** A numeric threshold, with the evidence path it is written against. */
    threshold: z
      .object({
        path: z.string().trim().min(1).max(120),
        /** The engine operator this threshold is expressed with. */
        op: z.enum(['lte', 'lt', 'gte', 'gt', 'eq']),
        value: z.number(),
      })
      .optional(),
  })
  .strict();

export type ClaimMeaning = z.infer<typeof claimMeaningSchema>;

export function isRulePartValue(value: string): value is RulePart {
  return (RULE_PARTS as readonly string[]).includes(value);
}
