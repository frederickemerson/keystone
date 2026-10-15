// How the film is shot: the order of acts, each one's mood, the stage of the
// product it lives in, and how it is entered. The script owns the words; this
// owns the pictures. Per-act stages and motion live in scripts/acts/<id>.mjs.

export const PALETTE = {
  night: '#15121f',
  nightDeep: '#0e0c16',
  cream: '#f6f5fa',
  lavender: '#8b7cf6',
  dew: '#eeecf4',
  blocked: '#e8503f',
  approval: '#d79a3a',
  grounded: '#3fb97a',
  muted: '#9a93b5',
};

/**
 * The product's own five stages, as its nav names them. Every act is tagged
 * with the one it lives in, so the film and the website read as one map.
 */
export const STAGE = {
  'act-00': null,
  'act-01': null,
  'act-1b': 'I–V · THE LOOP',
  'act-2a': 'I · CAPTURE',
  'act-02': 'I · CAPTURE',
  'act-03': 'I · CAPTURE',
  'act-04': 'III · APPLY',
  'act-05': 'III · APPLY',
  'act-06': 'III · APPLY',
  'act-07': 'IV · LEARN',
  'act-08': 'IV · LEARN',
  'act-09': 'IV · LEARN',
  'act-10': 'II · COMPILE',
  'act-11': null,
  'act-12': null,
  close: 'V · REUSE',
};

/** The ghost numeral that drifts behind each act: the stage, as a glyph. */
export const NUMERAL = {
  'act-1b': '∞', 'act-2a': 'I', 'act-02': 'I', 'act-03': 'I', 'act-04': 'III', 'act-05': 'III',
  'act-06': 'III', 'act-07': 'IV', 'act-08': 'IV', 'act-09': 'IV', 'act-10': 'II', close: 'V',
};

/** Keyston's mood per act — mapped from the beat, never decorative-random. */
export const MOOD = {
  'act-00': 'puzzled', 'act-01': 'idle', 'act-1b': 'thinking', 'act-2a': 'listening', 'act-02': 'listening',
  'act-03': 'listening', 'act-04': 'blocked', 'act-05': 'found', 'act-06': 'thinking', 'act-07': 'puzzled',
  'act-08': 'thinking', 'act-09': 'found', 'act-10': 'thinking', 'act-11': 'idle', 'act-12': 'thinking',
  close: 'pleased',
};

/**
 * How each act is entered. One primary (push) for related points, with accents
 * where the story turns: zoom-through into the loop, the callback, the
 * strongest act, and from the chooser's chilled-water card into the session;
 * blur where the picture continues; a dip where the register changes. Values
 * are the transition names in scripts/lib/chrome.mjs. The film opens on Tan
 * (act-01), then the AI asked what he knows (act-00): the script's section
 * order is the film's order.
 */
export const TRANSITION_IN = {
  'act-01': 'fade',
  'act-00': 'dip',
  'act-1b': 'zoom',
  'act-2a': 'push',
  'act-02': 'zoom',   // through the chilled-water card on the chooser, into the session
  'act-03': 'push',
  'act-04': 'push',
  'act-05': 'zoom',
  'act-06': 'blur',
  'act-07': 'whip',
  'act-08': 'push',
  'act-09': 'zoom',
  'act-10': 'push',
  'act-11': 'blur',
  'act-12': 'dip',
  close: 'blur',
};

/**
 * Acts cut for length. The handbook caps the film at eight minutes; the
 * script's own cut order is Act 10's two-metre beat → Act 8 → the last tip in
 * Act 11, and Act 9 is never cut. Act 8 ("top five, and why") goes first: it is
 * the one act that shows a list rather than a decision.
 */
export const CUT = new Set(['act-08']);

/** How long the outgoing and incoming hosts overlap for each transition. */
export const OVERLAP = { fade: 0, dip: 0.5, push: 0.5, whip: 0.32, zoom: 0.55, blur: 0.6, cut: 0 };
