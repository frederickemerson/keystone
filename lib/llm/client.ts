import 'server-only';

import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * TokenHub and OpenAI adapters for providers.ts (CodeBuddy is the primary live provider).
 * Used only for: rule extraction, follow-up probes, contradiction detection,
 * tenant-message drafting, incident summary. Decisions stay deterministic.
 *
 * API keys are read from the server environment and are never logged or exposed.
 */
// The area-gz endpoint is the one verified live for our key (the -intl
// Singapore host returns 401 for it). TOKENHUB_BASE_URL overrides per account.
export const DEFAULT_BASE_URL = 'https://tokenhub.tencentcloudmaas.com/v1';
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
    // Measured 12 Oct 2026: TokenHub honours response_format json_schema
    // (strict) for hy4-preview, so the extract wire schema is enforced at decode time.
    supportsStructuredOutputs: true,
  });

  return provider;
}

/** Returns the configured chat model. Throws if no API key is present. */
export function getModel(modelId: string = getModelId()): MosaicModel {
  return getProvider().chatModel(modelId);
}

/** Final live fallback. Any model id the installed @ai-sdk/openai supports. */
export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

export function getOpenAIModelId(): string {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

let openaiProvider: ReturnType<typeof createOpenAI> | null = null;

/** Responses API model. Throws if OPENAI_API_KEY is absent. */
export function getOpenAIModel(modelId: string = getOpenAIModelId()) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');
  openaiProvider ??= createOpenAI({ apiKey });
  return openaiProvider.responses(modelId);
}
