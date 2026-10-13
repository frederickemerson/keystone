// Tencent Cloud ADP custom-skill compatibility, enforced rather than claimed.
//
// docs/SUBMISSION.md names ADP as the governed distribution path for pills, on
// the strength of the package Keystone already exports. These tests pin that
// package against ADP's documented import constraints, so the claim fails here
// — not in the console on Demo Day — if the exporter or a pill ever drifts.
//
// Source (fetched 2026-10-13):
//   https://www.tencentcloud.com/document/product/1254/81539  (import a ZIP)
//   https://www.tencentcloud.com/document/product/1254/81540  (package structure)
// Verbatim: SKILL.md must be "included in the root directory of the ZIP
// package"; "Only .zip format is supported"; "Maximum 10 MB"; SKILL.md "must
// contain metadata in YAML format, including at least the Skill name and
// feature description fields"; Version Number is required and "Recommended
// semantic versioning".

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import yaml from 'js-yaml';
import { extractFrontmatter } from '@/lib/engine';
import { createGovernanceStore, memoryStorage } from '@/lib/governance/store';
import { currentApproved } from '@/lib/governance/versions';
import { loadAllPills } from '@/lib/pills/load';
import { readPillSource } from '../pill-source.server';
import { buildSkillPackage } from '../skill-package';
import { unzipFiles, zipFiles } from '../zip';

/** ADP import limits, doc 1254/81540. */
const MAX_ZIP_BYTES = 10 * 1024 * 1024;
const MAX_SKILL_ID = 64;
const MAX_DISPLAY_NAME = 64;
const MAX_OVERVIEW = 1024;
const SEMVER = /^\d+\.\d+\.\d+$/;

const clock = () => '2026-10-13T00:00:00.000Z';

/** Every pill on disk, exported at its currently approved version. */
function approvedPackages() {
  return loadAllPills().map((bundle) => {
    const store = createGovernanceStore(memoryStorage(), clock);
    store.getState().seedPills([{ id: bundle.id, pill: bundle.pill }]);
    const history = store.getState().versions[bundle.id];
    const approved = currentApproved(history);
    expect(approved, `${bundle.id} has an approved version to export`).toBeDefined();
    const source = readPillSource(bundle.id);
    expect(source, `${bundle.id} has readable source files`).toBeDefined();
    return { id: bundle.id, pkg: buildSkillPackage(source!, approved!, history) };
  });
}

function frontmatter(skillMd: string): Record<string, unknown> {
  const front = yaml.load(extractFrontmatter(skillMd), { schema: yaml.CORE_SCHEMA });
  expect(front && typeof front === 'object' && !Array.isArray(front)).toBe(true);
  return front as Record<string, unknown>;
}

afterEach(() => vi.restoreAllMocks());

describe('ADP custom-skill package compatibility', () => {
  // Without this, every check below would pass vacuously over an empty list.
  it('exports a package for every pill on disk', () => {
    const packages = approvedPackages();
    expect(packages.length).toBeGreaterThanOrEqual(2);
  });

  it('ships SKILL.md at the archive root, not inside a folder', () => {
    for (const { id, pkg } of approvedPackages()) {
      // Read the entry names back out of real zip bytes, not the file map the
      // builder returned, so the archive itself is what is under test.
      const entries = Object.keys(unzipFiles(zipFiles(pkg.files)));
      expect(entries, `${id} has SKILL.md at the root`).toContain('SKILL.md');
      const nested = entries.filter((e) => e.endsWith('SKILL.md') && e !== 'SKILL.md');
      expect(nested, `${id} has no nested SKILL.md`).toEqual([]);
    }
  });

  it('is a .zip under ADP’s 10 MB ceiling', () => {
    for (const { id, pkg } of approvedPackages()) {
      expect(pkg.filename.endsWith('.zip'), `${id} exports a .zip`).toBe(true);
      const bytes = zipFiles(pkg.files).byteLength;
      expect(bytes, `${id} is ${bytes} bytes, over ADP's ${MAX_ZIP_BYTES}`).toBeLessThanOrEqual(MAX_ZIP_BYTES);
    }
  });

  it('carries YAML metadata with the name and description ADP parses', () => {
    for (const { id, pkg } of approvedPackages()) {
      const front = frontmatter(pkg.files['SKILL.md']);
      const name = front.name;
      const description = front.description;
      expect(typeof name, `${id} declares a name`).toBe('string');
      expect(typeof description, `${id} declares a description`).toBe('string');
      expect((name as string).trim().length).toBeGreaterThan(0);
      expect((description as string).trim().length).toBeGreaterThan(0);
      // Skill ID and Display Name are both parsed from this one field.
      expect((name as string).length, `${id} name fits ADP's ${MAX_SKILL_ID}-char Skill ID`).toBeLessThanOrEqual(MAX_SKILL_ID);
      expect((name as string).length).toBeLessThanOrEqual(MAX_DISPLAY_NAME);
      expect((description as string).length, `${id} description fits ADP's ${MAX_OVERVIEW}-char Overview`).toBeLessThanOrEqual(MAX_OVERVIEW);
    }
  });

  it('declares a semantic version matching the governed version it was built from', () => {
    for (const { id, pkg } of approvedPackages()) {
      const front = frontmatter(pkg.files['SKILL.md']);
      expect(String(front.version), `${id} uses semantic versioning`).toMatch(SEMVER);
      expect(front.version, `${id} frontmatter matches the exported version`).toBe(pkg.version);
      expect(pkg.filename).toContain(`v${pkg.version}`);
    }
  });

  // "Skill ID ... unique within the enterprise": two pills must never collide.
  it('gives every pill a distinct Skill ID', () => {
    const names = approvedPackages().map(({ pkg }) => String(frontmatter(pkg.files['SKILL.md']).name));
    expect(new Set(names).size, `Skill IDs collide: ${names.join(', ')}`).toBe(names.length);
  });
});
