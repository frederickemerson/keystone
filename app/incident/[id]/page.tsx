import { PagePlaceholder } from '@/components/page-placeholder';

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <PagePlaceholder
      title="Incident Room"
      purpose={`Evidence timeline, deterministic gates and action chips for ${id}.`}
    />
  );
}
