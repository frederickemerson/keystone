// Serialisable props for the Incident Decision Room. The server page loads
// data/ + pills/ and hands these plain-JSON shapes to the client room, where
// the (pure) engine runs on every replay step.

import type { PillBundle } from '@/lib/pills/load';
import type {
  AssetRecord,
  IncidentRecord,
  TenantMessageFixture,
  Timeline,
} from '@/lib/data/schemas';

/**
 * The orchestrator LLM's recorded proposal (data/fixtures/llm/ai-proposals-*.json),
 * resolved against the timeline. The deterministic gate named by `ruleId`
 * decides whether it may proceed (SPEC §1 Wow 1).
 */
export interface AiProposal {
  proposalId: string;
  /** Rule that gates this proposal. */
  ruleId: string;
  text: string;
  model: string;
  /** Replay step (1-based event count) at which the model made the proposal. */
  afterStep: number;
}

/** One incident + the asset it happened on + its evidence timeline. */
export interface IncidentScenario {
  incident: IncidentRecord;
  asset: AssetRecord;
  timeline: Timeline;
  /** Recorded LLM tenant-message draft (null when the incident has none). */
  tenantMessage: TenantMessageFixture | null;
  /** Recorded LLM proposals for this incident ([] when none recorded). */
  aiProposals: AiProposal[];
}

/** The pill fields the room needs (drops SKILL.md body / changelog). */
export type RoomPill = Pick<PillBundle, 'id' | 'domain' | 'name' | 'pill'>;

export interface IncidentRoomProps {
  primary: IncidentScenario;
  /** Same pills on a different asset profile (Wow 3), when one exists. */
  overlay: IncidentScenario | null;
  pills: RoomPill[];
  /** Replay position to open at (`?step=` deep link): event count or "end". */
  initialStep?: number | 'end';
}
