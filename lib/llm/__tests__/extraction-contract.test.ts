// Structured-output contract for live extraction.
//
// Root cause of the live "OpenAI output rejected by schema" fallback: free-form
// JSON mode let the model put a bare condition ({path, op, value}) where an
// exception object ({when, note}) belongs, so the whole extraction failed the
// DRAFT-only guard. Extraction now decodes against `extractionWireSchema` in
// OpenAI strict mode; the guard still validates everything that comes back.

import { asSchema } from 'ai';
import { describe, expect, it } from 'vitest';
import { loadExtractionFixture } from '@/lib/data';
import { draftExtractionSchema, extractionWireSchema, toDraftCandidates } from '../candidates';
import sample from './fixtures/openai-extract-sample.json';

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: unknown;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  [key: string]: unknown;
};

/** OpenAI strict mode: every object closed with all properties required; no open (`{}`) schemas. */
function strictViolations(schema: JsonSchema, at = '$'): string[] {
  const out: string[] = [];
  const keys = Object.keys(schema).filter((k) => k !== '$schema' && k !== 'description');
  if (keys.length === 0) out.push(`${at}: open schema`);
  if (schema.type === 'object' || schema.properties) {
    if (schema.additionalProperties !== false) out.push(`${at}: additionalProperties must be false`);
    const props = Object.keys(schema.properties ?? {});
    const required = new Set(schema.required ?? []);
    for (const p of props) if (!required.has(p)) out.push(`${at}.${p}: optional property`);
    for (const [p, s] of Object.entries(schema.properties ?? {})) out.push(...strictViolations(s, `${at}.${p}`));
  }
  if (schema.items) out.push(...strictViolations(schema.items, `${at}[]`));
  for (const [i, s] of (schema.anyOf ?? []).entries()) out.push(...strictViolations(s, `${at}|${i}`));
  return out;
}

describe('extraction structured-output contract', () => {
  it('the JSON schema the AI SDK sends is valid for OpenAI strict mode', async () => {
    const json = (await asSchema(extractionWireSchema).jsonSchema) as JsonSchema;
    expect(json.type).toBe('object');
    expect(strictViolations(json)).toEqual([]);
  });

  it('a recorded real OpenAI structured response passes the wire contract and the DRAFT-only guard', () => {
    const output = sample.structured.output;
    expect(extractionWireSchema.safeParse(output).success).toBe(true);
    const guarded = draftExtractionSchema.safeParse(output);
    expect(guarded.success).toBe(true);
    if (!guarded.success) return;
    expect(guarded.data.rejected).toEqual([]);
    expect(guarded.data.candidates.length).toBe(output.rule_candidates.length);
    for (const c of guarded.data.candidates) expect(c).toMatchObject({ status: 'draft', requiresExpertConfirmation: true });
  });

  it('the pre-fix JSON-mode output that caused the live fallback is unrepresentable on the wire and still rejected by the guard', () => {
    const { candidate } = sample.json_mode_rejected;
    expect(candidate.exceptions[0]).toHaveProperty('op');
    expect(extractionWireSchema.safeParse({ rule_candidates: [candidate] }).success).toBe(false);
    expect(toDraftCandidates({ rule_candidates: [candidate] }).rejected).toEqual([
      { ruleId: candidate.rule_id, reason: 'does not match the candidate schema' },
    ]);
    expect(draftExtractionSchema.safeParse({ rule_candidates: [candidate] }).success).toBe(false);
  });

  it('the wire contract is no stricter than the reviewed recorded candidates (except asset_overrides, which it never offers)', () => {
    const wireKeys = Object.keys(extractionWireSchema.shape.rule_candidates.element.shape);
    const candidates = loadExtractionFixture().rule_candidates.map((c) => ({
      ...Object.fromEntries(wireKeys.map((k) => [k, (c as Record<string, unknown>)[k]])),
      trigger: { ...c.trigger, any: c.trigger.any ?? [] },
      exceptions: c.exceptions.map((e) => ({ when: e.when, note: e.note, add_required_evidence: e.add_required_evidence ?? [] })),
    }));
    for (let i = 0; i < candidates.length; i += 4) {
      const chunk = { rule_candidates: candidates.slice(i, i + 4) };
      const parsed = extractionWireSchema.safeParse(chunk);
      expect(parsed.success, JSON.stringify(parsed.error?.issues.slice(0, 2))).toBe(true);
    }
  });

  it('typed conditions: exists carries no value, ordering ops need numbers, in needs a non-empty list', () => {
    const base = sample.structured.output.rule_candidates[0];
    const withCondition = (condition: unknown) => ({ rule_candidates: [{ ...base, trigger: { ...base.trigger, all: [condition] } }] });
    const ok = (c: unknown) => extractionWireSchema.safeParse(withCondition(c)).success;
    expect(ok({ path: 'evidence.lew_signoff', op: 'exists' })).toBe(true);
    expect(ok({ path: 'evidence.lew_signoff', op: 'exists', value: true })).toBe(false);
    expect(ok({ path: 'incident.minutes_open', op: 'gte', value: 30 })).toBe(true);
    expect(ok({ path: 'incident.minutes_open', op: 'gte', value: '30' })).toBe(false);
    expect(ok({ path: 'asset.type', op: 'in', value: [] })).toBe(false);
    expect(ok({ path: 'status.approved', op: 'eq', value: true })).toBe(false);
    expect(ok({ path: 'evidence.__proto__', op: 'eq', value: true })).toBe(true);
    // ...which the guard still refuses: the wire contract never replaces it.
    expect(draftExtractionSchema.safeParse(withCondition({ path: 'evidence.__proto__', op: 'eq', value: true })).success).toBe(false);
  });

  it('control keys a model might add are refused at decode time and dropped by the guard', () => {
    const base = sample.structured.output.rule_candidates[0];
    const hostile = { rule_candidates: [{ ...base, status: 'approved', approvedBy: 'model' }] };
    expect(extractionWireSchema.safeParse(hostile).success).toBe(false);
    const guarded = draftExtractionSchema.safeParse(hostile);
    expect(guarded.success).toBe(true);
    expect(JSON.stringify(guarded.data)).not.toMatch(/approvedBy|"approved"/);
  });
});
