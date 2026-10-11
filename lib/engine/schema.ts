// MOSAIC deterministic rule engine — zod schemas + parsePill.
// Parses a pill's source files (SKILL.md, rules.yaml, provenance.json, evals/*.yaml).

import * as yaml from "js-yaml";
import { z } from "zod";
import type {
  ActionClass,
  ActionStatus,
  Asset,
  AssetOverrides,
  Condition,
  EvalCase,
  Evidence,
  EvidenceCatalog,
  EvidenceItem,
  ExpectedDecision,
  Incident,
  Pill,
  PillManifest,
  Provenance,
  ProvenanceMap,
  ProvenanceRuleEntry,
  Rule,
  RuleException,
  Sensitivity,
} from "./types";

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

const opSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "exists",
]);

const conditionSchema: z.ZodType<Condition> = z.object({
  path: z.string().min(1),
  op: opSchema,
  value: z.unknown().optional(),
});

const escalateTargetSchema = z.object({
  role: z.string(),
  fallback: z.string().optional(),
});

const ruleExceptionSchema: z.ZodType<RuleException> = z.object({
  when: z.array(conditionSchema),
  note: z.string(),
  add_required_evidence: z.array(z.string()).optional(),
  escalate_to: escalateTargetSchema.optional(),
});

const actionClassSchema = z.enum([
  "recommend",
  "requires_approval",
  "must_escalate",
]) as z.ZodType<ActionClass>;

const sensitivitySchema = z.enum([
  "public",
  "internal",
  "tenant_pii",
  "commercial",
]) as z.ZodType<Sensitivity>;

const assetOverridesSchema: z.ZodType<AssetOverrides> = z
  .record(
    z.string(),
    z
      .object({
        escalate_to: escalateTargetSchema.optional(),
        action_class: actionClassSchema.optional(),
        deadline_minutes: z.number().nullable().optional(),
        allowed_actions: z.array(z.string()).optional(),
        forbidden_actions: z.array(z.string()).optional(),
        forbidden_if_missing_evidence: z.boolean().optional(),
        note: z.string().optional(),
      })
      .passthrough(),
  )
  .default({});

const ruleSchema: z.ZodType<Rule> = z.object({
  id: z.string().min(1),
  title: z.string(),
  trigger: z.object({
    incident_type: z.string(),
    all: z.array(conditionSchema),
    any: z.array(conditionSchema),
  }),
  required_evidence: z.array(z.string()),
  decision: z.string(),
  allowed_actions: z.array(z.string()),
  forbidden_actions: z.array(z.string()),
  exceptions: z.array(ruleExceptionSchema),
  action_class: actionClassSchema,
  forbidden_if_missing_evidence: z.boolean(),
  escalate_to: escalateTargetSchema,
  owner: z.string(),
  deadline_minutes: z.number().nullable(),
  asset_overrides: assetOverridesSchema,
  asset_refs: z.array(z.string()),
  sensitivity: sensitivitySchema,
  provenance: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// SKILL.md frontmatter
// ---------------------------------------------------------------------------

const manifestSchema: z.ZodType<PillManifest> = z
  .object({
    name: z.string(),
    description: z.string(),
    version: z.string(),
    owner: z.string(),
    steward: z.string(),
    approver: z.string(),
    status: z.enum(["draft", "shadow", "approved", "retired"]),
    scope: z
      .object({
        asset_types: z.array(z.string()).optional(),
        incident_types: z.array(z.string()).optional(),
        systems: z.array(z.string()).optional(),
        geographic_scope: z.string().optional(),
        standards: z.array(z.string()).optional(),
      })
      .passthrough(),
    access: z
      .object({
        roles_allowed: z.array(z.string()).optional(),
        roles_read_only: z.array(z.string()).optional(),
        denied: z.array(z.string()).optional(),
        sensitivity_default: z.string().optional(),
      })
      .passthrough(),
    review_cadence: z
      .object({
        interval_months: z.number().optional(),
        next_review: z
          .union([z.string(), z.date()])
          .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))
          .optional(),
        trigger_conditions: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

const provenanceRuleEntrySchema: z.ZodType<ProvenanceRuleEntry> = z.object({
  source: z.string(),
  start: z.string(),
  end: z.string(),
  quote: z.string(),
  confirmation: z.enum(["confirmed", "edited", "rejected"]),
  confirmed_by: z.string(),
  confirmed_at: z.string(),
  edit_note: z.string().optional(),
  transcript_segment: z.string().optional(),
  confirmation_status: z.enum(["confirmed", "edited", "rejected"]).optional(),
});

const provenanceSchema: z.ZodType<Provenance> = z.object({
  pill: z.string(),
  version: z.string(),
  source_interview: z.string(),
  interviewer: z.string().optional(),
  expert: z.object({
    name: z.string(),
    role: z.string(),
    years_experience: z.number().optional(),
    employer_context: z.string().optional(),
  }),
  rules: z.record(z.string(), provenanceRuleEntrySchema),
});

// ---------------------------------------------------------------------------
// Evidence catalog (optional evidence.yaml)
// ---------------------------------------------------------------------------

const evidenceCatalogSchema: z.ZodType<EvidenceCatalog> = z.record(
  z.string(),
  z
    .object({
      label: z.string(),
      type: z.string(),
      confirmable_by: z.array(z.string()),
      description: z.string().optional(),
    })
    .passthrough(),
);

// ---------------------------------------------------------------------------
// Eval case
// ---------------------------------------------------------------------------

const actionStatusSchema = z.enum([
  "allowed",
  "blocked",
  "needs_approval",
  "escalate",
  "not_applicable",
]) as z.ZodType<ActionStatus>;

const evidenceItemSchema = z.object({
  value: z.unknown(),
  source: z.string(),
  at: z.string(),
  confirmed: z.boolean(),
});

/** Asserted decision fields. Strict: an unknown field is an authoring error,
 *  never silently ignored (it would read as a passing assertion). */
const expectedDecisionSchema: z.ZodType<ExpectedDecision> = z
  .object({
    status: actionStatusSchema,
    deadline_minutes: z.number().nullable().optional(),
  })
  .strict();

/** Engine-native EvalCase (already-normalised evidence). */
const evalCaseSchema: z.ZodType<EvalCase> = z.object({
  id: z.string(),
  description: z.string().optional(),
  asset: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    attributes: z.record(z.string(), z.unknown()),
  }),
  incident: z
    .object({
      id: z.string(),
      type: z.string(),
    })
    .catchall(z.unknown()),
  evidence: z.record(z.string(), evidenceItemSchema),
  expected: z.record(z.string(), expectedDecisionSchema),
});

// ---------------------------------------------------------------------------
// Authored eval file (evals/*.yaml) — the canonical on-disk format
// ---------------------------------------------------------------------------

const rawEvalSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    incident_date: z.string().optional(),
    incident_type: z.string().optional(),
    incident: z
      .object({ id: z.string().optional() })
      .passthrough()
      .optional(),
    asset: z.record(z.string(), z.unknown()),
    evidence: z.record(z.string(), z.unknown()),
    expected_decisions: z.record(
      z.string(),
      z
        .object({
          status: actionStatusSchema,
          deadline_minutes: z.number().nullable().optional(),
          /** Human rationale — documentation only, not asserted. */
          reason: z.string().optional(),
        })
        .strict(),
    ),
  })
  .passthrough();

/** "Harbourfront DC1" → "harbourfront-dc1". */
function slug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalise one authored evidence value:
 *  - a bare scalar (`true`, `"category_1"`) → confirmed evidence from the eval;
 *  - an authored `{ value, confirmed, ... }` object → keep its `confirmed` flag.
 */
function toEvidenceItem(raw: unknown, at: string): EvidenceItem {
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw) && "value" in raw) {
    const obj = raw as Record<string, unknown>;
    return {
      value: obj.value,
      source: typeof obj.source === "string" ? obj.source : "eval",
      at: typeof obj.at === "string" ? obj.at : at,
      confirmed: typeof obj.confirmed === "boolean" ? obj.confirmed : true,
    };
  }
  return { value: raw, source: "eval", at, confirmed: true };
}

/**
 * Parse one authored eval file (evals/<id>.yaml) into the engine's EvalCase.
 * Bare evidence values are treated as confirmed; `expected_decisions.<id>`
 * becomes the asserted fields (status, optional deadline_minutes); the asset name is slugged into its id.
 */
export function parseEvalFile(id: string, yamlText: string): EvalCase {
  const raw = parseYaml(yamlText, `evals/${id}.yaml`, rawEvalSchema);

  const incidentDate = raw.incident_date ?? "";
  const assetRaw = raw.asset;
  const name = typeof assetRaw.name === "string" ? assetRaw.name : "Unknown";
  const type = typeof assetRaw.type === "string" ? assetRaw.type : "unknown";

  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(assetRaw)) {
    if (key === "name" || key === "type") continue;
    attributes[key] = value;
  }
  const asset: Asset = { id: slug(name), name, type, attributes };

  const evidence: Evidence = {};
  for (const [key, value] of Object.entries(raw.evidence)) {
    evidence[key] = toEvidenceItem(value, incidentDate);
  }

  const expected: Record<string, ExpectedDecision> = {};
  for (const [ruleId, entry] of Object.entries(raw.expected_decisions)) {
    expected[ruleId] =
      entry.deadline_minutes === undefined
        ? { status: entry.status }
        : { status: entry.status, deadline_minutes: entry.deadline_minutes };
  }

  const incident: Incident = {
    id: raw.incident?.id ?? id,
    type: raw.incident_type ?? "water_ingress",
  };

  return { id, asset, incident, evidence, expected };
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract YAML frontmatter from a SKILL.md string.
 * Frontmatter is delimited by leading/trailing `---` lines.
 */
export function extractFrontmatter(skillMd: string): string {
  const match = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error("SKILL.md: no YAML frontmatter found (expected leading --- … ---)");
  }
  return match[1];
}

function parseYaml<T>(text: string, label: string, schema: z.ZodType<T>): T {
  let raw: unknown;
  try {
    raw = yaml.load(text, { filename: label });
  } catch (err) {
    throw new Error(`YAML parse error in ${label}: ${(err as Error).message}`);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Schema validation error in ${label}: ${issues}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// parsePill — the public entry point
// ---------------------------------------------------------------------------

export interface PillFiles {
  skillMd: string;
  rulesYaml: string;
  provenanceJson: string;
  /** Optional evidence.yaml text: evidence key → {label, type, confirmable_by[], description}. */
  evidenceYaml?: string;
  /** evals keyed by case id (filename stem). */
  evals: Record<string, string>;
}

export function parsePill(files: PillFiles): Pill {
  // Manifest from SKILL.md frontmatter.
  const frontmatter = extractFrontmatter(files.skillMd);
  const manifest = parseYaml(frontmatter, "SKILL.md", manifestSchema);

  // Rules from rules.yaml.
  const ruleArraySchema = z.array(ruleSchema);
  const rules = parseYaml(files.rulesYaml, "rules.yaml", ruleArraySchema);

  // Provenance from provenance.json — canonical wrapper; expose the per-rule map.
  let provenanceRaw: unknown;
  try {
    provenanceRaw = JSON.parse(files.provenanceJson);
  } catch (err) {
    throw new Error(`JSON parse error in provenance.json: ${(err as Error).message}`);
  }
  const provenanceResult = provenanceSchema.safeParse(provenanceRaw);
  if (!provenanceResult.success) {
    const issues = provenanceResult.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Schema validation error in provenance.json: ${issues}`);
  }
  const provenance: ProvenanceMap = provenanceResult.data.rules;

  // Optional evidence catalog (empty when the pill ships no evidence.yaml).
  const evidenceCatalog: EvidenceCatalog =
    files.evidenceYaml && files.evidenceYaml.trim() !== ""
      ? parseYaml(files.evidenceYaml, "evidence.yaml", evidenceCatalogSchema)
      : {};

  // Evals: each value is an authored eval-file YAML string.
  const evals: Record<string, EvalCase> = {};
  for (const [caseId, yamlText] of Object.entries(files.evals)) {
    evals[caseId] = parseEvalFile(caseId, yamlText);
  }

  return { manifest, rules, provenance, evals, evidenceCatalog };
}

// Re-export schemas for callers that want to validate fragments.
export {
  conditionSchema,
  ruleSchema,
  manifestSchema,
  provenanceSchema,
  evalCaseSchema,
  escalateTargetSchema,
  actionClassSchema,
  sensitivitySchema,
};
