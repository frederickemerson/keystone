'use client';

// Header "?": every GLOSSARY entry in one dialog, plain language first.

import { useEffect, useRef } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { GLOSSARY } from '@/lib/journey';

export function GlossaryButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Clicking the backdrop (the dialog element itself, outside its content) closes it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === dialog) dialog.close();
    };
    dialog.addEventListener('click', onClick);
    return () => dialog.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
        aria-label="Glossary: what the words mean"
        title="What the words mean"
        className="btn-pill size-10 px-0 sm:size-9"
      >
        <HelpCircle className="size-4" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="glossary-title"
        className="m-auto max-h-[min(40rem,86dvh)] w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-night/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 pb-3 pt-4">
            <div>
              <h2 id="glossary-title" className="font-serif text-[28px] font-normal leading-tight tracking-[-0.01em]">
                What the words mean
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-muted">The terms you will meet in Keystone, in plain language.</p>
            </div>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Close the glossary"
                className="grid size-10 place-items-center rounded-full text-ink-muted hover:bg-dew-drop hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </form>
          </header>
          <dl className="min-h-0 flex-1 divide-y divide-line overflow-y-auto px-5">
            {Object.entries(GLOSSARY).map(([key, entry]) => (
              <div key={key} className="py-3">
                <dt className="text-[15px] font-semibold text-heading">{entry.term}</dt>
                <dd className="mt-0.5 text-[14px] leading-snug text-ink-muted">{entry.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </dialog>
    </>
  );
}
