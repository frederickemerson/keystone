// Audit log export (CSV for a spreadsheet, JSON for another system). Pure and
// client-safe. The log is exported as recorded: oldest first, every field.

import type { AuditEvent, AuditLog } from '@/lib/governance/audit';

export const AUDIT_CSV_COLUMNS = [
  'id',
  'at',
  'actor',
  'role',
  'action',
  'pillId',
  'pillVersion',
  'incidentId',
  'ruleId',
  'evidenceKey',
  'captureTaskId',
  'noteId',
  'detail',
] as const satisfies readonly (keyof AuditEvent)[];

/**
 * One CSV cell (RFC 4180): quoted when it holds a comma, quote or line break.
 * A cell a spreadsheet would read as a formula (=, +, -, @, tab, CR) gets a
 * leading apostrophe, so exported text can never run as a formula.
 */
export function csvCell(value: string | undefined): string {
  let text = value ?? '';
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The log as CSV with a header row, CRLF line endings. */
export function auditToCsv(log: AuditLog): string {
  const rows = [AUDIT_CSV_COLUMNS.join(',')];
  for (const event of log) rows.push(AUDIT_CSV_COLUMNS.map((c) => csvCell(event[c])).join(','));
  return `${rows.join('\r\n')}\r\n`;
}

export interface AuditExport {
  exportedAt: string;
  note: string;
  events: AuditEvent[];
}

/** The log as JSON, with when it was exported and where it came from. */
export function auditToJson(log: AuditLog, exportedAt: string): string {
  const payload: AuditExport = {
    exportedAt,
    note: 'Keystone demo audit log, from the governance store in this browser. Append-only; ids are contiguous, so a gap means an event is missing.',
    events: [...log],
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/** File name stem with the export time, e.g. "keystone-audit-2026-10-12T0930". */
export function auditFileStem(exportedAt: string): string {
  return `keystone-audit-${exportedAt.slice(0, 16).replace(/[:]/g, '')}`;
}
