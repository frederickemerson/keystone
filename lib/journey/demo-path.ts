// The guided demo: one story, one person per step, one screen per step.
// "One sentence from a retiring expert stops an unsafe action, and a
// technician's 20-second note becomes a governed rule."
// Copy never hard-codes a future version number (the next version is derived
// from the pill's history at runtime).

import {
  DEMO_EXPERT_TIMESTAMP,
  DEMO_GATE_STEP,
  DEMO_INCIDENT_ID,
  DEMO_PILL_ID,
  GUIDE_ANCHORS,
  routes,
  withAnchor,
} from './routes';

/** The five stages of the loop, as the landing page names them. */
export const STAGES = [
  { id: 'capture', label: 'Capture' },
  { id: 'compile', label: 'Compile' },
  { id: 'apply', label: 'Apply' },
  { id: 'learn', label: 'Learn' },
  { id: 'reuse', label: 'Reuse' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];

export interface DemoStep {
  id: string;
  stage: StageId;
  /** Short imperative title, sentence case. */
  title: string;
  /** roles.json role the guided demo switches to for this step. */
  role: string;
  /** The step's screen; a `#fragment` names the element to bring into view (GUIDE_ANCHORS). */
  href: string;
  /** What to do on the screen, one or two sentences. */
  doThis: string;
  /** What to notice, one sentence. */
  notice: string;
}

export const DEMO_PATH: readonly DemoStep[] = [
  {
    id: 'teach-skill',
    stage: 'capture',
    title: 'Teach a skill',
    role: 'chief_engineer',
    // Straight into the chilled-water exercise. /teach itself is the chooser
    // now, and "step through the situation" is an instruction about this
    // session, not about picking one.
    href: routes.teach(DEMO_PILL_ID),
    doThis:
      'Step through the situation, answer the open question in your own words, then answer the few that follow. Say the riser first, and the sub-valve when the branch-leak case comes up.',
    notice:
      'The board on the right is the fields of a real rule, not a position in a script — and when your two isolation answers disagree, nothing had to read them to notice.',
  },
  {
    id: 'hear-expert',
    stage: 'capture',
    title: 'Hear where it came from',
    role: 'chief_engineer',
    href: routes.capture(DEMO_EXPERT_TIMESTAMP),
    doThis: 'Play the recorded onboarding call from 00:14:32, where the retiring Chief Engineer explains the LEW rule.',
    notice: 'Rule TS-07 appears beside the transcript, linked to his exact words — this transcript is what every provenance citation points into.',
  },
  {
    id: 'confirm-rule',
    stage: 'compile',
    title: 'Confirm the rule',
    role: 'chief_engineer',
    href: routes.canvas(DEMO_PILL_ID, 'TS-07'),
    doThis: 'On the decision canvas, read TS-07 and confirm it.',
    notice: 'Each rule shows the quote it came from; the AI only drafted it.',
  },
  {
    id: 'gate-blocks',
    stage: 'apply',
    title: 'Watch the gate hold',
    role: 'technician',
    href: withAnchor(routes.incident(DEMO_INCIDENT_ID, DEMO_GATE_STEP), GUIDE_ANCHORS.blockedGate),
    doThis:
      'You are Rajesh, the technician on the L23 leak. The AI proposed re-energising the air-handling unit, and TS-07 holds it. Open "Why? · Hear the expert", then press "Escalate to … Duty Licensed Electrical Worker".',
    notice: 'The gate is fixed code: the AI cannot override it. Escalating hands the decision to the Duty LEW and asks you one question.',
  },
  {
    id: 'teach-back',
    stage: 'learn',
    title: 'Teach it back in 20 seconds',
    role: 'technician',
    href: withAnchor(routes.incident(DEMO_INCIDENT_ID, DEMO_GATE_STEP), GUIDE_ANCHORS.captureTask),
    doThis:
      'Escalating opened the "Tell us why — 20 seconds" task below. Accept the recording notice if asked, choose "Demo note", then "Use this demo note" (the recorded note for this incident), mark each highlighted value "Right", then press "Draft rule".',
    notice: 'Your note becomes one draft rule, credited to you. Nothing is live yet.',
  },
  {
    id: 'propose',
    stage: 'learn',
    title: 'Propose it as a new version',
    role: 'chief_engineer',
    href: withAnchor(routes.canvas(DEMO_PILL_ID), GUIDE_ANCHORS.noteDrafts),
    doThis: "Under Drafts from frontline notes, propose the draft from Rajesh's note into the pill.",
    notice: 'It becomes a Draft version. Rajesh is credited; the rule keeps his words.',
  },
  {
    id: 'peer-confirm',
    stage: 'learn',
    title: 'Peer check',
    role: 'technical_services_lead',
    href: routes.approvals(),
    doThis: 'As Hafiz, confirm the rule (or dispute it with a reason).',
    notice: 'The speaker and the proposer cannot confirm their own rule.',
  },
  {
    id: 'trial-run',
    stage: 'learn',
    title: 'Start the trial run',
    role: 'asset_operations_manager',
    href: routes.approvals(),
    doThis: 'As Priya, put the version into a trial run (Shadow).',
    notice: 'The approvals card shows the trial result: how many past incidents the new version agrees with the live one on.',
  },
  {
    id: 'approve-reuse',
    stage: 'reuse',
    title: 'Approve and reuse',
    role: 'head_technical_services',
    href: routes.approvals(),
    doThis: 'As Goh, approve.',
    notice: 'The incident room now runs the new version, and Learning can roll it back to the previous version in one click.',
  },
];

/** The end card after the last step: what the demo showed, and where to go next. */
export const DEMO_FINISH = {
  title: 'You finished the guided demo',
  saw: [
    "Capture: a retiring expert's sentence became rule TS-07, linked to his exact words.",
    'Compile: a named engineer confirmed the rule; the AI only drafted it.',
    'Apply: the gate held an unsafe action until the Duty LEW signs off.',
    "Learn: a technician's 20-second note became a draft, peer-checked, trial-run and approved by named people.",
    'Reuse: the incident room runs the new version, and every decision is in the record.',
  ],
  links: [
    { label: 'Decision record', href: routes.incidentRecord(DEMO_INCIDENT_ID) },
    { label: 'Connectors', href: routes.connectors() },
  ],
} as const;
