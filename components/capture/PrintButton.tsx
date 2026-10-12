'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button type="button" className="btn-pill btn-pill-primary min-h-11" onClick={() => window.print()}>
      <Printer aria-hidden className="size-4" /> Print label
    </button>
  );
}
