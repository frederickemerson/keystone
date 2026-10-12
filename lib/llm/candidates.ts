// LLM output → DRAFT rule candidates. Pure + client-safe.
//
// The extractor (live model or recorded fixture) only ever proposes. Its
// output is untrusted text: it is parsed against the candidate schema, mapped
// field-by-field into an engine Rule (any other key the model emits — "status",
// "approved", "instructions" — is dropped), validated against the engine rule
// schema, and returned as a draft awaiting expert confirmation. Nothing here
// can touch pill versions, approvals or gates: those change only through the
// governance store (proposeVersion → Draft → canApprove by a different,
// authorised human).

import { z } from "zod";
import { ruleCandidateSchema, type RuleCandidate } from "@/lib/data/schemas";
import { ruleSchema, type Rule } from "@/lib/engine";

export interface DraftCandidate {
  readonly status: "draft";
  readonly requiresExpertConfirmation: true;
  readonly rule: Rule;
}

export interface CandidateParse {
  candidates: DraftCandidate[];
  /** Candidates (or the whole output) that were dropped, with why. */
  rejected: { ruleId: string | null; reason: string }[];
}

/** Map one extracted candidate into the engine Rule shape (explicit fields only). */
export function candidateToRule(c: RuleCandidate): Rule {
  return {
    id: c.rule_id,
    title: c.title,
    trigger: {
      incident_type: c.trigger.incident_type,
      all: c.trigger.all,
      any: c.trigger.any ?? [],
    },
    required_evidence: c.required_evidence,
    decision: c.decision,
    allowed_actions: c.allowed_actions,
    forbidden_actions: c.forbidden_actions,
    exceptions: c.exceptions,
    action_class: c.action_class,
    forbidden_if_missing_evidence: c.forbidden_if_missing_evidence,
    escalate_to: c.escalate_to,
    owner: c.owner,
    deadline_minutes: c.deadline_minutes,
    asset_overrides: (c.asset_overrides ?? {}) as Rule["asset_overrides"],
    asset_refs: [],
    sensitivity: "internal",
    provenance: c.provenance,
  };
}

const extractionOutputSchema = z.object({ rule_candidates: z.array(z.unknown()).max(20) });

// ---------------------------------------------------------------------------
// Structured-output contract (what a schema-constrained provider must emit)
// ---------------------------------------------------------------------------
//
// Providers that support strict JSON-schema output (OpenAI) are constrained to
// this schema at decode time, so they cannot invent shapes the guard rejects
// (e.g. a bare condition where an exception object belongs). It is expressed
// in the OpenAI strict subset: every property required, no additional
// properties, no open types. It is deliberately a SUBSET of what the guard
// accepts — the guard (draftExtractionSchema) still runs on the result and
// stays the only authority. Fields the guard treats as optional are either
// required here (escalate_to.fallback, add_required_evidence: [] allowed) or
// not offered (asset_overrides, exception escalate_to).

const wirePath = z.string().regex(/^(evidence|asset|incident)(\.[A-Za-z0-9_]+)+$/);
const wireScalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
/** One variant per operator family so the value type matches what the engine evaluates. */
const wireCondition = z.union([
  z.strictObject({ path: wirePath, op: z.enum(["eq", "neq"]), value: wireScalar }),
  z.strictObject({ path: wirePath, op: z.enum(["gt", "gte", "lt", "lte"]), value: z.number() }),
  z.strictObject({ path: wirePath, op: z.literal("in"), value: z.array(wireScalar).min(1) }),
  z.strictObject({ path: wirePath, op: z.literal("exists") }),
]);
const wireCandidate = z.strictObject({
  rule_id: z.string().regex(/^[A-Z]{2,5}-\d{2,3}$/),
  title: z.string(),
  trigger: z.strictObject({ incident_type: z.string(), all: z.array(wireCondition), any: z.array(wireCondition) }),
  required_evidence: z.array(z.string()),
  decision: z.string(),
  allowed_actions: z.array(z.string()),
  forbidden_actions: z.array(z.string()),
  exceptions: z.array(z.strictObject({
    when: z.array(wireCondition),
    note: z.string(),
    add_required_evidence: z.array(z.string()),
  })),
  action_class: z.enum(["recommend", "requires_approval", "must_escalate"]),
  forbidden_if_missing_evidence: z.boolean(),
  escalate_to: z.strictObject({ role: z.string(), fallback: z.string() }),
  owner: z.string(),
  deadline_minutes: z.number().nullable(),
  provenance: z.array(z.string().regex(/^[A-Za-z0-9-]+#\d{2}:[0-5]\d:[0-5]\d$/)),
  confirmation_status: z.literal("pending_expert_review"),
  confidence: z.number(),
});

/**
 * The structured-output schema for the `extract` task. Passed to providers as
 * the decode-time contract; its output is then re-validated by
 * `draftExtractionSchema`, which never trusts it.
 */
export const extractionWireSchema = z.strictObject({ rule_candidates: z.array(wireCandidate).max(4) });

/** Use the existing field-by-field guard for both provider output and fixtures. */
export const draftExtractionSchema = extractionOutputSchema.transform((raw, ctx) => {
  const parsed = toDraftCandidates(raw);
  const ids = parsed.candidates.map((c) => c.rule.id);
  if (parsed.rejected.length || new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', message: 'Invalid or duplicate rule candidates.' });
    return z.NEVER;
  }
  return parsed;
});

/**
 * Parse raw extractor output into draft candidates. Never throws: malformed
 * output yields no candidates; each malformed candidate is rejected alone.
 */
export function toDraftCandidates(raw: unknown): CandidateParse {
  const out: CandidateParse = { candidates: [], rejected: [] };
  const envelope = extractionOutputSchema.safeParse(raw);
  if (!envelope.success) {
    out.rejected.push({ ruleId: null, reason: "output is not an extraction ({ rule_candidates: [...] })" });
    return out;
  }
  for (const item of envelope.data.rule_candidates) {
    const id =
      typeof item === "object" && item !== null && typeof (item as { rule_id?: unknown }).rule_id === "string"
        ? (item as { rule_id: string }).rule_id
        : null;
    const candidate = ruleCandidateSchema.safeParse(item);
    if (!candidate.success) {
      out.rejected.push({ ruleId: id, reason: "does not match the candidate schema" });
      continue;
    }
    const rule = ruleSchema.safeParse(candidateToRule(candidate.data));
    if (!rule.success) {
      out.rejected.push({ ruleId: id, reason: "does not form a valid engine rule" });
      continue;
    }
    out.candidates.push(Object.freeze({ status: "draft", requiresExpertConfirmation: true, rule: rule.data }));
  }
  return out;
}
