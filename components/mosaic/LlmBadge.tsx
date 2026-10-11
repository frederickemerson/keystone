import type { Generation } from '@/lib/llm/providers';

export function LlmBadge({ result }: { result?: Pick<Generation<unknown>, 'source' | 'provider' | 'model' | 'latencyMs' | 'reason'> | null }) {
  const label = result?.source === 'live'
    ? `live · ${result.model} via ${result.provider === 'codebuddy' ? 'CodeBuddy' : 'TokenHub'} · ${(result.latencyMs / 1000).toFixed(1)} s`
    : 'recorded output';
  return (
    <span tabIndex={0} title={result?.reason ?? (result?.source === 'live' ? 'Live model output, not an approval.' : 'Recorded fixture; no network call.')} className="inline-flex rounded-full border border-line bg-dew-drop px-2.5 py-1 text-[11px] text-ink-muted">
      {label}
    </span>
  );
}
