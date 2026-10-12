// Jev evidence suggestions — the client-safe half (no key, no network).
//
// Which evidence keys are worth asking Jev about, and the validated wire shape
// of /api/jev/suggest. A suggestion is a probability, never evidence: it
// becomes evidence only when a human with the key's `confirmable_by` grant
// confirms it through the governance store (confirmEvidence → audit).

import { z } from '@/lib/zod';
import type { ConditionContext } from '@/lib/engine/conditions';
import { evaluateRule } from '@/lib/engine/evaluate';
import type { EvidenceCatalog, Pill } from '@/lib/engine/types';

/** Upper bound on questions in one Jev call (keeps the request small and fast). */
export const MAX_SUGGESTION_KEYS = 24;

/** Evidence key as declared in evidence.yaml (snake_case). */
export const evidenceKeySchema = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);

export const suggestRequestSchema = z
  .object({
    incidentId: z.string().regex(/^INC-\d{4}-\d{4}$/),
    eventId: z.string().regex(/^[A-Za-z0-9-]{1,40}$/),
    pillId: z.string().regex(/^[a-z0-9-]{1,120}$/),
    keys: z.array(evidenceKeySchema).min(1).max(MAX_SUGGESTION_KEYS),
  })
  .strict();

export type SuggestRequest = z.infer<typeof suggestRequestSchema>;

export const suggestionSchema = z.object({
  key: evidenceKeySchema,
  label: z.string(),
  probability: z.number().min(0).max(1),
});

export type EvidenceSuggestion = z.infer<typeof suggestionSchema>;

export const suggestResponseSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    model: z.string(),
    latencyMs: z.number().nonnegative(),
    suggestions: z.array(suggestionSchema),
  }),
  z.object({ available: z.literal(false), reason: z.string() }),
]);

export type SuggestResponse = z.infer<typeof suggestResponseSchema>;

/** Boolean keys declared in the catalog — the only ones Jev may be asked about. */
export function isSuggestableKey(catalog: EvidenceCatalog, key: string): boolean {
  return Object.hasOwn(catalog, key) && catalog[key].type === 'boolean';
}

function triggerEvidenceKeys(rule: Pill['rules'][number]): string[] {
  return [...rule.trigger.all, ...rule.trigger.any]
    .filter((c) => c.path.startsWith('evidence.'))
    .map((c) => c.path.split('.')[1] ?? '')
    .filter(Boolean);
}

/**
 * Evidence keys the pill's triggered or near-triggered rules read, for which
 * no human-confirmed value exists yet.
 *
 * "Near-triggered" comes from the engine's own trace, not a heuristic: the
 * incident type matches and every failing trigger condition is on an
 * `evidence.*` path — i.e. evidence alone could fire the rule. Keys are the
 * rule's trigger evidence plus the gating set evaluateRule derives.
 */
export function suggestionKeys(pill: Pill, ctx: ConditionContext): string[] {
  const keys: string[] = [];
  for (const rule of pill.rules) {
    const { trace, requiredEvidence } = evaluateRule(rule, ctx);
    const failing = [...trace.allConditions.filter((c) => !c.matched)];
    const anyFailed = rule.trigger.any.length > 0 && !trace.anyConditions.some((c) => c.matched);
    if (anyFailed) failing.push(...trace.anyConditions);
    const typeMatch = ctx.incident.type === rule.trigger.incident_type;
    const near = typeMatch && failing.every((c) => c.path.startsWith('evidence.'));
    if (!trace.triggered && !near) continue;
    keys.push(...triggerEvidenceKeys(rule), ...requiredEvidence);
  }
  return [...new Set(keys)]
    .filter((k) => isSuggestableKey(pill.evidenceCatalog, k))
    .filter((k) => !(Object.hasOwn(ctx.evidence, k) && ctx.evidence[k].confirmed === true))
    .slice(0, MAX_SUGGESTION_KEYS);
}

/** Question text for a key: its evidence.yaml label + description (authored by the expert). */
export function questionFor(catalog: EvidenceCatalog, key: string): string {
  const entry = catalog[key];
  return entry.description ? `${entry.label}. ${entry.description}` : entry.label;
}
