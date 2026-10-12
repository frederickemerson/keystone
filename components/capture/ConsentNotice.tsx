'use client';

// PDPA s.20 purpose notice + consent, shown before the microphone can open
// (lib/capture canStartRecording). Named credit is opt-in and defaults off.

import { useEffect, useId, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { canStartRecording, MAX_AUDIO_RETENTION_DAYS, MAX_NOTE_DURATION_SEC, type Consent } from '@/lib/capture';

export interface ConsentNoticeProps {
  /** The speaker's name, for the opt-in credit line. */
  speakerName: string;
  speakerRole: string;
  onConsent: (consent: Consent) => void;
}

export function ConsentNotice({ speakerName, speakerRole, onConsent }: ConsentNoticeProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // When the notice was put in front of the speaker (recorded on the note).
  const [shownAt] = useState(() => new Date().toISOString());
  const [agreed, setAgreed] = useState(false);
  const [namedCredit, setNamedCredit] = useState(false);
  const gate = canStartRecording({ noticeShownAt: shownAt, recordingConsent: agreed });

  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section aria-labelledby={headingId} className="card-paper space-y-4 p-5 sm:p-6">
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-lg outline-none font-semibold text-heading">
        <ShieldCheck aria-hidden className="size-5" /> Before you record
      </h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-ink">
        <p>
          Your note is turned into text and used to draft an operating rule for this equipment. A draft only becomes a rule after
          you check it, a colleague confirms it and a named approver signs it off.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-ink-muted">
          <li>Recording runs only while you hold the button, for at most {MAX_NOTE_DURATION_SEC} s.</li>
          <li>Keystone keeps the text and discards the audio after transcription (audio is never kept longer than {MAX_AUDIO_RETENTION_DAYS} days).</li>
          <li>
            Each note records which speech service produced the text and where the audio was processed. The browser’s speech
            recognition sends audio to the browser vendor’s service.
          </li>
          <li>You can type the note instead of speaking.</li>
        </ul>
      </div>
      <fieldset className="space-y-3">
        <legend className="sr-only">Consent</legend>
        <label className="flex items-start gap-3 text-[15px]">
          <input type="checkbox" className="mt-1 size-5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I agree to this note being recorded and used as described.</span>
        </label>
        <label className="flex items-start gap-3 text-[15px]">
          <input type="checkbox" className="mt-1 size-5" checked={namedCredit} onChange={(e) => setNamedCredit(e.target.checked)} />
          <span>
            Credit me by name ({speakerName}). <span className="text-ink-muted">Otherwise rules credit “{speakerRole}”.</span>
          </span>
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-pill btn-pill-primary min-h-11 px-5 text-[15px]"
          disabled={!gate.allowed}
          aria-describedby={gate.allowed ? undefined : `${headingId}-why`}
          onClick={() => onConsent({ noticeShownAt: shownAt, recordingConsent: true, namedCredit })}
        >
          Continue
        </button>
        {gate.allowed ? null : (
          <span id={`${headingId}-why`} className="text-sm text-ink-muted">
            {gate.reason}
          </span>
        )}
      </div>
    </section>
  );
}
