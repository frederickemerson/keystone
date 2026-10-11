import { randomUUID } from 'node:crypto';
import fixture from '@/data/fixtures/llm/tenant-message-INC-2026-1011.json';
import { generateJson } from '@/lib/llm/providers';
import { readRequest, tenantRequestSchema } from '@/lib/llm/requests';
import { tenantDraftSchema, tenantSentences } from '@/lib/llm/tenant-draft';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const input = await readRequest(request, tenantRequestSchema);
  if (input instanceof Response) return input;
  if (input.incidentId !== fixture.source_incident) {
    return Response.json({ error: 'No reviewed tenant first-notice snapshot for this incident. DC clients use the CFM SLA channel.' }, { status: 404 });
  }
  const recorded = fixture.drafts[0];
  const prompt = `Compose a concise DRAFT first notice for incident ${input.incidentId}, using only the reviewed facts at ${fixture.generated_at}. TE-03: no unverified cause or component blamed. TE-02: no completion promise (a next-update time is not a completion time). TE-05: no other tenant information. Nothing is sent or approved.
Return JSON with subject and body. Subject must be ${JSON.stringify(recorded.subject)}.
Select and arrange sentences from the following bank VERBATIM, separated by spaces or blank lines. Do not paraphrase or add claims. Include the sentences starting "This is our first notice", "We are investigating", "Next update:" and "Contact:". Include appropriate what-happened and current-action facts. Omit redundant salutations if desired. This is a bounded drafting task, not free-form advice.
SENTENCE BANK: ${JSON.stringify(tenantSentences)}`;
  const result = await generateJson('tenant-message-INC-2026-1011', prompt, tenantDraftSchema);
  // Model-supplied identity, routing, sensitivity and approval keys never survive.
  const draft = {
    ...recorded, ...result.data,
    draft_id: result.source === 'live' ? `TM-live-${randomUUID()}` : recorded.draft_id,
    status: 'needs_approval',
  };
  return Response.json({ ...result, data: { draft, snapshotAt: fixture.generated_at } }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
