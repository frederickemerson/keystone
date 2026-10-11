import { PagePlaceholder } from '@/components/page-placeholder';

export default async function LearningPage({ params }: { params: Promise<{ pillId: string }> }) {
  const { pillId } = await params;

  return (
    <PagePlaceholder
      title="Learning"
      purpose={`Outcome capture, version diff, eval replay and one-click rollback — ${pillId}.`}
    />
  );
}
