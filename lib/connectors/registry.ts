// The connector registry: data/connectors.json validated against the fixed
// contract. Client-safe (a static JSON import, no node:fs), so the evidence
// timeline can label sources in the browser from the same data the
// connectors screen shows.

import connectorsJson from '@/data/connectors.json';
import { connectorsFileSchema, type Connector, type ConnectorStatus } from './contract';

/** Every connector, in file order. Throws at import time if the file breaks the contract. */
export const CONNECTORS: readonly Connector[] = Object.freeze(connectorsFileSchema.parse(connectorsJson));

export function connectorById(id: string): Connector | undefined {
  return CONNECTORS.find((c) => c.id === id);
}

/** The connector that feeds a timeline `source` value (e.g. "lew"), if any. */
export function connectorForSource(source: string): Connector | undefined {
  return CONNECTORS.find((c) => c.timelineSources.includes(source));
}

/**
 * Display label for a timeline source ("lew" → "LEW sign-off"). An unknown
 * source falls back to a sentence-case form of the id, never the raw
 * snake_case; the connectors test keeps every real source mapped.
 */
export function sourceLabel(source: string): string {
  const connector = connectorForSource(source);
  if (connector) return connector.label;
  const words = source.replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Unknown source';
}

/** Sentence-case name and one-line meaning of each status (the screen's legend). */
export const STATUS_LEGEND: Readonly<Record<ConnectorStatus, { label: string; meaning: string }>> = {
  live: {
    label: 'Live',
    meaning: 'Working now. An AI service: credentials are set and Keystone calls it. An export: the file is built in your browser.',
  },
  simulated: { label: 'Simulated', meaning: 'Replayed from recorded data. No system is connected.' },
  adapter_not_configured: {
    label: 'Adapter not configured',
    meaning: 'Code exists, but it has no credentials or has not been verified, so Keystone does not call it.',
  },
  planned: { label: 'Planned', meaning: 'Proposed for a pilot. Not built.' },
};

export interface ConnectorGroup {
  id: 'building' | 'records' | 'people' | 'ai' | 'exports';
  title: string;
  connectors: Connector[];
}

const GROUP_OF: Readonly<Record<string, ConnectorGroup['id']>> = {
  ibms_alarms: 'building',
  leak_detection: 'building',
  dcim: 'building',
  cmms_work_orders: 'records',
  contractor: 'records',
};

const GROUP_TITLES: Readonly<Record<ConnectorGroup['id'], string>> = {
  building: 'Building systems',
  records: 'Work and records',
  people: 'People on site',
  ai: 'AI services',
  exports: 'Exports',
};

function groupOf(c: Connector): ConnectorGroup['id'] {
  if (c.kind === 'ai_service') return 'ai';
  if (c.kind === 'export') return 'exports';
  return GROUP_OF[c.id] ?? 'people';
}

/** Connectors grouped for the screen, groups in a fixed order, empty groups dropped. */
export function groupConnectors(connectors: readonly Connector[] = CONNECTORS): ConnectorGroup[] {
  const order: ConnectorGroup['id'][] = ['building', 'records', 'people', 'ai', 'exports'];
  return order
    .map((id) => ({ id, title: GROUP_TITLES[id], connectors: connectors.filter((c) => groupOf(c) === id) }))
    .filter((g) => g.connectors.length > 0);
}
