// Status of the AI-service connectors, computed from configuration at request
// time. Pure: the caller passes the answers of the checks the AI code itself
// uses (lib/connectors/ai-status.server.ts reads them), so this file never
// re-derives env logic and a test can drive every branch.

import type { Connector, ConnectorStatus } from './contract';

/** Answers of the real configuration checks, read once per request. */
export interface AiConfigProbe {
  /**
   * `expectedLiveProvider()` (lib/llm/providers): "<model> via <Provider>" for
   * the provider a live LLM call tries first, or null when only recorded
   * output is possible.
   */
  llmFirstProvider: string | null;
  /** `isJevConfigured()` (lib/jev/client). */
  jevConfigured: boolean;
  /** `serverAsrChain()` (lib/capture/asr): state and reason of each server ASR provider. */
  asr: readonly { provider: string; state: string; detail: string }[];
}

/** Where the status was decided: on the server from configuration, or in the viewer's browser. */
export type StatusCheckedIn = 'server' | 'browser';

export interface ResolvedStatus {
  status: ConnectorStatus;
  /** One plain sentence saying why. */
  detail: string;
  checkedIn: StatusCheckedIn;
}

function asrStatus(probe: AiConfigProbe, provider: string, name: string): ResolvedStatus {
  const entry = probe.asr.find((a) => a.provider === provider);
  if (!entry) return { status: 'adapter_not_configured', detail: `${name} is not in the server speech chain.`, checkedIn: 'server' };
  return entry.state === 'ready'
    ? { status: 'live', detail: `Ready: ${entry.detail}.`, checkedIn: 'server' }
    : { status: 'adapter_not_configured', detail: entry.detail, checkedIn: 'server' };
}

/**
 * The status to show for a connector. Static connectors keep their file
 * status. A "config" connector is live only when the real check says Keystone
 * will call it; anything unknown fails closed to "adapter not configured".
 */
export function resolveStatus(connector: Connector, probe: AiConfigProbe): ResolvedStatus {
  if (connector.statusFrom === 'static') {
    return { status: connector.status, detail: '', checkedIn: 'server' };
  }
  switch (connector.id) {
    case 'llm_drafting':
      return probe.llmFirstProvider
        ? { status: 'live', detail: `First live call: ${probe.llmFirstProvider}. If it fails, the next configured provider is tried, then the recorded draft.`, checkedIn: 'server' }
        : { status: 'adapter_not_configured', detail: 'No provider has credentials, or recorded mode is selected: every draft shown is the labelled recorded one.', checkedIn: 'server' };
    case 'jev':
      return probe.jevConfigured
        ? { status: 'live', detail: 'An API key is set: the incident room asks Jev for suggestions.', checkedIn: 'server' }
        : { status: 'adapter_not_configured', detail: 'No Jev API key is set: no suggestions are shown.', checkedIn: 'server' };
    case 'tencent_asr':
      return asrStatus(probe, 'tencent_asr', 'Tencent Cloud ASR');
    case 'openai_transcribe':
      return asrStatus(probe, 'openai_transcribe', 'OpenAI transcription');
    case 'browser_speech':
      // Depends on the viewer's browser: the screen checks it there.
      return { status: 'adapter_not_configured', detail: 'Checked in your browser.', checkedIn: 'browser' };
    default:
      return { status: 'adapter_not_configured', detail: 'No configuration check is wired for this service.', checkedIn: 'server' };
  }
}

/** Resolved status of every connector, keyed by id. */
export function resolveStatuses(connectors: readonly Connector[], probe: AiConfigProbe): Record<string, ResolvedStatus> {
  return Object.fromEntries(connectors.map((c) => [c.id, resolveStatus(c, probe)]));
}
