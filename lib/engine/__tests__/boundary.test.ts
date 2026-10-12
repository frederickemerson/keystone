// The engine's safety invariant, enforced instead of assumed.
//
// README.md and CLAUDE.md both claim the deterministic engine takes no model
// input, so no LLM, no remote service and no ambient state can change a gate
// decision — "true by construction". Construction is not a guarantee: a single
// import added to lib/engine/ would make the claim false while every other test
// in the suite stayed green. These tests are what makes it true.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";

const ENGINE_DIR = join(__dirname, "..");

/**
 * The only non-relative modules an engine file may import.
 *   js-yaml   — parses pill YAML. Pure; performs no I/O of its own.
 *   @/lib/zod — schema validation, and the project's single zod entry point
 *               (lib/__tests__/zod-entry.test.ts). Pure.
 * Anything else — a model client, a fetch wrapper, the governance store,
 * `server-only` — would put a non-deterministic input within reach of a gate.
 */
const ALLOWED_PACKAGES = ["js-yaml", "@/lib/zod"];

/** Tokens that would admit ambient state, I/O or nondeterminism. */
const FORBIDDEN = [
  { pattern: /\bprocess\s*\.\s*env\b/, why: "reads ambient configuration" },
  { pattern: /\bfetch\s*\(/, why: "performs network I/O" },
  { pattern: /\bimport\s*\(/, why: "loads a module dynamically, escaping this check" },
  { pattern: /\brequire\s*\(/, why: "loads a module dynamically, escaping this check" },
  { pattern: /["']server-only["']/, why: "couples the engine to a server runtime" },
  { pattern: /\bnew\s+Date\b|\bDate\s*\.\s*now\b/, why: "reads the clock, so identical inputs could decide differently" },
  { pattern: /\bMath\s*\.\s*random\b/, why: "is nondeterministic" },
  { pattern: /\b(?:XMLHttpRequest|WebSocket)\b/, why: "performs network I/O" },
];

function engineSources(): { name: string; source: string }[] {
  return readdirSync(ENGINE_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({ name, source: readFileSync(join(ENGINE_DIR, name), "utf8") }));
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:\bfrom|^\s*import)\s+["']([^"']+)["']/gm)].map((match) => match[1]);
}

describe("engine boundary", () => {
  // Guard against a vacuous pass: if the engine is ever restructured so this
  // scan finds nothing, the checks below would all "pass" having read no code.
  it("finds the engine source files it is meant to police", () => {
    const names = engineSources().map((file) => file.name);
    expect(names).toContain("evaluate.ts");
    expect(names).toContain("conditions.ts");
    expect(names.length).toBeGreaterThanOrEqual(5);
  });

  it("imports only relative modules, js-yaml or @/lib/zod", () => {
    const offenders = engineSources().flatMap(({ name, source }) =>
      importSpecifiers(source)
        .filter((specifier) => !specifier.startsWith("./") && !specifier.startsWith("../"))
        .filter((specifier) => !ALLOWED_PACKAGES.includes(specifier))
        .map((specifier) => `${name} imports "${specifier}"`),
    );
    expect(offenders).toEqual([]);
  });

  it("never reaches for ambient state, I/O or the clock", () => {
    const offenders = engineSources().flatMap(({ name, source }) =>
      FORBIDDEN.filter(({ pattern }) => pattern.test(source)).map(({ why }) => `${name} ${why}`),
    );
    expect(offenders).toEqual([]);
  });

  // A fifth parameter is how a model input would most plausibly arrive. Pinning
  // the arity means adding one is a deliberate, test-breaking act.
  it("evaluates from exactly its four declared inputs: pill, asset, incident, evidence", () => {
    expect(evaluate.length).toBe(4);
  });
});
