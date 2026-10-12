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
  routes,
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
  href: string;
  /** What to do on the screen, one or two sentences. */
  doThis: string;
  /** What to notice, one sentence. */
  notice: string;
}

export const DEMO_PATH: readonly DemoStep[] = [
  {
    id: 'hear-expert',
    stage: 'capture',
    title: 'Hear the expert',
    role: 'chief_engineer',
    href: routes.capture(DEMO_EXPERT_TIMESTAMP),
    doThis: 'Play the onboarding call from 00:14:32, where the retiring Chief Engineer explains the LEW rule.',
    notice: 'Rule TS-07 appears beside the transcript, linked to his exact words.',
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
    href: routes.incident(DEMO_INCIDENT_ID, DEMO_GATE_STEP),
    doThis: 'You are Rajesh, the technician on the L23 leak. Try to re-energise the air-handling unit.',
    notice: 'TS-07 blocks it until the LEW signs off. Open "Why" to hear the expert say it.',
  },
  {
    id: 'teach-back',
    stage: 'learn',
    title: 'Teach it back in 20 seconds',
    role: 'technician',
    href: routes.incident(DEMO_INCIDENT_ID, DEMO_GATE_STEP),
    doThis: 'Answer the "Tell us why" task with the recorded demo note, then confirm the highlighted values.',
    notice: 'Your note becomes a draft rule. Nothing is live yet.',
  },
  {
    id: 'propose',
    stage: 'learn',
    title: 'Propose it as a new version',
    role: 'chief_engineer',
    href: routes.canvas(DEMO_PILL_ID),
    doThis: "Under Drafts from frontline notes, propose Rajesh's draft into the pill.",
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
    doThis: 'As Priya, put the version into a trial run (Shadow) and review how it compares on past incidents.',
    notice: 'The trial run decides nothing; it only shows where the new version would differ.',
  },
  {
    id: 'approve-reuse',
    stage: 'reuse',
    title: 'Approve and reuse',
    role: 'head_technical_services',
    href: routes.approvals(),
    doThis: 'As Goh, approve the version, then reopen the incident room.',
    notice: 'The pill now runs the new version; one click rolls it back.',
  },
];
