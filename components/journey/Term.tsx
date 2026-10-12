'use client';

// <Term k="shadow">Shadow</Term>: a jargon word with a plain-language popover
// from lib/journey/glossary. Keyboard: Enter/Space opens, Escape closes.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { GLOSSARY, type GlossaryKey } from '@/lib/journey';

export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  const entry = GLOSSARY[k];
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="cursor-help rounded-sm underline decoration-dotted decoration-1 underline-offset-[3px] hover:decoration-solid focus-visible:outline-offset-2"
      >
        {children ?? entry.term}
      </button>
      {open ? (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-full z-50 mt-1.5 block w-72 rounded-xl border border-line bg-surface p-3 text-left text-[13px] font-normal leading-snug text-ink shadow-lg"
        >
          <span className="block font-semibold text-heading">{entry.term}</span>
          <span className="mt-1 block text-ink-muted">{entry.meaning}</span>
        </span>
      ) : null}
    </span>
  );
}
