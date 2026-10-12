'use client';

// Reset demo: an inline, non-blocking confirm step.

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatSgtClock } from './labels';

export function ResetDemoControl({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  const cancel = () => {
    returnFocus.current = true;
    setConfirming(false);
  };
  const confirm = () => {
    onConfirm();
    setResetAt(new Date().toISOString());
    returnFocus.current = true;
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div
        role="group"
        aria-labelledby="reset-demo-question"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        className="flex flex-col items-end gap-2 rounded-xl border border-blocked/45 bg-blocked-tint px-3 py-2.5"
      >
        <p id="reset-demo-question" className="text-[12px] leading-snug text-ink">
          Reset versions, decisions and evidence?
          <span className="block text-ink-muted">The audit log is kept.</span>
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={cancel} className="btn-pill text-xs">
            Cancel
          </button>
          <button ref={confirmRef} type="button" onClick={confirm} className="btn-pill btn-pill-primary text-xs">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button ref={triggerRef} type="button" onClick={() => setConfirming(true)} className="btn-pill text-xs">
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Reset demo
      </button>
      {resetAt ? (
        <p role="status" className="text-[11px] text-ink-muted">
          Reset at{' '}
          <time dateTime={resetAt} className="font-mono tabular-nums">
            {formatSgtClock(resetAt)}
          </time>
        </p>
      ) : null}
    </div>
  );
}
