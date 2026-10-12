// Keystone governance — the trial run (Shadow). Pure + client-safe.
//
// A version in Shadow is replayed beside the live approved version over the
// pill's past incidents (its eval cases): both versions decide every incident,
// nothing is acted on, and each disagreement is recorded. The store runs this
// when a version enters Shadow, so "in Shadow" always means "has been trialled";
// approval then requires at least one recorded run (canApprove `no_trial_runs`).

import { evaluate, type EvalCase, type Pill } from "@/lib/engine";
import { makeShadowRun, type ShadowRun } from "./approval";

/** Replay every past incident through the live and the candidate version, side by side. */
export function replayTrial(
  live: Pill,
  candidate: Pill,
  cases: readonly EvalCase[],
  at: string = new Date().toISOString(),
): ShadowRun[] {
  return cases.map((c) => {
    const onLive = evaluate(live, c.asset, c.incident, c.evidence).actions;
    const onCandidate = evaluate(candidate, c.asset, c.incident, c.evidence).actions;
    return makeShadowRun(c.id, onLive, onCandidate, at);
  });
}
