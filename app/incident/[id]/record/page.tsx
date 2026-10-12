// Incident decision record: printable, with a JSON download. The incident,
// asset, timeline and tenant drafts are scoped to the signed-in role here on
// the server (as the incident room does), so nothing above the role's
// clearance reaches the browser. Versions, decisions and audit live in the
// browser's governance store; the client view joins the two.

import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { UNRESOLVED_ROLE } from '@/lib/governance/access';
import { loadAllPills } from '@/lib/pills/load';
import { loadRecordScenario } from '@/lib/record/scenario.server';
import { RecordView } from './RecordView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Decision record ${decodeURIComponent(id)} · Keystone` };
}

export default async function DecisionRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const role = session?.role ?? UNRESOLVED_ROLE;
  const scenario = loadRecordScenario(decodeURIComponent(id), role);
  if (!scenario) notFound();

  const pills = loadAllPills().map(({ id: pillId, name, pill }) => ({ id: pillId, name, pill }));
  return <RecordView scenario={scenario} pills={pills} role={role} />;
}
