// Tamper-evident content digest for an exported pill package.
//
// The Keppel statement asks how the organisation keeps ownership of its
// decision logic when it leaves for another vendor or model. A pill leaves as
// plain text, which is the portable part — but plain text says nothing about
// whether the rules are still the rules that were approved. This module adds
// the missing part: a SHA-256 manifest written into the package (DIGEST.txt)
// and a pure verifier the importing side can run on it.
//
// TAMPER-EVIDENT, NOT TAMPER-PROOF. This is a content digest, not a signature.
// There is no key and no secret: anyone who edits rules.yaml can recompute
// DIGEST.txt and it will verify. What it catches is alteration that did not
// rewrite the manifest — an edited rule, a dropped eval, a swapped
// provenance.json, bit rot, a truncated transfer — and it lets a recipient
// compare one 64-character digest against the one Keystone's audit log
// recorded, out of band, instead of diffing a folder by eye. Authenticity
// ("Keppel built this") needs asymmetric signing with a real key, which this
// deliberately is not, and no comment or UI copy here may say otherwise.
//
// WHAT THE DIGEST COVERS — every file the package ships except DIGEST.txt
// itself, each by its package-relative path AND its exact UTF-8 bytes:
//   rules.yaml       the conditions, statuses and deadlines the engine gates on
//   provenance.json  who confirmed each rule and the verbatim span it came from
//   SKILL.md         the manifest (name, version, status) and the prose body
//   evidence.yaml    the vocabulary rules and evals are validated against
//   evals/*.yaml     the regression cases that prove the rules still decide alike
//   CHANGELOG.md     the governed version history
// The first two are the reason this exists: altering either changes, or
// misreports, a gate decision.
//
// WHAT IT DOES NOT COVER:
//   DIGEST.txt       it carries the digest, so it cannot hash itself. Its
//                    comment header, and its pill/version lines, are a reader's
//                    convenience and are not covered by anything; the
//                    authoritative version is SKILL.md's frontmatter, which is.
//   the .zip container — mtime, entry order, compression level, file modes.
//                    The digest is taken over file texts, so re-zipping the
//                    same files always yields the same digest.
//   the .zip filename.
//   authorship, as above.
//
// Pure and client-safe: the export runs in the browser. No imports, no I/O, no
// clock, no randomness. SHA-256 is implemented here in plain TypeScript rather
// than through globalThis.crypto.subtle, because subtle.digest() is async and
// buildSkillPackage() is a synchronous call made from a React event handler.
// The implementation uses only TextEncoder, Uint32Array and DataView — web
// standards present in both the browser and the Node test environment — and
// lib/export/__tests__/digest.test.ts holds it to the NIST vectors and to
// globalThis.crypto.subtle's own answers.

import type { PackageFiles } from './skill-package';

/** The package-relative path the digest manifest is written to. */
export const DIGEST_FILE = 'DIGEST.txt';
/** Bumped if the manifest layout ever changes; an unknown format verifies as 'unsupported'. */
export const DIGEST_FORMAT = 'keystone-pill-digest/v1';
export const DIGEST_ALGORITHM = 'sha-256';

/** One covered file: its package-relative path and the SHA-256 of its UTF-8 bytes. */
export interface DigestEntry {
  path: string;
  hash: string;
}

export interface PackageDigest {
  format: string;
  algorithm: string;
  /** SHA-256 over the canonical manifest text, as 64 lowercase hex characters. */
  digest: string;
  /** Every covered file, sorted by path. */
  entries: readonly DigestEntry[];
}

/** What the package says about itself, for the manifest's reader-facing lines. */
export interface DigestLabel {
  /** e.g. "technical-services/chilled-water-leak". */
  pill: string;
  /** The governed version the package was built from, e.g. "1.3.0". */
  version: string;
}

export type DigestState = 'verified' | 'altered' | 'absent' | 'unsupported';
export type DigestFileState = 'match' | 'changed' | 'missing' | 'unlisted';

export interface DigestFileResult {
  path: string;
  state: DigestFileState;
  /** The hash DIGEST.txt records for this path; null when it lists no such path. */
  recorded: string | null;
  /** The hash of the file in hand; null when the listed file is not in the package. */
  computed: string | null;
}

/** The result of verifying a package. Structured, never a boolean: a UI has to say what failed. */
export interface DigestVerification {
  state: DigestState;
  /** One sentence, sentence case, safe to render as-is. */
  summary: string;
  format: string | null;
  algorithm: string | null;
  recordedDigest: string | null;
  /** The digest recomputed from the files in hand; null when there was nothing to compare. */
  computedDigest: string | null;
  /** Every path either listed in the manifest or present in the package, sorted. */
  files: readonly DigestFileResult[];
  /** The subset of `files` that did not match, for a UI that lists only problems. */
  problems: readonly DigestFileResult[];
}

// ---------------------------------------------------------------------------
// SHA-256 (FIPS 180-4). Plain TypeScript so it runs unchanged in the browser.
// ---------------------------------------------------------------------------

const ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** FIPS 180-4 §5.3.3 initial hash value. */
const INITIAL_HASH = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

const BLOCK_BYTES = 64;
/** The 0x80 terminator plus the 8-byte big-endian message length. */
const PADDING_BYTES = 9;

function rotr(word: number, bits: number): number {
  return (word >>> bits) | (word << (32 - bits));
}

/** SHA-256 over `bytes` as 64 lowercase hex characters. */
function sha256Bytes(bytes: Uint8Array): string {
  const blocks = Math.ceil((bytes.length + PADDING_BYTES) / BLOCK_BYTES);
  const padded = new Uint8Array(blocks * BLOCK_BYTES);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  // Length in bits, big-endian, in the last 8 bytes. A package file would have
  // to exceed 1 PiB before the high word stopped being exact.
  const bitLength = bytes.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const hash = INITIAL_HASH.slice();
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += BLOCK_BYTES) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15];
      const y = w[i - 2];
      const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
      const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choose = (e & f) ^ (~e & g);
      const t1 = (h + s1 + choose + ROUND_CONSTANTS[i] + w[i]) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + majority) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    const round = [a, b, c, d, e, f, g, h];
    for (let i = 0; i < 8; i += 1) hash[i] = (hash[i] + round[i]) | 0;
  }

  let hex = '';
  for (let i = 0; i < 8; i += 1) hex += hash[i].toString(16).padStart(8, '0');
  return hex;
}

/** SHA-256 over the UTF-8 encoding of `text`. Exported for the cross-check tests. */
export function sha256Text(text: string): string {
  return sha256Bytes(new TextEncoder().encode(text));
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/** 64 lowercase hex characters, then exactly two spaces, then the path (which may contain spaces). */
const ENTRY_LINE = /^([0-9a-f]{64}) {2}(.+)$/;
const HEX_64 = /^[0-9a-f]{64}$/;

/**
 * The exact text the digest is taken over. Sorting by path is what makes the
 * digest independent of key insertion order and of the order evals were
 * enumerated; the default Array#sort compares UTF-16 code units, so it does not
 * depend on a locale either.
 */
function canonicalManifest(entries: readonly DigestEntry[]): string {
  const lines = [DIGEST_FORMAT, DIGEST_ALGORITHM];
  for (const entry of entries) lines.push(`${entry.hash}  ${entry.path}`);
  return `${lines.join('\n')}\n`;
}

function coveredEntries(files: PackageFiles): DigestEntry[] {
  return Object.keys(files)
    .filter((path) => path !== DIGEST_FILE)
    .sort()
    .map((path) => ({ path, hash: sha256Text(files[path]) }));
}

/** Digest `files` as they stand. DIGEST.txt, if present, is excluded from its own manifest. */
export function digestPackage(files: PackageFiles): PackageDigest {
  const entries = coveredEntries(files);
  return { format: DIGEST_FORMAT, algorithm: DIGEST_ALGORITHM, digest: sha256Text(canonicalManifest(entries)), entries };
}

/** The DIGEST.txt text for a package: the manifest, plus a header saying what it does and does not prove. */
export function renderDigestFile(digest: PackageDigest, label: DigestLabel): string {
  const header = [
    `# Keystone content digest — tamper-evident, not a signature.`,
    `#`,
    `# Every file listed below is hashed with SHA-256, the list is sorted by path,`,
    `# and "digest" is the SHA-256 of that list. Recompute it after import: if a`,
    `# line disagrees, that file is not the one Keystone exported.`,
    `#`,
    `# This proves nothing about WHO built the package. There is no key here, so`,
    `# anyone who edits a file can rewrite this manifest. Compare "digest" with`,
    `# the digest recorded in Keystone's audit log for v${label.version} to close that gap.`,
    `#`,
    `# DIGEST.txt is not covered by itself. Everything else in the package is,`,
    `# including rules.yaml and provenance.json — the files whose alteration`,
    `# would change, or misreport, a gate decision.`,
  ];
  const body = [
    `format: ${digest.format}`,
    `algorithm: ${digest.algorithm}`,
    `pill: ${label.pill}`,
    `version: ${label.version}`,
    `digest: ${digest.digest}`,
    `files:`,
    ...digest.entries.map((entry) => `${entry.hash}  ${entry.path}`),
  ];
  return `${[...header, ...body].join('\n')}\n`;
}

interface ParsedManifest {
  format: string | null;
  algorithm: string | null;
  digest: string | null;
  entries: DigestEntry[];
}

function parseDigestFile(text: string): ParsedManifest {
  const parsed: ParsedManifest = { format: null, algorithm: null, digest: null, entries: [] };
  for (const raw of text.split('\n')) {
    if (raw.startsWith('#') || raw.trim() === '') continue;
    const entry = ENTRY_LINE.exec(raw);
    if (entry) {
      parsed.entries.push({ hash: entry[1], path: entry[2] });
      continue;
    }
    const colon = raw.indexOf(':');
    if (colon < 0) continue;
    const key = raw.slice(0, colon).trim();
    const value = raw.slice(colon + 1).trim();
    if (key === 'format') parsed.format = value;
    else if (key === 'algorithm') parsed.algorithm = value;
    else if (key === 'digest') parsed.digest = value;
  }
  return parsed;
}

function unsupported(summary: string, parsed: ParsedManifest): DigestVerification {
  return {
    state: 'unsupported',
    summary,
    format: parsed.format,
    algorithm: parsed.algorithm,
    recordedDigest: parsed.digest,
    computedDigest: null,
    files: [],
    problems: [],
  };
}

function compare(files: PackageFiles, parsed: ParsedManifest): DigestFileResult[] {
  const recorded = new Map(parsed.entries.map((entry) => [entry.path, entry.hash]));
  const present = Object.keys(files).filter((path) => path !== DIGEST_FILE);
  const paths = [...new Set([...recorded.keys(), ...present])].sort();
  return paths.map((path) => {
    const expected = recorded.get(path) ?? null;
    const actual = path in files ? sha256Text(files[path]) : null;
    if (expected === null) return { path, state: 'unlisted' as const, recorded: null, computed: actual };
    if (actual === null) return { path, state: 'missing' as const, recorded: expected, computed: null };
    return { path, state: expected === actual ? ('match' as const) : ('changed' as const), recorded: expected, computed: actual };
  });
}

function alteredSummary(problems: readonly DigestFileResult[], digestLineMatches: boolean): string {
  if (problems.length === 0) {
    return 'Every file matches its recorded hash, but the digest line does not match the list it summarises, so DIGEST.txt has been edited.';
  }
  const named = problems.slice(0, 3).map((p) => p.path).join(', ');
  const rest = problems.length > 3 ? ` and ${problems.length - 3} more` : '';
  const trailer = digestLineMatches ? '' : ' The digest line does not match the list either.';
  const count = problems.length === 1 ? 'file does not' : 'files do not';
  return `${problems.length} ${count} match DIGEST.txt: ${named}${rest}.${trailer}`;
}

/**
 * Verify a package against the DIGEST.txt it carries. Pure: give it the files
 * an importer unzipped and it decides from those alone, so it runs on the
 * server, in the browser or in a test.
 */
export function verifyPackageDigest(files: PackageFiles): DigestVerification {
  const text = files[DIGEST_FILE];
  if (text === undefined) {
    return {
      state: 'absent',
      summary: `This package carries no ${DIGEST_FILE}, so whether its files were altered cannot be told either way.`,
      format: null,
      algorithm: null,
      recordedDigest: null,
      computedDigest: null,
      files: [],
      problems: [],
    };
  }

  const parsed = parseDigestFile(text);
  if (parsed.format !== DIGEST_FORMAT) {
    const found = parsed.format === null ? 'no format line' : `format "${parsed.format}"`;
    return unsupported(`${DIGEST_FILE} has ${found}; this build can only verify ${DIGEST_FORMAT}.`, parsed);
  }
  if (parsed.algorithm !== DIGEST_ALGORITHM) {
    const found = parsed.algorithm === null ? 'no algorithm line' : `algorithm "${parsed.algorithm}"`;
    return unsupported(`${DIGEST_FILE} has ${found}; this build can only verify ${DIGEST_ALGORITHM}.`, parsed);
  }
  if (parsed.digest === null || !HEX_64.test(parsed.digest)) {
    return unsupported(`${DIGEST_FILE} has no readable SHA-256 digest line.`, parsed);
  }
  if (parsed.entries.length === 0) {
    return unsupported(`${DIGEST_FILE} lists no files, so it covers nothing.`, parsed);
  }
  if (parsed.entries.some((entry) => entry.path === DIGEST_FILE)) {
    return unsupported(`${DIGEST_FILE} lists itself, which no ${DIGEST_FORMAT} manifest does.`, parsed);
  }

  const results = compare(files, parsed);
  const problems = results.filter((result) => result.state !== 'match');
  // Taken over the files in hand, not over the manifest's own list: this is the
  // number to compare with the audit log, and checking it against the digest
  // line also catches an edited digest line on a package whose files are intact.
  const computedDigest = digestPackage(files).digest;
  const digestLineMatches = computedDigest === parsed.digest;

  if (problems.length === 0 && digestLineMatches) {
    return {
      state: 'verified',
      summary: `All ${results.length} files match ${DIGEST_FILE}. That shows they were not altered after export; it does not show who exported them.`,
      format: parsed.format,
      algorithm: parsed.algorithm,
      recordedDigest: parsed.digest,
      computedDigest,
      files: results,
      problems,
    };
  }

  return {
    state: 'altered',
    summary: alteredSummary(problems, digestLineMatches),
    format: parsed.format,
    algorithm: parsed.algorithm,
    recordedDigest: parsed.digest,
    computedDigest,
    files: results,
    problems,
  };
}
