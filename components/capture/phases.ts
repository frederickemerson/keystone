// CDM sweep -> display phase mapping.
// The transcript stores a per-turn `probe_id` (CDM/ACTA probe). We collapse the
// 7 probe-phase enum (incident_selection, timeline, deepening, what_if,
// coverage_audit, contrast_and_contradiction, confirmation) into the 5 labels the
// on-call UI surfaces: Incident account -> Timeline -> Deepening probes ->
// What-if -> Knowledge audit.
//
// The probe ids come from the one library the live interviewer also draws from
// (lib/llm/interview PROBE_IDS), and the Record below is keyed by it, so a probe
// the library knows about cannot be missing a phase here.

import { baseProbeId, isProbeId, type ProbeId } from '@/lib/llm/interview';

export const PHASE_ORDER = [
  'Incident account',
  'Timeline',
  'Deepening probes',
  'What-if',
  'Knowledge audit',
] as const;

export type PhaseLabel = (typeof PHASE_ORDER)[number];

const PROBE_PHASE: Record<ProbeId, PhaseLabel> = {
  P01: 'Incident account',
  P02: 'Timeline',
  // Deepening probes (CDM sweep 3)
  P03: 'Deepening probes',
  P04: 'Deepening probes',
  P05: 'Deepening probes',
  P06: 'Deepening probes',
  P07: 'Deepening probes',
  P08: 'Deepening probes',
  P09: 'Deepening probes',
  P10: 'Deepening probes',
  P11: 'Deepening probes',
  P12: 'Deepening probes',
  // What-if (CDM sweep 4)
  P13: 'What-if',
  P14: 'What-if',
  P23: 'What-if',
  P27: 'What-if',
  // Knowledge audit + contrast/confirmation (ACTA + Knowledge Checker)
  P15: 'Knowledge audit',
  P16: 'Knowledge audit',
  P17: 'Knowledge audit',
  P18: 'Knowledge audit',
  P19: 'Knowledge audit',
  P20: 'Knowledge audit',
  P21: 'Knowledge audit',
  P22: 'Knowledge audit',
  P24: 'Knowledge audit',
  P25: 'Knowledge audit',
  P26: 'Knowledge audit',
  P28: 'Knowledge audit',
  P29: 'Knowledge audit',
  P30: 'Knowledge audit',
  P31: 'Knowledge audit',
};

/**
 * Returns one phase label per turn. The phase follows the interviewer's current
 * probe; expert turns inherit the phase of the most recent Keystone probe so the
 * call panel shows a clean sweep progression.
 */
export function computePhaseByTurn(
  turns: { speaker: string; probe_id?: string | null }[],
): string[] {
  const out: string[] = [];
  let current: PhaseLabel = 'Incident account';
  for (const t of turns) {
    if (t.speaker === 'Keystone' && t.probe_id) {
      const base = baseProbeId(t.probe_id); // strip "-follow_up"
      if (isProbeId(base)) current = PROBE_PHASE[base];
    }
    out.push(current);
  }
  return out;
}

/** The sweep a probe belongs to, for labelling one probe on its own. */
export function probePhase(probeId: string): PhaseLabel | undefined {
  const base = baseProbeId(probeId);
  return isProbeId(base) ? PROBE_PHASE[base] : undefined;
}
