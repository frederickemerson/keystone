import { z } from 'zod';
import fixture from '@/data/fixtures/llm/tenant-message-INC-2026-1011.json';

const recorded = fixture.drafts[0];
// A fail-closed factual sentence bank, not a regex pretending to understand
// arbitrary prose. The model may select and arrange these recorded, reviewed
// first-notice facts; it may not invent a cause, ETA, recipient or instruction.
export const tenantSentences = recorded.body.split(/\n\n|(?<=[.!?])\s+/).filter(Boolean);
const required = tenantSentences.filter((s) =>
  s.startsWith('This is our first notice') || s.startsWith('We are investigating') ||
  s.startsWith('Next update:') || s.startsWith('Contact:'),
);

export const tenantDraftSchema = z.object({
  subject: z.literal(recorded.subject),
  body: z.string().min(1).max(6_000),
}).superRefine(({ body }, ctx) => {
  const sentences = body.split(/\n\n|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.some((s) => !tenantSentences.includes(s)) || required.some((s) => !sentences.includes(s))) {
    ctx.addIssue({ code: 'custom', message: 'TE-02/TE-03: unsupported claim, cause or completion promise; use only the reviewed facts and next update.' });
  }
});

export type TenantDraftText = z.infer<typeof tenantDraftSchema>;
