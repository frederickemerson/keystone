// Server component — loads the interview transcript, the recorded extraction and
// contradiction fallbacks (lib/data), and the real pill (lib/pills/load, import
// only). Maps extraction candidates into draft engine `Rule`s (lib/llm/candidates) and passes purely
// serialisable recorded defaults to the client. Live extraction is opt-in only.

import { loadTranscript, loadExtractionFixture, loadContradictionFixture } from '@/lib/data';
import { loadPill } from '@/lib/pills/load';
import type { Rule as EngineRule } from '@/lib/engine/types';
import { toDraftCandidates } from '@/lib/llm/candidates';
import { ExpertCallClient } from '@/components/capture/ExpertCallClient';
import { pillTitle } from '@/components/mosaic/pillTitle';
import { expectedLiveProvider } from '@/lib/llm/providers';
import { EXPERT_CALL_INTERVIEW_ID, EXPERT_CALL_PILL_ID, parseCallTime } from '@/components/incident/expertCall';

// Provider availability (env / local CLI login) is read per request, not baked in at build time.
export const dynamic = 'force-dynamic';

const INTERVIEW_ID = EXPERT_CALL_INTERVIEW_ID;
const PILL_ID = EXPERT_CALL_PILL_ID;

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ?at=HH:MM:SS (routes.capture) offers to start the call at that moment; anything else is ignored.
  const seekTo = parseCallTime((await searchParams).at);
  const transcript = loadTranscript(INTERVIEW_ID);
  const extraction = loadExtractionFixture();
  const contradiction = loadContradictionFixture();
  const pill = loadPill(PILL_ID);

  if (!transcript) {
    return (
      <p className="text-sm text-ink-muted">
        Transcript “{INTERVIEW_ID}” not found in data/transcripts.
      </p>
    );
  }

  // Extractor output only ever becomes draft candidates for the expert to confirm.
  const rules: EngineRule[] = toDraftCandidates(extraction).candidates.map((c) => c.rule);

  // First provenance quote/timestamp per rule, taken from the transcript spans.
  const provenance: Record<string, { quote: string; timestamp: string }> = {};
  for (const turn of transcript.turns) {
    for (const rid of turn.extracted_rule_ids ?? []) {
      if (!provenance[rid]) {
        provenance[rid] = {
          quote: turn.text,
          timestamp: `${INTERVIEW_ID}#${turn.t}`,
        };
      }
    }
  }

  return (
    <ExpertCallClient
      transcript={transcript}
      rules={rules}
      provenance={provenance}
      contradiction={contradiction}
      pillId={PILL_ID}
      pillName={pill ? pillTitle(pill) : PILL_ID}
      pill={pill?.pill ?? null}
      seekTo={seekTo}
      liveProvider={expectedLiveProvider()}
    />
  );
}
