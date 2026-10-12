// F01: zod's eval probe must never run under the CSP. `jitless` only takes
// effect for schemas built after it is set, so app code must get `z` from
// lib/zod (which sets it on import) rather than from "zod" directly.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from '@/lib/zod';

const ROOT = join(__dirname, '..', '..');
const SOURCE_DIRS = ['app', 'components', 'lib'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('zod entry point', () => {
  it('lib/zod enables jitless mode', () => {
    expect(z.config().jitless).toBe(true);
  });

  it('no app source imports "zod" except lib/zod.ts', () => {
    const offenders = [...SOURCE_DIRS.flatMap((d) => sourceFiles(join(ROOT, d))), join(ROOT, 'middleware.ts')]
      .filter((file) => relative(ROOT, file) !== join('lib', 'zod.ts'))
      .filter((file) => /from\s+['"]zod(\/[^'"]*)?['"]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
