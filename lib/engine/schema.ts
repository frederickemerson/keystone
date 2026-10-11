// MOSAIC deterministic rule engine — zod schemas + parsePill.
// Parses a pill's source files (SKILL.md, rules.yaml, provenance.json, evals/*.yaml).

import * as yaml from "js-yaml";
import { z } from "zod";
import type {
  ActionClass,
  AssetOverrides,
  Condition,
  EvalCase,
  Pill,
  PillManifest,
  ProvenanceMap,
  Rule,
  RuleException,
  Sensitivity,
} from "./types.js";

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

const assetOverridesSchema: z.ZodType<AssetOverrides> = z.record(
  z.string(),
  z.object({
    escalate_to: escalateTargetSchema.optional(),
    action_class: actionClassSchema.optional(),
    deadline_minutes: z.number().nullable().optional(),
    allowed_actions: z.array(z.string()).optional(),
    forbidden_actions: z.array(z.string()).optional(),
  }),
);

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

const manifestSchema: z.ZodType<PillManifest> = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  owner: z.string(),
  steward: z.string(),
  approver: z.string(),
  scope: z.string(),
  access: z.string(),
});

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

const provenanceEntrySchema = z.object({
  transcript_segment: z.string(),
  confirmation_status: z.enum(["confirmed", "edited", "rejected"]),
  expert_role: z.string().optional(),
});

const provenanceSchema = z.record(z.string(), provenanceEntrySchema) as z.ZodType<ProvenanceMap>;

// ---------------------------------------------------------------------------
// Eval case
// ---------------------------------------------------------------------------

const actionStatusSchema = z.enum([
  "allowed",
  "blocked",
  "needs_approval",
  "escalate",
]);

const evidenceItemSchema = z.object({
  value: z.unknown(),
  source: z.string(),
  at: z.string(),
  confirmed: z.boolean(),
});

const evalCaseSchema: z.ZodType<EvalCase> = z.object({
  id: z.string(),
  description: z.string().optional(),
  asset: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    attributes: z.record(z.string(), z.unknown()),
  }),
  incident: z.object({
    id: z.string(),
    type: z.string(),
  }).catchall(z.unknown()),
  evidence: z.record(z.string(), evidenceItemSchema),
  expected: z.record(z.string(), actionStatusSchema),
});

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

  // Provenance from provenance.json.
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
  const provenance = provenanceResult.data;

  // Evals: each value is a YAML string.
  const evals: Record<string, EvalCase> = {};
  for (const [caseId, yamlText] of Object.entries(files.evals)) {
    evals[caseId] = parseYaml(yamlText, `evals/${caseId}.yaml`, evalCaseSchema);
  }

  return { manifest, rules, provenance, evals };
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
