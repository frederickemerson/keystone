// Actions taken in the demo happen now, not on the recorded incident's clock
// (08:11). They are labelled relative to now, never as a bare wall-clock time.

import { describe, expect, it } from "vitest";
import { formatActionTime } from "@/components/incident/labels";

const NOW = Date.parse("2026-10-12T07:57:00.000Z"); // 15:57 SGT

describe("formatActionTime", () => {
  it("says just now, then minutes ago", () => {
    expect(formatActionTime("2026-10-12T07:56:30.000Z", NOW)).toBe("just now");
    expect(formatActionTime("2026-10-12T07:54:00.000Z", NOW)).toBe("3 min ago");
  });

  it("names the day for anything older, in Singapore time, marked as the viewer's clock", () => {
    expect(formatActionTime("2026-10-12T02:00:00.000Z", NOW)).toBe("today 10:00 (your clock)");
    expect(formatActionTime("2026-10-10T02:00:00.000Z", NOW)).toBe("10 Oct 10:00 (your clock)");
  });

  it("passes through an unreadable timestamp", () => {
    expect(formatActionTime("nope", NOW)).toBe("nope");
  });
});
