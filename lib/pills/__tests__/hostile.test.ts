// Loader hostility: ids arrive from URL params (app/canvas/[pillId],
// app/learning/[pillId]). No id may make the loader touch a path outside
// pills/ — ids are resolved against the on-disk listing, never joined raw.

import { resolve, sep } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const touched: string[] = [];
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const track =
    <A extends unknown[], R>(fn: (p: never, ...rest: A) => R) =>
    (p: unknown, ...rest: A): R => {
      touched.push(String(p));
      return fn(p as never, ...rest);
    };
  return {
    ...fs,
    readFileSync: track(fs.readFileSync),
    readdirSync: track(fs.readdirSync),
    existsSync: track(fs.existsSync),
    statSync: track(fs.statSync),
  };
});

const { loadPill, pillsDir } = await import("../load");

const HOSTILE_IDS = [
  "",
  ".",
  "..",
  "../package",
  "../../../../etc/passwd",
  "/etc/passwd",
  "C:\\Windows\\win.ini",
  "technical-services/../../package.json",
  "technical-services-chilled-water-leak/../../../etc/passwd",
  "technical-services-chilled-water-leak\0",
  "\0../etc/passwd",
  "%2e%2e%2fpackage",
  "..%2F..%2Fetc%2Fpasswd",
  "__proto__",
  "constructor",
  "toString",
  "a".repeat(100_000),
  "technical-services-chilled-water-leak".padEnd(5000, "/.."),
];

afterEach(() => {
  touched.length = 0;
});

describe("loadPill with hostile ids", () => {
  it.each(HOSTILE_IDS.map((id) => [JSON.stringify(id).slice(0, 60), id]))("%s → undefined, reads stay in pills/", (_l, id) => {
    expect(loadPill(id)).toBeUndefined();
    expect(touched.length).toBeGreaterThan(0); // the fs spy is live
    const root = resolve(pillsDir());
    for (const p of touched) expect(resolve(p) === root || resolve(p).startsWith(root + sep), p).toBe(true);
  });

  it("still loads a real pill (sanity)", () => {
    expect(loadPill("technical-services-chilled-water-leak")?.pill.rules.length).toBeGreaterThan(0);
  });
});
