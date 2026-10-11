// "Ink on paper" status tones — one place for the four status ink/tint pairs
// (DESIGN.md). Always pair with an icon + text label; colour is never the only cue.

export type Tone = 'blocked' | 'escalate' | 'approval' | 'recommend' | 'neutral';

/** Pill chip classes: tinted paper, thin ink-coloured border, status ink text. */
export const TONE_CHIP: Record<Tone, string> = {
  blocked: 'border-blocked/45 bg-blocked-tint text-blocked',
  escalate: 'border-escalate-mark/45 bg-escalate-tint text-escalate',
  approval: 'border-approval/40 bg-approval-tint text-approval',
  recommend: 'border-recommend/40 bg-recommend-tint text-recommend',
  neutral: 'border-na/35 bg-na-tint text-na',
};

/** Panel/callout classes (larger tinted areas). */
export const TONE_PANEL: Record<Tone, string> = {
  blocked: 'border-blocked/35 bg-blocked-tint',
  escalate: 'border-escalate-mark/35 bg-escalate-tint',
  approval: 'border-approval/30 bg-approval-tint',
  recommend: 'border-recommend/30 bg-recommend-tint',
  neutral: 'border-line bg-na-tint',
};

/** Base classes for a status pill chip (pair with TONE_CHIP[tone]). */
export const CHIP_BASE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-xs font-medium leading-none';
