import { PagePlaceholder } from '@/components/page-placeholder';

export default async function CanvasPage({ params }: { params: Promise<{ pillId: string }> }) {
  const { pillId } = await params;

  return (
    <PagePlaceholder
      title="Decision Canvas"
      purpose={`Confirm, edit or reject extracted rule candidates before publishing a new pill version — ${pillId}.`}
    />
  );
}
