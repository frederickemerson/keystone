// Learning's expert correction is its own story: the version it proposes is
// marked with the incident it corrects, so a version from a frontline note
// (or a Canvas review) is never mistaken for it, whichever number comes first.

import { describe, expect, it } from "vitest";
import { createGovernanceStore, GOVERNANCE_STORE_KEY, memoryStorage } from "../store";
import { parseGovernanceSnapshot } from "../snapshot";
import { correctionFor, inReview } from "../versions";
import { PILL_ID, pill, rule } from "./fixtures";

const clock = () => "2026-10-11T08:00:00.000Z";
const INCIDENT = "INC-2026-1011";

function setup() {
  const storage = memoryStorage();
  const store = createGovernanceStore(storage, clock);
  const s = () => store.getState();
  s().seedPills([{ id: PILL_ID, pill: pill() }]);
  s().setRole("chief_engineer");
  return { s, storage };
}

describe("correction provenance", () => {
  it("records the incident and rule a Learning correction comes from, and audits it", () => {
    const { s } = setup();
    const v = s().proposeVersion(
      PILL_ID,
      "1.2.0",
      [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 10 } }],
      "Incomplete: 10 minutes",
      { incidentId: INCIDENT, ruleId: "TS-02" },
    );
    expect(v.correction).toEqual({ incidentId: INCIDENT, ruleId: "TS-02" });
    expect(s().audit.at(-1)).toMatchObject({ action: "version_proposed", incidentId: INCIDENT, ruleId: "TS-02" });
    expect(correctionFor(s().versions[PILL_ID], INCIDENT)?.version).toBe("1.3.0");
  });

  it("a version from elsewhere is not the correction, whichever version number it takes", () => {
    const { s } = setup();
    // Another change takes the next number first (as a frontline note does).
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "add", rule: rule("TS-14") }], "From a note");
    const history = s().versions[PILL_ID];
    expect(correctionFor(history, INCIDENT)).toBeUndefined();
    expect(inReview(history)?.version).toBe("1.3.0");

    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    s().setRole("head_technical_services");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    expect(inReview(s().versions[PILL_ID])).toBeUndefined();

    // The correction now builds on the live v1.3.0 and becomes v1.4.0.
    s().setRole("chief_engineer");
    const c = s().proposeVersion(
      PILL_ID,
      "1.3.0",
      [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 10 } }],
      "Incomplete",
      { incidentId: INCIDENT, ruleId: "TS-02" },
    );
    expect(c.version).toBe("1.4.0");
    expect(correctionFor(s().versions[PILL_ID], INCIDENT)?.version).toBe("1.4.0");
    expect(correctionFor(s().versions[PILL_ID], "INC-OTHER")).toBeUndefined();
  });

  it("a correction survives a reload, and a forged one (no audit event) is discarded", () => {
    const { s, storage } = setup();
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 10 } }], "r", {
      incidentId: INCIDENT,
      ruleId: "TS-02",
    });
    const raw = JSON.parse(String(storage.getItem(GOVERNANCE_STORE_KEY))).state;
    const ok = parseGovernanceSnapshot(raw);
    expect(ok.ok && ok.data.versions[PILL_ID][1].correction?.incidentId).toBe(INCIDENT);

    const forged = structuredClone(raw);
    forged.versions[PILL_ID][1].correction = { incidentId: "INC-FORGED", ruleId: "TS-02" };
    expect(parseGovernanceSnapshot(forged).ok).toBe(false);
  });
});
