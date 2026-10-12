// The recorded demo close-out note drafts the same rule offline every time:
// its fixture carries an authored extraction for exactly that transcript, and
// the drafted rule reads only evidence the chilled-water pill declares.

import { describe, expect, it } from "vitest";
import { CAPTURE_FIXTURES } from "@/lib/capture/fixtures";
import { extractionForNote } from "@/lib/capture/note-flow";
import { loadPill } from "@/lib/pills/load";

const closeout = CAPTURE_FIXTURES.find((f) => f.id === "capture-closeout-chw-r2")!;

describe("recorded demo close-out note", () => {
  it("has a recorded extraction, labelled as a recorded demo", () => {
    expect(closeout.extractionModel).toBe("recorded demo extraction");
  });

  it("drafts the same single rule every time, bound to the note it is used for", () => {
    const a = closeout.extractionFor("VN-A")!;
    const b = closeout.extractionFor("VN-A")!;
    expect(a).toEqual(b);
    expect(a.candidates).toHaveLength(1);
    const [draft] = a.candidates;
    expect(draft.rule.provenance).toEqual(["VN-A#00:00:00"]);
    expect(draft.rule.decision).toMatch(/LD-23-04/);
    expect(closeout.extractionFor("VN-B")!.candidates[0].rule.provenance).toEqual(["VN-B#00:00:00"]);
  });

  it("is used offline only for exactly this transcript", () => {
    const recorded = { transcript: closeout.transcript, extraction: closeout.extractionFor("VN-A")! };
    const offline = { source: "recorded" as const, data: { candidates: [], rejected: [] }, reason: "Offline." };
    expect(extractionForNote(offline, { transcript: closeout.transcript }, recorded)).toMatchObject({ from: "recorded-note" });
    expect(extractionForNote(offline, { transcript: `${closeout.transcript} And more.` }, recorded).data).toBeNull();
  });

  it("reads only evidence keys the chilled-water pill declares", () => {
    const catalog = loadPill("technical-services-chilled-water-leak")!.pill.evidenceCatalog;
    const [draft] = closeout.extractionFor("VN-A")!.candidates;
    const keys = [
      ...draft.rule.required_evidence,
      ...draft.rule.trigger.all.map((c) => c.path.replace(/^evidence\./, "")),
    ];
    for (const key of keys) expect(Object.keys(catalog), key).toContain(key);
  });
});
