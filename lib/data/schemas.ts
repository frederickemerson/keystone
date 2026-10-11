// MOSAIC demo data — zod schemas + inferred types for data/*.json.
// Pure (no fs) so client-safe modules (lib/governance/access.ts) can validate
// statically imported JSON. Shapes are derived from the actual files in data/.

import { z } from "zod";
import { conditionSchema } from "../engine/schema";

export const sensitivityLevelSchema = z.enum(["public", "internal", "tenant_pii", "commercial"]);
export type SensitivityLevel = z.infer<typeof sensitivityLevelSchema>;

const actionClassSchema = z.enum(["recommend", "requires_approval", "must_escalate"]);

// Extraction candidates become engine rules (app/capture), so their conditions
// must meet the engine's own typed condition schema — not a looser copy.

// ---------------------------------------------------------------------------
// data/roles.json
// ---------------------------------------------------------------------------

/**
 * The exact approval grants that appear in roles.json `can_approve`. Listed
 * verbatim so a new/renamed grant fails validation loudly instead of being
 * silently ignored by the access policy.
 */
export const approvalGrantSchema = z.enum([
  "requires_approval actions",
  "pill shadow-to-approved promotion (steward sign-off)",
  "tenant message draft before send",
  "pill version promotion (final approver for commercial-sensitivity pills)",
  "rollback",
]);
export type ApprovalGrant = z.infer<typeof approvalGrantSchema>;

const visibilityListSchema = z.object({
  evidence: z.array(z.string()).optional(),
  incident_fields: z.array(z.string()).optional(),
  pill_fields: z.array(z.string()).optional(),
});

export const roleSchema = z.object({
  role: z.string().min(1),
  label: z.string(),
  description: z.string(),
  /** The named human who holds this role in the demo (one persona per role). */
  person: z.string().min(1),
  sensitivity_levels_visible: z.array(sensitivityLevelSchema),
  sensitivity_levels_masked: z.array(sensitivityLevelSchema),
  can_see: visibilityListSchema,
  cannot_see: visibilityListSchema,
  can_approve: z.array(approvalGrantSchema),
  can_escalate: z.boolean(),
  can_draft_tenant_message: z.boolean(),
  can_publish_pill: z.boolean(),
  ui_highlights: z.record(z.string(), z.unknown()),
});
export type RoleDefinition = z.infer<typeof roleSchema>;
export const rolesSchema = z.array(roleSchema);

// ---------------------------------------------------------------------------
// data/assets.json — heterogeneous per asset type; common core is typed,
// type-specific detail (systems, lease_structure, iso_certifications…) is kept.
// ---------------------------------------------------------------------------

const equipmentSchema = z.looseObject({
  id: z.string(),
  brick_class: z.string(),
  type: z.string(),
  location: z.string(),
  cmms_asset_code: z.string(),
  serves: z.string().optional(),
  serves_floors: z.string().optional(),
  zone: z.string().optional(),
  connected_to: z.string().optional(),
  function: z.string().optional(),
  isolation_valves: z.array(z.string()).optional(),
});

const personSchema = z.looseObject({
  name: z.string(),
  /** Job title as displayed (matches the roles.json label). */
  role: z.string(),
  /** Role id in data/roles.json — the structured link, not the title string. */
  role_id: z.string(),
  department: z.string(),
  employer: z.string(),
  experience_years: z.number(),
  reports_to: z.string().optional(),
});

export const assetSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  address: z.string(),
  location: z.string(),
  floors: z.number(),
  year_built: z.number(),
  green_certification: z.looseObject({
    scheme: z.string(),
    rating: z.string(),
    certificate_id: z.string(),
    pue: z.number().optional(),
  }),
  operating_model: z.string().optional(),
  lease_structure: z.string().optional(),
  anchor_tenant: z
    .looseObject({
      name: z.string(),
      floors: z.string(),
      critical_period: z.string(),
      sla_first_notice_min: z.number(),
      lease_termination_clause: z.string(),
    })
    .optional(),
  clients: z
    .array(
      z.object({
        name: z.string(),
        halls: z.string(),
        sla_tier: z.string(),
        sla_notification_min: z.number(),
        sla_credit_trigger: z.string().optional(),
      }),
    )
    .optional(),
  tenants: z.array(z.object({ name: z.string(), floors: z.string(), type: z.string() })).optional(),
  systems: z.record(z.string(), z.record(z.string(), z.unknown())),
  equipment: z.array(equipmentSchema),
  people: z.array(personSchema),
  facility_manager: z.string(),
  ppm_compliance_pct: z.number(),
  tenant_satisfaction_score: z.number().optional(),
  ontology_refs: z.object({
    brick_version: z.string(),
    haystack_phIoT_version: z.string(),
    cobie_facility_id: z.string(),
  }),
});
export type AssetRecord = z.infer<typeof assetSchema>;
export const assetsSchema = z.array(assetSchema);

// ---------------------------------------------------------------------------
// data/incidents.json — live incidents carry actions/evidence/timeline;
// closed historical incidents carry eval outcome fields.
// ---------------------------------------------------------------------------

const incidentActionSchema = z.object({
  rule_id: z.string(),
  decision: z.string(),
  action_class: actionClassSchema,
  status: z.string(),
  missing_evidence: z.array(z.string()).optional(),
  escalate_to: z
    .object({
      role: z.string(),
      fallback: z.string().optional(),
      name: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
  completed_at: z.string().optional(),
  deadline_min: z.number().optional(),
  note: z.string().optional(),
  provenance: z.string(),
});
export type IncidentActionRecord = z.infer<typeof incidentActionSchema>;

export const incidentSchema = z.object({
  id: z.string(),
  asset_id: z.string(),
  asset_name: z.string(),
  type: z.string(),
  subtype: z.string(),
  status: z.enum(["active", "monitoring", "closed"]),
  severity: z.string(),
  opened_at: z.string(),
  opened_by: z.string().optional(),
  closed_at: z.string().optional(),
  location: z.string(),
  affected_systems: z.array(z.string()).optional(),
  affected_tenant: z
    .object({ name: z.string(), floors: z.string(), sensitivity: sensitivityLevelSchema })
    .optional(),
  affected_client: z
    .object({
      name: z.string(),
      halls: z.string(),
      sensitivity: sensitivityLevelSchema,
      sla_notification_min: z.number(),
      sla_credit_trigger: z.string(),
    })
    .optional(),
  description: z.string(),
  pill_applied: z.string(),
  pill_version: z.string(),
  asset_overlay: z.string().optional(),
  actions: z.array(incidentActionSchema).optional(),
  evidence_coverage: z
    .object({ required: z.number(), confirmed: z.number(), pending: z.array(z.string()) })
    .optional(),
  timeline_ref: z.string().optional(),
  audit_trail: z
    .array(z.object({ at: z.string(), user: z.string(), action: z.string(), detail: z.string() }))
    .optional(),
  reuse_demo_note: z.string().optional(),
  eval_expected: z.string().optional(),
  eval_actual: z.string().optional(),
  eval_pass: z.boolean().optional(),
  outcome: z.string().optional(),
  flagged_for_learning: z.boolean().optional(),
  learning_note: z.string().optional(),
});
export type IncidentRecord = z.infer<typeof incidentSchema>;
export const incidentsSchema = z.array(incidentSchema);

// ---------------------------------------------------------------------------
// data/timelines/*.json
// ---------------------------------------------------------------------------

export const timelineEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  source: z.string(),
  type: z.string(),
  text: z.string(),
  evidence_updates: z.record(z.string(), z.object({ value: z.unknown(), confirmed: z.boolean() })),
  sensitivity: sensitivityLevelSchema,
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const timelineSchema = z.object({
  incident_id: z.string(),
  asset_id: z.string(),
  asset_name: z.string(),
  timeline_version: z.string(),
  events: z.array(timelineEventSchema),
});
export type Timeline = z.infer<typeof timelineSchema>;

// ---------------------------------------------------------------------------
// data/transcripts/*.json
// ---------------------------------------------------------------------------

const transcriptStatementSchema = z.object({
  t: z.string(),
  speaker: z.string(),
  text_fragment: z.string(),
});

export const transcriptTurnSchema = z.object({
  /** HH:MM:SS offset into the interview. */
  t: z.string(),
  speaker: z.string(),
  text: z.string(),
  /** Interviewer turns: CDM/ACTA probe id (null for small talk). */
  probe_id: z.string().nullable().optional(),
  /** Expert turns: rules extracted from this span. */
  extracted_rule_ids: z.array(z.string()).optional(),
});
export type TranscriptTurn = z.infer<typeof transcriptTurnSchema>;

export const transcriptSchema = z.object({
  interview_id: z.string(),
  date: z.string(),
  duration: z.string(),
  language: z.string(),
  interviewer: z.string(),
  expert: z.object({
    name: z.string(),
    role: z.string(),
    department: z.string(),
    experience_years: z.number(),
    assets_managed: z.array(z.string()),
  }),
  method: z.string(),
  phases: z.array(z.string()),
  turns: z.array(transcriptTurnSchema),
  contradiction_detected: z.object({
    detected: z.boolean(),
    resolution_type: z.string(),
    statement_a: transcriptStatementSchema,
    statement_b: transcriptStatementSchema,
    resolution: z.object({
      t: z.string(),
      distinguishing_condition: z.string(),
      resolved_rule_id: z.string(),
      confirmation_status: z.string(),
    }),
  }),
  extracted_rules_summary: z.record(z.string(), z.string()),
});
export type Transcript = z.infer<typeof transcriptSchema>;

// ---------------------------------------------------------------------------
// data/fixtures/llm/*.json — recorded LLM fallbacks
// ---------------------------------------------------------------------------

const fixtureHeaderSchema = {
  fixture_id: z.string(),
  model: z.string(),
  generated_at: z.string(),
  fixture_type: z.literal("llm_fallback"),
  description: z.string(),
};

export const ruleCandidateSchema = z.looseObject({
  rule_id: z.string(),
  title: z.string(),
  trigger: z.object({
    incident_type: z.string(),
    all: z.array(conditionSchema),
    any: z.array(conditionSchema).optional(),
  }),
  required_evidence: z.array(z.string()),
  decision: z.string(),
  allowed_actions: z.array(z.string()),
  forbidden_actions: z.array(z.string()),
  exceptions: z.array(z.object({ when: z.array(conditionSchema), note: z.string() })),
  action_class: actionClassSchema,
  /** The extracted gate semantics — carried through to the candidate rule as-is. */
  forbidden_if_missing_evidence: z.boolean(),
  escalate_to: z.object({ role: z.string(), fallback: z.string().optional() }),
  owner: z.string(),
  deadline_minutes: z.number().nullable(),
  asset_overrides: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  provenance: z.array(z.string()),
  confirmation_status: z.string(),
  confidence: z.number(),
});
export type RuleCandidate = z.infer<typeof ruleCandidateSchema>;

export const extractionFixtureSchema = z.object({
  ...fixtureHeaderSchema,
  source_transcript: z.string(),
  rule_candidates: z.array(ruleCandidateSchema),
  scribe_metadata: z.object({
    model: z.string(),
    temperature: z.number(),
    schema: z.string(),
    content_requirements_met: z.boolean(),
    transcript_spans_extracted: z.number(),
    probes_processed: z.array(z.string()),
  }),
});
export type ExtractionFixture = z.infer<typeof extractionFixtureSchema>;

const contradictionStatementSchema = transcriptStatementSchema.extend({
  context: z.string(),
  targets: z.array(z.string()),
});

export const contradictionFixtureSchema = z.object({
  ...fixtureHeaderSchema,
  source_transcript: z.string(),
  contradiction: z.object({
    detected: z.boolean(),
    rule_id: z.string(),
    statement_a: contradictionStatementSchema,
    statement_b: contradictionStatementSchema,
    resolution: z.object({
      method: z.string(),
      resolved_at: z.string(),
      distinguishing_condition: z.string(),
      statement_a_generalised: z.string(),
      statement_b_specific: z.string(),
      both_correct_in_context: z.boolean(),
      confirmation_status: z.string(),
      transcript_segment_ref: z.string(),
    }),
    mosaic_summary: z.string(),
  }),
});
export type ContradictionFixture = z.infer<typeof contradictionFixtureSchema>;

export const tenantMessageFixtureSchema = z.object({
  ...fixtureHeaderSchema,
  source_incident: z.string(),
  drafts: z.array(
    z.object({
      draft_id: z.string(),
      channel: z.string(),
      recipients: z.array(z.string()),
      sensitivity: sensitivityLevelSchema,
      approved_by_role: z.string(),
      subject: z.string(),
      body: z.string(),
      sla_first_notice_deadline_min: z.number(),
      sla_first_notice_clock_start: z.string(),
      sla_first_notice_deadline: z.string(),
      status: z.string(),
    }),
  ),
});
export type TenantMessageFixture = z.infer<typeof tenantMessageFixtureSchema>;

export const incidentSummaryFixtureSchema = z.object({
  ...fixtureHeaderSchema,
  source_incident: z.string(),
  summary: z.object({
    headline: z.string(),
    incident_id: z.string(),
    asset: z.string(),
    status: z.string(),
    severity: z.string(),
    opened_at: z.string(),
    type: z.string(),
    location: z.string(),
    affected_tenant: z.string(),
    sensitivity: sensitivityLevelSchema,
    timeline_summary: z.string(),
    key_decisions: z.array(
      z.object({ rule_id: z.string(), action_class: actionClassSchema, status: z.string(), text: z.string() }),
    ),
    evidence_coverage: z.object({
      required: z.number(),
      confirmed: z.number(),
      pending: z.array(z.string()),
    }),
    current_risk: z.string(),
    pill_applied: z.string(),
    provenance_ref: z.string(),
  }),
});
export type IncidentSummaryFixture = z.infer<typeof incidentSummaryFixtureSchema>;

/**
 * The orchestrator LLM's proposed next action for an incident (recorded,
 * offline). The deterministic gate named by `rule_id` decides whether it may
 * proceed — the LLM cannot talk its way past it (SPEC §1 Wow 1).
 */
export const aiProposalFixtureSchema = z.object({
  ...fixtureHeaderSchema,
  source_incident: z.string(),
  proposals: z.array(
    z.object({
      proposal_id: z.string(),
      /** Rule that gates this proposal. */
      rule_id: z.string(),
      text: z.string(),
      /** Timeline event after which the LLM made the proposal. */
      proposed_after_event: z.string(),
    }),
  ),
});
export type AiProposalFixture = z.infer<typeof aiProposalFixtureSchema>;
