// Shared prop + data shapes for the Expert Onboarding Call screen.
// All types are imported (never edited) from lib/ so the client stays pure.

import type { Transcript, ContradictionFixture } from '@/lib/data';
import type { Rule } from '@/lib/engine/types';

export interface ProvenanceInfo {
  quote: string;
  timestamp: string;
}

export interface CaptureProps {
  /** Full interview transcript (transcript turns, expert, phases, contradiction refs). */
  transcript: Transcript;
  /** Rule candidates from the extraction fixture, mapped into engine `Rule` shape for RuleTile. */
  rules: Rule[];
  /** rule_id -> first provenance quote/timestamp seen in the transcript. */
  provenance: Record<string, ProvenanceInfo>;
  /** Contradiction fixture (statement A/B + resolved distinguishing condition). */
  contradiction: ContradictionFixture;
  /** Target pill id for the Decision Canvas CTA. */
  pillId: string;
  /** Human-readable pill name for the end summary. */
  pillName: string;
}
