// Server component — loads the interview transcript, the recorded extraction and
// contradiction fallbacks (lib/data), and the real pill (lib/pills/load, import
// only). Maps extraction candidates into engine `Rule` shapes and passes purely
// serialisable props to the client component. No client-side data fetching.

import { loadTranscript, loadExtractionFixture, loadContradictionFixture } from '@/lib/data';
import { loadPill } from '@/lib/pills/load';
import type { RuleCandidate } from '@/lib/data';
import type { Rule as EngineRule } from '@/lib/engine/types';
import { ExpertCallClient } from '@/components/capture/ExpertCallClient';

const INTERVIEW_ID = 'ce-interview-2026-10-02';
const PILL_ID = 'technical-services-chilled-water-leak';

// Map a recorded extraction candidate into the engine `Rule` shape used by RuleTile.
function toRule(c: RuleCandidate): EngineRule {
  return {
    id: c.rule_id,
    title: c.title,
    trigger: {
      incident_type: c.trigger.incident_type,
      all: c.trigger.all,
      any: c.trigger.any ?? [],
    },
    required_evidence: c.required_evidence,
    decision: c.decision,
    allowed_actions: c.allowed_actions,
    forbidden_actions: c.forbidden_actions,
    exceptions: c.exceptions,
    action_class: c.action_class,
    forbidden_if_missing_evidence: false,
    escalate_to: c.escalate_to,
    owner: c.owner,
    deadline_minutes: c.deadline_minutes,
    asset_overrides: (c.asset_overrides ?? {}) as EngineRule['asset_overrides'],
    asset_refs: [],
    sensitivity: 'internal',
    provenance: c.provenance,
  };
}

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

  const rules: EngineRule[] = extraction.rule_candidates.map(toRule);

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
      pillName={pill?.pill.manifest.name ?? 'Technical Services — Chilled Water Leak'}
    />
  );
}
