'use client';

// Browser speech recognition depends on the viewer's browser, so its status
// is checked here, in the browser, not on the server.

import { useMounted } from '@/components/mosaic/useMounted';
import { StatusChip } from './StatusChip';

function hasSpeechRecognition(): boolean {
  const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

export function BrowserSpeechStatus() {
  const mounted = useMounted();
  if (!mounted) return <span className="text-xs text-ink-muted">Checking this browser…</span>;
  const available = hasSpeechRecognition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusChip status={available ? 'live' : 'adapter_not_configured'} />
      <span className="text-xs text-ink-muted">
        {available
          ? 'This browser offers speech recognition; audio usually goes to the browser vendor’s service.'
          : 'This browser has no speech recognition. Typing a note works everywhere.'}
      </span>
    </span>
  );
}
