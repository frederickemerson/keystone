// The coordinator's own safety invariant, enforced instead of assumed.
//
// lib/coordination sits next to the gate engine and reads from it. Two things
// must stay true, and neither is true "by construction":
//
//   1. the dependency arrow is ONE-WAY — coordination may read the engine, the
//      engine may never read coordination. lib/engine/__tests__/boundary.test.ts
//      polices the engine's import allowlist; this file states the other half
//      explicitly, so the rule is written down on both sides.
//   2. coordination is PURE — no model input, no network, no ambient
//      configuration, no clock. A conflict the coordinator reports is a
//      statement about two pills' rules; nothing a model or a remote service
//      says may change it, and the same inputs must always give the same answer.
//
// Coordination never decides a gate. But it names a human and a deadline on
// screen, so the same discipline applies.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { coordinate } from "../detect";

const COORDINATION_DIR = join(__dirname, "..");
const ENGINE_DIR = join(COORDINATION_DIR, "..", "engine");

/**
 * The only non-relative modules a coordination file may import.
 *   @/lib/engine/*          — the deterministic engine: the authority on every
 *                             fact about a rule, so its gating set is never
 *                             re-derived here.
 *   @/lib/governance/access — roles.json policy (static JSON import): the named
 *                             human, their clearance and their grants.
 *   @/lib/zod               — schema validation, via the project's single entry point.
 * Anything else — a model client, a fetch wrapper, the governance store, the
 * pill loader's node:fs — would put a non-deterministic input in reach.
 */
const ALLOWED_PACKAGES = [
  "@/lib/engine",
  "@/lib/engine/conditions",
  "@/lib/engine/evaluate",
  "@/lib/engine/types",
  "@/lib/governance/access",
  "@/lib/zod",
];

/** Tokens that would admit ambient state, I/O or nondeterminism. */
const FORBIDDEN = [
  { pattern: /\bprocess\s*\.\s*env\b/, why: "reads ambient configuration" },
  { pattern: /\bfetch\s*\(/, why: "performs network I/O" },
  { pattern: /\bimport\s*\(/, why: "loads a module dynamically, escaping this check" },
  { pattern: /\brequire\s*\(/, why: "loads a module dynamically, escaping this check" },
  { pattern: /\bnode:/, why: "reaches for a node builtin, so it cannot run in the room" },
  { pattern: /["']server-only["']/, why: "couples the coordinator to a server runtime" },
  { pattern: /\bnew\s+Date\b|\bDate\s*\.\s*now\b/, why: "reads the clock, so identical inputs could decide differently" },
  { pattern: /\bMath\s*\.\s*random\b/, why: "is nondeterministic" },
  { pattern: /\b(?:XMLHttpRequest|WebSocket)\b/, why: "performs network I/O" },
];

function sourcesIn(dir: string): { name: string; source: string }[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({ name, source: readFileSync(join(dir, name), "utf8") }));
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:\bfrom|^\s*import)\s+["']([^"']+)["']/gm)].map((match) => match[1]);
}

describe("coordination boundary", () => {
  // Guard against a vacuous pass: if the module is ever restructured so this
  // scan finds nothing, every check below would "pass" having read no code.
  it("finds the coordination source files it is meant to police", () => {
    const names = sourcesIn(COORDINATION_DIR).map((file) => file.name);
    expect(names).toContain("detect.ts");
    expect(names).toContain("adjudicate.ts");
    expect(names).toContain("contract.ts");
    expect(names).toContain("policy.ts");
  });

  it("imports only relative modules, the engine, roles policy or @/lib/zod", () => {
    const offenders = sourcesIn(COORDINATION_DIR).flatMap(({ name, source }) =>
      importSpecifiers(source)
        .filter((specifier) => !specifier.startsWith("./") && !specifier.startsWith("../"))
        .filter((specifier) => !ALLOWED_PACKAGES.includes(specifier))
        .map((specifier) => `${name} imports "${specifier}"`),
    );
    expect(offenders).toEqual([]);
  });

  it("never reaches for ambient state, I/O or the clock", () => {
    const offenders = sourcesIn(COORDINATION_DIR).flatMap(({ name, source }) =>
      FORBIDDEN.filter(({ pattern }) => pattern.test(source)).map(({ why }) => `${name} ${why}`),
    );
    expect(offenders).toEqual([]);
  });

  // The other half of the one-way arrow. The engine's own boundary test pins an
  // allowlist; this says the forbidden direction by name, so a reader of either
  // file sees the whole rule.
  it("is never imported by the engine", () => {
    const engineFiles = sourcesIn(ENGINE_DIR);
    expect(engineFiles.length).toBeGreaterThanOrEqual(5);
    const offenders = engineFiles.flatMap(({ name, source }) =>
      importSpecifiers(source)
        .filter((specifier) => /coordination/.test(specifier))
        .map((specifier) => `lib/engine/${name} imports "${specifier}"`),
    );
    expect(offenders).toEqual([]);
  });

  // A third parameter is how a model input, a clock or a "live" override would
  // most plausibly arrive. Pinning the arity makes adding one a test-breaking act.
  it("coordinates from exactly its two declared inputs: policy and incident input", () => {
    expect(coordinate.length).toBe(2);
  });
});
