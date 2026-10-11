// Keystone deterministic rule engine — condition resolution and evaluation.

import type {
  Asset,
  Condition,
  ConditionTrace,
  Evidence,
  Incident,
  Operator,
} from "./types";

// ---------------------------------------------------------------------------
// Path resolution: resolve dotted path over {evidence, asset, incident}
// ---------------------------------------------------------------------------

export interface ConditionContext {
  evidence: Evidence;
  asset: Asset;
  incident: Incident;
}

/**
 * Own-property lookup. Inherited members (`constructor`, `toString`,
 * `__proto__`, …) are never data: a path segment only resolves when the
 * container really holds that key. Non-objects resolve to undefined.
 */
function ownGet(container: unknown, key: string): unknown {
  if (container === null || typeof container !== "object") return undefined;
  return Object.hasOwn(container, key) ? (container as Record<string, unknown>)[key] : undefined;
}

function walk(start: unknown, keys: string[]): unknown {
  let current = start;
  for (const key of keys) {
    current = ownGet(current, key);
    if (current === undefined) return undefined;
  }
  return current;
}

/**
 * Resolve a dotted path like "evidence.lew_signoff" or "asset.type" or
 * "incident.type" against the context.
 *
 * - "evidence.foo" → the EvidenceItem.value for key "foo"; "evidence.foo.bar"
 *   walks into that value.
 * - "asset.id|name|type" → the asset field; "asset.attributes.X…" and the
 *   shorthand "asset.X…" walk into asset.attributes.
 * - "incident.X…" → walks the incident record.
 *
 * Only own properties resolve (see {@link ownGet}); anything else, including
 * an unknown root, is undefined. Paths are validated at parse time
 * (schema.ts `conditionPathSchema`), so this never sees a malformed path from
 * a parsed pill — but it must still be total and side-effect free.
 */
export function resolvePath(path: string, ctx: ConditionContext): unknown {
  const [root, ...rest] = path.split(".");
  if (rest.length === 0) return undefined;

  switch (root) {
    case "evidence": {
      const [key, ...inner] = rest;
      const item = ownGet(ctx.evidence, key) as { value?: unknown } | undefined;
      if (item === undefined) return undefined;
      return walk(ownGet(item, "value"), inner);
    }
    case "asset": {
      const [field, ...inner] = rest;
      if (field === "id" || field === "name" || field === "type") {
        return walk(ctx.asset[field], inner);
      }
      if (field === "attributes") return walk(ctx.asset.attributes, inner);
      return walk(ctx.asset.attributes, rest);
    }
    case "incident":
      return walk(ctx.incident, rest);
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Operator evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single operator against a resolved value.
 *
 * Semantics are deliberately strict — there is no type coercion anywhere:
 *  - eq / neq / in: `===` (so "true" ≠ true, 1 ≠ true). A missing value is
 *    `undefined`, which equals no authored scalar: `neq` on a missing key is
 *    true, `eq` is false.
 *  - gt / gte / lt / lte: only between two finite numbers. Anything else
 *    (missing, null, strings, booleans, NaN, ±Infinity) does NOT match — a
 *    missing reading must never satisfy a threshold.
 *  - exists: the key is present (any value other than undefined, incl. null).
 *  - in: membership in an array; a non-array operand matches nothing.
 */
export function evaluateOp(op: Operator, resolved: unknown, conditionValue: unknown): boolean {
  switch (op) {
    case "exists":
      return resolved !== undefined;
    case "eq":
      return resolved === conditionValue;
    case "neq":
      return resolved !== conditionValue;
    case "in":
      return Array.isArray(conditionValue) && conditionValue.some((v) => v === resolved);
    case "gt":
      return ordered(resolved, conditionValue, (a, b) => a > b);
    case "gte":
      return ordered(resolved, conditionValue, (a, b) => a >= b);
    case "lt":
      return ordered(resolved, conditionValue, (a, b) => a < b);
    case "lte":
      return ordered(resolved, conditionValue, (a, b) => a <= b);
    default:
      return false;
  }
}

function ordered(a: unknown, b: unknown, cmp: (a: number, b: number) => boolean): boolean {
  return typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b) && cmp(a, b);
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
