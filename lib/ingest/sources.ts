// The systems Keystone accepts evidence FROM, and how each one's own
// identifiers become evidence keys.
//
// The mapping is a declared binding table, not a guess about free text: an
// iBMS point arrives with the signal its adapter is bound to, a CMMS work order
// arrives with the type of each document linked to it. Nothing here reads a
// point's name or a work order's description. In production this table is what a
// site integrator fills in once from the site's Brick / COBie tagging;
// `brickClass` records the class where our own data attests it.
//
// Every binding is checked against two independent sources of truth:
// data/connectors.json must list the key for that connector (the connector
// registry decides what a system is allowed to report), and some pill's
// evidence.yaml must declare it. lib/ingest/__tests__/ingest.test.ts and
// lib/data/__tests__/consistency.test.ts both enforce that.

import { connectorById } from '@/lib/connectors/registry';
import type { Connector } from '@/lib/connectors/contract';

/** What a payload looks like: alarm points, or documents linked to a work order. */
export type IngestShape = 'points' | 'documents';

export interface IngestBinding {
  /** The evidence key this signal reports. */
  key: string;
  /** The Brick class the point is bound to, where our data names one. */
  brickClass?: string;
}

export interface IngestSource {
  /** The connector in data/connectors.json that owns this feed. */
  connectorId: string;
  shape: IngestShape;
  /** Signal (point binding or document type) → evidence key. */
  bindings: Readonly<Record<string, IngestBinding>>;
}

/**
 * `active_water_release` is deliberately absent: the iBMS can show a ΔT anomaly
 * consistent with water leaving the loop, but "water is still escaping" is a
 * judgement a person makes on site. The feed reports the anomaly; the
 * technician reports the release.
 */
export const INGEST_SOURCES: Readonly<Record<string, IngestSource>> = {
  ibms: {
    connectorId: 'ibms_alarms',
    shape: 'points',
    bindings: {
      leak_alarm: { key: 'leak_alarm_active', brickClass: 'Leak_Alarm' },
      chw_delta_t_anomaly: { key: 'chw_flow_anomaly' },
      crah_condensate_alarm: { key: 'crah_condensate_alarm' },
      underfloor_leak_alarm: { key: 'underfloor_leak_detection' },
    },
  },
  leak_panel: {
    connectorId: 'leak_detection',
    shape: 'points',
    bindings: {
      leak_alarm: { key: 'leak_alarm_active', brickClass: 'Leak_Alarm' },
      underfloor_leak_alarm: { key: 'underfloor_leak_detection' },
    },
  },
  cmms: {
    connectorId: 'cmms_work_orders',
    shape: 'documents',
    bindings: {
      isolation_diagram: { key: 'shutoff_map_available' },
    },
  },
};

export function ingestSource(system: string): IngestSource | undefined {
  return INGEST_SOURCES[system];
}

/** The connector a system posts as. undefined when the registry has no such id. */
export function ingestConnector(system: string): Connector | undefined {
  const source = ingestSource(system);
  return source ? connectorById(source.connectorId) : undefined;
}
