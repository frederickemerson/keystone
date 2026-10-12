// Recording consent is asked once per person per browser session: the decision
// is stored (sessionStorage), read back for the same person only, survives a
// reload, and can be withdrawn. Storage failures never invent consent.

import { describe, expect, it } from "vitest";
import { forgetConsent, recallConsent, rememberConsent } from "../consent-session";

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

const CONSENT = { noticeShownAt: "2026-10-12T08:00:00.000Z", recordingConsent: true, namedCredit: true };

describe("consent per person per session", () => {
  it("recalls the stored decision for the same person, whatever the spacing or case of the name", () => {
    const s = memory();
    rememberConsent(s, "Rajesh Kumar", CONSENT);
    expect(recallConsent(s, "rajesh  kumar")).toEqual(CONSENT);
    expect(recallConsent(s, "Tan Wei Ming")).toBeNull();
  });

  it("can be withdrawn", () => {
    const s = memory();
    rememberConsent(s, "Rajesh Kumar", CONSENT);
    forgetConsent(s, "Rajesh Kumar");
    expect(recallConsent(s, "Rajesh Kumar")).toBeNull();
  });

  it("never treats a refusal, a corrupt entry or a broken storage as consent", () => {
    const s = memory();
    rememberConsent(s, "Rajesh Kumar", { ...CONSENT, recordingConsent: false });
    expect(recallConsent(s, "Rajesh Kumar")).toBeNull();
    s.setItem("keystone-capture-consent:rajesh kumar", "{not json");
    expect(recallConsent(s, "Rajesh Kumar")).toBeNull();
    const broken = { ...memory(), getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as Storage;
    expect(() => rememberConsent(broken, "Rajesh Kumar", CONSENT)).not.toThrow();
    expect(recallConsent(broken, "Rajesh Kumar")).toBeNull();
    expect(recallConsent(undefined, "Rajesh Kumar")).toBeNull();
  });
});
