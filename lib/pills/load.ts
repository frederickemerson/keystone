// MOSAIC pill loader — reads pills/<domain>/<name>/ from disk and parses it
// with the engine's parsePill. Server-only (node:fs): server components load
// bundles and pass the plain-data PillBundle to client components.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parsePill, type Pill } from "@/lib/engine";

/** Serialisable (plain JSON) view of a pill for client components. */
export interface PillBundle {
  /** "<domain>-<name>", e.g. "technical-services-chilled-water-leak". */
  id: string;
  domain: string;
  name: string;
  /** Repo-relative folder, e.g. "pills/technical-services/chilled-water-leak". */
  path: string;
  pill: Pill;
  /** SKILL.md body after the frontmatter (prose heuristics for the LLM host). */
  skillBody: string;
  /** CHANGELOG.md contents ("" when absent). */
  changelog: string;
}

export function pillsDir(): string {
  return join(process.cwd(), "pills");
}

export function pillId(domain: string, name: string): string {
  return `${domain}-${name}`;
}

function subdirs(dir: string): string[] {
  return readdirSync(dir)
    .filter((entry) => !entry.startsWith(".") && statSync(join(dir, entry)).isDirectory())
    .sort();
}

function readOptional(file: string): string {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function stripFrontmatter(skillMd: string): string {
  return skillMd.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trimStart();
}

/** Every pill folder on disk: a <domain>/<name>/ directory containing SKILL.md. */
export function listPillRefs(): { id: string; domain: string; name: string }[] {
  const root = pillsDir();
  const refs: { id: string; domain: string; name: string }[] = [];
  for (const domain of subdirs(root)) {
    for (const name of subdirs(join(root, domain))) {
      if (existsSync(join(root, domain, name, "SKILL.md"))) {
        refs.push({ id: pillId(domain, name), domain, name });
      }
    }
  }
  return refs;
}

function loadFromFolder(domain: string, name: string): PillBundle {
  const rel = join("pills", domain, name);
  const dir = join(pillsDir(), domain, name);
  const skillMd = readFileSync(join(dir, "SKILL.md"), "utf8");

  const evals: Record<string, string> = {};
  const evalsDir = join(dir, "evals");
  if (existsSync(evalsDir)) {
    for (const file of readdirSync(evalsDir).sort()) {
      if (/\.ya?ml$/.test(file)) {
        evals[file.replace(/\.ya?ml$/, "")] = readFileSync(join(evalsDir, file), "utf8");
      }
    }
  }

  let pill: Pill;
  try {
    pill = parsePill({
      skillMd,
      rulesYaml: readFileSync(join(dir, "rules.yaml"), "utf8"),
      provenanceJson: readFileSync(join(dir, "provenance.json"), "utf8"),
      evals,
    });
  } catch (err) {
    throw new Error(`${rel}: ${(err as Error).message}`);
  }

  return {
    id: pillId(domain, name),
    domain,
    name,
    path: rel,
    pill,
    skillBody: stripFrontmatter(skillMd),
    changelog: readOptional(join(dir, "CHANGELOG.md")),
  };
}

export function loadAllPills(): PillBundle[] {
  return listPillRefs().map((ref) => loadFromFolder(ref.domain, ref.name));
}

/** Load one pill by id ("<domain>-<name>"); undefined when no such pill exists. */
export function loadPill(id: string): PillBundle | undefined {
  const ref = listPillRefs().find((r) => r.id === id);
  return ref ? loadFromFolder(ref.domain, ref.name) : undefined;
}
