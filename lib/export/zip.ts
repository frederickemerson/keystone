// Zip a text package with fflate. Pure and client-safe.

import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { PackageFiles } from './skill-package';

/** Zip `files` with every path at the archive root. A fixed `mtime` keeps the archive reproducible. */
export function zipFiles(files: PackageFiles, mtime: Date = new Date()): Uint8Array {
  const entries: Zippable = {};
  for (const [file, text] of Object.entries(files)) entries[file] = [strToU8(text), { mtime }];
  return zipSync(entries, { level: 6 });
}

/** Read a zip back into path → text (tests and self-checks). */
export function unzipFiles(zip: Uint8Array): PackageFiles {
  const out: PackageFiles = {};
  for (const [file, bytes] of Object.entries(unzipSync(zip))) {
    if (!file.endsWith('/')) out[file] = strFromU8(bytes);
  }
  return out;
}
