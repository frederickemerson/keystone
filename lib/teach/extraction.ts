// What to do with the extractor's answer, when the input is something a person
// just typed.
//
// This is a pure decision, kept out of the component so it can be tested,
// because it encodes a rule that is easy to get wrong in a way nobody would
// notice: POST /api/llm/extract answers over-quota and provider-failure cases
// with the RECORDED FIXTURE, carrying source: 'recorded'. That is right on
// /capture, where the input genuinely is the recorded interview — the fixture
// is a reading of those exact turns.
//
// Here the input is an account this person wrote thirty seconds ago. Showing
// the fixture would put four rule candidates on screen under the heading "what
// a model read in your account", and not one of them would have been read out
// of it. That is the invented-authority failure the whole submission argues
// against, produced by a fallback that looks sensible everywhere else.
//
// So: live output only. Anything else is reported as a reason, with no
// candidates.

import type { CandidateParse } from '@/lib/llm/candidates';

export interface ExtractionResponse {
  status: number;
  source?: 'live' | 'recorded';
  provider?: string;
  model?: string;
  reason?: string;
  data?: CandidateParse;
}

export type ExtractionOutcome =
  | { kind: 'candidates'; parse: CandidateParse; provider: string; model: string }
  | { kind: 'unavailable'; reason: string };

export const OVER_QUOTA_REASON =
  'The extractor is over its quota for now. It will not show you the recorded example instead — that example is a reading of a different conversation, not of what you just wrote.';

export const UNREACHABLE_REASON =
  'The extractor could not be reached, so your account has not been read yet.';

export const NOT_LIVE_REASON =
  'No live extractor answered, and the recorded example is a reading of a different conversation, so it is not shown here.';

export function accountExtractionOutcome(response: ExtractionResponse): ExtractionOutcome {
  if (response.status === 429) return { kind: 'unavailable', reason: OVER_QUOTA_REASON };
  if (response.status !== 200) return { kind: 'unavailable', reason: UNREACHABLE_REASON };
  // A recorded answer is refused even when it arrives with status 200.
  if (response.source !== 'live') return { kind: 'unavailable', reason: response.reason ?? NOT_LIVE_REASON };
  if (!response.data) return { kind: 'unavailable', reason: UNREACHABLE_REASON };
  return {
    kind: 'candidates',
    parse: { candidates: response.data.candidates ?? [], rejected: response.data.rejected ?? [] },
    provider: response.provider ?? 'unknown',
    model: response.model ?? 'unknown',
  };
}
