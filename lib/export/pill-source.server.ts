// Read a pill's source files from disk for the skill package. Server only.

import 'server-only';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listPillRefs, pillsDir } from '@/lib/pills/load';
import type { PillSource } from './skill-package';

function readOptional(file: string): string {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

/** The files of pill `pillId` as they are on disk, or undefined for an unknown id. */
export function readPillSource(pillId: string): PillSource | undefined {
  const ref = listPillRefs().find((r) => r.id === pillId);
  if (!ref) return undefined;
  const dir = join(pillsDir(), ref.domain, ref.name);
  const evals: Record<string, string> = {};
  const evalsDir = join(dir, 'evals');
  if (existsSync(evalsDir)) {
    for (const file of readdirSync(evalsDir).sort()) {
      if (/\.ya?ml$/.test(file)) evals[file.replace(/\.ya?ml$/, '')] = readFileSync(join(evalsDir, file), 'utf8');
    }
  }
  return {
    id: ref.id,
    domain: ref.domain,
    name: ref.name,
    skillMd: readFileSync(join(dir, 'SKILL.md'), 'utf8'),
    rulesYaml: readFileSync(join(dir, 'rules.yaml'), 'utf8'),
    provenanceJson: readFileSync(join(dir, 'provenance.json'), 'utf8'),
    evidenceYaml: readOptional(join(dir, 'evidence.yaml')),
    evals,
    changelog: readOptional(join(dir, 'CHANGELOG.md')),
  };
}
