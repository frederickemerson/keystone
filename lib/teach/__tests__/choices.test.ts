// The chooser's description of a pill, held to the pill itself.
//
// Every line a person reads before committing ten minutes is assembled from
// the pill: the expert from provenance.json, the roles from the rules'
// `owner` and `escalate_to`, the drawing from the scenario, the count from the
// exercise. These tests recompute each of those from the source and compare,
// so a card can never say something the pill does not.

import { describe, expect, it } from 'vitest';
import { loadPill, listPillRefs } from '@/lib/pills/load';
import { roleLabel } from '@/lib/governance/access';
import { DEMO_PILL_ID, routes } from '@/lib/journey/routes';
import { DEMO_PATH } from '@/lib/journey/demo-path';
import { teachChoice, teachChoices } from '../choices';
import { loadExercise } from '../load';
import { scenarioStages } from '../scenario';

const DRAWN = 'technical-services-chilled-water-leak';
const UNDRAWN = 'tenant-experience-incident-comms';

describe('the pills offered on the chooser', () => {
  it('offers exactly the pills the screen can open, so a card can never lead to a dead end', () => {
    const choices = teachChoices();
    expect(choices.length).toBeGreaterThan(1);
    const openable = listPillRefs()
      .map((ref) => ref.id)
      .filter((id) => loadExercise(id) !== null);
    expect(choices.map((choice) => choice.id)).toEqual(openable);
  });

  it('is null for a pill that does not exist, rather than a card about nothing', () => {
    expect(teachChoice('no-such-pill')).toBeNull();
  });

  it('carries where the questions came from, and the two kinds both occur', () => {
    const choices = teachChoices();
    for (const choice of choices) {
      expect(choice.origin).toBe(loadExercise(choice.id)!.origin);
    }
    // The distinction is only worth showing because it is real in practice.
    expect(new Set(choices.map((choice) => choice.origin)).size).toBe(2);
  });

  it('names the expert the pill was elicited from', () => {
    for (const choice of teachChoices()) {
      const bundle = loadPill(choice.id)!;
      expect(choice.expert?.name).toBe(bundle.expert?.name);
      expect(choice.expert?.role).toBe(bundle.expert?.role);
    }
  });

  it('lists only roles the pill’s own rules name', () => {
    for (const choice of teachChoices()) {
      const rules = loadPill(choice.id)!.pill.rules;
      const fromRules = new Set<string>();
      for (const rule of rules) {
        for (const role of [rule.owner, rule.escalate_to.role, rule.escalate_to.fallback]) {
          if (role) fromRules.add(roleLabel(role));
        }
        for (const override of Object.values(rule.asset_overrides)) {
          if (override.escalate_to?.role) fromRules.add(roleLabel(override.escalate_to.role));
        }
        for (const exception of rule.exceptions) {
          if (exception.escalate_to?.role) fromRules.add(roleLabel(exception.escalate_to.role));
        }
      }
      expect(choice.roles.length).toBeGreaterThan(0);
      for (const role of choice.roles) expect(fromRules).toContain(role);
      expect(new Set(choice.roles).size).toBe(choice.roles.length);
    }
  });

  it('counts the rules the pill actually holds', () => {
    for (const choice of teachChoices()) {
      expect(choice.ruleCount).toBe(loadPill(choice.id)!.pill.rules.length);
    }
  });

  it('names a rule the pill actually has, when it names one at all', () => {
    for (const choice of teachChoices()) {
      if (!choice.rule) continue;
      const rules = loadPill(choice.id)!.pill.rules;
      const rule = rules.find((candidate) => candidate.id === choice.rule!.id);
      expect(rule?.title).toBe(choice.rule.title);
    }
  });

  it('promises only the questions the session asks unprompted', () => {
    for (const choice of teachChoices()) {
      const exercise = loadExercise(choice.id)!.exercise;
      const volunteered = exercise.questions.filter((question) => !question.onContradictionOnly);
      expect(choice.questionCount).toBe(1 + volunteered.length);
      // The contradiction question is raised only when two answers disagree,
      // so counting it would promise an argument that may never happen.
      expect(choice.questionCount).toBeLessThanOrEqual(1 + exercise.questions.length);
    }
  });

  it('sends the guided demo into a session rather than at the chooser', () => {
    // /teach is the chooser, so a step whose instructions are about working
    // the chilled-water exercise has to address that exercise directly.
    const step = DEMO_PATH.find((candidate) => candidate.id === 'teach-skill');
    expect(step?.href).toBe(routes.teach(DEMO_PILL_ID));
    expect(teachChoice(DEMO_PILL_ID)).not.toBeNull();
  });

  it('shows a drawing only for the pill somebody drew one for', () => {
    const drawn = teachChoice(DRAWN)!;
    const undrawn = teachChoice(UNDRAWN)!;
    expect(drawn.stages?.length).toBeGreaterThan(1);
    expect(undrawn.stages).toBeNull();
    for (const choice of teachChoices()) {
      expect(choice.stages).toEqual(scenarioStages(loadExercise(choice.id)!.exercise.scenarioId));
    }
  });
});
