// Frontline capture tasks raised from the incident room (docs/capture/PLAN.md F1).
//
// Pure + client-safe. What makes a decision a capture moment is read from the
// ENGINE's own classification of the action at the moment the human decided
// (ActionStatus) plus the recorded outcome — never from rule titles or text:
//   - the gate was blocking the action (status "blocked") and the human acted
//     on it anyway (escalated, asked for evidence)  → gate_blocked;
//   - the rule asked for a human approval (status "needs_approval") and the
//     human rejected its recommendation             → gate_override.
// Everything else (approving a requires-approval action, escalating a
// must-escalate one) is the rule working as written: no question to ask.

import type { ActionStatus } from '@/lib/engine/types';
import type { DecisionOutcome } from '@/lib/governance/access';
import { CAPTURE_TASK_ID, type CaptureTask, type CaptureTaskKind } from '@/lib/capture';

export type GateTaskKind = Extract<CaptureTaskKind, 'gate_blocked' | 'gate_override'>;
export type NewCaptureTask = Omit<CaptureTask, 'status' | 'answeredBy' | 'noteId'>;

/** Which gate capture task (if any) a human decision on an engine action raises. */
export function gateTaskKind(status: ActionStatus, outcome: DecisionOutcome): GateTaskKind | null {
  if (status === 'blocked') return 'gate_blocked';
  if (status === 'needs_approval' && outcome === 'rejected') return 'gate_override';
  return null;
}

const KIND_CODE: Record<CaptureTaskKind, string> = {
  gate_blocked: 'GB',
  gate_override: 'GO',
  job_closeout: 'JC',
  asset_qr: 'QR',
};

/**
 * A fresh task id (CT-…). Unique per creation — a task answered or dismissed
 * earlier never blocks a new one for the same moment; de-duplication of OPEN
 * tasks is the contract's findOpenCaptureTask, not the id.
 */
export function newCaptureTaskId(kind: CaptureTaskKind, parts: readonly (string | undefined)[], at: string): string {
  const stamp = Date.parse(at).toString(36);
  const body = [KIND_CODE[kind], ...parts.filter((p): p is string => Boolean(p)), stamp]
    .join('-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .slice(0, 60);
  const id = `CT-${body}`;
  if (!CAPTURE_TASK_ID.test(id)) throw new Error(`Cannot build a capture task id from ${parts.join(', ')}`);
  return id;
}

/** Latest task (any status) for this moment and role: what the action card shows inline. */
export function latestTask(
  tasks: readonly CaptureTask[],
  key: { kinds: readonly CaptureTaskKind[]; incidentId: string; ruleId?: string; createdFor: string },
): CaptureTask | undefined {
  let found: CaptureTask | undefined;
  for (const t of tasks) {
    if (!key.kinds.includes(t.kind) || t.incidentId !== key.incidentId || t.ruleId !== key.ruleId) continue;
    if (t.createdFor !== key.createdFor) continue;
    if (!found || Date.parse(t.createdAt) >= Date.parse(found.createdAt)) found = t;
  }
  return found;
}

/** Seconds the question asks for: gates 20 s, close-out 10 s (PLAN: micro-capture, 15–60 s target). */
export const PROMPT_SECONDS: Record<CaptureTaskKind, number> = {
  gate_blocked: 20,
  gate_override: 20,
  job_closeout: 10,
  asset_qr: 20,
};

/** Headline shown on the task card. */
export function taskHeadline(kind: CaptureTaskKind): string {
  return kind === 'job_closeout'
    ? `Close-out note — ${PROMPT_SECONDS[kind]} seconds`
    : `Tell us why — ${PROMPT_SECONDS[kind]} seconds`;
}

function gatePrompt(kind: GateTaskKind, ruleId: string, step: number | undefined): string {
  const at = step ? ` at step ${step}` : '';
  return kind === 'gate_blocked'
    ? `${ruleId} blocked you${at}. What did you know that the gate didn't? (${PROMPT_SECONDS[kind]} s)`
    : `You overrode ${ruleId}${at}. What made the rule wrong here? (${PROMPT_SECONDS[kind]} s)`;
}

/** The task a gate decision raises, addressed to the acting role, on the incident's asset. */
export function buildGateTask(input: {
  kind: GateTaskKind;
  incidentId: string;
  assetId: string;
  ruleId: string;
  pillId: string;
  role: string;
  step?: number;
  at: string;
}): NewCaptureTask {
  return {
    id: newCaptureTaskId(input.kind, [input.incidentId, input.ruleId], input.at),
    kind: input.kind,
    incidentId: input.incidentId,
    assetId: input.assetId,
    ruleId: input.ruleId,
    pillId: input.pillId,
    createdAt: input.at,
    createdFor: input.role,
    prompt: gatePrompt(input.kind, input.ruleId, input.step),
  };
}

/** The close-out task: one short note at the end of the job, for the person closing it out. */
export function buildCloseoutTask(input: { incidentId: string; assetId: string; role: string; at: string }): NewCaptureTask {
  return {
    id: newCaptureTaskId('job_closeout', [input.incidentId], input.at),
    kind: 'job_closeout',
    incidentId: input.incidentId,
    assetId: input.assetId,
    createdAt: input.at,
    createdFor: input.role,
    prompt: `Closing out ${input.incidentId}: what should the next shift know? (${PROMPT_SECONDS.job_closeout} s)`,
  };
}

/** Open tasks addressed to `role`, newest first. */
export function openTasksFor(tasks: readonly CaptureTask[], role: string): CaptureTask[] {
  return tasks
    .filter((t) => t.status === 'open' && t.createdFor === role)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
