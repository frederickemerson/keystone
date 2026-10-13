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

/** Samples taken of each size, and calls batched into one sample. */
const SAMPLES = 5;
const BATCH = 20;

/**
 * Cost of one call, as the fastest of `SAMPLES` batches of `BATCH` calls.
 *
 * Two deliberate choices, both learned from this test flaking in CI:
 *  - BATCHING. A single 500-rule evaluation runs in about 1.7 ms, which
 *    performance.now() cannot resolve precisely on a busy machine; the ratio
 *    below swung between 4.1x and 6.1x across runs of identical code. Timing
 *    20 calls at once puts every sample in the tens of milliseconds, where the
 *    measurement is stable.
 *  - MINIMUM, not mean. Scheduler noise only ever ADDS time, so the fastest
 *    sample is the best estimate of real cost. A single sample on a loaded
 *    machine can be several times the true figure.
 */
function perCall<T>(label: string, fn: () => T): { ms: number; value: T } {
  let best = Infinity;
  let value!: T;
  for (let s = 0; s < SAMPLES; s++) {
    const t0 = performance.now();
    for (let i = 0; i < BATCH; i++) value = fn();
    best = Math.min(best, (performance.now() - t0) / BATCH);
  }
  console.log(`[stress] ${label}: ${best.toFixed(2)} ms/call (best of ${SAMPLES} × ${BATCH})`);
  return { ms: best, value };
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
    // Both pills are built OUTSIDE the timed region. The earlier version built
    // the 1,000-rule pill inside it, so that sample timed construction AND
    // evaluation while the 2,000-rule sample timed evaluation alone — an
    // inflated denominator that could have hidden quadratic evaluation.
    const quarterPill = makePill(rules.slice(0, N_RULES / 8));
    evaluate(pill, asset, incident, ev); // warm up both paths
    evaluate(quarterPill, asset, incident, ev);

    const full = perCall("evaluate × 2000 rules", () => evaluate(pill, asset, incident, ev));
    const half = perCall("evaluate × 250 rules", () => evaluate(quarterPill, asset, incident, ev));
    console.log(`[stress] ratio 2000/250 = ${(full.ms / half.ms).toFixed(2)}x (linear ~8, quadratic ~64)`);

    expect(full.value.trace).toHaveLength(N_RULES);
    expect(half.value.trace).toHaveLength(N_RULES / 8);
    expect(full.ms).toBeLessThan(500);

    // The small sample must be big enough to measure, or the ratio below is
    // noise. Failing loudly beats skipping: on hardware fast enough to make
    // 250 rules unmeasurable even batched, raise N_RULES rather than ignore it.
    expect(half.ms, "250 rules is too fast to time; raise N_RULES").toBeGreaterThan(0.05);

    // 8x the rules is 8x the work when evaluation is linear, and about 64x
    // when it is quadratic. Measured on this pill, over repeated runs:
    //   as written                                    8.09x, 8.89x, 9.31x
    //   with `pill.rules.findIndex(...)` per rule    15.37x, 17.76x
    // so 12 separates them with room on both sides.
    //
    // The 8x spread is deliberate. An earlier 2,000-vs-1,000 version of this
    // check could not tell the two apart at all: the same injected regression
    // measured 2.19x against a 3.5x bound and passed. The wider the spread,
    // the more the quadratic term dominates and the clearer the signal.
    expect(full.ms).toBeLessThan(half.ms * 12);
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
