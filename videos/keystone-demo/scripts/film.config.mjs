// How each act is shot. The script owns the words; this owns the pictures.
//
// `source` names recorded footage of the deployed site. An act with no source
// is motion graphics — and the two in the film that have none are the two that
// are deliberately NOT product shots: the cold open (a generic assistant, no
// Keystone chrome) and the close.
export const SHOTS = {
  'act-00': { kind: 'coldopen' },
  'act-01': { kind: 'knowledge-drain' },
  'act-02': { kind: 'footage', source: 'act-02.webm', from: 0, label: 'Teaching a skill' },
  'act-03': { kind: 'footage', source: 'act-03.webm', from: 0, label: 'Frontline capture' },
  'act-04': { kind: 'footage', source: 'act-04.webm', from: 2, label: 'The gate holds' },
  // One recorded ADP session, cut three ways, plus the refusal.
  'act-05': { kind: 'footage', source: 'adp-session.webm', from: 12, label: 'Grounded, and measured',
              second: { source: 'adp-ungrounded.webm', from: 30, at: 0.62 } },
  'act-06': { kind: 'footage', source: 'adp-session.webm', from: 34, label: 'One thread, not one question' },
  'act-07': { kind: 'footage', source: 'adp-session.webm', from: 49, label: 'Disputing an answer' },
  'act-08': { kind: 'footage', source: 'act-08.webm', from: 2, label: 'What to look at first' },
  'act-09': { kind: 'footage', source: 'act-09.webm', from: 1, label: 'A skill nobody wrote down' },
  'act-10': { kind: 'footage', source: 'act-10.webm', from: 2, label: 'One-off, or systemic' },
  'act-11': { kind: 'stills', stills: ['01a-codebuddy-plan-mode-hy4-subagents.png', '02c-codebuddy-scaffold-build-pass-7-routes.png', '04b-codebuddy-skill-ts07-answer.png', '05a-adp-agent-live-grounded.png'], label: 'How it was built' },
  close: { kind: 'close' },
};

/** Keyston's mood per act — mapped from the beat, never decorative-random. */
export const MOOD = {
  'act-00': 'puzzled', 'act-01': 'idle', 'act-02': 'listening', 'act-03': 'listening',
  'act-04': 'blocked', 'act-05': 'found', 'act-06': 'thinking', 'act-07': 'puzzled',
  'act-08': 'thinking', 'act-09': 'found', 'act-10': 'thinking', 'act-11': 'idle', close: 'pleased',
};

export const PALETTE = {
  night: '#15121f',
  nightDeep: '#0e0c16',
  cream: '#f6f5fa',
  lavender: '#8b7cf6',
  dew: '#eeecf4',
  blocked: '#e8503f',
  approval: '#d79a3a',
  muted: '#9a93b5',
};
