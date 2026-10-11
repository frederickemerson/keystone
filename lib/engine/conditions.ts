// MOSAIC deterministic rule engine — condition resolution and evaluation.

import type {
  Asset,
  Condition,
  ConditionTrace,
  Evidence,
  Incident,
  Operator,
} from "./types.js";

// ---------------------------------------------------------------------------
// Path resolution: resolve dotted path over {evidence, asset, incident}
// ---------------------------------------------------------------------------

export interface ConditionContext {
  evidence: Evidence;
  asset: Asset;
  incident: Incident;
}

/**
 * Resolve a dotted path like "evidence.lew_signoff" or "asset.type" or
 * "incident.type" against the context.
 *
 * - "evidence.foo" → returns the *EvidenceItem.value* for key "foo", or undefined.
 * - "asset.type" → asset.type; "asset.attributes.X" → nested lookup.
 * - "incident.type" → incident.type; "incident.X" → incident[X].
 *
 * If the path doesn't start with one of these roots, returns undefined.
 */
export function resolvePath(path: string, ctx: ConditionContext): unknown {
  const parts = path.split(".");
  if (parts.length === 0) return undefined;
  const root = parts[0];

  switch (root) {
    case "evidence": {
      if (parts.length < 2) return undefined;
      const key = parts[1];
      const item = ctx.evidence[key];
      if (item === undefined) return undefined;
      return item.value;
    }
    case "asset": {
      if (parts.length < 2) return undefined;
      // asset.id, asset.name, asset.type
      if (parts.length === 2) {
        const field = parts[1];
        if (field === "id") return ctx.asset.id;
        if (field === "name") return ctx.asset.name;
        if (field === "type") return ctx.asset.type;
        // Fall through to attributes
        return ctx.asset.attributes[field];
      }
      // asset.attributes.X
      if (parts[1] === "attributes") {
        return parts.slice(2).reduce<unknown>((obj, key) => {
          if (obj && typeof obj === "object" && key in obj) {
            return (obj as Record<string, unknown>)[key];
          }
          return undefined;
        }, ctx.asset.attributes);
      }
      // Unknown deep asset path
      return undefined;
    }
    case "incident": {
      if (parts.length < 2) return undefined;
      const field = parts[1];
      const top = (ctx.incident as Record<string, unknown>)[field];
      if (parts.length === 2) return top;
      return parts.slice(2).reduce<unknown>((obj, key) => {
        if (obj && typeof obj === "object" && key in obj) {
          return (obj as Record<string, unknown>)[key];
        }
        return undefined;
      }, top);
    }
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Operator evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single condition against resolved value.
 * Returns true/false.
 */
export function evaluateOp(op: Operator, resolved: unknown, conditionValue: unknown): boolean {
  switch (op) {
    case "exists":
      return resolved !== undefined;

    case "eq":
      return strictEqual(resolved, conditionValue);

    case "neq":
      return !strictEqual(resolved, conditionValue);

    case "in":
      if (!Array.isArray(conditionValue)) return false;
      return conditionValue.some((v) => strictEqual(resolved, v));

    case "gt":
      return compare(resolved, conditionValue) > 0;
    case "gte":
      return compare(resolved, conditionValue) >= 0;
    case "lt":
      return compare(resolved, conditionValue) < 0;
    case "lte":
      return compare(resolved, conditionValue) <= 0;

    default:
      return false;
  }
}

function strictEqual(a: unknown, b: unknown): boolean {
  // Treat boolean/number coercion explicitly: true === 1 is false in JS strict.
  // We want strict equality except: string "true"/"false" coerce to boolean? No — keep strict.
  return a === b;
}

function compare(a: unknown, b: unknown): number {
  const aN = toNumber(a);
  const bN = toNumber(b);
  if (aN === null || bN === null) {
    // Fallback to string comparison
    const aS = String(a);
    const bS = String(b);
    if (aS < bS) return -1;
    if (aS > bS) return 1;
    return 0;
  }
  if (aN < bN) return -1;
  if (aN > bN) return 1;
  return 0;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Condition evaluation with trace
// ---------------------------------------------------------------------------

/**
 * Evaluate a single condition and produce a human-readable trace.
 */
export function evaluateCondition(
  cond: Condition,
  ctx: ConditionContext,
): ConditionTrace {
  const resolved = resolvePath(cond.path, ctx);
  const matched = evaluateOp(cond.op, resolved, cond.value);

  const reason = describeMatch(cond, resolved, matched);

  return {
    path: cond.path,
    op: cond.op,
    value: cond.value,
    resolved,
    matched,
    reason,
  };
}

function describeMatch(cond: Condition, resolved: unknown, matched: boolean): string {
  const valRepr = (v: unknown): string => {
    if (v === undefined) return "undefined";
    return JSON.stringify(v);
  };

  if (cond.op === "exists") {
    return matched
      ? `${cond.path} exists (${valRepr(resolved)})`
      : `${cond.path} does not exist`;
  }

  return matched
    ? `${cond.path} (${valRepr(resolved)}) ${cond.op} ${valRepr(cond.value)} — matched`
    : `${cond.path} (${valRepr(resolved)}) ${cond.op} ${valRepr(cond.value)} — not matched`;
}

// ---------------------------------------------------------------------------
// Condition list evaluation (all/any)
// ---------------------------------------------------------------------------

export interface ConditionListResult {
  /** Whether the list as a whole passed. For `all`: every condition matched. For `any`: at least one matched (or list empty → true). */
  passed: boolean;
  traces: ConditionTrace[];
}

export function evaluateAll(conditions: Condition[], ctx: ConditionContext): ConditionListResult {
  const traces = conditions.map((c) => evaluateCondition(c, ctx));
  const passed = traces.every((t) => t.matched);
  return { passed, traces };
}

export function evaluateAny(conditions: Condition[], ctx: ConditionContext): ConditionListResult {
  const traces = conditions.map((c) => evaluateCondition(c, ctx));
  // Empty `any` array → vacuously true (no OR constraint).
  const passed = conditions.length === 0 || traces.some((t) => t.matched);
  return { passed, traces };
}
