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
import draftExtractionFixture from '@/data/fixtures/llm/extraction.json';
import { draftExtractionSchema, draftRuleId, extractionWireSchema, toDraftCandidates } from '../candidates';
import { listPillRefs, loadPill } from '@/lib/pills/load';
import { applyRuleChanges } from '@/lib/governance/versions';
import recordedSample from './fixtures/openai-extract-sample.json';

// The recorded response predates server-assigned draft ids: it carries a
// model-chosen rule_id, which the wire contract no longer offers.
const withoutRuleId = <T extends { rule_id?: unknown }>({ rule_id: _drop, ...rest }: T) => rest;
const sample = {
  ...recordedSample,
  structured: { output: { rule_candidates: recordedSample.structured.output.rule_candidates.map(withoutRuleId) } },
};

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

  it('draft ids are assigned server-side in the reserved DRAFT- namespace, never taken from the model', () => {
    const base = sample.structured.output.rule_candidates[0];
    const withModelId = { rule_candidates: [{ ...base, rule_id: 'TS-01' }, { ...base, rule_id: 'TS-01', title: 'second' }] };
    // The model cannot emit an id on the wire...
    expect(extractionWireSchema.safeParse(withModelId).success).toBe(false);
    // ...and any id a non-strict provider sends is overwritten by the guard.
    const guarded = draftExtractionSchema.safeParse(withModelId);
    expect(guarded.success).toBe(true);
    if (!guarded.success) return;
    expect(guarded.data.candidates.map((c) => c.rule.id)).toEqual(['DRAFT-01', 'DRAFT-02']);
    expect(draftRuleId(9)).toBe('DRAFT-10');
  });

  it('a draft id can never equal a real pill rule id', () => {
    const pills = listPillRefs().map((r) => loadPill(r.id)!.pill);
    expect(pills.length).toBeGreaterThan(0);
    const guarded = draftExtractionSchema.parse(draftExtractionFixture);
    const pillIds = new Set(pills.flatMap((p) => p.rules.map((r) => r.id)));
    for (const c of guarded.candidates) expect(pillIds.has(c.rule.id)).toBe(false);
    // The namespace is reserved: a draft cannot be proposed into a pill under its draft id.
    expect(() => applyRuleChanges(pills[0].rules, [{ op: 'add', rule: guarded.candidates[0].rule }])).toThrow(/draft id/);
  });
});
