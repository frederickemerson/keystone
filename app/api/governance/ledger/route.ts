// The durable governance record: write what happened, read it back.
//
// POST mirrors the browser's append-only audit log into Postgres. It is
// deliberately not in the path of anything: a failure here changes no decision,
// blocks no gate and is invisible to the person using the screen. The log in
// the browser remains what the session renders.
//
// GET is the answer to "where does the approved pill actually go?" — it is a
// row, readable from another browser, surviving the deploy that cleared the
// tab.

import { readRequest } from '@/lib/llm/requests';
import { callerOf, signInRequired } from '@/lib/ratelimit/caller';
import { retryHeaders, takeLedgerWrite } from '@/lib/ratelimit/policies';
import { ledgerConfigured, ledgerRequestSchema, ledgerSummary, readLedger, recordEvents } from '@/lib/governance/ledger';

export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();
  const input = await readRequest(request, ledgerRequestSchema);
  if (input instanceof Response) return input;

  // The record is shared and the demo passcode ships with the submission, so
  // "has a session" says nothing about who is appending. Generous, but bounded.
  const quota = takeLedgerWrite(caller);
  if (!quota.ok) {
    return Response.json(
      { persisted: false, reason: 'Too many writes to the record from this session; the log stays in this browser for now.' },
      { status: 429, headers: { ...NO_STORE, ...retryHeaders(quota) } },
    );
  }

  if (!ledgerConfigured()) {
    // Honest absence, not a silent success: the caller is told the record is
    // session-only here, which is what the screen then says.
    return Response.json(
      { persisted: false, reason: 'No durable record is configured on this deployment; the log stays in this session.' },
      { status: 503, headers: NO_STORE },
    );
  }

  try {
    const written = await recordEvents(input.sessionId, input.events);
    return Response.json({ persisted: true, written, received: input.events.length }, { headers: NO_STORE });
  } catch {
    // Never leak a connection string or a driver error to a browser.
    return Response.json({ persisted: false, reason: 'The durable record could not be written.' }, { status: 502, headers: NO_STORE });
  }
}

export async function GET(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();
  if (!ledgerConfigured()) {
    return Response.json({ configured: false, events: [], summary: null }, { headers: NO_STORE });
  }
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? 50);
  try {
    const [events, summary] = await Promise.all([readLedger(Number.isFinite(limit) ? limit : 50), ledgerSummary()]);
    return Response.json({ configured: true, events, summary }, { headers: NO_STORE });
  } catch {
    return Response.json({ configured: true, events: [], summary: null, reason: 'The durable record could not be read.' }, { status: 502, headers: NO_STORE });
  }
}
