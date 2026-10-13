// The coordination policy as the browser sees it.
//
// WHY THIS FILE EXISTS, AND WHY IT IS NOT A SECOND SOURCE OF TRUTH:
// data/coordination.yaml is the authored contract, and the Incident Room's
// conflict panel is a client component — the Next bundler ships JSON and TS to
// the browser, not YAML, and reading the file would mean a server-side
// filesystem read plus a new prop through a page this feature does not own
// (components/incident/types.ts belongs to the room). So the runtime
// projection of the contract (./contract projectPolicy) is written out here as
// a typed literal, and lib/coordination/__tests__/contract.test.ts asserts
// `COORDINATION_POLICY` equals `projectPolicy(data/coordination.yaml)` — a
// whole-value equality, so the two cannot drift: edit the YAML and this file
// fails the gate until it matches.
//
// Everything the contract pins but the runtime never reads (each class's
// description / predicate / falsified_when, each conflict's grounding) lives
// only in the YAML.

import { coordinationPolicySchema, type CoordinationPolicy } from "./contract";

export const COORDINATION_POLICY: CoordinationPolicy = coordinationPolicySchema.parse({
  version: "1.0.0",
  classes: [{ id: "deadline_before_gate_clears", label: "Deadline before the gate clears" }],
  conflicts: [
    {
      id: "XP-01",
      class: "deadline_before_gate_clears",
      obligation: { pill: "tenant-experience-incident-comms", rule: "TE-04" },
      gate: { pill: "technical-services-chilled-water-leak", rule: "TS-07" },
      dependency:
        "The first thing the bank's anchor tenant asks on that call is when power comes back to " +
        "their floor. TS-07 is the gate that answers it, and it does not clear until the duty LEW " +
        "has signed off. The call still has to be made inside its window — saying, in terms, that " +
        "the answer is not available yet.",
    },
  ],
});
