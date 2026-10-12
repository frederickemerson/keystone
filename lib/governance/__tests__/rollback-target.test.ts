// "One click rolls it back": whatever made the live version (a frontline note,
// a Learning correction, a Canvas review), the rollback restores the version
// that was live before it — never the live version itself.

import { describe, expect, it } from "vitest";
import { rollbackAuthority } from "../approval";
import { markApproved, promoteToShadow, proposeVersion, rollback, rollbackTarget, seedVersion, type PillVersion } from "../versions";
import { AOM, CE, HTS, PILL_ID, pill, rule } from "./fixtures";

const AT = "2026-10-12T00:00:00.000Z";

/** v1.2.0 seeded, v1.3.0 proposed from a note-style add, trialled and approved. */
function approvedNoteVersion(): PillVersion[] {
  const seed = seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);
  const v13 = proposeVersion(seed, [{ op: "add", rule: rule("TS-14") }], CE, "From voice note VN-1", [seed], AT);
  const shadowed = promoteToShadow([seed, v13], v13.version, AOM, AT);
  return markApproved(shadowed, v13.version, HTS, AT);
}

describe("rollbackTarget", () => {
  it("is the previously approved version once a new version is live", () => {
    const h = approvedNoteVersion();
    expect(rollbackTarget(h)?.version).toBe("1.2.0");
  });

  it("is undefined while only the seed is live (nothing earlier to restore)", () => {
    const seed = seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);
    expect(rollbackTarget([seed])).toBeUndefined();
  });

  it("is undefined while the new version is still in review", () => {
    const seed = seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);
    const v13 = proposeVersion(seed, [{ op: "add", rule: rule("TS-14") }], CE, "From voice note VN-1", [seed], AT);
    expect(rollbackTarget([seed, v13])).toBeUndefined();
  });

  it("is a target the store's rollback accepts, and the approver may use it in one step", () => {
    const h = approvedNoteVersion();
    const target = rollbackTarget(h)!;
    const live = h.find((v) => v.status === "Approved")!;
    expect(rollbackAuthority(target, live, HTS).allowed).toBe(true);
    const after = rollback(h, PILL_ID, target.version, HTS, "TS-14 misfired", AT);
    const restored = after.find((v) => v.status === "Approved")!;
    expect(restored.rollbackOf).toBe("1.2.0");
    expect(restored.rules.map((r) => r.id)).not.toContain("TS-14");
  });
});
