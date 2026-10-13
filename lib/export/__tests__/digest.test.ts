// The tamper-evident digest, held to the three claims it makes.
//
// 1. DETERMINISM. "The same files always produce the same digest" is the claim
//    an importer relies on, so it is tested against the two things that most
//    plausibly break it: the insertion order of the file map (evals are
//    enumerated from an object) and the zip container's mtime.
// 2. CORRECTNESS. lib/export/digest.ts implements SHA-256 by hand, because the
//    export is a synchronous call in a React handler and subtle.digest() is
//    async. A hand-rolled hash that is merely self-consistent would pass every
//    round-trip test while being wrong, so it is checked against the FIPS 180-4
//    vectors AND against globalThis.crypto.subtle — the same Web Crypto API the
//    browser provides — including at the message lengths where padding changes.
// 3. HONESTY. It is a content digest, not a signature. The last describe block
//    pins that wording in the file that ships to whoever imports the package.

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGovernanceStore, memoryStorage } from '@/lib/governance/store';
import { currentApproved } from '@/lib/governance/versions';
import { DEMO_PILL_ID } from '@/lib/journey/routes';
import { loadPill, type PillBundle } from '@/lib/pills/load';
import {
  DIGEST_ALGORITHM,
  DIGEST_FILE,
  DIGEST_FORMAT,
  digestPackage,
  sha256Text,
  verifyPackageDigest,
} from '../digest';
import { readPillSource } from '../pill-source.server';
import { buildSkillPackage, type PackageFiles } from '../skill-package';
import { unzipFiles, zipFiles } from '../zip';

const DIGEST_SOURCE = join(__dirname, '..', 'digest.ts');

/** The demo pill exported at its currently approved version, as the Learning screen exports it. */
function exportedPackage() {
  const bundle = loadPill(DEMO_PILL_ID) as PillBundle;
  const source = readPillSource(DEMO_PILL_ID)!;
  const store = createGovernanceStore(memoryStorage(), () => '2026-10-13T00:00:00.000Z');
  store.getState().seedPills([{ id: bundle.id, pill: bundle.pill }]);
  const history = store.getState().versions[bundle.id];
  return buildSkillPackage(source, currentApproved(history)!, history);
}

/** `files` with one path replaced, added or (with undefined) dropped — never mutated. */
function withFile(files: PackageFiles, path: string, text: string | undefined): PackageFiles {
  const next = { ...files };
  if (text === undefined) delete next[path];
  else next[path] = text;
  return next;
}

async function webCryptoSha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('sha-256', () => {
  // FIPS 180-4 / NIST CAVP known answers. If the implementation is subtly wrong
  // these are what catch it; nothing else in the suite compares to a constant.
  it('matches the published vectors for the empty string and "abc"', () => {
    // Arrange / Act / Assert
    expect(sha256Text('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Text('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('agrees with globalThis.crypto.subtle, including at every padding boundary', async () => {
    // Arrange: 55/56 and 63/64 are where SHA-256 padding spills into a new block.
    const texts = [
      '',
      'a',
      'x'.repeat(55),
      'x'.repeat(56),
      'x'.repeat(57),
      'x'.repeat(63),
      'x'.repeat(64),
      'x'.repeat(65),
      'x'.repeat(1000),
      'chilled water · 冷水 · emoji 🧊 for multi-byte UTF-8',
      readFileSync(DIGEST_SOURCE, 'utf8'),
    ];

    // Act / Assert
    for (const text of texts) {
      expect(sha256Text(text), `length ${text.length}`).toBe(await webCryptoSha256(text));
    }
  });
});

describe('package digest', () => {
  it('is the same whatever order the files and evals were added in', () => {
    // Arrange: the same package, built once forwards and once backwards.
    const { files } = exportedPackage();
    const paths = Object.keys(files);
    expect(paths.filter((p) => p.startsWith('evals/')).length).toBeGreaterThanOrEqual(2);
    const forwards: PackageFiles = {};
    for (const path of paths) forwards[path] = files[path];
    const backwards: PackageFiles = {};
    for (const path of [...paths].reverse()) backwards[path] = files[path];

    // Act / Assert
    expect(Object.keys(forwards)).not.toEqual(Object.keys(backwards));
    expect(digestPackage(backwards).digest).toBe(digestPackage(forwards).digest);
    expect(digestPackage(backwards).entries).toEqual(digestPackage(forwards).entries);
  });

  it('is unchanged by the zip container, whatever mtime it was written with', () => {
    // Arrange
    const { files, digest } = exportedPackage();

    // Act: the same files through two archives stamped a year apart.
    const early = unzipFiles(zipFiles(files, new Date('2020-01-01T00:00:00.000Z')));
    const late = unzipFiles(zipFiles(files, new Date('2026-10-13T09:30:00.000Z')));

    // Assert
    expect(zipFiles(files, new Date('2020-01-01T00:00:00.000Z'))).not.toEqual(zipFiles(files, new Date('2026-10-13T09:30:00.000Z')));
    expect(digestPackage(early).digest).toBe(digest);
    expect(digestPackage(late).digest).toBe(digest);
  });

  it('covers every file in the package except DIGEST.txt, rules and provenance among them', () => {
    // Arrange
    const { files } = exportedPackage();

    // Act
    const covered = digestPackage(files).entries.map((entry) => entry.path);

    // Assert
    expect(covered).toContain('rules.yaml');
    expect(covered).toContain('provenance.json');
    expect(covered).toContain('SKILL.md');
    expect(covered).not.toContain(DIGEST_FILE);
    expect([...covered].sort()).toEqual(Object.keys(files).filter((p) => p !== DIGEST_FILE).sort());
    expect(covered.length).toBeGreaterThanOrEqual(5);
  });

  it('changes when a rule changes', () => {
    // Arrange
    const { files, digest } = exportedPackage();
    expect(files['rules.yaml']).toContain('deadline_minutes');

    // Act
    const edited = withFile(files, 'rules.yaml', files['rules.yaml'].replace('deadline_minutes', 'deadline_minutes '));

    // Assert
    expect(digestPackage(edited).digest).not.toBe(digest);
  });
});

describe('verifying a package', () => {
  it('reports every file matching for the package as exported', () => {
    // Arrange
    const { files } = exportedPackage();

    // Act
    const result = verifyPackageDigest(files);

    // Assert
    expect(result.state).toBe('verified');
    expect(result.problems).toEqual([]);
    expect(result.files.length).toBe(Object.keys(files).length - 1);
    expect(result.recordedDigest).toBe(result.computedDigest);
    expect(result.format).toBe(DIGEST_FORMAT);
    expect(result.algorithm).toBe(DIGEST_ALGORITHM);
    // The claim is "not altered", never "authentic".
    expect(result.summary).toContain('not show who');
  });

  it('names the rule file when a deadline is edited in transit', () => {
    // Arrange
    const { files } = exportedPackage();
    const tampered = withFile(files, 'rules.yaml', files['rules.yaml'].replace('deadline_minutes: 15', 'deadline_minutes: 90'));
    expect(tampered['rules.yaml']).not.toBe(files['rules.yaml']);

    // Act
    const result = verifyPackageDigest(tampered);

    // Assert
    expect(result.state).toBe('altered');
    expect(result.problems.map((p) => p.path)).toEqual(['rules.yaml']);
    expect(result.problems[0].state).toBe('changed');
    expect(result.problems[0].recorded).not.toBe(result.problems[0].computed);
    expect(result.summary).toContain('rules.yaml');
    // Untouched files are still reported as matching, so a UI can show the rest is fine.
    expect(result.files.filter((f) => f.state === 'match').length).toBe(result.files.length - 1);
  });

  it('reports a dropped eval as missing and an inserted file as unlisted', () => {
    // Arrange
    const { files } = exportedPackage();
    const evalPath = Object.keys(files).find((p) => p.startsWith('evals/'))!;

    // Act
    const dropped = verifyPackageDigest(withFile(files, evalPath, undefined));
    const inserted = verifyPackageDigest(withFile(files, 'rules.extra.yaml', 'id: SMUGGLED\n'));

    // Assert
    expect(dropped.state).toBe('altered');
    expect(dropped.problems).toEqual([{ path: evalPath, state: 'missing', recorded: expect.any(String), computed: null }]);
    expect(inserted.state).toBe('altered');
    expect(inserted.problems).toEqual([{ path: 'rules.extra.yaml', state: 'unlisted', recorded: null, computed: expect.any(String) }]);
  });

  it('reports an edited digest line even when every file still matches', () => {
    // Arrange: the files are untouched; only DIGEST.txt's own summary line is rewritten.
    const { files, digest } = exportedPackage();
    const forged = 'f'.repeat(64);
    const tampered = withFile(files, DIGEST_FILE, files[DIGEST_FILE].replace(`digest: ${digest}`, `digest: ${forged}`));
    expect(tampered[DIGEST_FILE]).toContain(forged);

    // Act
    const result = verifyPackageDigest(tampered);

    // Assert
    expect(result.state).toBe('altered');
    expect(result.problems).toEqual([]);
    expect(result.recordedDigest).toBe(forged);
    expect(result.computedDigest).toBe(digest);
    expect(result.summary).toContain('DIGEST.txt has been edited');
  });

  it('says it cannot tell, rather than verified or altered, when there is no manifest', () => {
    // Arrange: a package from before the digest existed.
    const { files } = exportedPackage();

    // Act
    const result = verifyPackageDigest(withFile(files, DIGEST_FILE, undefined));

    // Assert
    expect(result.state).toBe('absent');
    expect(result.computedDigest).toBeNull();
    expect(result.files).toEqual([]);
    expect(result.summary).toContain('cannot be told either way');
  });

  it.each([
    ['an unknown format', (text: string) => text.replace(DIGEST_FORMAT, 'keystone-pill-digest/v9'), 'format'],
    ['an unknown algorithm', (text: string) => text.replace(`algorithm: ${DIGEST_ALGORITHM}`, 'algorithm: md5'), 'algorithm'],
    ['no digest line', (text: string) => text.replace(/^digest: .*$/m, 'digest: not-a-hash'), 'digest line'],
    ['no file lines', (text: string) => text.replace(/^[0-9a-f]{64} {2}.*$/gm, '').replace(/\n+/g, '\n'), 'lists no files'],
    ['itself in its own list', (text: string) => `${text}${'0'.repeat(64)}  ${DIGEST_FILE}\n`, 'lists itself'],
  ])('refuses to guess when DIGEST.txt has %s', (_label, corrupt, expected) => {
    // Arrange
    const { files } = exportedPackage();

    // Act
    const result = verifyPackageDigest(withFile(files, DIGEST_FILE, corrupt(files[DIGEST_FILE])));

    // Assert
    expect(result.state).toBe('unsupported');
    expect(result.summary).toContain(expected);
    expect(result.computedDigest).toBeNull();
  });
});

describe('the exported package', () => {
  it('ships a DIGEST.txt that verifies after a real zip round trip', () => {
    // Arrange
    const pkg = exportedPackage();

    // Act: through zip bytes, which is how the package actually travels.
    const delivered = unzipFiles(zipFiles(pkg.files, new Date('2026-10-13T00:00:00.000Z')));

    // Assert
    expect(Object.keys(delivered)).toContain(DIGEST_FILE);
    expect(Object.keys(delivered)).toContain('SKILL.md'); // the ADP constraint, still held
    expect(verifyPackageDigest(delivered).state).toBe('verified');
    expect(pkg.digest).toBe(digestPackage(delivered).digest);
    expect(pkg.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('records the digest in DIGEST.txt alongside the pill and version it was built from', () => {
    // Arrange
    const pkg = exportedPackage();

    // Act
    const text = pkg.files[DIGEST_FILE];

    // Assert
    expect(text).toContain(`format: ${DIGEST_FORMAT}`);
    expect(text).toContain(`algorithm: ${DIGEST_ALGORITHM}`);
    expect(text).toContain(`digest: ${pkg.digest}`);
    expect(text).toContain(`version: ${pkg.version}`);
    expect(text).toContain('rules.yaml');
    expect(text).toContain('provenance.json');
  });

  it('tells the reader in plain words that this is not a signature', () => {
    // Arrange
    const { files } = exportedPackage();

    // Act
    const text = files[DIGEST_FILE];

    // Assert: the distinction is the whole point, so it is pinned, not trusted.
    expect(text).toContain('tamper-evident, not a signature');
    expect(text).toContain('proves nothing about WHO built the package');
    expect(text).toContain('There is no key here');
    expect(text).not.toMatch(/\bsigned by\b|\bsignature of\b|\bcryptographically signed\b/i);
  });
});

describe('digest.ts runs in the browser as well as in Node', () => {
  // Export happens client-side, so a Node-only digest would be a defect the
  // test suite could not see: vitest runs in Node, where node:crypto works.
  // These checks are what stand in for a browser run of the module.
  const source = readFileSync(DIGEST_SOURCE, 'utf8');

  // Guard against a vacuous pass: an empty or moved file would satisfy every
  // "does not contain" assertion below.
  it('reads the module it is meant to police', () => {
    expect(source).toContain('export function verifyPackageDigest');
    expect(source).toContain(DIGEST_ALGORITHM);
    expect(source.length).toBeGreaterThan(2000);
  });

  it('imports nothing but the PackageFiles type', () => {
    const specifiers = [...source.matchAll(/(?:\bfrom|^\s*import)\s+["']([^"']+)["']/gm)].map((match) => match[1]);
    expect(specifiers).toEqual(['./skill-package']);
    expect(source).toContain("import type { PackageFiles } from './skill-package'");
  });

  it('reaches for no Node-only API, and for no clock or randomness', () => {
    const forbidden = [
      { pattern: /\bnode:/, why: 'imports a Node builtin' },
      { pattern: /\bcreateHash\b/, why: 'uses node:crypto' },
      { pattern: /\bBuffer\b/, why: 'uses the Node Buffer global' },
      { pattern: /\bprocess\s*\.\s*(?:env|cwd)\b/, why: 'reads ambient Node state' },
      { pattern: /\brequire\s*\(|\bimport\s*\(/, why: 'loads a module at runtime, escaping this check' },
      { pattern: /\bnew\s+Date\b|\bDate\s*\.\s*now\b/, why: 'reads the clock, so the same files could digest differently' },
      { pattern: /\bMath\s*\.\s*random\b/, why: 'is nondeterministic' },
      { pattern: /\bfetch\s*\(|\bXMLHttpRequest\b/, why: 'performs I/O' },
    ];
    const offenders = forbidden.filter(({ pattern }) => pattern.test(source)).map(({ why }) => why);
    expect(offenders).toEqual([]);
  });
});
