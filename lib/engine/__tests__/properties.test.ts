// Property-based tests (fast-check) for the engine's safety invariants.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  counterfactual,
  evaluate,
  evaluateCondition,
  ruleSchema,
  type ActionStatus,
  type Asset,
  type Condition,
  type Evidence,
  type EvidenceItem,
  type Incident,
  type Rule,
  type RuleException,
} from "../index";
import { isEvidenceSatisfied } from "../evaluate";
import { makePill } from "./fixtures";

const RUNS = { numRuns: 400 };

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const KEYS = ["k0", "k1", "k2", "k3", "k4", "k5"];
const ASSET_TYPES = ["office", "data_centre", "retail"];
const INCIDENT_TYPES = ["water_ingress", "fire_alarm"];

const keyArb = fc.constantFrom(...KEYS);
const keysArb = fc.uniqueArray(keyArb, { maxLength: 4 });
const scalarArb = fc.oneof(fc.boolean(), fc.integer({ min: -3, max: 3 }), fc.constantFrom("a", "b", "true"), fc.constant(null));

/** Any value at all, including the awkward ones. */
const valueArb = fc.oneof(scalarArb, fc.constant(undefined), fc.double(), fc.anything());

const itemArb: fc.Arbitrary<EvidenceItem> = fc.record({
  value: valueArb,
  source: fc.constant("s"),
  at: fc.constant("t"),
  // `confirmed` is typed boolean, but callers hand us JSON: try anything.
  confirmed: fc.oneof(fc.boolean(), fc.constantFrom("true", "false", 1, 0, null)) as fc.Arbitrary<boolean>,
});

const evidenceArb: fc.Arbitrary<Evidence> = fc.dictionary(keyArb, itemArb, { maxKeys: KEYS.length });

const pathArb = fc.oneof(
  keyArb.map((k) => `evidence.${k}`),
  fc.constantFrom("asset.type", "asset.attributes.floors", "incident.type", "incident.floor"),
);

const conditionArb: fc.Arbitrary<Condition> = fc.oneof(
  fc.record({ path: pathArb, op: fc.constantFrom("eq" as const, "neq" as const), value: scalarArb }),
  fc.record({ path: pathArb, op: fc.constantFrom("gt" as const, "gte" as const, "lt" as const, "lte" as const), value: fc.integer({ min: -3, max: 3 }) }),
  fc.record({ path: pathArb, op: fc.constant("in" as const), value: fc.array(scalarArb, { minLength: 1, maxLength: 3 }) }),
  fc.record({ path: pathArb, op: fc.constant("exists" as const) }),
);

const exceptionArb: fc.Arbitrary<RuleException> = fc.record(
  {
    when: fc.array(conditionArb, { maxLength: 2 }),
    note: fc.constant("n"),
    add_required_evidence: keysArb,
    escalate_to: fc.record({ role: fc.constantFrom("cfm", "fsm") }),
  },
  { requiredKeys: ["when", "note"] },
);

const actionClassArb = fc.constantFrom("recommend" as const, "requires_approval" as const, "must_escalate" as const);

const overrideArb = fc.record(
  {
    action_class: actionClassArb,
    forbidden_if_missing_evidence: fc.boolean(),
    escalate_to: fc.record({ role: fc.constantFrom("cfm") }),
    deadline_minutes: fc.option(fc.integer({ min: 0, max: 60 }), { nil: null }),
    forbidden_actions: fc.subarray(["f1", "f2", "f3"]),
  },
  { requiredKeys: [] },
);

const ruleArb: fc.Arbitrary<Rule> = fc.record({
  id: fc.constant("R"),
  title: fc.constant("t"),
  trigger: fc.record({
    incident_type: fc.constantFrom(...INCIDENT_TYPES),
    all: fc.array(conditionArb, { maxLength: 3 }),
    any: fc.array(conditionArb, { maxLength: 3 }),
  }),
  required_evidence: keysArb,
  decision: fc.constant("d"),
  allowed_actions: fc.constant(["a1"]),
  forbidden_actions: fc.subarray(["f1", "f2"]),
  exceptions: fc.array(exceptionArb, { maxLength: 3 }),
  action_class: actionClassArb,
  forbidden_if_missing_evidence: fc.boolean(),
  escalate_to: fc.constant({ role: "lew" }),
  owner: fc.constant("o"),
  deadline_minutes: fc.constant(null),
  asset_overrides: fc.dictionary(fc.constantFrom(...ASSET_TYPES), overrideArb, { maxKeys: 2 }),
  asset_refs: fc.constant([]),
  sensitivity: fc.constant("internal" as const),
  provenance: fc.constant([]),
});

/** Rules as parsePill would admit them (schema-valid, incl. tighten-only overrides). */
const validRuleArb = ruleArb.filter((r) => ruleSchema.safeParse(r).success);

const assetArb: fc.Arbitrary<Asset> = fc.record({
  id: fc.constant("a"),
  name: fc.constant("A"),
  type: fc.constantFrom(...ASSET_TYPES),
  attributes: fc.record({ floors: fc.integer({ min: -3, max: 3 }) }, { requiredKeys: [] }),
});

const incidentArb: fc.Arbitrary<Incident> = fc.record({
  id: fc.constant("i"),
  type: fc.constantFrom(...INCIDENT_TYPES),
  floor: fc.oneof(fc.integer({ min: -3, max: 3 }), fc.constant("L1")),
});

const caseArb = fc.record({ rule: validRuleArb, asset: assetArb, incident: incidentArb, evidence: evidenceArb });

const one = (rule: Rule, asset: Asset, incident: Incident, evidence: Evidence) =>
  evaluate(makePill([rule]), asset, incident, evidence).trace[0];

/** Strictness order: how much a status restrains the action. */
const RESTRAINT: Record<Exclude<ActionStatus, "not_applicable">, number> = {
  allowed: 0,
  needs_approval: 1,
  escalate: 2,
  blocked: 3,
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("engine properties", () => {
  it("required evidence is satisfied iff confirmed === true && value === true (any value/type)", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (value, confirmed) => {
        const item = { value, confirmed, source: "s", at: "t" } as EvidenceItem;
        const want = confirmed === true && value === true;
        expect(isEvidenceSatisfied(item)).toBe(want);
        // …and the engine agrees: a triggered, gated rule is blocked unless satisfied.
        const rule = { ...makePill().rules[0], trigger: { incident_type: "x", all: [], any: [] }, required_evidence: ["k"], exceptions: [] };
        const t = one(rule, { id: "a", name: "A", type: "office", attributes: {} }, { id: "i", type: "x" }, { k: item });
        expect(t.status === "blocked").toBe(!want);
      }),
      RUNS,
    );
  });

  it("exceptions never unblock: they only add missing evidence and never lower restraint", () => {
    fc.assert(
      fc.property(caseArb, ({ rule, asset, incident, evidence }) => {
        const withEx = one(rule, asset, incident, evidence);
        const without = one({ ...rule, exceptions: [] }, asset, incident, evidence);
        expect(withEx.triggered).toBe(without.triggered);
        for (const key of without.missingEvidence) expect(withEx.missingEvidence).toContain(key);
        if (without.status === "blocked") expect(withEx.status).toBe("blocked");
        if (withEx.status !== "not_applicable" && without.status !== "not_applicable") {
          expect(RESTRAINT[withEx.status]).toBeGreaterThanOrEqual(RESTRAINT[without.status]);
        }
      }),
      RUNS,
    );
  });

  it("effective forbidden_if_missing_evidence + triggered + missing evidence ⇒ blocked", () => {
    fc.assert(
      fc.property(caseArb, ({ rule, asset, incident, evidence }) => {
        const t = one(rule, asset, incident, evidence);
        const ov = Object.hasOwn(rule.asset_overrides, asset.type) ? rule.asset_overrides[asset.type] : undefined;
        const forbidden = ov?.forbidden_if_missing_evidence ?? rule.forbidden_if_missing_evidence;
        if (t.triggered && forbidden && t.missingEvidence.length > 0) expect(t.status).toBe("blocked");
        if (t.status === "blocked") expect(t.missingEvidence.length).toBeGreaterThan(0);
      }),
      RUNS,
    );
  });

  it("not_applicable iff the trigger is unmatched (checked against an independent oracle)", () => {
    fc.assert(
      fc.property(caseArb, ({ rule, asset, incident, evidence }) => {
        const ctx = { asset, incident, evidence };
        const matches = (c: Condition) => evaluateCondition(c, ctx).matched;
        const oracle =
          incident.type === rule.trigger.incident_type &&
          rule.trigger.all.every(matches) &&
          (rule.trigger.any.length === 0 || rule.trigger.any.some(matches));
        const r = evaluate(makePill([rule]), asset, incident, evidence);
        expect(r.trace[0].triggered).toBe(oracle);
        expect(r.trace[0].status === "not_applicable").toBe(!oracle);
        expect(r.actions.length).toBe(oracle ? 1 : 0);
      }),
      RUNS,
    );
  });

  it("is deterministic and pure: frozen inputs, deep-equal outputs, no mutation", () => {
    fc.assert(
      fc.property(fc.array(validRuleArb, { maxLength: 4 }), assetArb, incidentArb, evidenceArb, (rules, asset, incident, evidence) => {
        const pill = makePill(rules.map((r, i) => ({ ...r, id: `R-${i}` })));
        const snapshot = structuredClone({ pill, asset, incident, evidence });
        deepFreeze(pill);
        deepFreeze(asset);
        deepFreeze(incident);
        deepFreeze(evidence);
        const a = evaluate(pill, asset, incident, evidence); // throws if it writes to a frozen input
        const b = evaluate(pill, asset, incident, evidence);
        expect(b).toEqual(a);
        for (const rule of pill.rules) {
          expect(counterfactual(pill, asset, incident, evidence, rule.id)).toEqual(counterfactual(pill, asset, incident, evidence, rule.id));
        }
        expect({ pill, asset, incident, evidence }).toEqual(snapshot);
      }),
      { numRuns: 200 },
    );
  });

  it("asset overrides admitted by the schema never lower restraint (and never un-forbid)", () => {
    fc.assert(
      fc.property(caseArb, ({ rule, asset, incident, evidence }) => {
        const withOv = one(rule, asset, incident, evidence);
        const base = one({ ...rule, asset_overrides: {} }, asset, incident, evidence);
        if (withOv.status !== "not_applicable" && base.status !== "not_applicable") {
          expect(RESTRAINT[withOv.status]).toBeGreaterThanOrEqual(RESTRAINT[base.status]);
        }
        if (rule.action_class === "must_escalate" && base.status !== "not_applicable") {
          expect(["escalate", "blocked"]).toContain(withOv.status);
        }
        const action = evaluate(makePill([rule]), asset, incident, evidence).actions[0];
        if (action) for (const f of rule.forbidden_actions) expect(action.forbiddenActions).toContain(f);
      }),
      RUNS,
    );
  });

  it("the schema rejects every override that would relax a gate", () => {
    fc.assert(
      fc.property(ruleArb, (rule) => {
        const relaxes = Object.values(rule.asset_overrides).some(
          (ov) =>
            (ov.action_class !== undefined &&
              ["recommend", "requires_approval", "must_escalate"].indexOf(ov.action_class) <
                ["recommend", "requires_approval", "must_escalate"].indexOf(rule.action_class)) ||
            (rule.forbidden_if_missing_evidence && ov.forbidden_if_missing_evidence === false) ||
            (ov.forbidden_actions !== undefined && rule.forbidden_actions.some((f) => !ov.forbidden_actions!.includes(f))),
        );
        if (relaxes) expect(ruleSchema.safeParse(rule).success).toBe(false);
      }),
      RUNS,
    );
  });

  it("counterfactual is sound: satisfying exactly ifEvidence yields flipsTo", () => {
    fc.assert(
      fc.property(caseArb, ({ rule, asset, incident, evidence }) => {
        const pill = makePill([rule]);
        const cf = counterfactual(pill, asset, incident, evidence, rule.id);
        expect(cf.currentStatus).toBe(one(rule, asset, incident, evidence).status);
        if (cf.ifEvidence.length === 0) {
          expect(cf.flipsTo).toBe(cf.currentStatus);
          return;
        }
        expect(cf.flipsTo).not.toBe(cf.currentStatus);
        const applied: Evidence = { ...evidence };
        for (const k of cf.ifEvidence) applied[k] = { value: true, confirmed: true, source: "x", at: "x" };
        expect(one(rule, asset, incident, applied).status).toBe(cf.flipsTo);
      }),
      RUNS,
    );
  });

  it("counterfactual finds a flip whenever confirming all gating evidence would change a blocked status", () => {
    fc.assert(
      fc.property(caseArb, ({ rule, asset, incident, evidence }) => {
        const t = one(rule, asset, incident, evidence);
        if (t.status !== "blocked") return;
        const cf = counterfactual(makePill([rule]), asset, incident, evidence, rule.id);
        // A blocked rule is blocked only by missing evidence, so some flip must exist.
        expect(cf.ifEvidence.length).toBeGreaterThan(0);
        expect(cf.flipsTo).not.toBe("blocked");
      }),
      RUNS,
    );
  });
});
