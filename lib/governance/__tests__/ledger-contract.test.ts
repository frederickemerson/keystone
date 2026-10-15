// What may enter the durable record, and what the browser sends it.
//
// The database itself is not exercised here — a unit suite that needs a
// connection string is a suite that gets skipped. What is checked is the
// contract either side of the wire: the validator that stands between a
// browser and an insert, and the shaping that decides what a stored event
// says. Both have failure modes that would be invisible in the demo and
// permanent in the record.

import { describe, expect, it } from 'vitest';
import { AUDIT_ACTIONS, appendAudit, EMPTY_AUDIT_LOG } from '../audit';
import { ledgerEventSchema, ledgerRequestSchema } from '../ledger-contract';

/** One real event, made the way the store makes them. */
const event = appendAudit(EMPTY_AUDIT_LOG, {
  at: '2026-10-15T09:10:00.000Z',
  actor: 'Tan Wei Ming',
  role: 'chief_engineer',
  action: 'version_proposed',
  pillId: 'technical-services-chilled-water-leak',
  pillVersion: '1.3.0',
  detail: 'isolation deadline 15 to 10 minutes',
})[0];

describe('what the record accepts', () => {
  it('takes an event the store actually produced', () => {
    const { detail, ...wire } = event;
    const parsed = ledgerEventSchema.safeParse({ ...wire, detail: { note: detail } });
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
  });

  it('refuses an action the audit vocabulary does not have', () => {
    expect(ledgerEventSchema.safeParse({ ...event, detail: undefined, action: 'quietly_approved' }).success).toBe(false);
  });

  it('refuses an id that is not an audit id, so the record keeps its ordering', () => {
    expect(ledgerEventSchema.safeParse({ ...event, detail: undefined, id: 'whatever' }).success).toBe(false);
    expect(ledgerEventSchema.safeParse({ ...event, detail: undefined, id: 'AUD-1' }).success).toBe(false);
  });

  it('refuses a time that is not a time', () => {
    expect(ledgerEventSchema.safeParse({ ...event, detail: undefined, at: 'yesterday' }).success).toBe(false);
  });

  it('refuses unknown top-level fields rather than storing them unvalidated', () => {
    expect(ledgerEventSchema.safeParse({ ...event, detail: undefined, approved: true }).success).toBe(false);
  });

  it('keeps whatever else the event carried, under detail', () => {
    const parsed = ledgerEventSchema.parse({ ...event, detail: { reason: 'deadline 15 to 10', evidenceKey: 'lew_signoff' } });
    expect(parsed.detail).toEqual({ reason: 'deadline 15 to 10', evidenceKey: 'lew_signoff' });
  });

  it('covers every action the audit log can append', () => {
    for (const action of AUDIT_ACTIONS) {
      expect(ledgerEventSchema.safeParse({ ...event, detail: undefined, action }).success, `${action} cannot be recorded`).toBe(true);
    }
  });
});

describe('what one request may carry', () => {
  it('needs a session to group the record by', () => {
    expect(ledgerRequestSchema.safeParse({ events: [{ ...event, detail: undefined }] }).success).toBe(false);
    expect(ledgerRequestSchema.safeParse({ sessionId: '', events: [{ ...event, detail: undefined }] }).success).toBe(false);
  });

  it('refuses an empty batch and an unbounded one', () => {
    expect(ledgerRequestSchema.safeParse({ sessionId: 's-1', events: [] }).success).toBe(false);
    const many = Array.from({ length: 201 }, (_, i) => ({ ...event, detail: undefined, id: `AUD-${String(i + 1).padStart(5, '0')}` }));
    expect(ledgerRequestSchema.safeParse({ sessionId: 's-1', events: many }).success).toBe(false);
  });

  it('takes a batch the size one human gesture produces', () => {
    const batch = Array.from({ length: 12 }, (_, i) => ({ ...event, detail: undefined, id: `AUD-${String(i + 1).padStart(5, '0')}` }));
    expect(ledgerRequestSchema.safeParse({ sessionId: 's-1', events: batch }).success).toBe(true);
  });
});
