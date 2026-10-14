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
  agent_answer_disputed: 'AD',
  new_skill_candidate: 'NS',
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
  // A disputed answer needs the correction said properly, not a soundbite.
  agent_answer_disputed: 30,
  // Explaining how you solved something nobody had a rule for is the longest
  // ask in the system, and the most valuable answer in it.
  new_skill_candidate: 45,
};

/** Headline shown on the task card. */
export function taskHeadline(kind: CaptureTaskKind): string {
  if (kind === 'job_closeout') return `Close-out note — ${PROMPT_SECONDS[kind]} seconds`;
  if (kind === 'agent_answer_disputed') return `Put it right — ${PROMPT_SECONDS[kind]} seconds`;
  if (kind === 'new_skill_candidate') return `How did you solve it? — ${PROMPT_SECONDS[kind]} seconds`;
  return `Tell us why — ${PROMPT_SECONDS[kind]} seconds`;
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

/** Longest question the schema accepts; the quoted question is trimmed to fit. */
const PROMPT_LIMIT = 280;

/**
 * The question a disputed agent answer puts to the expert.
 *
 * The reader's own question is quoted back, because that is the part that
 * carries what they were actually trying to find out — and it is the part that
 * normally evaporates. It is trimmed rather than dropped so the prompt always
 * fits the schema's limit.
 */
export function agentDisputePrompt(question: string, grounded: boolean, seconds: number): string {
  const head = grounded
    ? 'Our published agent answered this and a reader says it is wrong:'
    : 'Our published agent answered this with nothing from the pill behind it:';
  const tail = ` What is the right answer? (${seconds} s)`;
  const room = PROMPT_LIMIT - head.length - tail.length - 3; // 3 = space + the two quote marks
  const asked = question.trim();
  const quoted = asked.length > room ? `${asked.slice(0, Math.max(0, room - 1)).trimEnd()}…` : asked;
  return `${head} “${quoted}”${tail}`;
}

/**
 * A reader marked a published agent's answer wrong or incomplete.
 *
 * The one task kind Keystone does not raise for itself. It exists because this
 * exchange — question asked, answered badly, corrected out loud, forgotten — is
 * the most perishable knowledge there is, and the usual fate of it is nothing.
 */
export function buildAgentDisputeTask(input: {
  pillId: string;
  assetId: string;
  /** The rule the reader says this is about, when the answer was about one. */
  ruleId?: string;
  /** The role being asked to put it right. */
  role: string;
  question: string;
  /** Whether the agent retrieved anything from the pill before answering. */
  grounded: boolean;
  at: string;
}): NewCaptureTask {
  return {
    id: newCaptureTaskId('agent_answer_disputed', [input.pillId, input.ruleId ?? 'no-rule'], input.at),
    kind: 'agent_answer_disputed',
    assetId: input.assetId,
    ruleId: input.ruleId,
    pillId: input.pillId,
    createdAt: input.at,
    createdFor: input.role,
    prompt: agentDisputePrompt(input.question, input.grounded, PROMPT_SECONDS.agent_answer_disputed),
  };
}

/**
 * The question a new-skill candidate asks.
 *
 * It asks for the REASONING, not the fix. The record already holds what was
 * done — the outcome field says so. What is missing is how the person knew to
 * look where they looked, and that is the part that becomes a rule.
 */
export function newSkillPrompt(incidentId: string, seconds: number): string {
  return `${incidentId} was solved, but no rule in any approved pill fired on it. How did you know where to look? (${seconds} s)`;
}

/**
 * The replay found a solved incident no approved rule accounts for.
 *
 * The only task Keystone raises about ITSELF rather than about a person's
 * decision: nobody did anything wrong, the record simply holds judgement the
 * pills do not. It carries no rule id on purpose — which rule, and which pill,
 * is what the answer is for.
 */
export function buildNewSkillTask(input: {
  incidentId: string;
  assetId: string;
  /** The role being asked how they solved it. */
  role: string;
  at: string;
}): NewCaptureTask {
  return {
    id: newCaptureTaskId('new_skill_candidate', [input.incidentId], input.at),
    kind: 'new_skill_candidate',
    incidentId: input.incidentId,
    assetId: input.assetId,
    createdAt: input.at,
    createdFor: input.role,
    prompt: newSkillPrompt(input.incidentId, PROMPT_SECONDS.new_skill_candidate),
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
