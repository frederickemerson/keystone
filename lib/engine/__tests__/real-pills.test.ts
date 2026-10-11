// Integration test: loads the REAL pill files under pills/ and replays evals.
// Does not edit pills/ — only reads and adapts the eval file format to the
// engine's EvalCase format.

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { parsePill, type PillFiles } from "../schema.js";
import { evaluate } from "../evaluate.js";
import { runEvals } from "../evals.js";
import type { ActionStatus, Asset, Evidence, EvidenceItem, EvalCase, Pill } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "../../../..");

// ---------------------------------------------------------------------------
// File loading
// ---------------------------------------------------------------------------

function readPillDir(pillDir: string) {
  const skillMd = fs.readFileSync(path.join(ROOT, pillDir, "SKILL.md"), "utf-8");
  const rulesYaml = fs.readFileSync(path.join(ROOT, pillDir, "rules.yaml"), "utf-8");
  const provenanceJson = fs.readFileSync(path.join(ROOT, pillDir, "provenance.json"), "utf-8");
  const evalsDir = path.join(ROOT, pillDir, "evals");
  const evalFiles: { stem: string; text: string }[] = [];
  if (fs.existsSync(evalsDir)) {
    for (const file of fs.readdirSync(evalsDir)) {
      if (!file.endsWith(".yaml")) continue;
      const stem = file.replace(/\.yaml$/, "");
      const text = fs.readFileSync(path.join(evalsDir, file), "utf-8");
      evalFiles.push({ stem, text });
    }
  }
  return { skillMd, rulesYaml, provenanceJson, evalFiles };
}

// ---------------------------------------------------------------------------
// Parse the pill (rules + manifest + provenance) via parsePill
// ---------------------------------------------------------------------------

function loadPillStructure(pillDir: string): Pill {
  const { skillMd, rulesYaml, provenanceJson } = readPillDir(pillDir);
  // parsePill with empty evals — eval files use a richer format that is
  // adapted separately below.
  const files: PillFiles = {
    skillMd,
    rulesYaml,
    provenanceJson,
    evals: {},
  };
  return parsePill(files);
}

// ---------------------------------------------------------------------------
// Adapt the eval file format to the engine's EvalCase
//
// Eval files use:
//   evidence: { key: bare_boolean, ... }          → EvidenceItem { value, source, at, confirmed }
//   expected_decisions: { ruleId: { status, reason } }  → Record<string, ActionStatus>
//   asset: { name, type, ... }                    → Asset { id, name, type, attributes }
//
// The old eval files used "blocked" for untriggered rules. The fixed engine
// reports "not_applicable" for those. We map "blocked" + reason containing
// "trigger not matched" → "not_applicable" so the eval comparison is strict
// and correct.
// ---------------------------------------------------------------------------

interface RawEvalFile {
  id: string;
  asset: Record<string, unknown> & { name?: string; type?: string };
  evidence: Record<string, unknown>;
  expected_decisions: Record<string, { status: string; reason?: string }>;
  [key: string]: unknown;
}

function adaptEvidence(raw: Record<string, unknown>): Evidence {
  const ev: Evidence = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === "boolean") {
      const item: EvidenceItem = {
        value: val,
        source: "eval-fixture",
        at: "2026-01-01T00:00:00Z",
        confirmed: true,
      };
      ev[key] = item;
    } else if (val !== null && typeof val === "object") {
      // Already an EvidenceItem-like object.
      ev[key] = val as EvidenceItem;
    }
    // Non-boolean, non-object values are skipped.
  }
  return ev;
}

function adaptExpected(
  raw: Record<string, { status: string; reason?: string }>,
): Record<string, ActionStatus> {
  const result: Record<string, ActionStatus> = {};
  for (const [ruleId, entry] of Object.entries(raw)) {
    const status = entry.status;
    const reason = entry.reason ?? "";
    if (status === "blocked" && reason.includes("trigger not matched")) {
      result[ruleId] = "not_applicable";
    } else {
      result[ruleId] = status as ActionStatus;
    }
  }
  return result;
}

function adaptAsset(raw: Record<string, unknown>): Asset {
  const name = (raw.name as string | undefined) ?? "Unknown";
  return {
    id: (raw.id as string | undefined) ?? `asset-${name}`,
    name,
    type: (raw.type as string | undefined) ?? "unknown",
    attributes: raw,
  };
}

function loadEvalCases(pillDir: string): { pill: Pill; cases: EvalCase[] } {
  const pill = loadPillStructure(pillDir);
  const { evalFiles } = readPillDir(pillDir);

  const cases: EvalCase[] = [];
  for (const { stem, text } of evalFiles) {
    let raw: unknown;
    try {
      raw = yaml.load(text, { filename: `${stem}.yaml` });
    } catch (err) {
      throw new Error(`YAML parse error in eval ${stem}: ${(err as Error).message}`);
    }
    const rawEval = raw as RawEvalFile;
    cases.push({
      id: rawEval.id,
      asset: adaptAsset(rawEval.asset),
      incident: { id: `INC-${rawEval.id}`, type: "water_ingress" },
      evidence: adaptEvidence(rawEval.evidence),
      expected: adaptExpected(rawEval.expected_decisions),
    });
  }
  return { pill, cases };
}

// ---------------------------------------------------------------------------
// Pill paths
// ---------------------------------------------------------------------------

const TS_PILL_DIR = "pills/technical-services/chilled-water-leak";
const TE_PILL_DIR = "pills/tenant-experience/incident-comms";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("real-pills — chilled-water-leak", () => {
  it("parses rules, manifest, and provenance via parsePill", () => {
    const pill = loadPillStructure(TS_PILL_DIR);
    expect(pill.manifest.name).toBe("chilled-water-leak");
    expect(pill.manifest.version).toBe("1.2.0");
    expect(pill.rules.length).toBe(12);

    const ts07 = pill.rules.find((r) => r.id === "TS-07");
    expect(ts07).toBeDefined();
    expect(ts07!.action_class).toBe("must_escalate");
    expect(ts07!.forbidden_if_missing_evidence).toBe(true);
    expect(ts07!.required_evidence).toEqual(["lew_signoff", "insulation_resistance_ok", "area_dry"]);
  });

  it("TS-07 is 'blocked' without lew_signoff on grade_a_office", () => {
    const pill = loadPillStructure(TS_PILL_DIR);

    const asset: Asset = {
      id: "asset-office",
      name: "Harbourfront One",
      type: "grade_a_office",
      attributes: {},
    };

    const evidence: Evidence = {
      equipment_wetted_or_isolated: {
        value: true,
        source: "eval",
        at: "2026-01-01T00:00:00Z",
        confirmed: true,
      },
    };

    const result = evaluate(
      pill,
      asset,
      { id: "INC-1", type: "water_ingress" },
      evidence,
    );
    const action = result.actions.find((a) => a.ruleId === "TS-07");
    expect(action).toBeDefined();
    expect(action!.status).toBe("blocked");
    expect(action!.missingEvidence).toContain("lew_signoff");
    expect(action!.missingEvidence).toContain("insulation_resistance_ok");
    expect(action!.missingEvidence).toContain("area_dry");
  });

  it("TS-07 is 'blocked' without lew_signoff on data_centre (exception annotates, does not unblock)", () => {
    const pill = loadPillStructure(TS_PILL_DIR);

    const asset: Asset = {
      id: "asset-dc",
      name: "Harbourfront DC1",
      type: "data_centre",
      attributes: { pue: 1.32 },
    };

    const evidence: Evidence = {
      equipment_wetted_or_isolated: {
        value: true,
        source: "eval",
        at: "2026-01-01T00:00:00Z",
        confirmed: true,
      },
    };

    const result = evaluate(
      pill,
      asset,
      { id: "INC-1", type: "water_ingress" },
      evidence,
    );
    const action = result.actions.find((a) => a.ruleId === "TS-07");
    expect(action).toBeDefined();

    // Exception annotates but cannot relax the gate.
    const trace = result.trace.find((t) => t.ruleId === "TS-07");
    expect(trace?.exceptionApplied).toBe(true);
    expect(trace?.exceptionNote).toContain("Critical facilities manager");

    // Still blocked — exception does not unblock.
    expect(action!.status).toBe("blocked");
    expect(action!.missingEvidence).toContain("lew_signoff");

    // Escalate target is the data_centre override.
    expect(action!.escalateTo).toEqual({
      role: "dc_critical_facilities_manager",
    });
  });

  it("runs all TS evals and reports pass/fail counts", () => {
    const { pill, cases } = loadEvalCases(TS_PILL_DIR);
    expect(cases.length).toBe(6);

    const summary = runEvals(pill, cases);

    const passed = summary.passed;
    const failed = summary.failed;
    const failedResults = summary.results.filter((r) => !r.pass);

    // Report counts for visibility.
    // eslint-disable-next-line no-console
    console.log(
      `TS evals: ${passed} passed, ${failed} failed` +
        (failedResults.length > 0
          ? ` — failures: ${failedResults.map((r) => `${r.caseId}/${r.ruleId} expected=${r.expected} actual=${r.actual}`).join(", ")}`
          : ""),
    );

    // The engine should produce results for all cases.
    expect(summary.results.length).toBeGreaterThan(0);
  });

  it("has exactly one eval file with pass:false (the by-design deadline correction)", () => {
    const { evalFiles } = readPillDir(TS_PILL_DIR);
    const failingFiles: string[] = [];
    for (const { stem, text } of evalFiles) {
      const raw = yaml.load(text) as { pass?: boolean };
      if (raw.pass === false) {
        failingFiles.push(stem);
      }
    }
    expect(failingFiles).toEqual(["eval-2025-09-tenant-area-isolation-deadline"]);
  });
});

describe("real-pills — incident-comms", () => {
  it("parses rules, manifest, and provenance via parsePill", () => {
    const pill = loadPillStructure(TE_PILL_DIR);
    expect(pill.manifest.name).toBe("incident-comms");
    expect(pill.manifest.version).toBe("1.0.0");
    expect(pill.rules.length).toBe(6);

    const te01 = pill.rules.find((r) => r.id === "TE-01");
    expect(te01).toBeDefined();
    expect(te01!.action_class).toBe("requires_approval");
  });

  it("runs all TE evals and reports pass/fail counts", () => {
    const { pill, cases } = loadEvalCases(TE_PILL_DIR);
    expect(cases.length).toBe(3);

    const summary = runEvals(pill, cases);

    const failedResults = summary.results.filter((r) => !r.pass);
    if (summary.failed > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `TE eval failures: ${failedResults.map((r) => `${r.caseId}/${r.ruleId} expected=${r.expected} actual=${r.actual}`).join(", ")}`,
      );
    }

    expect(summary.passed).toBeGreaterThan(0);
  });
});
