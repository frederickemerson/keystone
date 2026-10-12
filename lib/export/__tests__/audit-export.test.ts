import { describe, expect, it } from 'vitest';
import { appendAudit, EMPTY_AUDIT_LOG } from '@/lib/governance/audit';
import { auditFileStem, auditToCsv, auditToJson, csvCell } from '../audit-export';

const log = [
  { actor: 'Goh Boon Kheng', role: 'head_technical_services', action: 'version_approved' as const, pillId: 'p', pillVersion: '1.3.0', detail: 'Approved, "no regressions"', at: '2026-10-12T01:00:00.000Z' },
  { actor: 'Rajesh Kumar', role: 'technician', action: 'evidence_confirmed' as const, incidentId: 'INC-1', evidenceKey: 'location_confirmed', detail: 'line one\nline two, with comma', at: '2026-10-12T01:05:00.000Z' },
  { actor: 'Priya Nair', role: 'asset_operations_manager', action: 'action_approved' as const, ruleId: 'TS-07', detail: '=HYPERLINK("http://x")', at: '2026-10-12T01:06:00.000Z' },
].reduce((acc, e) => appendAudit(acc, e), EMPTY_AUDIT_LOG);

describe('audit export', () => {
  it('quotes commas, quotes and line breaks (RFC 4180)', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell(undefined)).toBe('');
  });

  it('neutralises cells a spreadsheet would run as a formula', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+65 6123')).toBe("'+65 6123");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });

  it('exports one header row plus one row per event, oldest first', () => {
    const csv = auditToCsv(log);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('id,at,actor,role,action,pillId,pillVersion,incidentId,ruleId,evidenceKey,captureTaskId,noteId,detail');
    expect(lines[1].startsWith('AUD-00001,2026-10-12T01:00:00.000Z,Goh Boon Kheng,')).toBe(true);
    expect(lines[1].endsWith(',"Approved, ""no regressions"""')).toBe(true);
    expect(csv).toContain('"line one\nline two, with comma"');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('exports JSON with every event and field', () => {
    const parsed = JSON.parse(auditToJson(log, '2026-10-12T02:00:00.000Z'));
    expect(parsed.exportedAt).toBe('2026-10-12T02:00:00.000Z');
    expect(parsed.events).toEqual(JSON.parse(JSON.stringify(log)));
    expect(parsed.events.map((e: { id: string }) => e.id)).toEqual(['AUD-00001', 'AUD-00002', 'AUD-00003']);
  });

  it('names files by export time without colons', () => {
    expect(auditFileStem('2026-10-12T09:30:12.000Z')).toBe('keystone-audit-2026-10-12T0930');
  });
});
