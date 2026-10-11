// Expert provenance for a rule: the transcript quote + timestamp the rule was
// captured from. Reads pill.provenance, which is moving from the legacy
// `{ [ruleId]: { transcript_segment } }` map to the real provenance.json shape
// `{ rules: { [ruleId]: { source, start, end, quote, ... } } }`; both are read
// structurally so the room keeps working across that migration.

import type { Pill, Rule } from '@/lib/engine/types';

export interface ExpertQuote {
  quote: string;
  /** Transcript offset "HH:MM:SS". */
  start: string;
  end?: string;
  /** Interview / transcript id, e.g. "ce-interview-2026-10-02". */
  source: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Parse a SPEC §4 provenance ref "ce-interview-2026-10-02#00:14:32". */
export function parseProvenanceRef(ref: string | undefined): { source: string; timestamp: string } | null {
  if (!ref) return null;
  const [source, timestamp] = ref.split('#');
  return source ? { source, timestamp: timestamp ?? '' } : null;
}

export function expertQuoteFor(pill: Pill, rule: Rule): ExpertQuote | null {
  const prov: unknown = pill.provenance;
  const ref = parseProvenanceRef(rule.provenance[0]);
  let entry: unknown;
  if (isRecord(prov)) {
    entry = isRecord(prov.rules) ? prov.rules[rule.id] : prov[rule.id];
  }
  if (!isRecord(entry)) return null;

  const quote = str(entry.quote) ?? str(entry.transcript_segment);
  if (!quote) return null;
  return {
    quote,
    start: str(entry.start) ?? ref?.timestamp ?? '',
    end: str(entry.end),
    source: str(entry.source) ?? ref?.source ?? 'expert interview',
    confirmedBy: str(entry.confirmed_by),
    confirmedAt: str(entry.confirmed_at),
  };
}
