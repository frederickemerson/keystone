// Client-safe result types and attribution labels. No secrets, no SDK imports.
//
// Invariant enforced by providers.ts: `source === 'live'` iff `provider` is the
// live provider whose response passed validation, and `model` is the model id
// that provider was asked for. Recorded output is always `provider: 'fixtures'`.

export type LiveProvider = 'codebuddy' | 'tokenhub' | 'openai';
export type LlmProvider = LiveProvider | 'fixtures';

/** Why a live provider in the chain did not produce the output (no raw details). */
export type AttemptOutcome = 'timeout' | 'error' | 'invalid-json' | 'rejected' | 'budget-exhausted';

export interface ProviderAttempt {
  provider: LiveProvider;
  model: string;
  outcome: AttemptOutcome;
}

export interface Generation<T> {
  data: T;
  source: 'live' | 'recorded';
  /** The provider that produced `data`; 'fixtures' for recorded output. */
  provider: LlmProvider;
  /** The model that produced `data` (for recorded output, the model the fixture was recorded from). */
  model: string;
  latencyMs: number;
  /** Earlier providers in the chain that failed before `provider` answered. */
  attempts: ProviderAttempt[];
  reason?: string;
}

export const PROVIDER_NAMES: Record<LiveProvider, string> = {
  codebuddy: 'CodeBuddy',
  tokenhub: 'TokenHub',
  openai: 'OpenAI',
};

type Attributable = Pick<Generation<unknown>, 'source' | 'provider' | 'model' | 'latencyMs'>;

/** Badge text. Only a live result names a provider, and only the one that produced it. */
export function generationLabel(result: Attributable | null | undefined): string {
  if (!result || result.source !== 'live' || result.provider === 'fixtures' || !(result.provider in PROVIDER_NAMES)) {
    return 'Recorded output';
  }
  return `Live · ${result.model} via ${PROVIDER_NAMES[result.provider]} · ${(result.latencyMs / 1000).toFixed(1)} s`;
}

export function generationTitle(result: (Attributable & { reason?: string }) | null | undefined): string {
  if (result?.reason) return result.reason;
  return result?.source === 'live' ? 'Live model output, not an approval.' : 'Recorded fixture; no network call.';
}
