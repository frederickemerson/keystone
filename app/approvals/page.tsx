import { loadAllPills } from "@/lib/pills/load";
import { loadAllTimelines, loadIncidents } from "@/lib/data";
import { ApprovalsQueue } from "@/components/approvals/ApprovalsQueue";
import { sessionRole } from "@/lib/auth/session";
import { scopeIncidents } from "@/lib/governance/scope";

export const metadata = { title: 'Approvals · Keystone' };

export default async function ApprovalsPage() {
  // Server loads pill bundles (for version approvals) and incidents (for
  // pending action decisions); the client queue seeds the governance store.
  const bundles = loadAllPills();
  // Incidents are scoped to the signed-in role before they reach the client.
  const incidents = scopeIncidents(loadIncidents(), await sessionRole());
  // Replayable incidents and their length: "See it in …" opens the room at the end of the replay.
  const replayEnd = Object.fromEntries(loadAllTimelines().map((t) => [t.incident_id, t.events.length]));
  return <ApprovalsQueue bundles={bundles} incidents={incidents} replayEnd={replayEnd} />;
}
