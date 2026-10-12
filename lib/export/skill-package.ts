// Governed skill package: the approved version of a pill (from the governance
// store) written back as the folder the pill loader and CodeBuddy read —
// SKILL.md at the root, rules.yaml, evidence.yaml, provenance.json, evals/,
// CHANGELOG.md. Pure and client-safe: the caller supplies the pill's source
// files (lib/export/pill-source.server.ts) and the version history.

import yaml from 'js-yaml';
import { extractFrontmatter, parsePill, type Pill, type Provenance, type ProvenanceRuleEntry } from '@/lib/engine';
import { compareSemver, type PillVersion } from '@/lib/governance/versions';

/** A pill's files exactly as they are on disk (pills/<domain>/<name>/). */
export interface PillSource {
  id: string;
  domain: string;
  name: string;
  skillMd: string;
  rulesYaml: string;
  provenanceJson: string;
  /** "" when the pill ships no evidence.yaml. */
  evidenceYaml: string;
  /** Eval case id (file stem) → YAML text. */
  evals: Record<string, string>;
  /** "" when the pill ships no CHANGELOG.md. */
  changelog: string;
}

/** Package-relative path (no leading folder) → file text. */
export type PackageFiles = Record<string, string>;

export interface SkillPackage {
  /** e.g. "chilled-water-leak-v1.3.0.zip". */
  filename: string;
  /** The folder name a skill host installs it under, e.g. "chilled-water-leak". */
  folder: string;
  version: string;
  files: PackageFiles;
}

export class SkillPackageError extends Error {
  override name = 'SkillPackageError';
}

const YAML_DUMP = { lineWidth: -1, noRefs: true } as const;

function who(v: { name: string; role: string } | undefined): string {
  return v ? `${v.name} (${v.role})` : 'nobody';
}

function day(iso: string | undefined): string {
  return iso ? iso.slice(0, 10) : 'unknown date';
}

/** SKILL.md with the frontmatter's version and status set to the governed version's. */
function skillMd(source: PillSource, version: PillVersion): string {
  const front = yaml.load(extractFrontmatter(source.skillMd), { schema: yaml.CORE_SCHEMA });
  if (!front || typeof front !== 'object' || Array.isArray(front)) {
    throw new SkillPackageError(`${source.id}: SKILL.md frontmatter is not a mapping`);
  }
  const manifest = { ...(front as Record<string, unknown>), version: version.version, status: 'approved' };
  const body = source.skillMd.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const note = `# Exported from Keystone: v${version.version}, approved by ${who(version.approvedBy)} on ${day(version.approvedAt)}.`;
  return `---\n${note}\n${yaml.dump(manifest, { ...YAML_DUMP, schema: yaml.CORE_SCHEMA }).trimEnd()}\n---\n${body}`;
}

function rulesYaml(source: PillSource, version: PillVersion): string {
  // JSON round trip drops undefined optionals, which YAML cannot represent.
  const rules: unknown = JSON.parse(JSON.stringify(version.rules));
  const header = [
    `# Keystone Intelligence Pill — Rules`,
    `# Pill: ${source.domain}/${source.name}`,
    `# Version: ${version.version} (governed export; approved by ${who(version.approvedBy)})`,
    `# Structured conditions only. Evidence vocabulary: evidence.yaml (same folder).`,
  ].join('\n');
  return `${header}\n\n${yaml.dump(rules, YAML_DUMP)}`;
}

/** Provenance of a rule proposed from a frontline note: the verbatim span and who passed it. */
function captureEntry(version: PillVersion): ProvenanceRuleEntry | null {
  const c = version.capture;
  if (!c) return null;
  return {
    source: c.noteId,
    start: `char ${c.quoteSpan.start}`,
    end: `char ${c.quoteSpan.end}`,
    quote: c.quoteSpan.text,
    confirmation: 'confirmed',
    confirmed_by: version.approvedBy?.name ?? version.createdBy.name,
    confirmed_at: version.approvedAt ?? version.createdAt,
    edit_note: `Proposed from frontline note ${c.noteId} recorded by ${who(c.author)}; peer-confirmed before Shadow, put in Shadow by ${who(version.shadowedBy)}, approved by ${who(version.approvedBy)}.`,
  };
}

/** Disk provenance for the rules this version keeps, plus every capture-derived rule in its lineage. */
function provenanceJson(source: PillSource, version: PillVersion, lineage: readonly PillVersion[]): string {
  const disk = JSON.parse(source.provenanceJson) as Provenance;
  const ruleIds = new Set(version.rules.map((r) => r.id));
  const rules: Record<string, ProvenanceRuleEntry> = {};
  for (const [id, entry] of Object.entries(disk.rules)) if (ruleIds.has(id)) rules[id] = entry;
  for (const v of lineage) {
    const entry = captureEntry(v);
    if (entry && v.capture && ruleIds.has(v.capture.ruleId) && !rules[v.capture.ruleId]) rules[v.capture.ruleId] = entry;
  }
  return `${JSON.stringify({ ...disk, version: version.version, rules }, null, 2)}\n`;
}

/** Governed versions up to and including `version`, excluding the seeded baseline, oldest first. */
function governedLineage(history: readonly PillVersion[], version: PillVersion): PillVersion[] {
  return history
    .filter((v) => v.parentVersion !== null && compareSemver(v.version, version.version) <= 0)
    .sort((a, b) => compareSemver(a.version, b.version));
}

function changelogEntry(v: PillVersion): string {
  const lines = [`## ${v.version} — ${day(v.approvedAt ?? v.createdAt)}`, '', `**Status in Keystone:** ${v.status.toLowerCase()}`, ''];
  lines.push(`**Why:** ${v.reason}`, '');
  lines.push(`**Proposed by:** ${who(v.createdBy)} from v${v.parentVersion}`, '');
  if (v.rollbackOf) lines.push(`**Rollback:** restores the rules of v${v.rollbackOf}`, '');
  if (v.capture) lines.push(`**From a frontline note:** ${v.capture.noteId} (rule ${v.capture.ruleId})`, '');
  if (v.shadowedBy) lines.push(`**Put in Shadow by:** ${who(v.shadowedBy)}`, '');
  if (v.approvedBy) lines.push(`**Approved by:** ${who(v.approvedBy)}`, '');
  return lines.join('\n');
}

function changelogMd(source: PillSource, version: PillVersion, lineage: readonly PillVersion[]): string {
  const governed = [...lineage].reverse().map(changelogEntry).join('\n');
  const intro = [
    `<!-- Governed export from Keystone: v${version.version}. Entries above the file changelog come from the governance record. -->`,
    '',
  ].join('\n');
  const disk = source.changelog.trim();
  if (!governed) return `${intro}${disk}\n`;
  // Keep the file changelog's title on top, then the governed entries, then its own entries.
  const titleMatch = /^# .*\n/.exec(disk);
  const title = titleMatch ? titleMatch[0] : '';
  const rest = titleMatch ? disk.slice(title.length).trimStart() : disk;
  return `${intro}${title}\n${governed}\n${rest}\n`;
}

/**
 * Build the package for `version`, which must be the Approved one: exporting
 * a Draft or Shadow version would publish rules that never passed approval.
 */
export function buildSkillPackage(source: PillSource, version: PillVersion, history: readonly PillVersion[]): SkillPackage {
  if (version.status !== 'Approved') {
    throw new SkillPackageError(`Only the approved version can be exported (v${version.version} is ${version.status})`);
  }
  if (version.pillId !== source.id) {
    throw new SkillPackageError(`Version belongs to ${version.pillId}, not ${source.id}`);
  }
  const lineage = governedLineage(history, version);
  const files: PackageFiles = {
    'SKILL.md': skillMd(source, version),
    'rules.yaml': rulesYaml(source, version),
    'provenance.json': provenanceJson(source, version, lineage),
    'CHANGELOG.md': changelogMd(source, version, lineage),
  };
  if (source.evidenceYaml.trim()) files['evidence.yaml'] = source.evidenceYaml;
  for (const [id, text] of Object.entries(source.evals)) files[`evals/${id}.yaml`] = text;
  return { filename: `${source.name}-v${version.version}.zip`, folder: source.name, version: version.version, files };
}

/** Parse a package back exactly the way the pill loader parses a folder. Throws when it would not load. */
export function parsePackage(files: PackageFiles): Pill {
  const evals: Record<string, string> = {};
  for (const [file, text] of Object.entries(files)) {
    const m = /^evals\/(.+)\.ya?ml$/.exec(file);
    if (m) evals[m[1]] = text;
  }
  const required = ['SKILL.md', 'rules.yaml', 'provenance.json'];
  for (const f of required) if (!(f in files)) throw new SkillPackageError(`Package is missing ${f}`);
  return parsePill({
    skillMd: files['SKILL.md'],
    rulesYaml: files['rules.yaml'],
    provenanceJson: files['provenance.json'],
    evidenceYaml: files['evidence.yaml'] ?? '',
    evals,
  });
}
