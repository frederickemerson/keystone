// What may travel from a browser into the durable governance record.
//
// Separate from lib/governance/ledger because that module is `server-only`
// (it opens a database connection) while this contract is read by three
// callers: the route that validates a write, the mirror that shapes one, and
// the suite that holds both to it. A validator nobody can import from a test
// is a validator nobody tests.

import { AUDIT_ACTIONS } from './audit';
import { z } from '@/lib/zod';

/** One event as it travels from the browser. Validated before it is stored. */
export const ledgerEventSchema = z
  .object({
    id: z.string().trim().regex(/^AUD-\d{5}$/),
    at: z.iso.datetime(),
    actor: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(60),
    action: z.enum(AUDIT_ACTIONS),
    pillId: z.string().trim().max(120).optional(),
    pillVersion: z.string().trim().max(40).optional(),
    incidentId: z.string().trim().max(40).optional(),
    ruleId: z.string().trim().max(40).optional(),
    /** Everything else the event carried, kept whole rather than flattened. */
    detail: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type LedgerEvent = z.infer<typeof ledgerEventSchema>;

export const ledgerRequestSchema = z
  .object({
    sessionId: z.string().trim().min(1).max(120),
    events: z.array(ledgerEventSchema).min(1).max(200),
  })
  .strict();
