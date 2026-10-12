// Pure helpers shared by the Registry client components. No React, no store.

import * as yaml from "js-yaml";
import { personaFor, shadowKey } from "@/lib/governance/store";
import { shadowSummary, type ShadowRun, type ShadowSummary } from "@/lib/governance/approval";
import { compareSemver, pillAtVersion, type PillVersion } from "@/lib/governance/versions";
import { runEvals } from "@/lib/engine";
import type { Pill, PillManifest } from "@/lib/engine/types";
import type { DiffItem } from "@/components/mosaic/types";

/** Display name for a role id, falling back to its governance label. */
export function personaName(role: string): string {
  return personaFor(role).name;
}

/**
 * Next review date as the pill's SKILL.md declares it (`review_cadence.next_review`)
 * — the authored, authoritative date, not one computed from when the store seeded.
 */
export function nextReviewDate(manifest: PillManifest): string {
  const iso = manifest.review_cadence?.next_review;
  if (!iso) return "Not set";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * The pill's most recent shadow replay, for any of its versions: a rollback
 * retires the version that was shadowed, but its shadow evidence still exists.
 */
export function latestShadow(
  pillId: string,
  history: readonly PillVersion[],
  shadowRuns: Readonly<Record<string, readonly ShadowRun[]>>,
): { version: string; summary: ShadowSummary } | null {
  const newestFirst = [...history].sort((a, b) => compareSemver(b.version, a.version));
  for (const v of newestFirst) {
    const runs = shadowRuns[shadowKey(pillId, v.version)];
    if (runs && runs.length > 0) return { version: v.version, summary: shadowSummary(runs) };
  }
  return null;
}

/**
 * Eval pass rate for a pill *at a given version* (rules swapped in). Returns
 * pass/total counts — never a percentage (per SPEC §6, no LLM percentages).
 */
export function evalPassFor(pill: Pill, version: PillVersion): { pass: number; total: number } {
  const atVersion = pillAtVersion(pill, version);
  const cases = Object.values(pill.evals);
  const summary = runEvals(atVersion, cases);
  return { pass: summary.passed, total: summary.passed + summary.failed };
}

/** Union of Brick asset references covered by a version's rules. */
export function assetRefsFor(version: PillVersion): string[] {
  const refs = new Set<string>();
  for (const rule of version.rules) for (const r of rule.asset_refs) refs.add(r);
  return [...refs];
}

/** Highest sensitivity present across a version's rules. */
const SENSITIVITY_ORDER = ["public", "internal", "tenant_pii", "commercial"] as const;
export function maxSensitivity(version: PillVersion): string {
  let worst = 0;
  for (const rule of version.rules) {
    const idx = SENSITIVITY_ORDER.indexOf(rule.sensitivity as (typeof SENSITIVITY_ORDER)[number]);
    if (idx > worst) worst = idx;
  }
  return SENSITIVITY_ORDER[worst];
}

/**
 * Convert describeRulesDelta lines into DiffView items.
 * "TS-02 deadline_minutes 15 → 10" → label "TS-02 deadline_minutes", before "15", after "10".
 */
export function changesToDiffItems(changes: readonly string[]): DiffItem[] {
  return changes.map((change) => {
    const arrow = change.indexOf(" → ");
    if (arrow !== -1) {
      const left = change.slice(0, arrow);
      const cut = left.lastIndexOf(" ");
      return {
        label: cut === -1 ? left : left.slice(0, cut),
        before: cut === -1 ? "" : left.slice(cut + 1),
        after: change.slice(arrow + 3),
        kind: "change" as const,
      };
    }
    if (change.endsWith(" added") || change.endsWith(" added.")) {
      return { label: change.replace(/ added\.?$/, ""), before: "", after: "added", kind: "add" as const };
    }
    if (change.endsWith(" removed")) {
      return { label: change.replace(/ removed$/, ""), before: "removed", after: "", kind: "remove" as const };
    }
    return { label: change, before: "", after: "", kind: "change" as const };
  });
}

/** Reconstruct a downloadable SKILL.md frontmatter block from a manifest (scope/access are objects). */
export function skillFrontmatter(manifest: PillManifest): string {
  return `---\n${yaml.dump(manifest, { lineWidth: -1 }).trimEnd()}\n---`;
}
