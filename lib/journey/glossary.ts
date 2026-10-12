// Plain-language meanings for the terms a newcomer meets. One source for the
// glossary popover (<Term>) and the glossary panel; copy is sentence case.

export interface GlossaryEntry {
  term: string;
  /** One or two sentences, no other jargon. */
  meaning: string;
}

export const GLOSSARY = {
  pill: {
    term: 'Intelligence Pill',
    meaning:
      "A versioned package of an expert's rules for one kind of situation, such as a chilled-water leak. Each rule links back to the moment the expert said it.",
  },
  rule: {
    term: 'Rule',
    meaning: 'One decision the expert would make, written so a computer can check it. Ids such as TS-07 name a rule inside a pill.',
  },
  gate: {
    term: 'Safety gate',
    meaning:
      'A rule that blocks an action until the evidence it needs is confirmed by a person. Gates are checked by fixed code, never by the AI.',
  },
  evidence: {
    term: 'Evidence',
    meaning: 'A fact a rule needs before an action is allowed, such as "the LEW has signed off". A named person confirms it.',
  },
  shadow: {
    term: 'Trial run (Shadow)',
    meaning:
      'A new version runs silently beside the live one on real and past incidents. Its decisions are compared, not acted on, until someone approves it.',
  },
  version: {
    term: 'Version',
    meaning: 'Every change to a pill makes a new numbered version. Draft, then trial run, then approved; any approved version can be rolled back.',
  },
  peer_confirm: {
    term: 'Peer confirmation',
    meaning: 'Someone other than the speaker and the proposer checks a rule that came from a frontline note before it can be trialled.',
  },
  read_back: {
    term: 'Read-back',
    meaning: 'Numbers, times, equipment tags and roles in a voice note are highlighted so the speaker can confirm or correct them.',
  },
  provenance: {
    term: 'Provenance',
    meaning: 'Where a rule came from: who said it, when, and the exact words.',
  },
  action_class: {
    term: 'Action class',
    meaning: 'How much human sign-off an action needs: recommend, requires approval, or must escalate.',
  },
  lew: {
    term: 'LEW',
    meaning: "Licensed Electrical Worker: the person in Singapore who must sign off before electrical equipment is switched back on.",
  },
  connector: {
    term: 'Connector',
    meaning: 'A source of incident evidence, such as building alarms or work orders. Each is marked live, simulated or planned.',
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
