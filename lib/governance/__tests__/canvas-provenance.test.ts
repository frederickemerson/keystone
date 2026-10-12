// The Decision Canvas shows the expert's own words for every rule tile. This
// pins that every rule of every shipped pill has a real provenance quote that
// the Canvas reader (expertQuoteFor) resolves — not placeholder text.

import { describe, expect, it } from "vitest";
import { expertQuoteFor } from "@/components/incident/provenance";
import { loadAllPills } from "@/lib/pills/load";
import { pillEditAuthority } from "../access";

const pills = loadAllPills();

describe("Canvas provenance", () => {
  it("loads the shipped pills", () => {
    expect(pills.length).toBeGreaterThan(0);
  });

  for (const bundle of pills) {
    it(`${bundle.id}: every rule resolves to the expert's quote with a transcript timestamp`, () => {
      for (const rule of bundle.pill.rules) {
        const q = expertQuoteFor(bundle.pill, rule);
        expect(q, `${rule.id} has no provenance quote`).not.toBeNull();
        expect(q!.quote.length).toBeGreaterThan(20);
        expect(q!.quote).not.toMatch(/captured in onboarding interview/);
        expect(q!.start).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      }
    });
  }

  it("TS-07 carries the LEW sign-off quote from 00:14:32 to 00:16:10", () => {
    const ts = pills.find((p) => p.pill.rules.some((r) => r.id === "TS-07"))!;
    const q = expertQuoteFor(ts.pill, ts.pill.rules.find((r) => r.id === "TS-07")!);
    expect(q).toMatchObject({ start: "00:14:32", end: "00:16:10", confirmedBy: "Tan Wei Ming" });
    expect(q!.quote).toMatch(/^never re-energise before the LEW signs off/);
  });
});

describe("Canvas edit access follows the pill's SKILL.md access block", () => {
  for (const bundle of pills) {
    const m = bundle.pill.manifest;
    const policy = { owner: m.owner, steward: m.steward, approver: m.approver, access: m.access };
    it(`${bundle.id}: RACI and roles_allowed may edit; read-only roles may not`, () => {
      for (const role of [m.owner, m.steward, m.approver]) expect(pillEditAuthority(role, policy).allowed).toBe(true);
      for (const role of m.access.roles_read_only ?? []) {
        const r = pillEditAuthority(role, policy);
        expect(r.allowed).toBe(false);
        expect(r.reason).toMatch(/read-only/);
      }
      expect(pillEditAuthority("unresolved", policy).allowed).toBe(false);
    });
  }
});
