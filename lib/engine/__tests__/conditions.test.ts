import { describe, it, expect } from "vitest";
import {
  resolvePath,
  evaluateOp,
  evaluateCondition,
  evaluateAll,
  evaluateAny,
} from "../conditions.js";
import type { Asset, Evidence, Incident } from "../types.js";

const ctx = {
  evidence: {
    lew_signoff: { value: true, source: "s", at: "t", confirmed: true },
    unconfirmed_item: { value: true, source: "s", at: "t", confirmed: false },
  } as Evidence,
  asset: { id: "a1", name: "Asset", type: "office", attributes: { pue: 1.32, nested: { key: "val" } } } as Asset,
  incident: { id: "i1", type: "water_ingress", floor: "L23" } as Incident,
};

describe("resolvePath", () => {
  it("resolves evidence paths to the item value", () => {
    expect(resolvePath("evidence.lew_signoff", ctx)).toBe(true);
  });

  it("returns undefined for missing evidence keys", () => {
    expect(resolvePath("evidence.nonexistent", ctx)).toBeUndefined();
  });

  it("resolves asset.type", () => {
    expect(resolvePath("asset.type", ctx)).toBe("office");
  });

  it("resolves asset.attributes.pue", () => {
    expect(resolvePath("asset.attributes.pue", ctx)).toBe(1.32);
  });

  it("resolves nested asset attributes", () => {
    expect(resolvePath("asset.attributes.nested.key", ctx)).toBe("val");
  });

  it("resolves incident.type", () => {
    expect(resolvePath("incident.type", ctx)).toBe("water_ingress");
  });

  it("resolves incident.floor", () => {
    expect(resolvePath("incident.floor", ctx)).toBe("L23");
  });
});

describe("evaluateOp", () => {
  it("eq matches strictly", () => {
    expect(evaluateOp("eq", true, true)).toBe(true);
    expect(evaluateOp("eq", true, false)).toBe(false);
  });

  it("neq is logical negation of eq", () => {
    expect(evaluateOp("neq", 5, 3)).toBe(true);
    expect(evaluateOp("neq", 5, 5)).toBe(false);
  });

  it("exists checks for non-undefined", () => {
    expect(evaluateOp("exists", "hello", undefined)).toBe(true);
    expect(evaluateOp("exists", undefined, undefined)).toBe(false);
  });

  it("in checks array membership", () => {
    expect(evaluateOp("in", "office", ["office", "retail"])).toBe(true);
    expect(evaluateOp("in", "warehouse", ["office", "retail"])).toBe(false);
  });

  it("gt/gte/lt/lte compare numbers", () => {
    expect(evaluateOp("gt", 10, 5)).toBe(true);
    expect(evaluateOp("gt", 5, 10)).toBe(false);
    expect(evaluateOp("gte", 5, 5)).toBe(true);
    expect(evaluateOp("lt", 5, 10)).toBe(true);
    expect(evaluateOp("lte", 5, 5)).toBe(true);
  });
});

describe("evaluateCondition", () => {
  it("produces a matching trace for a true condition", () => {
    const trace = evaluateCondition({ path: "evidence.lew_signoff", op: "eq", value: true }, ctx);
    expect(trace.matched).toBe(true);
    expect(trace.reason).toContain("matched");
  });

  it("produces a non-matching trace for a false condition", () => {
    const trace = evaluateCondition({ path: "evidence.lew_signoff", op: "eq", value: false }, ctx);
    expect(trace.matched).toBe(false);
    expect(trace.reason).toContain("not matched");
  });

  it("exists op on a present evidence key", () => {
    const trace = evaluateCondition({ path: "evidence.lew_signoff", op: "exists" }, ctx);
    expect(trace.matched).toBe(true);
  });

  it("exists op on an absent evidence key", () => {
    const trace = evaluateCondition({ path: "evidence.nonexistent", op: "exists" }, ctx);
    expect(trace.matched).toBe(false);
  });
});

describe("evaluateAll", () => {
  it("passes when all conditions match", () => {
    const result = evaluateAll(
      [
        { path: "evidence.lew_signoff", op: "eq", value: true },
        { path: "asset.type", op: "eq", value: "office" },
      ],
      ctx,
    );
    expect(result.passed).toBe(true);
    expect(result.traces).toHaveLength(2);
  });

  it("fails when any condition does not match", () => {
    const result = evaluateAll(
      [
        { path: "evidence.lew_signoff", op: "eq", value: true },
        { path: "asset.type", op: "eq", value: "data_centre" },
      ],
      ctx,
    );
    expect(result.passed).toBe(false);
  });

  it("passes vacuously with an empty array", () => {
    const result = evaluateAll([], ctx);
    expect(result.passed).toBe(true);
  });
});

describe("evaluateAny", () => {
  it("passes when at least one condition matches", () => {
    const result = evaluateAny(
      [
        { path: "asset.type", op: "eq", value: "data_centre" },
        { path: "asset.type", op: "eq", value: "office" },
      ],
      ctx,
    );
    expect(result.passed).toBe(true);
  });

  it("fails when no conditions match", () => {
    const result = evaluateAny(
      [
        { path: "asset.type", op: "eq", value: "data_centre" },
        { path: "asset.type", op: "eq", value: "warehouse" },
      ],
      ctx,
    );
    expect(result.passed).toBe(false);
  });

  it("passes vacuously with an empty array", () => {
    const result = evaluateAny([], ctx);
    expect(result.passed).toBe(true);
  });
});
