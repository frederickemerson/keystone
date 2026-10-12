// Recording consent, asked once per person per browser session (PDPA s.20
// notice). The decision is kept in sessionStorage keyed by the speaker's
// identity, shown on every capture, and can be withdrawn. Client-safe; every
// storage access is guarded, and anything unreadable means "ask again".

import { identityKey } from "@/lib/governance/access";
import { consentSchema, type Consent } from "./contract";

const PREFIX = "keystone-capture-consent:";
const keyFor = (speakerName: string): string => `${PREFIX}${identityKey(speakerName)}`;

/** The stored consent of this speaker in this session, or null (ask). */
export function recallConsent(storage: Storage | undefined, speakerName: string): Consent | null {
  try {
    const raw = storage?.getItem(keyFor(speakerName));
    if (!raw) return null;
    const parsed = consentSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.recordingConsent ? parsed.data : null;
  } catch {
    return null;
  }
}

export function rememberConsent(storage: Storage | undefined, speakerName: string, consent: Consent): void {
  try {
    storage?.setItem(keyFor(speakerName), JSON.stringify(consent));
  } catch {
    // Not stored: the notice is shown again next time, which is the safe side.
  }
}

export function forgetConsent(storage: Storage | undefined, speakerName: string): void {
  try {
    storage?.removeItem(keyFor(speakerName));
  } catch {
    // Nothing stored to withdraw.
  }
}

/** window.sessionStorage when reachable. */
export function sessionStore(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}
