// MOSAIC deterministic rule engine — zod schemas + parsePill.
// Parses a pill's source files (SKILL.md, rules.yaml, provenance.json,
// evidence.yaml, evals/*.yaml).
//
// Pill files are governance artefacts: everything that reaches the engine
// passes through here, so this module is where hostile or sloppy input is
// rejected LOUDLY. Nothing is coerced, defaulted or silently dropped:
//  - YAML is read with the JSON-compatible core schema (no !!binary, no
//    timestamps, no merge keys), with a size cap, and the loaded tree must be a
//    plain tree — no anchors/aliases (shared or cyclic nodes) and no
//    prototype-ish keys (`__proto__`, `constructor`, `prototype`);
//  - every object schema is strict: an unknown field is an authoring error;
//  - conditions are type-checked against their operator;
//  - cross-file references (rule ids, evidence keys) must resolve.

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
// Safe structured-data loading
// ---------------------------------------------------------------------------

/** Upper bound (UTF-16 code units) for any single pill source file. Authored rules run ~3.3 KB
 *  each (12 rules ≈ 40 KB), so 10 MB admits a ~3,000-rule pill. Parsing is
 *  linear (aliases are rejected), so the cap bounds work, not correctness. */
export const MAX_SOURCE_CHARS = 10_000_000;

/** Keys that are never data: assigning them to a plain object rewrites its
 *  prototype (or shadows a prototype member) instead of storing a value. */
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Reject anything that is not a plain data tree:
 *  - a node reachable twice (YAML anchor/alias reuse, or a cycle) — aliases
 *    are how a "billion laughs" document stays small on disk while every
 *    downstream traversal explodes, and they make a reviewed file mean
 *    something other than what the reviewer read;
 *  - a prototype-ish key at any depth.
 * Iterative with a visited set, so it is linear in the document size.
 */
function assertPlainTree(root: unknown, label: string): void {
  const seen = new Set<object>();
  const stack: [unknown, string][] = [[root, "(root)"]];
  while (stack.length > 0) {
    const [node, at] = stack.pop()!;
    if (node === null || typeof node !== "object") continue;
    if (seen.has(node)) {
      throw new Error(`${label}: ${at}: YAML anchors/aliases (shared or cyclic nodes) are not allowed`);
    }
    seen.add(node);
    for (const key of Object.keys(node)) {
      if (PROTOTYPE_KEYS.has(key)) {
        throw new Error(`${label}: ${at}: forbidden key "${key}"`);
      }
      stack.push([(node as Record<string, unknown>)[key], at === "(root)" ? key : `${at}.${key}`]);
    }
  }
}

function checkSize(text: string, label: string): void {
  if (text.length > MAX_SOURCE_CHARS) {
    throw new Error(`${label}: file is ${text.length} characters; the limit is ${MAX_SOURCE_CHARS}`);
  }
}

/** Load YAML with the JSON-compatible core schema, then assert a plain tree. */
function loadYaml(text: string, label: string): unknown {
  checkSize(text, label);
  let raw: unknown;
  try {
    raw = yaml.load(text, { filename: label, schema: yaml.CORE_SCHEMA });
  } catch (err) {
    throw new Error(`YAML parse error in ${label}: ${(err as Error).message}`);
  }
  assertPlainTree(raw, label);
  return raw;
}

function loadJson(text: string, label: string): unknown {
  checkSize(text, label);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`JSON parse error in ${label}: ${(err as Error).message}`);
  }
  assertPlainTree(raw, label);
  return raw;
}

function validate<T>(raw: unknown, label: string, schema: z.ZodType<T>): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Schema validation error in ${label}: ${issues}`);
  }
  return result.data;
}

function parseYaml<T>(text: string, label: string, schema: z.ZodType<T>): T {
  return validate(loadYaml(text, label), label, schema);
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

const opSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "exists"]);

/** A path segment: an identifier-like key. Prototype-ish names are never
 *  vocabulary (resolvePath only reads own properties anyway). */
const PATH_SEGMENT = /^[A-Za-z0-9_]+$/;

/** "evidence.<key>[.…]" | "asset.<field>[.…]" | "incident.<field>[.…]". */
export const conditionPathSchema = z.string().superRefine((path, ctx) => {
  const [root, ...rest] = path.split(".");
  if (root !== "evidence" && root !== "asset" && root !== "incident") {
    ctx.addIssue({ code: "custom", message: `path "${path}" must start with evidence., asset. or incident.` });
    return;
  }
  if (rest.length === 0 || rest.some((s) => !PATH_SEGMENT.test(s) || PROTOTYPE_KEYS.has(s))) {
    ctx.addIssue({ code: "custom", message: `path "${path}" has an empty, non-identifier or forbidden segment` });
  }
});

const scalarSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);

/**
 * A condition whose value is typed by its operator. evaluateOp is strict
 * (=== and number-only ordering), so an ill-typed value would make the
 * condition silently never (or always) match — reject it instead.
 */
const conditionSchema: z.ZodType<Condition> = z
  .strictObject({
    path: conditionPathSchema,
    op: opSchema,
    value: z.unknown().optional(),
  })
  .superRefine((cond, ctx) => {
    const bad = (message: string) => ctx.addIssue({ code: "custom", path: ["value"], message });
    switch (cond.op) {
      case "exists":
        if (cond.value !== undefined) bad("`exists` takes no value");
        break;
      case "gt":
      case "gte":
      case "lt":
      case "lte":
        if (typeof cond.value !== "number" || !Number.isFinite(cond.value)) {
          bad(`\`${cond.op}\` needs a finite number value`);
        }
        break;
      case "in":
        if (!Array.isArray(cond.value) || cond.value.length === 0 || !cond.value.every((v) => scalarSchema.safeParse(v).success)) {
          bad("`in` needs a non-empty array of scalars");
        }
        break;
      case "eq":
      case "neq":
        if (!scalarSchema.safeParse(cond.value).success) bad(`\`${cond.op}\` needs a scalar value`);
        break;
    }
  });

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const escalateTargetSchema = z.strictObject({
  role: z.string().min(1),
  fallback: z.string().min(1).optional(),
});

const ruleExceptionSchema: z.ZodType<RuleException> = z.strictObject({
  when: z.array(conditionSchema),
  note: z.string(),
  add_required_evidence: z.array(z.string().min(1)).optional(),
  escalate_to: escalateTargetSchema.optional(),
});

const actionClassSchema = z.enum([
  "recommend",
  "requires_approval",
  "must_escalate",
]) as z.ZodType<ActionClass>;

/** Strictness order of action classes: an override may only move up. */
const ACTION_CLASS_RANK: Record<ActionClass, number> = {
  recommend: 0,
  requires_approval: 1,
  must_escalate: 2,
};

const sensitivitySchema = z.enum([
  "public",
  "internal",
  "tenant_pii",
  "commercial",
]) as z.ZodType<Sensitivity>;

const assetOverrideSchema = z.strictObject({
  escalate_to: escalateTargetSchema.optional(),
  action_class: actionClassSchema.optional(),
  deadline_minutes: z.number().finite().nonnegative().nullable().optional(),
  allowed_actions: z.array(z.string()).optional(),
  forbidden_actions: z.array(z.string()).optional(),
  forbidden_if_missing_evidence: z.boolean().optional(),
  note: z.string().optional(),
});

const assetOverridesSchema: z.ZodType<AssetOverrides> = z
  .record(z.string().min(1), assetOverrideSchema)
  .default({});

/**
 * Asset overrides tailor ROUTING (who to escalate to, deadlines, the action
 * menu) per asset type; they may never RELAX a gate. A one-line override deep
 * in rules.yaml must not be able to turn a must_escalate rule into a
 * recommendation for data centres, drop its evidence gate, or un-forbid a
 * forbidden action — the evaluator applies an override wholesale, so the only
 * safe place to enforce monotonicity is here, at parse time:
 *  - override.action_class ranks ≥ the rule's action_class;
 *  - forbidden_if_missing_evidence cannot go true → false;
 *  - override.forbidden_actions ⊇ the rule's forbidden_actions;
 *  - the effective allowed and forbidden action lists are disjoint.
 */
function refineRule(rule: Rule, ctx: z.RefinementCtx): void {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: "custom", path, message });

  const clash = rule.allowed_actions.filter((a) => rule.forbidden_actions.includes(a));
  if (clash.length > 0) issue(["allowed_actions"], `actions both allowed and forbidden: ${clash.join(", ")}`);

  for (const [assetType, ov] of Object.entries(rule.asset_overrides)) {
    const at = ["asset_overrides", assetType];
    if (ov.action_class && ACTION_CLASS_RANK[ov.action_class] < ACTION_CLASS_RANK[rule.action_class]) {
      issue([...at, "action_class"], `override relaxes action_class ${rule.action_class} → ${ov.action_class}`);
    }
    if (rule.forbidden_if_missing_evidence && ov.forbidden_if_missing_evidence === false) {
      issue([...at, "forbidden_if_missing_evidence"], "override removes the missing-evidence gate");
    }
    const forbidden = ov.forbidden_actions ?? rule.forbidden_actions;
    const dropped = rule.forbidden_actions.filter((a) => !forbidden.includes(a));
    if (dropped.length > 0) issue([...at, "forbidden_actions"], `override un-forbids: ${dropped.join(", ")}`);
    const allowed = ov.allowed_actions ?? rule.allowed_actions;
    const both = allowed.filter((a) => forbidden.includes(a));
    if (both.length > 0) issue([...at, "allowed_actions"], `actions both allowed and forbidden: ${both.join(", ")}`);
  }
}

const ruleSchema: z.ZodType<Rule> = z
  .strictObject({
    id: z.string().min(1),
    title: z.string(),
    trigger: z.strictObject({
      incident_type: z.string().min(1),
      all: z.array(conditionSchema),
      any: z.array(conditionSchema),
    }),
    required_evidence: z.array(z.string().min(1)),
    decision: z.string(),
    allowed_actions: z.array(z.string()),
    forbidden_actions: z.array(z.string()),
    exceptions: z.array(ruleExceptionSchema),
    action_class: actionClassSchema,
    forbidden_if_missing_evidence: z.boolean(),
    escalate_to: escalateTargetSchema,
    owner: z.string(),
    deadline_minutes: z.number().finite().nonnegative().nullable(),
    asset_overrides: assetOverridesSchema,
    asset_refs: z.array(z.string()),
    sensitivity: sensitivitySchema,
    provenance: z.array(z.string()),
  })
  .superRefine(refineRule);

/** rules.yaml: a list of rules with unique ids. */
const rulesFileSchema = z.array(ruleSchema).superRefine((rules, ctx) => {
  const seen = new Set<string>();
  rules.forEach((rule, i) => {
    if (seen.has(rule.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `duplicate rule id "${rule.id}"` });
    seen.add(rule.id);
  });
});

// ---------------------------------------------------------------------------
// SKILL.md frontmatter
// ---------------------------------------------------------------------------

const manifestSchema: z.ZodType<PillManifest> = z.strictObject({
  name: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  owner: z.string(),
  steward: z.string(),
  approver: z.string(),
  status: z.enum(["draft", "shadow", "approved", "retired"]),
  scope: z.strictObject({
    asset_types: z.array(z.string()).optional(),
    incident_types: z.array(z.string()).optional(),
    systems: z.array(z.string()).optional(),
    geographic_scope: z.string().optional(),
    standards: z.array(z.string()).optional(),
  }),
  access: z.strictObject({
    roles_allowed: z.array(z.string()).optional(),
    roles_read_only: z.array(z.string()).optional(),
    denied: z.array(z.string()).optional(),
    sensitivity_default: z.string().optional(),
  }),
  review_cadence: z
    .strictObject({
      interval_months: z.number().optional(),
      // The core YAML schema has no timestamp type: an unquoted date is a string.
      next_review: z.string().optional(),
      trigger_conditions: z.array(z.string()).optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

const provenanceRuleEntrySchema: z.ZodType<ProvenanceRuleEntry> = z.strictObject({
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

const provenanceSchema: z.ZodType<Provenance> = z.strictObject({
  pill: z.string(),
  version: z.string(),
  source_interview: z.string(),
  interviewer: z.string().optional(),
  expert: z.strictObject({
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

const evidenceTypeSchema = z.enum(["boolean", "number", "string"]);

const evidenceCatalogSchema: z.ZodType<EvidenceCatalog> = z.record(
  z.string().regex(PATH_SEGMENT),
  z.strictObject({
    label: z.string(),
    type: evidenceTypeSchema,
    confirmable_by: z.array(z.string()),
    description: z.string().optional(),
  }),
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

const evidenceItemSchema = z.strictObject({
  value: z.unknown(),
  source: z.string(),
  at: z.string(),
  confirmed: z.boolean(),
});

/** Asserted decision fields. Strict: an unknown field is an authoring error,
 *  never silently ignored (it would read as a passing assertion). */
const expectedDecisionSchema: z.ZodType<ExpectedDecision> = z.strictObject({
  status: actionStatusSchema,
  deadline_minutes: z.number().nullable().optional(),
});

/** Engine-native EvalCase (already-normalised evidence). */
const evalCaseSchema: z.ZodType<EvalCase> = z.strictObject({
  id: z.string(),
  description: z.string().optional(),
  asset: z.strictObject({
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

/** A bare evidence value. "Not known" is expressed by omitting the key, so
 *  null is not a value. */
const evidenceScalarSchema = z.union([z.string(), z.number().finite(), z.boolean()]);

/**
 * One authored evidence entry:
 *  - a bare scalar (`true`, `"category_1"`) → confirmed evidence from the eval;
 *  - `{ value, confirmed, source?, at? }` → `confirmed` is REQUIRED and must be
 *    a real boolean. (`confirmed: "false"` once parsed as confirmed — the one
 *    place where a typo would forge a sign-off.)
 */
const rawEvidenceSchema = z.union([
  evidenceScalarSchema,
  z.strictObject({
    value: evidenceScalarSchema,
    confirmed: z.boolean(),
    source: z.string().optional(),
    at: z.string().optional(),
  }),
]);

const rawEvalSchema = z.strictObject({
  id: z.string().optional(),
  title: z.string().optional(),
  incident_date: z.string().optional(),
  incident_type: z.string().min(1),
  incident: z.strictObject({ id: z.string().min(1) }).optional(),
  asset: z
    .strictObject({ name: z.string().min(1), type: z.string().min(1) })
    .catchall(z.unknown()),
  evidence: z.record(z.string().regex(PATH_SEGMENT), rawEvidenceSchema),
  expected_decisions: z.record(
    z.string(),
    z.strictObject({
      status: actionStatusSchema,
      deadline_minutes: z.number().nullable().optional(),
      /** Human rationale — documentation only, not asserted. */
      reason: z.string().optional(),
    }),
  ),
  /** Documentation only: what the expert actually did, and what happened. */
  expert_decision: z.string().optional(),
  outcome: z.string().optional(),
});

/** "Harbourfront DC1" → "harbourfront-dc1". */
function slug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toEvidenceItem(raw: z.infer<typeof rawEvidenceSchema>, at: string): EvidenceItem {
  if (typeof raw === "object") {
    return { value: raw.value, source: raw.source ?? "eval", at: raw.at ?? at, confirmed: raw.confirmed };
  }
  return { value: raw, source: "eval", at, confirmed: true };
}

/**
 * Parse one authored eval file (evals/<id>.yaml) into the engine's EvalCase.
 * Bare evidence values are treated as confirmed; `expected_decisions.<id>`
 * becomes the asserted fields (status, optional deadline_minutes); the asset
 * name is slugged into its id. Cross-references (rule ids, evidence
 * vocabulary) are checked by parsePill, which knows the pill.
 */
export function parseEvalFile(id: string, yamlText: string): EvalCase {
  const label = `evals/${id}.yaml`;
  const raw = parseYaml(yamlText, label, rawEvalSchema);
  if (raw.id !== undefined && raw.id !== id) {
    throw new Error(`${label}: id "${raw.id}" does not match the file name`);
  }

  const incidentDate = raw.incident_date ?? "";
  const { name, type, ...attributes } = raw.asset;
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

  const incident: Incident = { id: raw.incident?.id ?? id, type: raw.incident_type };

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
  checkSize(skillMd, "SKILL.md");
  const match = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error("SKILL.md: no YAML frontmatter found (expected leading --- … ---)");
  }
  return match[1];
}

// ---------------------------------------------------------------------------
// Cross-file references
// ---------------------------------------------------------------------------

/** Every `evidence.<key>` a rule reads in a condition (trigger + exceptions). */
function conditionEvidenceKeys(rule: Rule): string[] {
  return [...rule.trigger.all, ...rule.trigger.any, ...rule.exceptions.flatMap((ex) => ex.when)]
    .filter((c) => c.path.startsWith("evidence."))
    .map((c) => c.path.split(".")[1]);
}

/** Every key that can gate a rule: base required + exception-added. */
function gatingEvidenceKeys(rule: Rule): string[] {
  return [...rule.required_evidence, ...rule.exceptions.flatMap((ex) => ex.add_required_evidence ?? [])];
}

/**
 * When the pill ships an evidence catalog, it is the vocabulary: every key a
 * rule or eval uses must be declared there, gating keys must be boolean (they
 * are satisfied only by a confirmed `true`), and eval values must have the
 * declared type. A typo'd key would otherwise read as "never provided" and
 * quietly change a decision.
 */
function checkEvidenceVocabulary(rules: Rule[], evals: Record<string, EvalCase>, catalog: EvidenceCatalog): void {
  const problems: string[] = [];
  const declared = (key: string) => Object.hasOwn(catalog, key);
  for (const rule of rules) {
    for (const key of conditionEvidenceKeys(rule)) {
      if (!declared(key)) problems.push(`rules.yaml ${rule.id}: evidence.${key} is not declared in evidence.yaml`);
    }
    for (const key of gatingEvidenceKeys(rule)) {
      if (!declared(key)) problems.push(`rules.yaml ${rule.id}: required evidence "${key}" is not declared in evidence.yaml`);
      else if (catalog[key].type !== "boolean") {
        problems.push(`rules.yaml ${rule.id}: required evidence "${key}" is ${catalog[key].type}, but gates need a boolean`);
      }
    }
  }
  for (const [caseId, evalCase] of Object.entries(evals)) {
    for (const [key, item] of Object.entries(evalCase.evidence)) {
      if (!declared(key)) problems.push(`evals/${caseId}.yaml: evidence "${key}" is not declared in evidence.yaml`);
      else if (typeof item.value !== catalog[key].type) {
        problems.push(`evals/${caseId}.yaml: evidence "${key}" is ${typeof item.value}, declared ${catalog[key].type}`);
      }
    }
  }
  if (problems.length > 0) throw new Error(`Evidence vocabulary errors: ${problems.join("; ")}`);
}

/** An eval may only assert decisions of rules the pill actually has — an
 *  unknown id would otherwise "pass" as not_applicable forever. */
function checkEvalRuleIds(rules: Rule[], evals: Record<string, EvalCase>): void {
  const ids = new Set(rules.map((r) => r.id));
  const problems: string[] = [];
  for (const [caseId, evalCase] of Object.entries(evals)) {
    for (const ruleId of Object.keys(evalCase.expected)) {
      if (!ids.has(ruleId)) problems.push(`evals/${caseId}.yaml: expected_decisions.${ruleId} names no rule in rules.yaml`);
    }
  }
  if (problems.length > 0) throw new Error(problems.join("; "));
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

/** An eval case id is a file-name stem. */
const EVAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function parsePill(files: PillFiles): Pill {
  // Manifest from SKILL.md frontmatter.
  const manifest = parseYaml(extractFrontmatter(files.skillMd), "SKILL.md", manifestSchema);

  // Rules from rules.yaml.
  const rules = parseYaml(files.rulesYaml, "rules.yaml", rulesFileSchema);

  // Provenance from provenance.json — canonical wrapper; expose the per-rule map.
  const provenance: ProvenanceMap = validate(
    loadJson(files.provenanceJson, "provenance.json"),
    "provenance.json",
    provenanceSchema,
  ).rules;

  // Optional evidence catalog (empty when the pill ships no evidence.yaml).
  const hasCatalog = files.evidenceYaml !== undefined && files.evidenceYaml.trim() !== "";
  const evidenceCatalog: EvidenceCatalog = hasCatalog
    ? parseYaml(files.evidenceYaml!, "evidence.yaml", evidenceCatalogSchema)
    : {};

  // Evals: each value is an authored eval-file YAML string.
  const evals: Record<string, EvalCase> = {};
  for (const [caseId, yamlText] of Object.entries(files.evals)) {
    if (!EVAL_ID.test(caseId) || PROTOTYPE_KEYS.has(caseId)) {
      throw new Error(`evals: invalid case id ${JSON.stringify(caseId)}`);
    }
    evals[caseId] = parseEvalFile(caseId, yamlText);
  }

  checkEvalRuleIds(rules, evals);
  if (hasCatalog) checkEvidenceVocabulary(rules, evals, evidenceCatalog);

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
