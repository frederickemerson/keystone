import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { runEvals, type Pill } from '@/lib/engine';
import { createGovernanceStore, memoryStorage } from '@/lib/governance/store';
import { currentApproved, pillAtVersion, type PillVersion } from '@/lib/governance/versions';
import { DEMO_PILL_ID } from '@/lib/journey/routes';
import { loadPill, type PillBundle } from '@/lib/pills/load';
import { readPillSource } from '../pill-source.server';
import { buildSkillPackage, parsePackage, SkillPackageError, type PackageFiles } from '../skill-package';
import { unzipFiles, zipFiles } from '../zip';

const bundle = loadPill(DEMO_PILL_ID) as PillBundle;
const source = readPillSource(DEMO_PILL_ID)!;
const clock = () => '2026-10-12T08:00:00.000Z';

/** The governance store, driven the way the Learning screen drives it. */
function governedHistory() {
  const store = createGovernanceStore(memoryStorage(), clock);
  const s = () => store.getState();
  s().seedPills([{ id: bundle.id, pill: bundle.pill }]);
  const seeded = s().versions[bundle.id];

  s().setRole('chief_engineer');
  const proposed = s().proposeVersion(bundle.id, '1.2.0', [{ op: 'update', ruleId: 'TS-02', patch: { deadline_minutes: 10 } }], 'Isolation took 10 minutes, not 15');
  s().setRole('asset_operations_manager');
  s().promoteToShadow(bundle.id, proposed.version);
  s().recordShadowRun(bundle.id, proposed.version, { incidentId: 'INC-2026-1011', approvedDecision: {}, shadowDecision: {}, agree: true, at: clock() });
  s().setRole('head_technical_services');
  expect(s().approveVersion(bundle.id, proposed.version, { regressions: [] }).allowed).toBe(true);
  const afterApproval = s().versions[bundle.id];

  const restored = s().rollback(bundle.id, '1.2.0', 'Night shift cannot isolate in 10 minutes');
  return { seeded, afterApproval, afterRollback: s().versions[bundle.id], proposedVersion: proposed.version, restored };
}

/** Write a package as pills/<domain>/<name>/ under a temp root and load it with the real loader. */
function loadThroughLoader(files: PackageFiles): Pill {
  const root = mkdtempSync(path.join(tmpdir(), 'keystone-pkg-'));
  dirs.push(root);
  const dir = path.join(root, 'pills', bundle.domain, bundle.name);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), text);
  }
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
  try {
    const loaded = loadPill(bundle.id);
    expect(loaded, 'loader finds the package').toBeDefined();
    return loaded!.pill;
  } finally {
    cwd.mockRestore();
  }
}

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function expectRoundTrip(version: PillVersion, history: readonly PillVersion[]): Pill {
  const pkg = buildSkillPackage(source, version, history);
  const zipped = unzipFiles(zipFiles(pkg.files, new Date(clock())));
  expect(zipped).toEqual(pkg.files);

  const loaded = loadThroughLoader(zipped);
  const governed = pillAtVersion(bundle.pill, version);
  expect(loaded.rules).toEqual(version.rules);
  expect(loaded.manifest).toEqual({ ...bundle.pill.manifest, version: version.version, status: 'approved' });
  expect(loaded.evidenceCatalog).toEqual(bundle.pill.evidenceCatalog);
  expect(Object.keys(loaded.evals).sort()).toEqual(Object.keys(bundle.pill.evals).sort());
  // Same evals, same results, as the governed version in the app.
  expect(runEvals(loaded, Object.values(loaded.evals))).toEqual(runEvals(governed, Object.values(bundle.pill.evals)));
  // The pure parser agrees with the folder loader.
  expect(parsePackage(pkg.files)).toEqual(loaded);
  return loaded;
}

describe('governed skill package', () => {
  it('round-trips the seeded approved version through zip and the pill loader', () => {
    const { seeded } = governedHistory();
    const v = currentApproved(seeded)!;
    expect(v.version).toBe('1.2.0');
    expectRoundTrip(v, seeded);
  });

  it('exports the approved correction, not the file on disk', () => {
    const { afterApproval, proposedVersion } = governedHistory();
    const v = currentApproved(afterApproval)!;
    expect(v.version).toBe(proposedVersion);
    const loaded = expectRoundTrip(v, afterApproval);
    expect(loaded.rules.find((r) => r.id === 'TS-02')?.deadline_minutes).toBe(10);
    expect(bundle.pill.rules.find((r) => r.id === 'TS-02')?.deadline_minutes).toBe(15);

    const changelog = buildSkillPackage(source, v, afterApproval).files['CHANGELOG.md'];
    expect(changelog).toContain(`## ${proposedVersion}`);
    expect(changelog).toContain('**Approved by:** Goh Boon Kheng (head_technical_services)');
    expect(changelog).toContain('**Put in Shadow by:** Priya Nair (asset_operations_manager)');
    expect(changelog).toContain('## 1.2.0'); // the file changelog is kept
  });

  it('exports a rollback version with the restored rules', () => {
    const { afterRollback, restored } = governedHistory();
    const v = currentApproved(afterRollback)!;
    expect(v.version).toBe(restored.version);
    const loaded = expectRoundTrip(v, afterRollback);
    expect(loaded.rules.find((r) => r.id === 'TS-02')?.deadline_minutes).toBe(15);
  });

  it('carries a frontline-note rule with its verbatim quote as provenance', () => {
    const { afterApproval } = governedHistory();
    const base = currentApproved(afterApproval)!;
    const ts04 = base.rules.find((r) => r.id === 'TS-04')!;
    const fromNote: PillVersion = {
      ...base,
      version: '9.9.0',
      parentVersion: base.version,
      rules: [...base.rules, { ...ts04, id: 'TS-99', title: 'Check the LD-23-04 cable first' }],
      capture: {
        noteId: 'VN-TEST-1',
        draftRuleId: 'DRAFT-01',
        ruleId: 'TS-99',
        quoteSpan: { start: 0, end: 30, text: 'check the LD-23-04 cable first' },
        author: { name: 'Rajesh Kumar', role: 'technician' },
      },
    };
    const history = [...afterApproval, fromNote];
    const loaded = expectRoundTrip(fromNote, history);
    expect(loaded.provenance['TS-99']).toMatchObject({ source: 'VN-TEST-1', quote: 'check the LD-23-04 cable first' });
  });

  it('refuses to export a version that is not approved', () => {
    const { afterApproval } = governedHistory();
    const retired = afterApproval.find((v) => v.status === 'Retired')!;
    expect(() => buildSkillPackage(source, retired, afterApproval)).toThrow(SkillPackageError);
  });

  it('puts SKILL.md at the archive root and names the zip by folder and version', () => {
    const { seeded } = governedHistory();
    const pkg = buildSkillPackage(source, seeded[0], seeded);
    expect(pkg.filename).toBe(`${bundle.name}-v1.2.0.zip`);
    expect(Object.keys(unzipFiles(zipFiles(pkg.files)))).toContain('SKILL.md');
    expect(Object.keys(pkg.files).filter((f) => f.startsWith('evals/'))).toHaveLength(Object.keys(bundle.pill.evals).length);
  });
});
