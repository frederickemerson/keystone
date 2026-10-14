// The pre-rendered audio, held to the transcript it speaks.
//
// The risk this guards is drift: a transcript turn gets reworded, the manifest
// still has audio for the old wording, and the call plays a sentence that is
// not the one on screen. Keying on the text makes that a miss rather than a
// mismatch, and this test makes the miss visible.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTranscript } from '@/lib/data';
import { EXPERT_CALL_INTERVIEW_ID } from '@/components/incident/expertCall';
import { loadExercise } from '@/lib/teach/load';
import { SCENARIO_STAGES } from '@/lib/teach/scenario';
import { manifestGeneratedAt, manifestSize, prerendered } from '../manifest';
import { TTS_ROLES } from '../roles';

const PUBLIC_DIR = join(process.cwd(), 'public');
const transcript = loadTranscript(EXPERT_CALL_INTERVIEW_ID)!;

function roleOf(speaker: string) {
  return speaker === transcript.expert.name ? 'expert' : 'interviewer';
}

describe('the pre-rendered speech manifest', () => {
  it('is not empty, and says when it was made', () => {
    expect(manifestSize()).toBeGreaterThan(0);
    expect(manifestGeneratedAt()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('has audio for every turn of the recorded call', () => {
    const missing = transcript.turns.filter((turn) => !prerendered(roleOf(turn.speaker), turn.text));
    expect(missing.map((t) => `${t.t} ${t.speaker}`)).toEqual([]);
  });

  it('points at files that exist', () => {
    for (const turn of transcript.turns) {
      const entry = prerendered(roleOf(turn.speaker), turn.text)!;
      expect(existsSync(join(PUBLIC_DIR, entry.file))).toBe(true);
    }
  });

  it('gives the expert and the interviewer different voices', () => {
    const voices = new Map<string, Set<string>>();
    for (const turn of transcript.turns) {
      const role = roleOf(turn.speaker);
      const entry = prerendered(role, turn.text)!;
      voices.set(role, (voices.get(role) ?? new Set()).add(entry.voice));
    }
    for (const role of TTS_ROLES) expect(voices.get(role)?.size).toBe(1);
    expect([...voices.get('expert')!][0]).not.toBe([...voices.get('interviewer')!][0]);
  });

  it('records where each file was synthesised, so the UI can still say so', () => {
    const entry = prerendered(roleOf(transcript.turns[0].speaker), transcript.turns[0].text)!;
    expect(entry.region).toBeTruthy();
    expect(entry.model).toBeTruthy();
  });

  it('never serves one role’s audio for the other', () => {
    const expertTurn = transcript.turns.find((t) => t.speaker === transcript.expert.name)!;
    expect(prerendered('expert', expertTurn.text)).toBeDefined();
    expect(prerendered('interviewer', expertTurn.text)).toBeUndefined();
  });

  it('misses rather than mismatches when a turn is reworded', () => {
    const turn = transcript.turns[0];
    expect(prerendered(roleOf(turn.speaker), `${turn.text} and one more thing`)).toBeUndefined();
  });

  it('stays small enough to ship: speech bitrate, not music bitrate', () => {
    for (const turn of transcript.turns) {
      const entry = prerendered(roleOf(turn.speaker), turn.text)!;
      // 48 kbit/s mono: about 6 KB a second, so 10 KB per second is a generous ceiling.
      const seconds = turn.text.length / 14;
      expect(entry.bytes).toBeLessThan(Math.max(40_000, seconds * 10_000));
    }
  });
});

// Regression. The first render covered only the transcript, so every line the
// exercise spoke went to the live route instead — and a single walk through
// /teach hit 429 after six of them, because the live budget is ten calls a
// minute (lib/ratelimit/policies). Fixed text has to be here, not bought.
describe('the exercise speaks from the manifest, not the metered route', () => {
  const exercise = loadExercise('technical-services-chilled-water-leak')!;

  it('has audio for every scenario caption', () => {
    const missing = SCENARIO_STAGES.filter((stage) => !prerendered('interviewer', stage.caption));
    expect(missing.map((s) => s.id)).toEqual([]);
  });

  it('has audio for every question prompt', () => {
    const questions = [exercise.opening, ...exercise.questions];
    const missing = questions.filter((q) => !prerendered('interviewer', q.prompt));
    expect(missing.map((q) => q.id)).toEqual([]);
  });

  it('has audio for the scene-setting on every question that has one', () => {
    const questions = [exercise.opening, ...exercise.questions].filter((q) => q.given);
    expect(questions.length).toBeGreaterThan(0);
    const missing = questions.filter((q) => !prerendered('interviewer', q.given!));
    expect(missing.map((q) => q.id)).toEqual([]);
  });

  it('gives the exercise the interviewer voice, never the expert\u2019s', () => {
    for (const stage of SCENARIO_STAGES) {
      expect(prerendered('expert', stage.caption)).toBeUndefined();
    }
  });
});
