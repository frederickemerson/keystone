// MOSAIC governance — pill versions, proposals, diff and rollback.
// Pure + client-safe. History is append-only: rollback creates a new version.

import { create as createDiffPatcher, type ArrayDelta, type Delta, type ObjectDelta } from "jsondiffpatch";
import type { Pill, Rule } from "@/lib/engine";

export type VersionStatus = "Draft" | "Shadow" | "Approved" | "Retired";

/** A named human acting in a role (role ids follow data/roles.json + pill RACI). */
export interface Actor {
  name: string;
  role: string;
}

export interface PillVersion {
  pillId: string;
  /** Semver "MAJOR.MINOR.PATCH". */
  version: string;
  status: VersionStatus;
  rules: Rule[];
  createdBy: Actor;
  createdAt: string;
  approvedBy?: Actor;
  approvedAt?: string;
  reason: string;
  /** Version this one was derived from (null for the seeded baseline). */
  parentVersion: string | null;
  /** Role that must approve promotion — the pill manifest's `approver`. */
  approverRole: string;
  /** Set when this version restores an earlier version's rules. */
  rollbackOf?: string;
}

// ---------------------------------------------------------------------------
// Semver helpers
// ---------------------------------------------------------------------------

function parseSemver(v: string): [number, number, number] {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(v.trim());
  if (!m) throw new Error(`Invalid semver: "${v}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function bumpMinor(v: string): string {
  const [major, minor] = parseSemver(v);
  return `${major}.${minor + 1}.0`;
}

/** Next free minor version given a pill's whole history. */
export function nextMinorVersion(history: readonly PillVersion[]): string {
  if (history.length === 0) return "0.1.0";
  const latest = [...history].sort((a, b) => compareSemver(b.version, a.version))[0];
  return bumpMinor(latest.version);
}

export function findVersion(history: readonly PillVersion[], version: string): PillVersion | undefined {
  return history.find((v) => v.version === version);
}

export function currentApproved(history: readonly PillVersion[]): PillVersion | undefined {
  return history
    .filter((v) => v.status === "Approved")
    .sort((a, b) => compareSemver(b.version, a.version))[0];
}

// ---------------------------------------------------------------------------
// Seeding + materialising
// ---------------------------------------------------------------------------

/** Baseline Approved version from a file pill. */
export function seedVersion(
  pillId: string,
  pill: Pill,
  people: { createdBy: Actor; approvedBy: Actor },
  at: string,
): PillVersion {
  return {
    pillId,
    version: pill.manifest.version,
    status: "Approved",
    rules: structuredClone(pill.rules),
    createdBy: people.createdBy,
    createdAt: at,
    approvedBy: people.approvedBy,
    approvedAt: at,
    reason: `Seeded from pill files (manifest v${pill.manifest.version})`,
    parentVersion: null,
    approverRole: pill.manifest.approver,
  };
}

/** The engine-ready Pill for a given version (file pill with that version's rules). */
export function pillAtVersion(base: Pill, v: PillVersion): Pill {
  return { ...base, manifest: { ...base.manifest, version: v.version }, rules: v.rules };
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export type RuleChange =
  | { op: "update"; ruleId: string; patch: Partial<Omit<Rule, "id">> }
  | { op: "add"; rule: Rule }
  | { op: "remove"; ruleId: string };

export function applyRuleChanges(rules: readonly Rule[], changes: readonly RuleChange[]): Rule[] {
  let next = structuredClone([...rules]);
  for (const change of changes) {
    switch (change.op) {
      case "update": {
        const idx = next.findIndex((r) => r.id === change.ruleId);
        if (idx === -1) throw new Error(`Cannot update unknown rule ${change.ruleId}`);
        next[idx] = { ...next[idx], ...structuredClone(change.patch) };
        break;
      }
      case "add": {
        if (next.some((r) => r.id === change.rule.id)) {
          throw new Error(`Rule ${change.rule.id} already exists`);
        }
        next.push(structuredClone(change.rule));
        break;
      }
      case "remove": {
        if (!next.some((r) => r.id === change.ruleId)) {
          throw new Error(`Cannot remove unknown rule ${change.ruleId}`);
        }
        next = next.filter((r) => r.id !== change.ruleId);
        break;
      }
    }
  }
  return next;
}

/**
 * Propose a new Draft version derived from `base`. Bumps the minor version —
 * from the highest version in `history` when given, so proposals never collide.
 */
export function proposeVersion(
  base: PillVersion,
  changes: readonly RuleChange[],
  author: Actor,
  reason: string,
  history: readonly PillVersion[] = [base],
  at: string = new Date().toISOString(),
): PillVersion {
  if (!reason.trim()) throw new Error("A proposal needs a reason");
  return {
    pillId: base.pillId,
    version: nextMinorVersion(history.length ? history : [base]),
    status: "Draft",
    rules: applyRuleChanges(base.rules, changes),
    createdBy: author,
    createdAt: at,
    reason,
    parentVersion: base.version,
    approverRole: base.approverRole,
  };
}

/** Draft → Shadow (runs silently alongside the approved version). */
export function promoteToShadow(
  history: readonly PillVersion[],
  version: string,
): PillVersion[] {
  const target = findVersion(history, version);
  if (!target) throw new Error(`Unknown version ${version}`);
  if (target.status !== "Draft") throw new Error(`Only Draft versions enter Shadow (v${version} is ${target.status})`);
  return history.map((v) => (v.version === version ? { ...v, status: "Shadow" } : v));
}

/**
 * Mark `version` Approved and retire the previously Approved version.
 * Gatekeeping (evals, separation of duties) lives in approval.ts — call
 * canApprove() first.
 */
export function markApproved(
  history: readonly PillVersion[],
  version: string,
  approver: Actor,
  at: string = new Date().toISOString(),
): PillVersion[] {
  const target = findVersion(history, version);
  if (!target) throw new Error(`Unknown version ${version}`);
  return history.map((v) => {
    if (v.version === version) return { ...v, status: "Approved", approvedBy: approver, approvedAt: at };
    if (v.status === "Approved") return { ...v, status: "Retired" };
    return v;
  });
}

// ---------------------------------------------------------------------------
// Rollback — never deletes history
// ---------------------------------------------------------------------------

/**
 * Roll a pill back to an earlier version's rules. Appends a NEW Approved
 * version (next minor) carrying `toVersion`'s rules, and marks the version
 * being rolled back (the current Approved one) Retired. Nothing is removed.
 */
export function rollback(
  history: readonly PillVersion[],
  pillId: string,
  toVersion: string,
  actor: Actor,
  reason: string,
  at: string = new Date().toISOString(),
): PillVersion[] {
  if (!reason.trim()) throw new Error("A rollback needs a reason");
  const target = findVersion(history, toVersion);
  if (!target || target.pillId !== pillId) throw new Error(`Unknown version ${pillId}@${toVersion}`);
  const current = currentApproved(history);
  if (current && current.version === toVersion) {
    throw new Error(`v${toVersion} is already the approved version`);
  }

  const restored: PillVersion = {
    pillId,
    version: nextMinorVersion(history),
    status: "Approved",
    rules: structuredClone(target.rules),
    createdBy: actor,
    createdAt: at,
    approvedBy: actor,
    approvedAt: at,
    reason,
    parentVersion: current?.version ?? toVersion,
    approverRole: target.approverRole,
    rollbackOf: toVersion,
  };

  return [
    ...history.map((v) => (v.status === "Approved" ? { ...v, status: "Retired" as const } : v)),
    restored,
  ];
}

// ---------------------------------------------------------------------------
// Diff (jsondiffpatch, rules keyed by id)
// ---------------------------------------------------------------------------

const differ = createDiffPatcher({
  // Rules match by id. Id-less objects (conditions, exceptions) match by
  // content; scalar list items (evidence keys, actions) match by value natively.
  objectHash: (item: object) =>
    "id" in item && typeof item.id === "string" ? item.id : JSON.stringify(item),
  arrays: { detectMove: false },
});

export interface VersionDiff {
  from: string;
  to: string;
  /** Raw jsondiffpatch delta over the rules array (undefined = identical). */
  delta: Delta;
  /** Human-readable changes, e.g. "TS-03 deadline_minutes 15 → 10". */
  changes: string[];
}

function fmt(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "∅";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function isArrayDelta(d: Delta): d is ArrayDelta {
  return typeof d === "object" && d !== null && !Array.isArray(d) && (d as Record<string, unknown>)._t === "a";
}

function isObjectDelta(d: Delta): d is ObjectDelta {
  return typeof d === "object" && d !== null && !Array.isArray(d);
}

/** Describe a delta under `prefix` (e.g. "TS-03 trigger.all"), newest values from `after`. */
function describe(prefix: string, delta: Delta, before: unknown, after: unknown, out: string[]): void {
  if (delta === undefined) return;

  if (Array.isArray(delta)) {
    if (delta.length === 1) out.push(`${prefix} added ${fmt(delta[0])}`);
    else if (delta.length === 2) out.push(`${prefix} ${fmt(delta[0])} → ${fmt(delta[1])}`);
    else if (delta[2] === 0) out.push(`${prefix} removed (was ${fmt(delta[0])})`);
    else out.push(`${prefix} changed`);
    return;
  }

  if (isArrayDelta(delta)) {
    const beforeArr = Array.isArray(before) ? before : [];
    const afterArr = Array.isArray(after) ? after : [];
    for (const [key, sub] of Object.entries(delta)) {
      if (key === "_t") continue;
      if (key.startsWith("_")) {
        const removed = beforeArr[Number(key.slice(1))];
        if (Array.isArray(sub) && sub[2] === 0) out.push(`${prefix} − ${fmt(removed)}`);
        continue;
      }
      const idx = Number(key);
      if (Array.isArray(sub) && sub.length === 1) {
        out.push(`${prefix} + ${fmt(sub[0])}`);
      } else {
        describe(`${prefix}[${idx}]`, sub as Delta, beforeArr[idx], afterArr[idx], out);
      }
    }
    return;
  }

  if (isObjectDelta(delta)) {
    const b = (before ?? {}) as Record<string, unknown>;
    const a = (after ?? {}) as Record<string, unknown>;
    for (const [key, sub] of Object.entries(delta)) {
      const path = prefix.includes(" ") ? `${prefix}.${key}` : `${prefix} ${key}`;
      describe(path, sub, b[key], a[key], out);
    }
  }
}

/** Human list of changes for a rules delta, keyed by rule id. */
export function describeRulesDelta(before: readonly Rule[], after: readonly Rule[], delta: Delta): string[] {
  const out: string[] = [];
  if (!delta || !isArrayDelta(delta)) return out;
  for (const [key, sub] of Object.entries(delta)) {
    if (key === "_t") continue;
    if (key.startsWith("_")) {
      const removed = before[Number(key.slice(1))];
      if (Array.isArray(sub) && sub[2] === 0 && removed) out.push(`${removed.id} removed`);
      continue;
    }
    const rule = after[Number(key)];
    if (!rule) continue;
    if (Array.isArray(sub) && sub.length === 1) {
      out.push(`${rule.id} added`);
      continue;
    }
    const prev = before.find((r) => r.id === rule.id);
    describe(rule.id, sub as Delta, prev, rule, out);
  }
  return out;
}

export function diffRules(before: readonly Rule[], after: readonly Rule[]): { delta: Delta; changes: string[] } {
  const delta = differ.diff(before, after);
  return { delta, changes: describeRulesDelta(before, after, delta) };
}

export function diffVersions(a: PillVersion, b: PillVersion): VersionDiff {
  const { delta, changes } = diffRules(a.rules, b.rules);
  return { from: a.version, to: b.version, delta, changes };
}
