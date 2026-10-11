import { describe, expect, it } from "vitest";
import { listPillRefs, loadAllPills, loadPill } from "../load";

describe("pill loader", () => {
  it("discovers both pill folders with <domain>-<name> ids", () => {
    expect(listPillRefs().map((r) => r.id)).toEqual([
      "technical-services-chilled-water-leak",
      "tenant-experience-incident-comms",
    ]);
  });

  it("loadAllPills parses both real pills via the engine", () => {
    const bundles = loadAllPills();
    expect(bundles).toHaveLength(2);
    const ts = bundles.find((b) => b.id === "technical-services-chilled-water-leak");
    const te = bundles.find((b) => b.id === "tenant-experience-incident-comms");
    expect(ts?.pill.manifest.version).toBe("1.2.0");
    expect(ts?.pill.rules.map((r) => r.id)).toContain("TS-07");
    expect(Object.keys(ts?.pill.evals ?? {})).toHaveLength(6);
    expect(ts?.changelog).toMatch(/1\.2\.0/);
    expect(ts?.skillBody.startsWith("---")).toBe(false);
    expect(te?.pill.rules.every((r) => r.id.startsWith("TE-"))).toBe(true);
    expect(Object.keys(te?.pill.evals ?? {})).toHaveLength(3);
  });

  it("reads evidence.yaml into evidenceCatalog, declaring every required_evidence key", () => {
    for (const b of loadAllPills()) {
      const catalog = b.pill.evidenceCatalog;
      expect(Object.keys(catalog).length).toBeGreaterThan(0);
      for (const r of b.pill.rules) {
        for (const key of r.required_evidence) {
          expect(catalog[key], `${b.id} ${r.id} required_evidence ${key}`).toBeDefined();
        }
      }
    }
  });

  it("bundles are plain JSON (serialisable to client components)", () => {
    for (const b of loadAllPills()) {
      expect(JSON.parse(JSON.stringify(b))).toEqual(b);
    }
  });

  it("loadPill returns one bundle by id, undefined for unknown ids", () => {
    expect(loadPill("tenant-experience-incident-comms")?.domain).toBe("tenant-experience");
    expect(loadPill("nope")).toBeUndefined();
  });
});
