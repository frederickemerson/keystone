// A published agent answered, a reader says it is wrong, and that exchange
// becomes a question for the expert instead of evaporating.
//
// The failure that matters: a prompt the schema refuses. The reader's question
// is quoted into it and is bounded by a different limit than the schema's, so
// the trim is the thing worth pinning.

import { describe, expect, it } from 'vitest';
import { agentDisputePrompt, buildAgentDisputeTask, PROMPT_SECONDS } from '@/components/incident/captureTasks';
import { captureTaskSchema } from '../contract';

const AT = '2026-10-14T09:15:00+08:00';
const BASE = {
  pillId: 'technical-services-chilled-water-leak',
  assetId: 'asset-hf1',
  role: 'head_technical_services',
  grounded: false,
  at: AT,
} as const;

/** The schema only accepts a complete task, so this is the real acceptance test. */
function accepted(task: unknown) {
  return captureTaskSchema.safeParse({ ...(task as object), status: 'open' });
}

describe('a disputed agent answer becomes a capture task', () => {
  it('is a task the governance schema accepts', () => {
    const task = buildAgentDisputeTask({ ...BASE, ruleId: 'TS-07', question: 'Who approves re-energising?' });
    const parsed = accepted(task);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
    expect(task.kind).toBe('agent_answer_disputed');
    expect(task.pillId).toBe(BASE.pillId);
    expect(task.createdFor).toBe('head_technical_services');
  });

  it('is accepted without a rule, because the agent may have cited none', () => {
    const task = buildAgentDisputeTask({ ...BASE, question: 'What has to be recorded before cleanup?' });
    expect(task.ruleId).toBeUndefined();
    expect(accepted(task).success).toBe(true);
  });

  it('is refused without the pill whose agent answered', () => {
    const task = buildAgentDisputeTask({ ...BASE, question: 'q question' });
    const { pillId: _dropped, ...withoutPill } = task;
    const parsed = accepted(withoutPill);
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain('pill');
  });

  it('quotes the reader’s own question back, because that is the part that is lost', () => {
    const prompt = agentDisputePrompt('Who approves re-energising?', false, 30);
    expect(prompt).toContain('Who approves re-energising?');
    expect(prompt).toContain('(30 s)');
  });

  it('says whether the pill was behind the answer', () => {
    const q = 'Who approves re-energising?';
    expect(agentDisputePrompt(q, false, 30)).toContain('nothing from the pill behind it');
    expect(agentDisputePrompt(q, true, 30)).toContain('a reader says it is wrong');
  });

  it('trims a question that would overflow the schema, rather than being refused', () => {
    // The ask endpoint accepts up to 300 characters; the prompt field accepts 280.
    const long = 'Why '.repeat(80).trim();
    expect(long.length).toBeGreaterThan(280);
    const task = buildAgentDisputeTask({ ...BASE, question: long });
    expect(task.prompt.length).toBeLessThanOrEqual(280);
    expect(task.prompt).toContain('…');
    expect(accepted(task).success).toBe(true);
  });

  it('keeps a question that fits exactly, without an ellipsis', () => {
    const task = buildAgentDisputeTask({ ...BASE, question: 'Short enough' });
    expect(task.prompt).not.toContain('…');
    expect(accepted(task).success).toBe(true);
  });

  it('asks for long enough to say it properly', () => {
    // A correction is not a soundbite; the gate prompts ask for 20 s.
    expect(PROMPT_SECONDS.agent_answer_disputed).toBeGreaterThanOrEqual(20);
  });
});
