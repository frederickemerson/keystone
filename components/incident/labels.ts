// Display formatting for identifiers coming from pills / data. These only
// format; they never classify — every decision comes from engine output or
// the structured data itself.

import { DEMO_PERSONAS } from '@/lib/governance/store';
import { getRole } from '@/lib/governance/access';

const TOKENS: Record<string, string> = {
  ahu: 'AHU',
  aom: 'AOM',
  bca: 'BCA',
  bcp: 'BCP',
  cfm: 'CFM',
  chw: 'CHW',
  cmms: 'CMMS',
  crah: 'CRAH',
  db: 'DB',
  dc: 'DC',
  eta: 'ETA',
  fsm: 'FSM',
  id: 'ID',
  it: 'IT',
  lew: 'LEW',
  nea: 'NEA',
  ok: 'OK',
  pii: 'PII',
  pub: 'PUB',
  signoff: 'sign-off',
  sla: 'SLA',
  ts: 'TS',
};

/** Sentence-case a display value: capitalise the first letter, keep the rest as written. */
export function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** snake_case identifier → readable label ("lew_signoff" → "LEW sign-off"). */
export function humanizeKey(key: string): string {
  const words = key
    .split('_')
    .filter(Boolean)
    .map((w) => TOKENS[w] ?? w);
  return sentenceCase(words.join(' '));
}

const ASSET_TYPE_LABEL: Record<string, string> = {
  grade_a_office: 'Grade A office',
  data_centre: 'Data centre',
};

export function assetTypeLabel(type: string): string {
  return ASSET_TYPE_LABEL[type] ?? humanizeKey(type);
}

export interface PersonRef {
  name: string;
  role: string;
}

/**
 * The named human behind a role id: persona name from the governance store,
 * job title from roles.json, else from the asset's `people` roster.
 */
export function personForRole(role: string, people: readonly PersonRef[]): { name: string | null; title: string } {
  const name = DEMO_PERSONAS[role] ?? null;
  const rosterTitle = name ? people.find((p) => p.name === name)?.role : undefined;
  return { name, title: getRole(role)?.label ?? rosterTitle ?? humanizeKey(role) };
}

/** "Person · Role label" — same display form as personaLabel / PersonaName. */
export function personLabel(role: string, people: readonly PersonRef[]): string {
  const p = personForRole(role, people);
  return p.name ? `${p.name} · ${p.title}` : p.title;
}

export function formatClock(iso: string): string {
  // Wall-clock time as recorded in the source timestamp (SGT, "+08:00"), so
  // server and client render identically regardless of the viewer's zone.
  const m = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso);
  return m ? `${m[1]}:${m[2]}${m[3] ? `:${m[3]}` : ''}` : iso;
}

/** "T+07:42" elapsed between two ISO timestamps. */
export function formatElapsed(fromIso: string, toIso: string): string {
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `T+${h}:${mm}:${ss}` : `T+${mm}:${ss}`;
}

const SGT_CLOCK = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Singapore',
});

/**
 * "08:41" in Singapore time for an instant the app itself recorded (a store
 * timestamp, which is UTC ISO). Source timestamps that carry "+08:00" use
 * formatClock instead.
 */
export function formatSgtClock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : SGT_CLOCK.format(d);
}

/** "LEW written sign-off missing (+2 more)" for an action's missing evidence keys. */
export function missingSummary(missing: readonly string[]): string {
  if (missing.length === 0) return '';
  const first = humanizeKey(missing[0]);
  return missing.length > 1 ? `${first} missing (+${missing.length - 1} more)` : `${first} missing`;
}
