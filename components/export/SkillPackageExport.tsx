'use client';

// "Download skill package (.zip)": the APPROVED version of a pill from the
// governance store, written as the folder the pill loader and CodeBuddy read.
// The package is parsed back with the engine before download; a package that
// would not load is never handed out.

import { useState } from 'react';
import { Download, FileJson, PackageCheck } from 'lucide-react';
import { loadPillSource } from '@/lib/export/actions';
import { downloadFile } from '@/lib/export/download';
import { buildSkillPackage, parsePackage, type SkillPackage } from '@/lib/export/skill-package';
import { zipFiles } from '@/lib/export/zip';
import { currentApproved, type PillVersion } from '@/lib/governance/versions';

type Props = {
  pill: { id: string; name: string };
  history: readonly PillVersion[];
  /** The version on disk (CodeBuddy loading was verified for that one only). */
  diskVersion: string;
};

type Busy = 'zip' | 'json' | null;

async function buildChecked(pillId: string, version: PillVersion, history: readonly PillVersion[]): Promise<SkillPackage> {
  const source = await loadPillSource(pillId);
  const pkg = buildSkillPackage(source, version, history);
  parsePackage(pkg.files); // throws if the package would not load
  return pkg;
}

export function SkillPackageExport({ pill, history, diskVersion }: Props) {
  const approved = currentApproved(history);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(kind: Exclude<Busy, null>) {
    if (!approved) return;
    setBusy(kind);
    setError(null);
    try {
      const pkg = await buildChecked(pill.id, approved, history);
      if (kind === 'zip') {
        downloadFile(pkg.filename, zipFiles(pkg.files), 'application/zip');
      } else {
        const json = JSON.stringify({ folder: pkg.folder, version: pkg.version, files: pkg.files }, null, 2);
        downloadFile(pkg.filename.replace(/\.zip$/, '.json'), json, 'application/json');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The package could not be built.');
    } finally {
      setBusy(null);
    }
  }

  if (!approved) {
    return (
      <p className="text-[12px] text-ink-muted">
        No approved version yet, so there is nothing to export. Only an approved version leaves Keystone.
      </p>
    );
  }

  const approvedBy = approved.approvedBy ? `approved by ${approved.approvedBy.name}` : 'approved';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => handleExport('zip')} disabled={busy !== null} className="btn-pill btn-pill-primary">
          <Download className="size-3.5" aria-hidden="true" />
          {busy === 'zip' ? 'Building package…' : 'Download skill package (.zip)'}
        </button>
        <button type="button" onClick={() => handleExport('json')} disabled={busy !== null} className="btn-pill">
          <FileJson className="size-3.5" aria-hidden="true" />
          {busy === 'json' ? 'Building…' : 'Download as JSON'}
        </button>
      </div>
      <p className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-muted">
        <PackageCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          v{approved.version} · {approvedBy}. SKILL.md, rules, evidence, provenance, evals and changelog, with SKILL.md at
          the root. Checked to load back with the same eval results before it downloads. Loading in CodeBuddy was verified
          for the file version (v{diskVersion}); WorkBuddy and ADP import are designed for, not tested.
        </span>
      </p>
      {error ? (
        <p role="alert" className="text-[12px] text-blocked">
          {error}
        </p>
      ) : null}
      <div className="rounded-lg border border-line bg-dew-drop/50 p-3">
        <p className="text-xs font-medium text-ink">Install as a CodeBuddy skill</p>
        <pre className="mt-1.5 overflow-x-auto rounded bg-canvas p-2 font-mono text-[11px] text-ink">
          {`unzip ${pill.name}-v${approved.version}.zip -d .codebuddy/skills/${pill.name}`}
        </pre>
      </div>
    </div>
  );
}
