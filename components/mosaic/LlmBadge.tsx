import { generationLabel, generationTitle, type Generation } from '@/lib/llm/attribution';

export function LlmBadge({ result }: { result?: Pick<Generation<unknown>, 'source' | 'provider' | 'model' | 'latencyMs' | 'reason'> | null }) {
  return (
    <span tabIndex={0} title={generationTitle(result)} className="inline-flex rounded-full border border-line bg-dew-drop px-2.5 py-1 text-[11px] text-ink-muted">
      {generationLabel(result)}
    </span>
  );
}
