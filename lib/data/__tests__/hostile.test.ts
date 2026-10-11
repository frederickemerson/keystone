// Loader hostility: incident / interview ids arrive from URL params
// (app/incident/[id]). No id may make a loader read outside data/ — ids are
// matched against the directory listing, never joined raw.

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
  return { ...fs, readFileSync: track(fs.readFileSync), readdirSync: track(fs.readdirSync), existsSync: track(fs.existsSync) };
});

const data = await import("../index");

const HOSTILE_IDS = [
  "",
  "..",
  "../assets",
  "../../package",
  "../../../../etc/passwd",
  "/etc/passwd",
  "INC-2026-1011/../../roles",
  "INC-2026-1011\0",
  "\0",
  "..%2Froles",
  "__proto__",
  "constructor",
  "a".repeat(100_000),
];

const loaders: [string, (id: string) => unknown][] = [
  ["loadTimeline", data.loadTimeline],
  ["loadTranscript", data.loadTranscript],
  ["loadTenantMessageFixture", data.loadTenantMessageFixture],
  ["loadIncidentSummaryFixture", data.loadIncidentSummaryFixture],
  ["loadAiProposalFixture", data.loadAiProposalFixture],
  ["loadAsset", data.loadAsset],
  ["loadIncident", data.loadIncident],
];

afterEach(() => {
  touched.length = 0;
});

describe("data loaders with hostile ids", () => {
  for (const [name, load] of loaders) {
    it(`${name} returns undefined and never reads outside data/`, () => {
      for (const id of HOSTILE_IDS) {
        expect(load(id), `${name}(${JSON.stringify(id).slice(0, 40)})`).toBeUndefined();
      }
      expect(touched.length).toBeGreaterThan(0);
      const root = resolve(data.dataDir());
      for (const p of touched) expect(resolve(p).startsWith(root + sep), p).toBe(true);
    });
  }

  it("still loads real records (sanity)", () => {
    expect(data.loadTimeline("INC-2026-1011")).toBeDefined();
    expect(data.loadAiProposalFixture("INC-2026-1011")).toBeDefined();
  });
});
