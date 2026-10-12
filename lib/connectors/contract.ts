// Connectors: where incident evidence comes from, and which AI services Keystone
// calls. data/connectors.json is validated against this schema. Honest by
// construction: an AI service's status is computed from configuration at
// request time (statusFrom: "config"), never written as "live" in the file.

import { z } from '@/lib/zod';

export const CONNECTOR_STATUSES = ['live', 'simulated', 'adapter_not_configured', 'planned'] as const;
export type ConnectorStatus = (typeof CONNECTOR_STATUSES)[number];

export const CONNECTOR_KINDS = ['evidence_source', 'ai_service', 'export'] as const;

export const connectorSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(2),
  /** The real-world system, e.g. "iBMS (BACnet)", "CMMS work orders". */
  system: z.string().min(2),
  kind: z.enum(CONNECTOR_KINDS),
  /** Static status for evidence sources and exports; ignored when statusFrom is "config". */
  status: z.enum(CONNECTOR_STATUSES),
  statusFrom: z.enum(['static', 'config']),
  /** Timeline `source` values this connector feeds (data/incidents/*). Evidence sources only. */
  timelineSources: z.array(z.string()).default([]),
  /** Evidence keys this source can REPORT. Every key must exist in some pill's evidence.yaml. */
  evidenceKeys: z.array(z.string()).default([]),
  /**
   * May this source CONFIRM a gate's required evidence on its own? Telemetry
   * never can: a feed may raise an incident, a named person opens a gate.
   */
  canConfirmGateEvidence: z.boolean(),
  /** Display label for a timeline source (replaces raw ids like "lew"). */
  label: z.string().min(2),
  /** One sentence: what it does in the demo, and what it would do in production. */
  description: z.string().min(10),
  /** Optional repo path of a sample payload shown on the connectors screen. */
  samplePayload: z.string().optional(),
});

export type Connector = z.infer<typeof connectorSchema>;
export const connectorsFileSchema = z.array(connectorSchema).min(1);
