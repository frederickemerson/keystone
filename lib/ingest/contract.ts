// POST /api/ingest — the evidence ingestion contract.
//
// Request: one building system's own payload (iBMS / leak-panel points, or CMMS
// work orders with the documents linked to them), for one incident.
//
// Response: the same observations expressed as evidence keys, each saying
// plainly whether it is confirmed and whether it could gate a decision. The
// safety invariant is built into the schema itself: an accepted observation
// whose key can gate a rule is rejected by `ingestedObservationSchema` unless
// `confirmed` is false, so the route cannot describe a confirmed gate item even
// if its mapping were ever changed to produce one.

import { z } from '@/lib/zod';

/** Points in one post, and work orders in one post. */
export const MAX_INGEST_POINTS = 50;
export const MAX_INGEST_WORK_ORDERS = 20;
export const MAX_INGEST_DOCUMENTS = 10;

/** Signals, document types and keys are ids, never prose. */
const idSchema = z.string().regex(/^[a-z0-9_]+$/);
const incidentIdSchema = z.string().regex(/^INC-\d{4}-\d{4}$/);
const instantSchema = z.iso.datetime({ offset: true });

/** One alarm point reading. `state` is the point's own state, not an opinion. */
export const ingestPointSchema = z.strictObject({
  pointId: z.string().trim().min(1).max(80),
  /** The signal this point is bound to (lib/ingest/sources.ts). */
  signal: idSchema,
  state: z.enum(['alarm', 'normal']),
  at: instantSchema,
});

/** One work order, with the documents the CMMS has linked to it. */
export const ingestWorkOrderSchema = z.strictObject({
  workOrderId: z.string().trim().min(1).max(80),
  cmmsAssetCode: z.string().trim().min(1).max(80),
  at: instantSchema,
  documents: z
    .array(z.strictObject({ type: idSchema, ref: z.string().trim().min(1).max(200) }))
    .min(1)
    .max(MAX_INGEST_DOCUMENTS),
});

const pointsPayload = <S extends string>(system: S) =>
  z.strictObject({
    system: z.literal(system),
    incidentId: incidentIdSchema,
    points: z.array(ingestPointSchema).min(1).max(MAX_INGEST_POINTS),
  });

const documentsPayload = <S extends string>(system: S) =>
  z.strictObject({
    system: z.literal(system),
    incidentId: incidentIdSchema,
    workOrders: z.array(ingestWorkOrderSchema).min(1).max(MAX_INGEST_WORK_ORDERS),
  });

/**
 * The accepted payloads, one per system in lib/ingest/sources.ts. The test
 * `every ingestable system has a request shape` keeps the two in step.
 */
export const ingestRequestSchema = z.discriminatedUnion('system', [
  pointsPayload('ibms'),
  pointsPayload('leak_panel'),
  documentsPayload('cmms'),
]);

export type IngestRequest = z.infer<typeof ingestRequestSchema>;

/** The system ids the request schema accepts (its discriminator values). */
export function schemaSystems(): string[] {
  return ingestRequestSchema.options.map((option) => option.shape.system.value);
}

/**
 * One ingested observation. A key that can gate a rule may be reported, but
 * never as confirmed: only a named person in an allowed role confirms a gate's
 * evidence, and an HTTP post is not a person.
 */
export const ingestedObservationSchema = z
  .strictObject({
    key: z.string().min(1),
    label: z.string().min(1),
    value: z.boolean(),
    confirmed: z.boolean(),
    /** True when some rule's required evidence (base or exception-added) is this key. */
    gating: z.boolean(),
    /** Roles that may confirm this key, from the pill's evidence.yaml. */
    confirmableBy: z.array(z.string()),
    /** The system's own reference: the point id, or the work-order id. */
    from: z.string().min(1),
    at: z.string().min(1),
  })
  .refine((observation) => !(observation.gating && observation.confirmed), {
    message: 'An ingested event can never confirm a gating evidence key.',
  });

export type IngestedObservation = z.infer<typeof ingestedObservationSchema>;

export const refusedObservationSchema = z.strictObject({
  from: z.string().min(1),
  signal: z.string().min(1),
  reason: z.string().min(1),
});

export type RefusedObservation = z.infer<typeof refusedObservationSchema>;

export const ingestResponseSchema = z.strictObject({
  incidentId: z.string().min(1),
  system: z.string().min(1),
  connectorId: z.string().min(1),
  connectorLabel: z.string().min(1),
  receivedAt: z.string().min(1),
  /** True when something arrived that can start the incident's rules. */
  raisesIncident: z.boolean(),
  accepted: z.array(ingestedObservationSchema),
  refused: z.array(refusedObservationSchema),
  note: z.string().min(1),
});

export type IngestResponse = z.infer<typeof ingestResponseSchema>;
