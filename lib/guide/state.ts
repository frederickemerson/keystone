// Guided demo state: which step, and whether the panel is open. Kept in
// sessionStorage so a reload resumes the tour; storage can be missing or throw
// (private mode, blocked site data), so every access is guarded and the tour
// simply starts fresh.

import { DEMO_PATH } from '@/lib/journey';

export const GUIDE_STORAGE_KEY = 'keystone.guide.v1';

export interface GuideState {
  /** Index into DEMO_PATH. */
  step: number;
  /** Panel shown. A closed tour keeps its step and can be resumed from the header. */
  open: boolean;
  /**
   * Step details hidden. Belongs to the current step only: every step change
   * shows the new step's "Do this" again.
   */
  collapsed: boolean;
  /** The last step was finished: the panel shows the end card instead of a step. */
  finished: boolean;
}

const lastStep = DEMO_PATH.length - 1;

function clampStep(step: number): number {
  return Math.min(Math.max(0, Math.trunc(step)), lastStep);
}

/** Validate stored JSON; anything malformed means "no tour". */
export function parseGuideState(raw: string | null | undefined): GuideState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { step, open, collapsed, finished } = value as Record<string, unknown>;
    if (typeof step !== 'number' || !Number.isFinite(step) || typeof open !== 'boolean') return null;
    if (step < 0 || step > lastStep) return null;
    // Fields added later default to false, so a tour saved by an older build resumes.
    return { step: Math.trunc(step), open, collapsed: collapsed === true, finished: finished === true };
  } catch {
    return null;
  }
}

export type GuideAction =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: number }
  | { type: 'close' }
  | { type: 'resume' }
  | { type: 'toggleDetails' }
  | { type: 'finish' }
  | { type: 'end' };

/** A fresh, open step: details shown, not finished. */
function atStep(step: number): GuideState {
  return { step: clampStep(step), open: true, collapsed: false, finished: false };
}

/** Pure transitions; returns a new object, never mutates. */
export function guideReducer(state: GuideState | null, action: GuideAction): GuideState | null {
  switch (action.type) {
    case 'start':
      return atStep(0);
    case 'end':
      return null;
    case 'goto':
      return atStep(action.step);
    default:
      break;
  }
  if (!state) return null;
  switch (action.type) {
    case 'next':
      return atStep(state.step + 1);
    case 'back':
      return atStep(state.step - 1);
    case 'toggleDetails':
      return { ...state, collapsed: !state.collapsed };
    case 'finish':
      return { step: lastStep, open: true, collapsed: false, finished: true };
    case 'close':
      return { ...state, open: false };
    case 'resume':
      return { ...state, open: true };
    default:
      return state;
  }
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readGuideState(storage: StorageLike | undefined): GuideState | null {
  try {
    return parseGuideState(storage?.getItem(GUIDE_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Persist; returns false when storage is unavailable (the tour still works in memory). */
export function writeGuideState(storage: StorageLike | undefined, state: GuideState | null): boolean {
  if (!storage) return false;
  try {
    if (state) storage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(state));
    else storage.removeItem(GUIDE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** sessionStorage, or undefined where it is absent or its accessor throws. */
export function browserSessionStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}
