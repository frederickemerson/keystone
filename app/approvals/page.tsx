import { loadAllPills } from "@/lib/pills/load";
import { loadIncidents } from "@/lib/data";
import { ApprovalsQueue } from "@/components/approvals/ApprovalsQueue";

export default function ApprovalsPage() {
  // Server loads pill bundles (for version approvals) and incidents (for
  // pending action decisions); the client queue seeds the governance store.
  const bundles = loadAllPills();
  const incidents = loadIncidents();
  return <ApprovalsQueue bundles={bundles} incidents={incidents} />;
}
