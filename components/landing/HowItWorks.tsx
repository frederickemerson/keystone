import { RomanList, type RomanListItem } from '@/components/mosaic';

function step(title: string, description: string, href: string, id: string): RomanListItem {
  return {
    id,
    href,
    title: <span className="text-[19px] font-semibold text-heading">{title}</span>,
    description: <span className="mt-1 block text-[17px] leading-[1.5] text-ink-muted">{description}</span>,
  };
}

export function HowItWorks({ pillId }: { pillId: string }) {
  const items: RomanListItem[] = [
    step('Capture', 'An AI interview surfaces cues, exceptions and contradictions.', '/capture', 'capture'),
    step('Compile', 'The expert confirms or edits each candidate rule.', `/canvas/${pillId}`, 'compile'),
    step('Apply', 'Approved rules check incident evidence and explain each decision.', '/incident/INC-2026-1011', 'apply'),
    step('Learn', 'Corrections are versioned, replay-tested and reviewed before promotion.', `/learning/${pillId}`, 'learn'),
    step('Reuse', 'Approved pills carry the rulebook to the next asset.', '/registry', 'reuse'),
  ];

  return (
    <section aria-labelledby="how-title" className="border-t border-pencil bg-dew-drop/60">
      <div className="mx-auto grid w-full max-w-[1240px] gap-x-16 gap-y-10 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-20">
        <div>
          <h2
            id="how-title"
            className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[52px]"
          >
            How it works
          </h2>
          <p className="mt-5 max-w-[26rem] text-[19px] leading-[1.5] text-ink">
            Follow one judgement from conversation to reuse.
          </p>
        </div>
        <RomanList items={items} aria-label="How MOSAIC works, in five steps" className="[&_a]:py-5 [&_a]:sm:px-7" />
      </div>
    </section>
  );
}
