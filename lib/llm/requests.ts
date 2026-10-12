import 'server-only';
import { z } from '@/lib/zod';

export const extractRequestSchema = z.object({
  interviewId: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/).default('ce-interview-2026-10-02'),
  turns: z.array(z.object({
    t: z.string().regex(/^\d{2}:[0-5]\d:[0-5]\d$/),
    speaker: z.string().trim().min(1).max(100),
    text: z.string().trim().min(1).max(4_000),
  }).strict()).min(1).max(100),
}).strict();

export const tenantRequestSchema = z.object({
  incidentId: z.string().regex(/^INC-\d{4}-\d{4}$/),
}).strict();

/** Bound the actual streamed body, not just the optional Content-Length header. */
export async function readRequest<T>(request: Request, schema: z.ZodType<T>): Promise<T | Response> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return Response.json({ error: 'Expected application/json.' }, { status: 415 });
  }
  const limit = 64_000;
  if (Number(request.headers.get('content-length')) > limit) {
    return Response.json({ error: 'Request too large.' }, { status: 413 });
  }
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Missing JSON body.' }, { status: 400 });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return Response.json({ error: 'Request too large.' }, { status: 413 });
      }
      chunks.push(value);
    }
    const parsed = schema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    return parsed.success ? parsed.data : Response.json({ error: 'Invalid request fields.' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
}
