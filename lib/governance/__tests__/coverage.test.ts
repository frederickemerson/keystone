import { describe, expect, it } from "vitest";
import { loadAssets, loadIncidents } from "@/lib/data";
import { loadAllPills } from "@/lib/pills/load";
import { outcomePill, pillsCovering } from "../coverage";

describe("pill coverage by asset type", () => {
  const pills = loadAllPills();
  const assets = loadAssets();
  const typeOf = (assetId: string) => assets.find((a) => a.id === assetId)?.type;

  it("office and data centre are covered; logistics and residential are gaps", () => {
    expect(pillsCovering(pills, "grade_a_office").length).toBeGreaterThan(0);
    expect(pillsCovering(pills, "data_centre").length).toBeGreaterThan(0);
    expect(pillsCovering(pills, "logistics")).toEqual([]);
    expect(pillsCovering(pills, "residential")).toEqual([]);
  });

  it("a closed incident on an uncovered asset type has no pill outcome (no Pass beside a Gap)", () => {
    const closed = loadIncidents().filter((i) => i.status === "closed");
    for (const i of closed) {
      const pill = outcomePill(pills, i.pill_applied, typeOf(i.asset_id));
      expect(Boolean(pill), i.id).toBe(pillsCovering(pills, typeOf(i.asset_id) ?? "").length > 0);
    }
    const roof = closed.find((i) => i.id === "INC-2026-0820")!;
    expect(outcomePill(pills, roof.pill_applied, typeOf(roof.asset_id))).toBeUndefined();
    const deadline = closed.find((i) => i.id === "INC-2026-0510")!;
    expect(outcomePill(pills, deadline.pill_applied, typeOf(deadline.asset_id))?.id).toBe("technical-services-chilled-water-leak");
  });
});
