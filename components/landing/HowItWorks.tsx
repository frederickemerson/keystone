import { MarginNote, RomanList, Sticker, type RomanListItem } from '@/components/mosaic';

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
    step(
      'capture',
      'An AI interviewer runs the onboarding call with the expert and probes for the cues, exceptions and contradictions behind each decision.',
      '/capture',
      'capture',
    ),
    step(
      'compile',
      'Each judgement becomes a candidate rule with its trigger, required evidence and action class, which the expert confirms or edits on the decision canvas.',
      `/canvas/${pillId}`,
      'compile',
    ),
    step(
      'apply',
      'In a live incident, approved rules are evaluated against the evidence on hand, and every action shows its status and the reason for it.',
      '/incident/INC-2026-1011',
      'apply',
    ),
    step(
      'learn',
      'Incident outcomes propose a new version. It is replayed against the pill’s evals, and an approver promotes it or rolls it back.',
      `/learning/${pillId}`,
      'learn',
    ),
    step(
      'reuse',
      'Approved pills sit in a versioned registry, ready for the next asset, the next shift and the next engineer.',
      '/registry',
      'reuse',
    ),
  ];

  return (
    <section aria-labelledby="how-title" className="border-t border-pencil bg-dew-drop/60">
      <div className="mx-auto grid w-full max-w-[1240px] gap-x-16 gap-y-10 px-4 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-28">
        <div className="relative">
          <h2
            id="how-title"
            className="font-display-soft text-[44px] font-extrabold leading-[1] tracking-[-0.02em] sm:text-[56px]"
          >
            how it works
          </h2>
          <p className="mt-5 max-w-[26rem] text-[19px] leading-[1.55] text-ink">
            One conversation becomes a rulebook that is used, checked and improved. Each step
            opens the screen where it happens.
          </p>
          <MarginNote arrow="right" rotate={-2} size="md" className="mt-10 hidden lg:flex lg:justify-end">
            it starts with a conversation
          </MarginNote>
          <Sticker kind="bolt" size={52} rotate={14} className="absolute right-6 top-0 hidden lg:block" />
        </div>
        <RomanList items={items} aria-label="How MOSAIC works, in five steps" className="[&_a]:py-5 [&_a]:sm:px-7" />
      </div>
    </section>
  );
}
