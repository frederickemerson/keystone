// The cross-pill coordination contract, enforced against the real files.
//
// data/coordination.yaml authors one fact no single pill holds: that TE-04's
// clock depends on TS-07's gate. Everything else it states is a claim ABOUT the
// pills and data/roles.json, and a claim is worth nothing unless something
// checks it. This file is that check:
//
//   1. the file parses against lib/coordination/contract.ts;
//   2. the runtime policy the browser ships IS that file, projected — so the
//      two cannot drift;
//   3. every class it declares has a predicate, and no predicate is undeclared;
//   4. every rule it names exists, in two different pills in two different
//      domains;
//   5. the gate's authored `unresolved_until` EQUALS the engine's effective
//      gating set (required_evidence union every matching exception's
//      add_required_evidence) — equality, because a subset check cannot catch
//      a key dropping off the list;
//   6. adjudication derives the authored human out of data/roles.json;
//   7. coordination output never becomes a pill.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { canEscalate, canSee, getRole, isKnownRole } from "@/lib/governance/access";
import { listPillRefs } from "@/lib/pills/load";
import { resolveAdjudicator } from "../adjudicate";
import { coordinationFileSchema, projectPolicy, type CoordinationFile } from "../contract";
import { CLASS_PREDICATES, coordinate, type ConflictFace } from "../detect";
import { COORDINATION_POLICY } from "../policy";
import { GROUNDED_INCIDENT, roomInput, timelineLength } from "./fixtures";

const CONTRACT_FILE = "data/coordination.yaml";

const FILE: CoordinationFile = coordinationFileSchema.parse(
  yaml.load(readFileSync(join(process.cwd(), CONTRACT_FILE), "utf8")),
);

/** The pill folders on disk, which is what the contract's pill ids must name. */
const PILL_DOMAIN = new Map(listPillRefs().map((ref) => [ref.id, ref.domain]));

/** Every face the detector builds for a link, at the end of the grounded timeline. */
function groundedFaces(conflictId: string): { obligation: ConflictFace; gate: ConflictFace } {
  const input = roomInput(GROUNDED_INCIDENT, timelineLength(GROUNDED_INCIDENT));
  const check = coordinate(COORDINATION_POLICY, input).find((c) => c.conflictId === conflictId);
  if (check === undefined) throw new Error(`no check for ${conflictId}`);
  if (check.obligation === null || check.gate === null) throw new Error(`${conflictId}: ${check.reason}`);
  return { obligation: check.obligation, gate: check.gate };
}

describe("coordination contract", () => {
  // Guard against a vacuous pass: every loop below runs over FILE.conflicts, so
  // an empty (or renamed) contract would "pass" each one having checked nothing.
  it("declares the classes and links the demo rests on", () => {
    expect(FILE.classes.map((c) => c.id)).toContain("deadline_before_gate_clears");
    expect(FILE.conflicts.map((c) => c.id)).toEqual(["XP-01"]);
    expect(PILL_DOMAIN.size).toBe(2);
  });

  it("is exactly what the browser ships, projected onto the runtime fields", () => {
    expect(COORDINATION_POLICY).toEqual(projectPolicy(FILE));
  });

  it("declares a class for every predicate and a predicate for every class", () => {
    expect([...FILE.classes.map((c) => c.id)].sort()).toEqual(Object.keys(CLASS_PREDICATES).sort());
  });

  it.each(FILE.conflicts)("$id names two rules in two different pills in two different domains", (link) => {
    for (const ref of [link.obligation, link.gate]) {
      expect(PILL_DOMAIN.has(ref.pill), `${ref.pill} is not a pill folder`).toBe(true);
    }
    expect(link.obligation.pill).not.toBe(link.gate.pill);
    expect(PILL_DOMAIN.get(link.obligation.pill)).not.toBe(PILL_DOMAIN.get(link.gate.pill));

    const { obligation, gate } = groundedFaces(link.id);
    expect(obligation.ruleId).toBe(link.obligation.rule);
    expect(gate.ruleId).toBe(link.gate.rule);
  });

  it.each(FILE.conflicts)("$id is grounded in the incident and asset type it claims", (link) => {
    const input = roomInput(link.grounding.incident, 0);
    expect(input.incident.id).toBe(link.grounding.incident);
    expect(input.asset.type).toBe(link.grounding.asset_type);
  });

  // Finding (a): the "unresolved until" set must be the FULL effective gating
  // set, and the check must be equality. Asserted at every replay step, so an
  // exception whose `when` reads evidence (and so only matches part-way
  // through) cannot slip a key past the contract either.
  it.each(FILE.conflicts)("$id pins the gate's whole effective gating set, at every step", (link) => {
    const total = timelineLength(link.grounding.incident);
    const expected = [...link.grounding.unresolved_until].sort();
    const seen: string[][] = [];
    for (let step = 0; step <= total; step += 1) {
      const check = coordinate(COORDINATION_POLICY, roomInput(link.grounding.incident, step)).find(
        (c) => c.conflictId === link.id,
      );
      expect(check?.gate).not.toBeNull();
      seen.push(check?.gate?.gatingSet ?? []);
    }
    expect(seen.length).toBe(total + 1);
    for (const gatingSet of seen) expect(gatingSet).toEqual(expected);
  });

  it.each(FILE.conflicts)("$id puts a named human on a finite clock", (link) => {
    const { obligation } = groundedFaces(link.id);
    expect(obligation.triggered).toBe(true);
    expect(obligation.deadlineMinutes).toBeGreaterThan(0);
    expect(isKnownRole(obligation.ownerRole)).toBe(true);
  });

  // Finding (c): the faces carry different sensitivities, and the role that
  // stewards both pills is NOT cleared for the obligation's. That is the leak
  // the panel has to mask — recorded here so the fact stays true in data.
  it("XP-01 spans two clearances, one of which the shared steward does not hold", () => {
    const { obligation, gate } = groundedFaces("XP-01");
    expect(obligation.sensitivity).toBe("commercial");
    expect(gate.sensitivity).toBe("internal");
    expect(canSee("asset_operations_manager", "commercial")).toBe(false);
    expect(canSee("asset_operations_manager", "internal")).toBe(true);
  });

  it.each(FILE.conflicts)("$id routes adjudication to the human data/roles.json names", (link) => {
    const input = roomInput(link.grounding.incident, timelineLength(link.grounding.incident));
    const obligationPill = input.pills.find((p) => p.pillId === link.obligation.pill);
    const gatePill = input.pills.find((p) => p.pillId === link.gate.pill);
    expect(obligationPill).toBeDefined();
    expect(gatePill).toBeDefined();

    const { obligation, gate } = groundedFaces(link.id);
    const outcome = resolveAdjudicator(obligationPill!.pill, gatePill!.pill, [
      obligation.sensitivity,
      gate.sensitivity,
    ]);

    expect(outcome.chosen).not.toBeNull();
    expect(outcome.chosen?.role).toBe(link.grounding.expected_adjudicator.role);
    expect(outcome.chosen?.basis).toBe(link.grounding.expected_adjudicator.basis);
    // The person and label come from roles.json, never from code.
    expect(outcome.chosen?.person).toBe(getRole(link.grounding.expected_adjudicator.role)?.person);
    expect(outcome.chosen?.label).toBe(getRole(link.grounding.expected_adjudicator.role)?.label);
    // The chosen human can actually settle it: cleared for both faces, may escalate.
    expect(canEscalate(outcome.chosen!.role)).toBe(true);
    for (const level of [obligation.sensitivity, gate.sensitivity]) {
      expect(canSee(outcome.chosen!.role, level)).toBe(true);
    }
    // Anyone passed over really is disqualified — no cosmetic "skipped" entries.
    for (const skipped of outcome.skipped) {
      const disqualified =
        !isKnownRole(skipped.role) ||
        !canEscalate(skipped.role) ||
        [obligation.sensitivity, gate.sensitivity].some((level) => !canSee(skipped.role, level));
      expect(disqualified, `${skipped.role} was skipped but qualifies`).toBe(true);
      expect(skipped.reason.length).toBeGreaterThan(10);
    }
  });

  it.each(FILE.conflicts)("$id names roles that exist in data/roles.json with a named persona", (link) => {
    const { obligation, gate } = groundedFaces(link.id);
    for (const role of [obligation.ownerRole, obligation.escalateToRole, gate.ownerRole, gate.escalateToRole]) {
      expect(getRole(role)?.person, `${role} has no persona in data/roles.json`).toBeTruthy();
    }
  });

  // Finding (d): coordination output is a statement about two pills, never a
  // third pill. listPillRefs() auto-discovers any pills/<domain>/<name>/ folder,
  // so pinning its result is what keeps that true.
  it("never becomes a pill: the pill folders are exactly the two known refs", () => {
    expect(listPillRefs()).toEqual([
      { id: "technical-services-chilled-water-leak", domain: "technical-services", name: "chilled-water-leak" },
      { id: "tenant-experience-incident-comms", domain: "tenant-experience", name: "incident-comms" },
    ]);
  });
});
