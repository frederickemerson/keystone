// Stress / scaling tests: 2,000 rules × 500 evidence keys, 1,000 eval cases.
// Bounds are generous (CI noise) but far below what quadratic behaviour costs;
// measured timings are printed for the report.

import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import {
  counterfactual,
  evaluate,
  parsePill,
  runEvals,
  type Asset,
  type EvalCase,
  type Evidence,
  type Incident,
  type Rule,
} from "../index";
import { makePill } from "./fixtures";

const N_RULES = 2000;
const N_KEYS = 500;
const N_CASES = 1000;

const key = (i: number) => `k${i % N_KEYS}`;

function bigRules(): Rule[] {
  return Array.from({ length: N_RULES }, (_, i) => ({
    id: `R-${i}`,
    title: `rule ${i}`,
    trigger: {
      incident_type: "water_ingress",
      all: [
        { path: `evidence.${key(i)}`, op: "eq" as const, value: true },
        { path: `evidence.${key(i + 1)}`, op: "neq" as const, value: false },
      ],
      any: [
        { path: `evidence.${key(i + 2)}`, op: "eq" as const, value: true },
        { path: "asset.type", op: "in" as const, value: ["office", "data_centre"] },
      ],
    },
    required_evidence: [key(i + 3), key(i + 4), key(i + 5), key(i + 6), key(i + 7)],
    decision: "d",
    allowed_actions: ["a"],
    forbidden_actions: ["f"],
    exceptions: [
      { when: [{ path: "asset.type", op: "eq" as const, value: "data_centre" }], note: "dc", add_required_evidence: [key(i + 8)] },
      { when: [{ path: `evidence.${key(i + 9)}`, op: "eq" as const, value: true }], note: "x", add_required_evidence: [key(i + 10)] },
    ],
    action_class: (["recommend", "requires_approval", "must_escalate"] as const)[i % 3],
    forbidden_if_missing_evidence: i % 2 === 0,
    escalate_to: { role: "lew" },
    owner: "o",
    deadline_minutes: i % 5 === 0 ? 15 : null,
    asset_overrides: { data_centre: { escalate_to: { role: "cfm" } } },
    asset_refs: [],
    sensitivity: "internal" as const,
    provenance: [],
  }));
}

/** Deterministic pseudo-random evidence (LCG) so timings are reproducible. */
function bigEvidence(seed: number): Evidence {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ev: Evidence = {};
  for (let i = 0; i < N_KEYS; i++) ev[`k${i}`] = { value: rnd() < 0.8, confirmed: rnd() < 0.8, source: "s", at: "t" };
  return ev;
}

const asset: Asset = { id: "a", name: "A", type: "data_centre", attributes: {} };
const incident: Incident = { id: "i", type: "water_ingress" };

function time<T>(label: string, fn: () => T): { ms: number; value: T } {
  const t0 = performance.now();
  const value = fn();
  const ms = performance.now() - t0;
  console.log(`[stress] ${label}: ${ms.toFixed(1)} ms`);
  return { ms, value };
}

describe(`stress: ${N_RULES} rules × ${N_KEYS} evidence keys`, () => {
  const rules = bigRules();
  const pill = makePill(rules);

  it("parsePill on the serialised pill (rules + catalog + 50 evals) stays linear", () => {
    const catalog = Object.fromEntries(
      Array.from({ length: N_KEYS }, (_, i) => [`k${i}`, { label: `k${i}`, type: "boolean", confirmable_by: ["t"] }]),
    );
    const evals: Record<string, string> = {};
    for (let c = 0; c < 50; c++) {
      evals[`case-${c}`] = yaml.dump({
        incident_type: "water_ingress",
        asset: { name: "A", type: "data_centre" },
        evidence: Object.fromEntries(Object.entries(bigEvidence(c)).map(([k, v]) => [k, { value: v.value, confirmed: v.confirmed }])),
        expected_decisions: Object.fromEntries(rules.map((r) => [r.id, { status: "blocked" }])),
      });
    }
    const files = {
      skillMd: "---\nname: p\ndescription: d\nversion: 1.0.0\nowner: o\nsteward: s\napprover: a\nstatus: approved\nscope: {}\naccess: {}\n---\n",
      rulesYaml: yaml.dump(rules),
      provenanceJson: JSON.stringify({ pill: "p", version: "1", source_interview: "x", expert: { name: "n", role: "r" }, rules: {} }),
      evidenceYaml: yaml.dump(catalog),
      evals,
    };
    const { ms, value } = time("parsePill (2000 rules, 500-key catalog, 50 evals × 2000 expectations)", () => parsePill(files));
    expect(value.rules).toHaveLength(N_RULES);
    expect(ms).toBeLessThan(15_000);
  });

  it("evaluate() is linear in rules", () => {
    const ev = bigEvidence(1);
    evaluate(pill, asset, incident, ev); // warm-up
    const { ms, value } = time("evaluate × 1", () => evaluate(pill, asset, incident, ev));
    expect(value.trace).toHaveLength(N_RULES);
    const half = time("evaluate × 1 (1000 rules)", () => evaluate(makePill(rules.slice(0, 1000)), asset, incident, ev));
    expect(ms).toBeLessThan(500);
    // Doubling the rules should not quadruple the time (allow noise).
    expect(ms).toBeLessThan(Math.max(20, half.ms * 3.5));
  });

  it("counterfactual() re-evaluates one rule, not the whole pill per hypothesis", () => {
    const ev = bigEvidence(2);
    const { ms } = time("counterfactual × 200 rules", () => {
      for (const r of rules.slice(0, 200)) counterfactual(pill, asset, incident, ev, r.id);
    });
    expect(ms).toBeLessThan(2_000);
  });

  it(`runEvals over ${N_CASES} cases × ${N_RULES} expectations`, () => {
    const cases: EvalCase[] = Array.from({ length: N_CASES }, (_, c) => ({
      id: `case-${c}`,
      asset,
      incident,
      evidence: bigEvidence(c + 100),
      expected: Object.fromEntries(rules.map((r) => [r.id, { status: "blocked" as const, deadline_minutes: null }])),
    }));
    const { ms, value } = time(`runEvals (${N_CASES} × ${N_RULES} × 2 fields)`, () => runEvals(pill, cases));
    expect(value.passed + value.failed).toBe(N_CASES * N_RULES * 2);
    expect(ms).toBeLessThan(30_000);
  }, 120_000);
});
