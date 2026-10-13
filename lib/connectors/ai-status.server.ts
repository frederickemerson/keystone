// Reads the real configuration checks for the AI-service connectors. Server
// only, called per request: the same functions the LLM chain, the Jev client
// and the speech route call, so the connectors screen can never disagree with
// what Keystone actually does.

import 'server-only';
import { adpSummary } from '@/lib/adp/status';
import { serverAsrSummary } from '@/lib/capture/asr';
import { isJevConfigured } from '@/lib/jev/client';
import { expectedLiveProvider } from '@/lib/llm/providers';
import type { AiConfigProbe } from './ai-status';

export function readAiConfig(): AiConfigProbe {
  return {
    llmFirstProvider: expectedLiveProvider(),
    jevConfigured: isJevConfigured(),
    asr: serverAsrSummary().providers,
    adp: adpSummary(),
  };
}
