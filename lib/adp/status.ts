// Status of the Tencent Cloud ADP adapter, computed — never written down.
//
// Mirrors lib/capture/asr.ts tencentAsrStatus(): the state comes from the real
// configuration, and nothing in the UI or the connectors screen can claim more
// than the configuration supports. ADP goes one step further than the ASR
// chain, where "ready" means credentials are present: an AppKey alone only ever
// reaches `not_verified`. Reporting ADP as live needs a real chat response in
// this process, recorded by lib/adp/client.ts on its success path and by
// nothing else (lib/adp/__tests__/adp.test.ts pins the single caller).

import { ADP_CHAT_URL, adpAppKey } from './contract';

export type Env = Readonly<Record<string, string | undefined>>;

/** Proof that one live ADP chat call returned a usable answer. */
export interface AdpVerification {
  /** The RequestId of the call that succeeded (correlates with ADP's own logs). */
  requestId: string;
  at: string;
  latencyMs: number;
  /** Characters of answer text received, so an empty "success" is visible. */
  answerChars: number;
}

export type AdpStatus =
  | { provider: 'adp_chat'; state: 'verified'; reason: string; verification: AdpVerification }
  | { provider: 'adp_chat'; state: 'not_configured' | 'not_verified'; reason: string };

let lastSuccess: AdpVerification | null = null;

/**
 * Record a real, successful ADP chat response. Called only from the client's
 * success path: this is the ONLY way any status can become "verified".
 */
export function recordAdpSuccess(verification: AdpVerification): void {
  lastSuccess = verification;
}

/** The last recorded live success in this process, or null. */
export function adpVerification(): AdpVerification | null {
  return lastSuccess;
}

/** Test helper: forget the recorded success. */
export function resetAdpVerification(): void {
  lastSuccess = null;
}

/**
 * Pure: the status implied by this configuration and this proof of a live call.
 * Both inputs are required, so no caller can accidentally omit the proof and
 * get a better answer than the truth.
 */
export function adpStatus(env: Env, verification: AdpVerification | null): AdpStatus {
  if (!adpAppKey(env)) {
    return {
      provider: 'adp_chat',
      state: 'not_configured',
      reason: 'Tencent Cloud ADP is not configured: no ADP_APP_KEY. The AppKey is minted in the ADP console, and this account has none yet.',
    };
  }
  if (!verification) {
    return {
      provider: 'adp_chat',
      state: 'not_verified',
      reason: `An ADP AppKey is set, but no call to ${ADP_CHAT_URL} has returned an answer in this process yet, so the adapter is not reported as working.`,
    };
  }
  return {
    provider: 'adp_chat',
    state: 'verified',
    reason: `An ADP chat call answered at ${verification.at} (${verification.answerChars} characters in ${verification.latencyMs} ms).`,
    verification,
  };
}

/** The status right now: real environment, real recorded proof. */
export function adpStatusNow(env: Env = process.env): AdpStatus {
  return adpStatus(env, adpVerification());
}

/** Public summary for the connectors screen (no credentials, no prompt text). */
export function adpSummary(env: Env = process.env): { state: AdpStatus['state']; detail: string } {
  const status = adpStatusNow(env);
  return { state: status.state, detail: status.reason };
}
