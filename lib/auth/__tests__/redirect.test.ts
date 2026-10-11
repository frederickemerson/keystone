import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "../redirect";

describe("safeNextPath (open-redirect guard)", () => {
  it("keeps same-origin relative paths with their query and hash", () => {
    expect(safeNextPath("/incident/INC-2026-1011?step=10")).toBe("/incident/INC-2026-1011?step=10");
    expect(safeNextPath("/learning/technical-services-chilled-water-leak#step-5")).toBe(
      "/learning/technical-services-chilled-water-leak#step-5",
    );
  });

  it.each([
    "https://evil.example/",
    "//evil.example/path",
    "/\\evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "javascript:alert(1)",
    "evil.example",
    "http:/evil.example",
    "",
    "/sign-in?next=/pulse",
    "/api/auth/sign-out",
  ])("falls back for %j", (raw) => {
    expect(safeNextPath(raw)).toBe(DEFAULT_AFTER_SIGN_IN);
  });

  it("falls back for missing input", () => {
    expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(safeNextPath(null)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});
