// The approvals card shows an added rule by its text (ChangedRulesList), and
// lists field-by-field edits only for rules that exist in both versions — never
// a bare "TS-14 Before: — After: added".

import { describe, expect, it } from "vitest";
import { fieldChanges } from "@/components/approvals/changedRules";
import { rule } from "./fixtures";

describe("fieldChanges", () => {
  it("is empty when the version only adds a rule", () => {
    expect(fieldChanges([rule("TS-01")], [rule("TS-01"), rule("TS-14")])).toEqual([]);
  });

  it("lists the edited fields of a rule in both versions", () => {
    const changes = fieldChanges([rule("TS-02")], [rule("TS-02", { deadline_minutes: 10 }), rule("TS-14")]);
    expect(changes).toEqual(["TS-02 deadline_minutes 15 → 10"]);
  });
});
