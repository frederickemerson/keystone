import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * TokenHub adapter for providers.ts (CodeBuddy is the primary live provider).
 * Used only for: rule extraction, follow-up probes, contradiction detection,
 * tenant-message drafting, incident summary. Decisions stay deterministic.
 *
 * The API key is read from the environment and is never logged or exposed.
 */
export const DEFAULT_BASE_URL = 'https://tokenhub-intl.tencentcloudmaas.com/v1';
export const DEFAULT_MODEL = 'hy4-preview';

export type MosaicModel = ReturnType<ReturnType<typeof createOpenAICompatible>>;

export function getBaseUrl(): string {
  return process.env.TOKENHUB_BASE_URL || DEFAULT_BASE_URL;
}

export function getModelId(): string {
  return process.env.MOSAIC_MODEL || DEFAULT_MODEL;
}

/** False when no key is present — callers should use the recorded fixtures instead. */
export function isConfigured(): boolean {
  return Boolean(process.env.TOKENHUB_API_KEY);
}

let provider: ReturnType<typeof createOpenAICompatible> | null = null;

function getProvider() {
  const apiKey = process.env.TOKENHUB_API_KEY;
  if (!apiKey) {
    throw new Error('TOKENHUB_API_KEY is not set — use the recorded fixtures instead.');
  }

  provider ??= createOpenAICompatible({
    name: 'tokenhub',
    baseURL: getBaseUrl(),
    apiKey,
  });

  return provider;
}

/** Returns the configured chat model. Throws if no API key is present. */
export function getModel(modelId: string = getModelId()): MosaicModel {
  return getProvider().chatModel(modelId);
}
