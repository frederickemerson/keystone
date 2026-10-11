// Local presentational prop types for MOSAIC shared UI components.
// Engine-contract types (ActionClass, ActionStatus, ActionDecision, Rule) are
// imported directly from "@/lib/engine/types" where needed.

import type { ActionClass, ActionStatus, Rule } from '@/lib/engine/types';

export type { ActionClass, ActionStatus, Rule };

// ---------------------------------------------------------------------------
// EvidenceTimeline
// ---------------------------------------------------------------------------

export type TimelineSource =
  | 'iBMS'
  | 'CMMS'
  | 'tenant'
  | 'technician'
  | 'contractor'
  | 'LEW'
  | (string & {});

export interface EvidenceUpdate {
  value: unknown;
  confirmed: boolean;
}

export interface TimelineEvent {
  id: string;
  /** ISO-8601 timestamp, e.g. "2026-10-11T08:02:18+08:00". */
  at: string;
  source: TimelineSource;
  type?: string;
  text: string;
  evidence_updates?: Record<string, EvidenceUpdate>;
  sensitivity?: 'public' | 'internal' | 'tenant_pii' | 'commercial' | (string & {});
}

// ---------------------------------------------------------------------------
// TranscriptLine
// ---------------------------------------------------------------------------

export interface TranscriptTurn {
  t: string;
  speaker: string;
  text: string;
  probe_id?: string | null;
  extracted_rule_ids?: string[];
}

// ---------------------------------------------------------------------------
// PillCard
// ---------------------------------------------------------------------------

export type PillStatus = 'Draft' | 'Shadow' | 'Approved' | 'Retired';

export interface PillCardData {
  name: string;
  domain: string;
  version: string;
  status: PillStatus;
  owner: string;
  steward: string;
  approver: string;
  /** Either a list of asset ids/names or a count. */
  assetsCovered: string[] | number;
  evalPass: { pass: number; total: number };
  shadowAgreements: number;
  pendingCorrections: number;
  /** Human-readable next review date string. */
  nextReviewDate: string;
}

// ---------------------------------------------------------------------------
// WhyDrawer
// ---------------------------------------------------------------------------

export interface WhyDrawerEvidence {
  key: string;
  confirmed: boolean;
}

export interface WhyDrawerRule {
  id: string;
  title: string;
  version: string;
}

export interface WhyDrawerExpertSource {
  quote: string;
  timestamp: string;
  /** Audio/transcript source id passed to onPlay. */
  source?: string;
  /** Expert's name for the handwritten attribution (defaults to "the expert"). */
  expert?: string;
  /** Expert's role, shown typeset beside the attribution. */
  role?: string;
}

// ---------------------------------------------------------------------------
// DiffView
// ---------------------------------------------------------------------------

export type DiffKind = 'add' | 'remove' | 'change';

export interface DiffItem {
  /** Field/section label, e.g. "decision". */
  label: string;
  before: string;
  after: string;
  kind?: DiffKind;
}
