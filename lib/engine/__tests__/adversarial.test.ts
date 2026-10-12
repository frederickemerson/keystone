// Adversarial regression tests: each block pins a defect found by hostile
// probing (type coercion, prototype paths, unsafe YAML, lax schemas,
// exception/counterfactual semantics, forged eval evidence).

import { describe, expect, it } from "vitest";
import {
  counterfactual,
  evaluate,
  evaluateOp,
  parsePill,
  resolvePath,
  type Asset,
  type Evidence,
  type Incident,
  type PillFiles,
  type Rule,
} from "../index";
import { isEvidenceSatisfied } from "../evaluate";
import { MAX_SOURCE_CHARS } from "../schema";
import { makePill, makeRule } from "./fixtures";

const office: Asset = { id: "a", name: "A", type: "grade_a_office", attributes: { floors: 30 } };
const incident: Incident = { id: "i", type: "water_ingress" };
const yes = (): Evidence[string] => ({ value: true, source: "s", at: "t", confirmed: true });

// ---------------------------------------------------------------------------
// Minimal valid pill files; each test mutates one thing.
// ---------------------------------------------------------------------------

const SKILL = `---
name: p
description: d
version: 1.0.0
owner: o
steward: s
approver: a
status: approved
scope: { incident_types: [water_ingress] }
access: { sensitivity_default: internal }
---
body
`;

function ruleYaml(id = "R-1", extra = ""): string {
  return `- id: ${id}
  title: t
  trigger: { incident_type: water_ingress, all: [{ path: evidence.wet, op: eq, value: true }], any: [] }
  required_evidence: [signoff]
  decision: d
  allowed_actions: [keep isolated]
  forbidden_actions: [re-energise]
  exceptions: []
  action_class: must_escalate
  forbidden_if_missing_evidence: true
  escalate_to: { role: lew }
  owner: o
  deadline_minutes: null
  asset_overrides: {}
  asset_refs: []
  sensitivity: internal
  provenance: []
${extra}`;
}

const PROVENANCE = JSON.stringify({
  pill: "p",
  version: "1.0.0",
  source_interview: "x",
  expert: { name: "n", role: "r" },
  rules: {},
});

const CATALOG = `wet: { label: Wet, type: boolean, confirmable_by: [technician] }
signoff: { label: Sign-off, type: boolean, confirmable_by: [lew] }
category: { label: Category, type: string, confirmable_by: [technician] }
`;

function evalYaml(evidence = "  wet: true", expected = "  R-1: { status: blocked }", extra = ""): string {
  return `incident_type: water_ingress
asset: { name: A, type: grade_a_office }
evidence:
${evidence}
expected_decisions:
${expected}
${extra}`;
}

function files(over: Partial<PillFiles> = {}): PillFiles {
  return { skillMd: SKILL, rulesYaml: ruleYaml(), provenanceJson: PROVENANCE, evidenceYaml: CATALOG, evals: {}, ...over };
}

describe("baseline fixture parses", () => {
  it("is valid", () => {
    const pill = parsePill(files({ evals: { c: evalYaml() } }));
    expect(pill.rules[0].id).toBe("R-1");
    expect(pill.evals.c.evidence.wet.confirmed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D1 — comparison operators coerced types
// ---------------------------------------------------------------------------

describe("evaluateOp is strictly typed (no coercion)", () => {
  const cases: [Parameters<typeof evaluateOp>[0], unknown, unknown, boolean][] = [
    ["gt", undefined, 5, false],
    ["lt", undefined, 5, false], // a missing reading never satisfies a threshold
    ["lte", null, 0, false], // null used to coerce to 0
    ["gte", true, 1, false], // true used to coerce to 1
    ["gt", "10", 9, false], // numeric string used to coerce
    ["gt", "abc", "abb", false], // string ordering used as fallback
    ["lt", 1, "2", false],
    ["gt", Number.NaN, 0, false],
    ["lt", -Infinity, 0, false],
    ["gt", 10, 9, true],
    ["lte", 9, 9, true],
    ["eq", "true", true, false],
    ["eq", 1, true, false],
    ["neq", undefined, true, true],
    ["in", "a", "abc", false], // non-array operand matches nothing
    ["in", "a", ["a", "b"], true],
    ["exists", null, undefined, true],
    ["exists", undefined, undefined, false],
  ];
  it.each(cases)("%s(%o, %o) === %s", (op, a, b, want) => {
    expect(evaluateOp(op, a, b)).toBe(want);
  });

  it("a rule gated on `lt` does not fire when the reading is missing", () => {
    const rule = makeRule({
      trigger: { incident_type: "water_ingress", all: [{ path: "evidence.ir_megohm", op: "lt", value: 1 }], any: [] },
    });
    const r = evaluate(makePill([rule]), office, incident, {});
    expect(r.trace[0].triggered).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D2 — prototype members resolved as data
// ---------------------------------------------------------------------------

describe("paths only resolve own properties", () => {
  const ctx = { evidence: {}, asset: office, incident };
  it.each([
    "incident.constructor",
    "incident.constructor.name",
    "incident.__proto__",
    "incident.hasOwnProperty",
    "asset.toString",
    "asset.constructor",
    "asset.attributes.constructor",
    "asset.id.length",
    "evidence.__proto__",
    "evidence.constructor",
    "evidence.toString",
  ])("%s → undefined", (path) => {
    expect(resolvePath(path, ctx)).toBeUndefined();
  });

  it("an `exists` trigger on a prototype member never fires", () => {
    const rule = makeRule({
      trigger: { incident_type: "water_ingress", all: [{ path: "incident.constructor", op: "exists" }], any: [] },
    });
    expect(evaluate(makePill([rule]), office, incident, {}).actions).toEqual([]);
  });

  it("an asset type named like a prototype member picks up no override", () => {
    for (const type of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      const r = evaluate(makePill(), { ...office, type }, incident, { water_near_electrical: yes() });
      expect(r.actions[0].status).toBe("blocked");
      expect(r.actions[0].escalateTo).toEqual({ role: "duty_lew", fallback: "head_technical_services" });
    }
  });

  it("required evidence named like a prototype member is missing, not satisfied", () => {
    const rule = makeRule({ required_evidence: ["constructor", "__proto__", "toString"] });
    const r = evaluate(makePill([rule]), office, incident, { water_near_electrical: yes() });
    expect(r.actions[0].missingEvidence).toEqual(["constructor", "__proto__", "toString"]);
  });

  it("isEvidenceSatisfied is total over non-object items", () => {
    for (const item of [null, 0, "true", true, [], undefined]) {
      expect(isEvidenceSatisfied(item as never)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// D3 — unsafe YAML
// ---------------------------------------------------------------------------

describe("YAML loading is safe", () => {
  it("rejects __proto__ / constructor / prototype keys at any depth (incl. asset_overrides)", () => {
    const evil = ruleYaml("R-1").replace(
      "asset_overrides: {}",
      "asset_overrides:\n    __proto__: { forbidden_if_missing_evidence: false, action_class: recommend }",
    );
    expect(() => parsePill(files({ rulesYaml: evil }))).toThrow(/forbidden key "__proto__"/);
    expect(() => parsePill(files({ evidenceYaml: CATALOG + "constructor: { label: x, type: boolean, confirmable_by: [] }\n" }))).toThrow(
      /forbidden key "constructor"/,
    );
    expect(() => parsePill(files({ evals: { c: evalYaml("  wet: true\n  prototype: true") } }))).toThrow(/forbidden key/);
  });

  it("rejects __proto__ keys in provenance.json", () => {
    const evil = PROVENANCE.replace('"rules":{}', '"rules":{"__proto__":{"polluted":true}}');
    expect(() => parsePill(files({ provenanceJson: evil }))).toThrow(/forbidden key "__proto__"/);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("rejects a billion-laughs alias bomb quickly", () => {
    const bomb = [
      "a: &a [x,x,x,x,x,x,x,x,x,x]",
      ...Array.from({ length: 12 }, (_, i) => {
        const prev = i === 0 ? "a" : `l${i - 1}`;
        return `l${i}: &l${i} [${Array(10).fill(`*${prev}`).join(",")}]`;
      }),
    ].join("\n");
    const t0 = performance.now();
    expect(() => parsePill(files({ evidenceYaml: bomb }))).toThrow(/anchors\/aliases/);
    expect(performance.now() - t0).toBeLessThan(1000);
  });

  it("rejects any shared (aliased) collection, e.g. a reused condition list", () => {
    const aliased = ruleYaml("R-1").replace("exceptions: []", "exceptions: &ex []\n  asset_refs_x: *ex").replace("  asset_refs: []\n", "");
    expect(() => parsePill(files({ rulesYaml: aliased }))).toThrow(/anchors\/aliases/);
  });

  it("rejects cyclic aliases", () => {
    expect(() => parsePill(files({ evidenceYaml: "a: &a [*a]\n" }))).toThrow();
  });

  it("does not construct !!binary, !!set, !!timestamp or merge keys", () => {
    expect(() => parsePill(files({ evidenceYaml: "x: !!binary aGVsbG8=\n" }))).toThrow(/YAML parse error/);
    expect(() => parsePill(files({ evidenceYaml: "x: !!set { a }\n" }))).toThrow(/YAML parse error/);
    expect(() => parsePill(files({ evidenceYaml: "x: !!timestamp 2024-01-01\n" }))).toThrow(/YAML parse error/);
    expect(() => parsePill(files({ evidenceYaml: "x: !!js/function 'function(){}'\n" }))).toThrow(/YAML parse error/);
  });

  it("keeps unquoted dates as strings (no Date objects)", () => {
    const md = SKILL.replace("status: approved", "status: approved\nreview_cadence: { next_review: 2026-12-01 }");
    expect(parsePill(files({ skillMd: md })).manifest.review_cadence?.next_review).toBe("2026-12-01");
  });

  it("rejects duplicate mapping keys", () => {
    expect(() => parsePill(files({ evidenceYaml: CATALOG + "wet: { label: dup, type: boolean, confirmable_by: [] }\n" }))).toThrow(
      /duplicated mapping key/,
    );
  });

  it("rejects oversized files before parsing", () => {
    const huge = "# " + "x".repeat(MAX_SOURCE_CHARS) + "\n" + CATALOG;
    expect(() => parsePill(files({ evidenceYaml: huge }))).toThrow(/limit/);
  });
});

// ---------------------------------------------------------------------------
// D4 — lax rule schema
// ---------------------------------------------------------------------------

describe("rules.yaml is strict", () => {
  it("rejects unknown fields on a rule, trigger, condition, exception and override", () => {
    const bad = [
      ruleYaml("R-1", "  bogus_field: 1\n"),
      ruleYaml("R-1").replace("any: [] }", "any: [], none: [] }"),
      ruleYaml("R-1").replace("op: eq, value: true }", "op: eq, value: true, note: x }"),
      ruleYaml("R-1").replace("exceptions: []", "exceptions: [{ when: [], note: n, relax: true }]"),
      ruleYaml("R-1").replace("asset_overrides: {}", "asset_overrides: { dc: { required_evidence: [] } }"),
      ruleYaml("R-1").replace("escalate_to: { role: lew }", "escalate_to: { role: lew, email: x }"),
    ];
    for (const rulesYaml of bad) expect(() => parsePill(files({ rulesYaml })), rulesYaml).toThrow(/Unrecognized key/);
  });

  it("rejects unknown frontmatter, provenance and catalog fields", () => {
    expect(() => parsePill(files({ skillMd: SKILL.replace("status: approved", "status: approved\nauto_approve: true") }))).toThrow(
      /Unrecognized key/,
    );
    expect(() => parsePill(files({ provenanceJson: PROVENANCE.replace('"rules"', '"extra":1,"rules"') }))).toThrow(/Unrecognized key/);
    expect(() => parsePill(files({ evidenceYaml: CATALOG + "z: { label: z, type: boolean, confirmable_by: [], default: true }\n" }))).toThrow(
      /Unrecognized key/,
    );
  });

  it("rejects duplicate rule ids", () => {
    expect(() => parsePill(files({ rulesYaml: ruleYaml("R-1") + ruleYaml("R-1") }))).toThrow(/duplicate rule id "R-1"/);
  });

  it("rejects rule ids in the reserved extraction-draft namespace", () => {
    expect(() => parsePill(files({ rulesYaml: ruleYaml("DRAFT-01") }))).toThrow(/reserved draft prefix/);
  });

  it.each([
    ["gt with a string", "{ path: evidence.wet, op: gt, value: '5' }"],
    ["lt with no value", "{ path: evidence.wet, op: lt }"],
    ["in with a scalar", "{ path: evidence.wet, op: in, value: abc }"],
    ["in with an empty list", "{ path: evidence.wet, op: in, value: [] }"],
    ["eq with an object", "{ path: evidence.wet, op: eq, value: { a: 1 } }"],
    ["exists with a value", "{ path: evidence.wet, op: exists, value: true }"],
    ["unknown root", "{ path: process.env, op: exists }"],
    ["bare root", "{ path: evidence, op: exists }"],
    ["traversal segment", "{ path: evidence.../x, op: exists }"],
    ["empty segment", "{ path: evidence..wet, op: exists }"],
    ["prototype segment", "{ path: incident.constructor, op: exists }"],
    ["unknown op", "{ path: evidence.wet, op: matches, value: x }"],
  ])("rejects a condition: %s", (_name, cond) => {
    const rulesYaml = ruleYaml().replace("{ path: evidence.wet, op: eq, value: true }", cond);
    expect(() => parsePill(files({ rulesYaml, evidenceYaml: "" }))).toThrow(/Schema validation error|YAML parse error/);
  });
});

// ---------------------------------------------------------------------------
// D5 — asset overrides could relax a gate
// ---------------------------------------------------------------------------

describe("asset overrides may only tighten", () => {
  const withOverride = (ov: string, extra?: (y: string) => string) => {
    const y = ruleYaml().replace("asset_overrides: {}", `asset_overrides: { data_centre: ${ov} }`);
    return extra ? extra(y) : y;
  };
  it.each([
    ["downgrade must_escalate → recommend", "{ action_class: recommend }", /relaxes action_class/],
    ["downgrade must_escalate → requires_approval", "{ action_class: requires_approval }", /relaxes action_class/],
    ["drop the missing-evidence gate", "{ forbidden_if_missing_evidence: false }", /removes the missing-evidence gate/],
    ["un-forbid an action", "{ forbidden_actions: [] }", /un-forbids: re-energise/],
    ["allow a forbidden action", "{ allowed_actions: [re-energise] }", /both allowed and forbidden/],
  ])("rejects: %s", (_name, ov, err) => {
    expect(() => parsePill(files({ rulesYaml: withOverride(ov) }))).toThrow(err);
  });

  it("accepts routing and tightening overrides", () => {
    const ok = withOverride(
      "{ escalate_to: { role: cfm }, deadline_minutes: 10, forbidden_actions: [re-energise, enter room] }",
      (y) => y.replace("action_class: must_escalate", "action_class: recommend").replace("forbidden_if_missing_evidence: true", "forbidden_if_missing_evidence: false"),
    ).replace("{ escalate_to: { role: cfm }", "{ action_class: must_escalate, forbidden_if_missing_evidence: true, escalate_to: { role: cfm }");
    const pill = parsePill(files({ rulesYaml: ok }));
    expect(pill.rules[0].asset_overrides.data_centre.action_class).toBe("must_escalate");
  });

  it("rejects a rule whose own allowed and forbidden lists overlap", () => {
    expect(() => parsePill(files({ rulesYaml: ruleYaml().replace("[keep isolated]", "[keep isolated, re-energise]") }))).toThrow(
      /both allowed and forbidden/,
    );
  });
});

// ---------------------------------------------------------------------------
// D6 — only the first matching exception applied
// ---------------------------------------------------------------------------

describe("every matching exception applies", () => {
  const rule: Rule = makeRule({
    trigger: { incident_type: "water_ingress", all: [], any: [] },
    required_evidence: [],
    exceptions: [
      { when: [], note: "first" },
      { when: [], note: "second", add_required_evidence: ["extra_signoff"], escalate_to: { role: "cfm" } },
      { when: [], note: "third", add_required_evidence: ["extra_signoff", "client_ok"], escalate_to: { role: "other" } },
      { when: [{ path: "asset.type", op: "eq", value: "nope" }], note: "unmatched", add_required_evidence: ["never"] },
    ],
  });

  it("adds every matching exception's evidence (deduplicated), never fewer", () => {
    const r = evaluate(makePill([rule]), office, incident, {});
    expect(r.actions[0].status).toBe("blocked");
    expect(r.actions[0].missingEvidence).toEqual(["extra_signoff", "client_ok"]);
    expect(r.trace[0].exceptionNote).toBe("first; second; third");
    expect(r.actions[0].escalateTo).toEqual({ role: "cfm" }); // first matching exception that sets one
    expect(r.confidence).toEqual({ requiredEvidence: 2, confirmed: 0 });
  });

  it("is unblocked only once all of them are satisfied", () => {
    const one = evaluate(makePill([rule]), office, incident, { extra_signoff: yes() });
    expect(one.actions[0].status).toBe("blocked");
    const both = evaluate(makePill([rule]), office, incident, { extra_signoff: yes(), client_ok: yes() });
    expect(both.actions[0].status).toBe("escalate");
  });
});

// ---------------------------------------------------------------------------
// D7 — counterfactual ignored exception-added evidence
// ---------------------------------------------------------------------------

describe("counterfactual sees exception-added evidence", () => {
  it("names the exception-added key as the flip", () => {
    const rule = makeRule({
      trigger: { incident_type: "water_ingress", all: [], any: [] },
      required_evidence: [],
      exceptions: [{ when: [], note: "n", add_required_evidence: ["k2"] }],
    });
    const cf = counterfactual(makePill([rule]), office, incident, {}, rule.id);
    expect(cf).toMatchObject({ currentStatus: "blocked", flipsTo: "escalate", ifEvidence: ["k2"] });
  });

  it("follows an exception that only matches once evidence is confirmed (fixpoint)", () => {
    const rule = makeRule({
      trigger: { incident_type: "water_ingress", all: [], any: [] },
      required_evidence: ["a", "b"],
      exceptions: [{ when: [{ path: "evidence.a", op: "eq", value: true }], note: "n", add_required_evidence: ["c"] }],
    });
    const cf = counterfactual(makePill([rule]), office, incident, {}, rule.id);
    expect(cf.flipsTo).toBe("escalate");
    expect([...cf.ifEvidence].sort()).toEqual(["a", "b", "c"]);
  });

  it("is pure: same inputs, same output, no wall-clock stamps", () => {
    const pill = makePill();
    const ev = { water_near_electrical: yes() };
    expect(counterfactual(pill, office, incident, ev, "TS-07")).toEqual(counterfactual(pill, office, incident, ev, "TS-07"));
  });
});

// ---------------------------------------------------------------------------
// D8 — eval files could forge confirmation / assert unknown things
// ---------------------------------------------------------------------------

describe("eval files are rejected loudly", () => {
  const parse = (y: string) => parsePill(files({ evals: { c: y } }));

  it('rejects confirmed: "false" (a string used to read as confirmed)', () => {
    expect(() => parse(evalYaml('  wet: true\n  signoff: { value: true, confirmed: "false" }'))).toThrow(/evals\/c\.yaml/);
  });
  it("rejects the object form without an explicit confirmed flag", () => {
    expect(() => parse(evalYaml("  wet: true\n  signoff: { value: true }"))).toThrow(/evals\/c\.yaml/);
  });
  it("keeps an explicit confirmed: false", () => {
    expect(parse(evalYaml("  wet: true\n  signoff: { value: true, confirmed: false }")).evals.c.evidence.signoff.confirmed).toBe(false);
  });
  it("rejects expected decisions for a rule that does not exist", () => {
    expect(() => parse(evalYaml("  wet: true", "  R-1: { status: blocked }\n  NOPE: { status: not_applicable }"))).toThrow(
      /expected_decisions\.NOPE names no rule/,
    );
  });
  it("rejects evidence keys not declared in evidence.yaml", () => {
    expect(() => parse(evalYaml("  wet: true\n  wett: true"))).toThrow(/"wett" is not declared/);
  });
  it("rejects evidence whose type differs from the catalog", () => {
    expect(() => parse(evalYaml('  wet: "true"'))).toThrow(/"wet" is string, declared boolean/);
    expect(() => parse(evalYaml("  wet: true\n  category: 2"))).toThrow(/"category" is number, declared string/);
  });
  it("rejects null / list / nested evidence values", () => {
    for (const v of ["null", "[true]", "{ value: { x: 1 }, confirmed: true }"]) {
      expect(() => parse(evalYaml(`  wet: ${v}`)), v).toThrow(/evals\/c\.yaml/);
    }
  });
  it("rejects a missing incident_type instead of defaulting it", () => {
    expect(() => parse(evalYaml().replace("incident_type: water_ingress\n", ""))).toThrow(/incident_type/);
  });
  it("rejects unknown top-level fields and an id that disagrees with the file name", () => {
    expect(() => parse(evalYaml(undefined, undefined, "expected: {}"))).toThrow(/Unrecognized key/);
    expect(() => parse("id: other\n" + evalYaml())).toThrow(/does not match the file name/);
  });
  it("rejects hostile case ids", () => {
    for (const id of ["__proto__", "../x", "", "a/b"]) {
      expect(() => parsePill(files({ evals: { [id]: evalYaml() } })), id).toThrow(/invalid case id/);
    }
  });
});

describe("rules must use the declared evidence vocabulary", () => {
  it("rejects an undeclared condition key", () => {
    expect(() => parsePill(files({ rulesYaml: ruleYaml().replace("evidence.wet", "evidence.wett") }))).toThrow(
      /evidence\.wett is not declared/,
    );
  });
  it("rejects an undeclared or non-boolean gating key (incl. exception-added)", () => {
    expect(() => parsePill(files({ rulesYaml: ruleYaml().replace("[signoff]", "[sign_off]") }))).toThrow(/"sign_off" is not declared/);
    expect(() => parsePill(files({ rulesYaml: ruleYaml().replace("[signoff]", "[category]") }))).toThrow(/gates need a boolean/);
    expect(() =>
      parsePill(files({ rulesYaml: ruleYaml().replace("exceptions: []", "exceptions: [{ when: [], note: n, add_required_evidence: [nope] }]") })),
    ).toThrow(/"nope" is not declared/);
  });
});

// ---------------------------------------------------------------------------
// D9 — decisions aliased the pill
// ---------------------------------------------------------------------------

describe("decisions do not alias the pill", () => {
  it("mutating a decision's lists leaves the rule untouched", () => {
    const pill = makePill();
    const r = evaluate(pill, office, incident, { water_near_electrical: yes() });
    r.actions[0].forbiddenActions.length = 0;
    r.actions[0].provenance.push("x");
    r.actions[0].escalateTo!.role = "nobody";
    expect(pill.rules[0].forbidden_actions).toEqual(["Re-energise before LEW sign-off"]);
    expect(pill.rules[0].provenance).toEqual(["ce-interview-2026-10-02#00:14:32"]);
    expect(pill.rules[0].escalate_to.role).toBe("duty_lew");
  });
});
