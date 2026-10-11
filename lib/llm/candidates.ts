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
