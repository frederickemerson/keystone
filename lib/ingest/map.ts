// Turning one building system's payload into evidence, with the gate rule
// enforced at run time.
//
// THE RULE, in one place: a feed may raise an incident; only a named person
// opens a gate. data/connectors.json says which systems can confirm a gate's
// evidence at all (`canConfirmGateEvidence`), and the pills say which keys can
// gate a rule. So:
//
//   gating key, feed cannot confirm gate evidence  → REFUSED. A leak detector
//       may not even report an item a gate needs; the connectors test holds the
//       recorded data to the same line.
//   gating key, feed can confirm gate evidence     → accepted, confirmed FALSE.
//       A work order on file can hold a gate, but the person who read it
//       confirms it in the incident room. An HTTP post is nobody.
//   any other key                                  → accepted as the system
//       reports it. No gate can read it, and a trigger can — which is exactly
//       "a feed may raise an incident".
//
// Pure: every input is a parameter, nothing is read from the environment.

import type { Connector } from '@/lib/connectors/contract';
import type { EvidenceCatalogEntry } from '@/lib/engine';
import type { IngestRequest, IngestResponse, IngestedObservation, RefusedObservation } from './contract';
import { ingestConnector, ingestSource, type IngestBinding } from './sources';

export const INGEST_NOTE =
  'Ingested observations are reports, not confirmations. An item a gate needs is never confirmed here: a named person in an allowed role confirms it in the incident room.';

export interface IngestEnvironment {
  /** Keys that can hold a gate open (lib/ingest/evidence.ts gatingKeysOf). */
  gatingKeys: ReadonlySet<string>;
  /** Evidence key → its pill declaration, for the label and who may confirm it. */
  catalog: Readonly<Record<string, EvidenceCatalogEntry>>;
  /** When this post arrived, as an ISO instant. */
  receivedAt: string;
}

export type IngestOutcome =
  | { ok: true; response: IngestResponse }
  | { ok: false; reason: 'unknown_system' | 'unknown_connector' | 'shape_mismatch'; detail: string };

/** What ingestion does with one evidence key from one connector. */
export type Disposition = 'refused_gating' | 'accepted_unconfirmed' | 'accepted_confirmed';

/**
 * The gate rule itself, as one decision in one place: the route's published
 * contract (GET /api/ingest) and the mapping below both read it, so what the
 * endpoint says it will do and what it does cannot drift apart.
 */
export function dispositionOf(key: string, connector: Connector, gatingKeys: ReadonlySet<string>): Disposition {
  if (!gatingKeys.has(key)) return 'accepted_confirmed';
  return connector.canConfirmGateEvidence ? 'accepted_unconfirmed' : 'refused_gating';
}

/** One reading, in the shape the guard works on, whatever system it came from. */
interface Reading {
  from: string;
  signal: string;
  value: boolean;
  at: string;
}

function readingsOf(payload: IngestRequest): Reading[] {
  if ('points' in payload) {
    return payload.points.map((point) => ({
      from: point.pointId,
      signal: point.signal,
      value: point.state === 'alarm',
      at: point.at,
    }));
  }
  // A linked document is present or it is not; there is no "normal" for one.
  return payload.workOrders.flatMap((order) =>
    order.documents.map((document) => ({ from: order.workOrderId, signal: document.type, value: true, at: order.at })),
  );
}

function refuse(reading: Reading, reason: string): RefusedObservation {
  return { from: reading.from, signal: reading.signal, reason };
}

/**
 * Resolve one reading, or say why it was refused. The connector registry is
 * authoritative twice over: it must list the key for this system, and it
 * decides whether this system may report a gating key at all.
 */
function resolve(
  reading: Reading,
  binding: IngestBinding | undefined,
  connector: Connector,
  environment: IngestEnvironment,
): { accepted: IngestedObservation } | { refused: RefusedObservation } {
  if (!binding) {
    return { refused: refuse(reading, `${connector.label} has no binding for "${reading.signal}", so Keystone does not know what it reports.`) };
  }
  const { key } = binding;
  if (!connector.evidenceKeys.includes(key)) {
    return { refused: refuse(reading, `The connector registry does not list ${key} as something ${connector.label} reports.`) };
  }
  const declaration = environment.catalog[key];
  if (!declaration) {
    return { refused: refuse(reading, `No pill declares the evidence key ${key}.`) };
  }
  const disposition = dispositionOf(key, connector, environment.gatingKeys);
  if (disposition === 'refused_gating') {
    return {
      refused: refuse(
        reading,
        `${declaration.label} can hold a gate open. ${connector.label} may raise an incident, but it can never confirm an item a gate needs.`,
      ),
    };
  }
  return {
    accepted: {
      key,
      label: declaration.label,
      value: reading.value,
      // The invariant, at the point it is decided — and again in the schema:
      // the system's own state is a fact it may confirm, unless a gate reads it.
      confirmed: disposition === 'accepted_confirmed',
      gating: environment.gatingKeys.has(key),
      confirmableBy: declaration.confirmable_by,
      from: reading.from,
      at: reading.at,
    },
  };
}

/** Map one payload to evidence. Never throws; a bad system is a typed failure. */
export function mapIngest(payload: IngestRequest, environment: IngestEnvironment): IngestOutcome {
  const source = ingestSource(payload.system);
  if (!source) return { ok: false, reason: 'unknown_system', detail: `No ingest source is wired for "${payload.system}".` };
  const connector = ingestConnector(payload.system);
  if (!connector) {
    return { ok: false, reason: 'unknown_connector', detail: `data/connectors.json has no connector "${source.connectorId}".` };
  }
  const shape = 'points' in payload ? 'points' : 'documents';
  if (source.shape !== shape) {
    return { ok: false, reason: 'shape_mismatch', detail: `${payload.system} sends ${source.shape}, not ${shape}.` };
  }

  const accepted: IngestedObservation[] = [];
  const refused: RefusedObservation[] = [];
  for (const reading of readingsOf(payload)) {
    const outcome = resolve(reading, source.bindings[reading.signal], connector, environment);
    if ('accepted' in outcome) accepted.push(outcome.accepted);
    else refused.push(outcome.refused);
  }

  return {
    ok: true,
    response: {
      incidentId: payload.incidentId,
      system: payload.system,
      connectorId: connector.id,
      connectorLabel: connector.label,
      receivedAt: environment.receivedAt,
      raisesIncident: accepted.some((observation) => observation.value),
      accepted,
      refused,
      note: INGEST_NOTE,
    },
  };
}
