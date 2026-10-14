// The situation the exercise is about.
//
// The captions live in data/teach/scenario.json rather than in this file, for
// the same reason the questions do: three things need them and only one is
// React. The pre-render script has to synthesise each caption, the manifest
// test has to check that it did, and the component only draws the stage it is
// given.
//
// It is JSON and not a TypeScript literal because the script is plain node and
// cannot import this module. Reading the captions back out of source with a
// regex was the first attempt, and it silently dropped the one caption long
// enough that the formatter wrapped it onto a second line — so the stage it
// narrated had no audio and went to the metered route instead. Shared data
// that two languages must read is a data file.

import scenario from '@/data/teach/scenario.json';

export interface ScenarioStageData {
  id: string;
  caption: string;
}

export const SCENARIO_STAGES: readonly ScenarioStageData[] = scenario.stages;

export type ScenarioStageId = string;

export function stageIndex(id: ScenarioStageId): number {
  return SCENARIO_STAGES.findIndex((stage) => stage.id === id);
}

/** The first stage, so a caller never has to know which id that is. */
export const FIRST_STAGE: ScenarioStageId = scenario.stages[0].id;
