// The corpus module's purity, enforced instead of assumed.
//
// A derived eval case is a regression expectation. If anything here could read
// the clock, the network or ambient configuration, the same closed incident
// could produce two different expectations and the corpus would stop being a
// regression test. lib/engine/__tests__/boundary.test.ts does this for the
// engine; this does it for the module that feeds it.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCorpus } from "../corpus";
import { deriveEvalCases } from "../derive";
import { driftReport } from "../drift";

const EVALS_DIR = join(__dirname, "..");

/** The one file allowed to touch the filesystem: it reads data/ through the
 *  lib/data loaders and hands the result to the pure functions. */
const IO_FILE = "history.ts";

/** Non-relative modules a pure file here may import. */
const ALLOWED_PACKAGES = ["@/lib/engine", "@/lib/data/schemas"];

/** Tokens that would admit ambient state, I/O or nondeterminism. `Date.parse`
 *  of a recorded timestamp is fine; reading the clock is not. */
const FORBIDDEN = [
  { pattern: /\bDate\s*\.\s*now\b/, why: "reads the clock" },
  { pattern: /\bnew\s+Date\b/, why: "constructs a date, which with no argument reads the clock" },
  { pattern: /\bMath\s*\.\s*random\b/, why: "is nondeterministic" },
  { pattern: /\bprocess\s*\.\s*env\b/, why: "reads ambient configuration" },
  { pattern: /\bfetch\s*\(/, why: "performs network I/O" },
  { pattern: /\bimport\s*\(/, why: "loads a module dynamically, escaping this check" },
  { pattern: /\brequire\s*\(/, why: "loads a module dynamically, escaping this check" },
  { pattern: /\bnode:fs\b/, why: "reads the filesystem" },
];

/**
 * The file's code, without its comments — these files explain in prose which
 * calls they avoid, and a scan that reads the prose would flag the explanation
 * instead of the code. Only whole comment lines and block comments are
 * removed, never part of a line, so nothing executable can hide behind this.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

function sources(): { name: string; source: string }[] {
  return readdirSync(EVALS_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({ name, source: code(readFileSync(join(EVALS_DIR, name), "utf8")) }));
}

function pureSources(): { name: string; source: string }[] {
  return sources().filter((file) => file.name !== IO_FILE);
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:\bfrom|^\s*import)\s+["']([^"']+)["']/gm)].map((match) => match[1]);
}

describe("lib/evals purity", () => {
  // Guard against a vacuous pass: if the module is restructured so this scan
  // finds nothing, every check below would "pass" having read no code.
  it("finds the source files it is meant to police, with their code intact", () => {
    const names = sources().map((file) => file.name);
    expect(names).toEqual(expect.arrayContaining(["derive.ts", "corpus.ts", "drift.ts", "types.ts", "index.ts"]));
    expect(pureSources().length).toBeGreaterThanOrEqual(5);
    // Stripping comments must not have stripped the code with them.
    for (const file of pureSources()) {
      expect(file.source, `${file.name} has no code left to scan`).toMatch(/\bexport\b/);
    }
  });

  it("keeps every file but the history loader free of the clock, I/O and ambient state", () => {
    const offenders = pureSources().flatMap(({ name, source }) =>
      FORBIDDEN.filter(({ pattern }) => pattern.test(source)).map(({ why }) => `${name} ${why}`),
    );
    expect(offenders).toEqual([]);
  });

  it("imports only relative modules, the engine or the data schemas", () => {
    const offenders = pureSources().flatMap(({ name, source }) =>
      importSpecifiers(source)
        .filter((specifier) => !specifier.startsWith("./") && !specifier.startsWith("../"))
        .filter((specifier) => !ALLOWED_PACKAGES.includes(specifier))
        .map((specifier) => `${name} imports "${specifier}"`),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the filesystem out of the public entry point", () => {
    // A client component holding a corpus or a report must not pull node:fs in
    // through the barrel, so history.ts stays behind its own import path.
    const index = sources().find((file) => file.name === "index.ts")!;
    expect(importSpecifiers(index.source)).not.toContain("./history");
  });

  it("takes every input it needs as a required argument", () => {
    // A past incident: an optional parameter with a fail-closed default
    // compiled green in two branches and silently changed every decision after
    // the merge. Arity is pinned so adding one is a deliberate, failing act.
    expect(deriveEvalCases.length).toBe(2);
    expect(buildCorpus.length).toBe(2);
    expect(driftReport.length).toBe(2);
  });
});
