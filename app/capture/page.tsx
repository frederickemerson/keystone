// Server component — loads the interview transcript, the recorded extraction and
// contradiction fallbacks (lib/data), and the real pill (lib/pills/load, import
// only). Maps extraction candidates into draft engine `Rule`s (lib/llm/candidates) and passes purely
// serialisable props to the client component. No client-side data fetching.

import { loadTranscript, loadExtractionFixture, loadContradictionFixture } from '@/lib/data';
import { loadPill } from '@/lib/pills/load';
import type { Rule as EngineRule } from '@/lib/engine/types';
import { toDraftCandidates } from '@/lib/llm/candidates';
import { ExpertCallClient } from '@/components/capture/ExpertCallClient';
import { pillTitle } from '@/components/mosaic/pillTitle';

const INTERVIEW_ID = 'ce-interview-2026-10-02';
const PILL_ID = 'technical-services-chilled-water-leak';

export default function CapturePage() {
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
    />
  );
}
