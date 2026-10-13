// Keystone eval corpus — the operational history, read from data/.
//
// Server-only (the lib/data loaders use node:fs). This is the ONLY file in
// lib/evals that performs I/O; ./derive, ./corpus and ./drift stay pure and
// take the history as an argument, so they can be replayed against any
// history — a test's, or a future connector's.

import { loadAllTimelines, loadAssets, loadIncidents } from "@/lib/data";
import type { IncidentHistory } from "./derive";

export function loadIncidentHistory(): IncidentHistory {
  return {
    incidents: loadIncidents(),
    timelines: loadAllTimelines(),
    assets: loadAssets(),
  };
}
