'use server';

// Server action: a pill's source files for the in-browser skill package
// export. The governed version lives in the browser (governance store) and
// the eval and evidence files on the server; the browser joins them.
// Signed-in users only; the id must name a pill on disk.

import { getSession } from '@/lib/auth/session';
import { z } from '@/lib/zod';
import { readPillSource } from './pill-source.server';
import type { PillSource } from './skill-package';

const pillIdSchema = z.string().min(1).max(200);

export async function loadPillSource(pillId: unknown): Promise<PillSource> {
  if (!(await getSession())) throw new Error('Sign in to export a pill.');
  const id = pillIdSchema.safeParse(pillId);
  const source = id.success ? readPillSource(id.data) : undefined;
  if (!source) throw new Error('Unknown pill.');
  return source;
}
