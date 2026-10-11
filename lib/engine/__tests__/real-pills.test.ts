// Integration test: loads the REAL pill files under pills/ and replays evals.
// parsePill is the single source of truth for the on-disk format — there are no
// adapters here; the engine reads SKILL.md, rules.yaml, provenance.json, the
// optional evidence.yaml, and evals/*.yaml exactly as authored.

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { parsePill, type PillFiles } from "../schema";
import { evaluate } from "../evaluate";
import { compareVersions, runEvals } from "../evals";
import type { Asset, Evidence, EvidenceItem, Pill } from "../types";

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// File loading
// ---------------------------------------------------------------------------

function readPillDir(pillDir: string) {
  const dir = path.join(ROOT, pillDir);
  const skillMd = fs.readFileSync(path.join(dir, "SKILL.md"), "utf-8");
  const rulesYaml = fs.readFileSync(path.join(dir, "rules.yaml"), "utf-8");
  const provenanceJson = fs.readFileSync(path.join(dir, "provenance.json"), "utf-8");

  const evidencePath = path.join(dir, "evidence.yaml");
  const evidenceYaml = fs.existsSync(evidencePath)
    ? fs.readFileSync(evidencePath, "utf-8")
    : undefined;

  const evals: Record<string, string> = {};
  const evalsDir = path.join(dir, "evals");
  if (fs.existsSync(evalsDir)) {
    for (const file of fs.readdirSync(evalsDir)) {
      if (!/\.ya?ml$/.test(file)) continue;
      evals[file.replace(/\.ya?ml$/, "")] = fs.readFileSync(path.join(evalsDir, file), "utf-8");
    }
  }

  return { skillMd, rulesYaml, provenanceJson, evidenceYaml, evals };
}

/** Parse a real pill folder straight through the engine (no adapters). */
function loadPill(pillDir: string): Pill {
  const files = readPillDir(pillDir);
  const pillFiles: PillFiles = {
    skillMd: files.skillMd,
    rulesYaml: files.rulesYaml,
    provenanceJson: files.provenanceJson,
    evidenceYaml: files.evidenceYaml,
    evals: files.evals,
  };
  return parsePill(pillFiles);
}

// ---------------------------------------------------------------------------
// Pill paths
// ---------------------------------------------------------------------------

const TS_PILL_DIR = "pills/technical-services/chilled-water-leak";
const TE_PILL_DIR = "pills/tenant-experience/incident-comms";

const OFFICE: Asset = {
  id: "asset-office",
  name: "Harbourfront One",
  type: "grade_a_office",
  attributes: {},
};

const DATA_CENTRE: Asset = {
  id: "asset-dc",
  name: "Harbourfront DC1",
  type: "data_centre",
  attributes: { pue: 1.32 },
};

function evidenceWith(lew: EvidenceItem | undefined): Evidence {
  const evidence: Evidence = {
    equipment_wetted_or_isolated: {
      value: true,
      source: "eval",
      at: "2026-01-01T00:00:00Z",
      confirmed: true,
    },
  };
  if (lew) evidence.lew_signoff = lew;
  return evidence;
}

// ---------------------------------------------------------------------------
// Tests — parsing the real authored pills
// ---------------------------------------------------------------------------

describe("real-pills — parse both authored pills", () => {
  it("parses chilled-water-leak (manifest, rules, provenance, evals)", () => {
    const pill = loadPill(TS_PILL_DIR);
    expect(pill.manifest.name).toBe("chilled-water-leak");
    expect(pill.manifest.version).toBe("1.2.0");
    expect(pill.manifest.status).toBe("approved");
    expect(pill.rules.length).toBe(12);
    expect(Object.keys(pill.provenance)).toContain("TS-07");

    const ts07 = pill.rules.find((r) => r.id === "TS-07");
    expect(ts07).toBeDefined();
    expect(ts07!.action_class).toBe("must_escalate");
    expect(ts07!.forbidden_if_missing_evidence).toBe(true);
    expect(ts07!.required_evidence).toEqual([
      "lew_signoff",
      "insulation_resistance_ok",
      "area_dry",
    ]);
  });

  it("parses incident-comms (manifest, rules, provenance, evals)", () => {
    const pill = loadPill(TE_PILL_DIR);
    expect(pill.manifest.name).toBe("incident-comms");
    expect(pill.manifest.version).toBe("1.0.0");
    expect(pill.rules.length).toBe(6);

    const te01 = pill.rules.find((r) => r.id === "TE-01");
    expect(te01).toBeDefined();
    expect(te01!.action_class).toBe("requires_approval");
  });
});

// ---------------------------------------------------------------------------
// Tests — the TS-07 LEW gate can never be satisfied by absence or a false value
// ---------------------------------------------------------------------------

describe("real-pills — TS-07 is 'blocked' without a satisfied LEW sign-off", () => {
  const pill = loadPill(TS_PILL_DIR);

  for (const asset of [OFFICE, DATA_CENTRE]) {
    it(`blocks when lew_signoff is absent on ${asset.type}`, () => {
      const result = evaluate(
        pill,
        asset,
        { id: "INC-1", type: "water_ingress" },
        evidenceWith(undefined),
      );
      const action = result.actions.find((a) => a.ruleId === "TS-07");
      expect(action).toBeDefined();
      expect(action!.status).toBe("blocked");
      expect(action!.missingEvidence).toContain("lew_signoff");
    });

    it(`blocks when lew_signoff is { value: false, confirmed: true } on ${asset.type}`, () => {
      const result = evaluate(
        pill,
        asset,
        { id: "INC-1", type: "water_ingress" },
        evidenceWith({ value: false, source: "eval", at: "2026-01-01", confirmed: true }),
      );
      const action = result.actions.find((a) => a.ruleId === "TS-07");
      expect(action).toBeDefined();
      expect(action!.status).toBe("blocked");
      expect(action!.missingEvidence).toContain("lew_signoff");
    });
  }

  it("applies the data_centre exception note and escalate override but stays blocked", () => {
    const result = evaluate(
      pill,
      DATA_CENTRE,
      { id: "INC-1", type: "water_ingress" },
      evidenceWith(undefined),
    );
    const trace = result.trace.find((t) => t.ruleId === "TS-07");
    expect(trace?.exceptionApplied).toBe(true);
    expect(trace?.exceptionNote).toContain("Critical facilities manager");

    const action = result.actions.find((a) => a.ruleId === "TS-07");
    expect(action!.status).toBe("blocked");
    expect(action!.escalateTo).toEqual({ role: "dc_critical_facilities_manager" });
  });
});

// ---------------------------------------------------------------------------
// Tests — eval replay (field-level: status + any authored deadline_minutes)
// ---------------------------------------------------------------------------

describe("real-pills — eval replay", () => {
  it("v1.2.0 TS evals have exactly one failure: the intentional TS-02 deadline case", () => {
    const pill = loadPill(TS_PILL_DIR);
    const summary = runEvals(pill, Object.values(pill.evals));

    const failures = summary.results.filter((r) => !r.pass);
    expect(failures).toEqual([
      {
        caseId: "eval-2025-09-tenant-area-isolation-deadline",
        ruleId: "TS-02",
        field: "deadline_minutes",
        expected: 10,
        actual: 15,
        pass: false,
      },
    ]);
    expect(summary.failed).toBe(1);
    // Every status assertion in every case passes on v1.2.0.
    expect(summary.results.filter((r) => r.field === "status").every((r) => r.pass)).toBe(true);
  });

  it("correcting TS-02 deadline_minutes 15 → 10 passes every eval with 0 regressions", () => {
    const base = loadPill(TS_PILL_DIR);
    const corrected: Pill = {
      ...base,
      rules: base.rules.map((r) => (r.id === "TS-02" ? { ...r, deadline_minutes: 10 } : r)),
    };
    const cases = Object.values(base.evals);
    const cmp = compareVersions(base, corrected, cases);

    expect(cmp.newSummary.failed).toBe(0);
    expect(cmp.regressions).toEqual([]);
    expect(cmp.improvements).toEqual([
      {
        caseId: "eval-2025-09-tenant-area-isolation-deadline",
        ruleId: "TS-02",
        field: "deadline_minutes",
        expected: 10,
        oldActual: 15,
        newActual: 10,
      },
    ]);
  });

  it("TE evals all pass", () => {
    const pill = loadPill(TE_PILL_DIR);
    const summary = runEvals(pill, Object.values(pill.evals));
    expect(summary.results.length).toBeGreaterThan(0);
    expect(summary.results.filter((r) => !r.pass)).toEqual([]);
  });
});
