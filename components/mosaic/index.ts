// MOSAIC shared UI components — pure, presentational, theme-token driven.
// Barrel re-export for `import { ... } from '@/components/mosaic'`.

export { ActionClassChip } from './ActionClassChip';
export { StatusBadge } from './StatusBadge';
export { EvidenceTimeline } from './EvidenceTimeline';
export { ActionCard } from './ActionCard';
export { WhyDrawer } from './WhyDrawer';
export { ConfidenceMeter } from './ConfidenceMeter';
export { PillCard } from './PillCard';
export { RuleTile } from './RuleTile';
export { TranscriptLine } from './TranscriptLine';
export { KpiStat } from './KpiStat';
export { DiffView } from './DiffView';
export { EmptyState } from './EmptyState';
export { SectionHeader } from './SectionHeader';
export { PageHeader } from './PageHeader';
export { PersonaName } from './PersonaName';
export { pillDisplayName, pillTitle } from './pillTitle';

// Notebook marginalia — the expert's handwritten voice (docs/design/DESIGN.md).
export { MarginNote, HandArrow } from './MarginNote';
export type { MarginArrowDirection } from './MarginNote';
export { MarkerHighlight } from './MarkerHighlight';
export { PillLabel } from './PillLabel';
export { ExpertQuote } from './ExpertQuote';
export { Sticker } from './Sticker';
export type { StickerKind } from './Sticker';
export { RomanList, toRoman } from './RomanList';
export type { RomanListItem } from './RomanList';
export { TONE_CHIP, TONE_PANEL, CHIP_BASE } from './tones';
export type { Tone } from './tones';

export type {
  TimelineEvent,
  TimelineSource,
  EvidenceUpdate,
  TranscriptTurn,
  PillCardData,
  PillStatus,
  WhyDrawerEvidence,
  WhyDrawerRule,
  WhyDrawerExpertSource,
  DiffItem,
  DiffKind,
} from './types';

// Re-export the engine-contract types these components are built around so
// consumers can import everything from one place. (ActionClass / ActionStatus /
// Rule are already re-exported via './types' above.)
export type { ActionDecision } from '@/lib/engine/types';
