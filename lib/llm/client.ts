import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * LLM access goes through Tencent TokenHub (OpenAI-compatible).
 * The API key is read from the environment and never logged.
 */
export const DEFAULT_BASE_URL = 'https://tokenhub-intl.tencentcloudmaas.com/v1';
export const DEFAULT_MODEL = 'hy4-preview';

export function getBaseUrl() {
  return process.env.TOKENHUB_BASE_URL || DEFAULT_BASE_URL;
}

export function getModelId() {
  return process.env.MOSAIC_MODEL || DEFAULT_MODEL;
}

export function isConfigured() {
  return Boolean(process.env.TOKENHUB_API_KEY);
}

let provider: ReturnType<typeof createOpenAICompatible> | null = null;

function getProvider() {
  const apiKey = process.env.TOKENHUB_API_KEY;
  if (!apiKey) {
    throw new Error('TOKENHUB_API_KEY is not set — MOSAIC cannot call the LLM.');
  }

  provider ??= createOpenAICompatible({
    name: 'tokenhub',
    baseURL: getBaseUrl(),
    apiKey,
  });

  return provider;
}

/** Returns the configured chat model. Throws if no API key is present. */
export function getModel(modelId: string = getModelId()) {
  return getProvider()(modelId);
}
