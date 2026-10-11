'use client';

// Route error boundary. Data loaders (pills, incidents, timelines) parse files
// at request time and deliberately throw on malformed input rather than
// degrading silently — those errors land here with a readable message.

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-ink">This screen failed to load</h1>
      <p className="rounded-lg border border-dashed border-escalate/40 bg-escalate/5 px-4 py-6 text-sm leading-relaxed text-ink">
        MOSAIC parses Intelligence Pills and demo data from disk when a screen is requested. A
        malformed pill package or data file surfaces here instead of degrading into an empty view —
        fix the source data rather than hiding the failure.
      </p>
      <p className="rounded-md border border-line bg-surface-raised px-3 py-2 font-mono text-xs text-ink-muted">
        {error.message || 'Unknown error'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink hover:border-accent"
      >
        Try again
      </button>
    </div>
  );
}
