import type { HeroFacts, StoryFacts } from './data';
import { HowItWorksStory } from './story/HowItWorksStory';

/** Server shell: heading plus the client story, fed only serialisable facts. */
export function HowItWorks({ hero, story }: { hero: HeroFacts; story: StoryFacts }) {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="border-t border-line bg-dew-drop/60">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-10 pt-16 sm:px-8 lg:pb-0 lg:pt-24">
        <h2
          id="how-title"
          className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[52px]"
        >
          How it works
        </h2>
        <p className="mt-5 max-w-[34rem] text-[19px] leading-[1.5] text-ink">
          Follow one sentence from the expert’s interview to a safety gate on another site.
        </p>
      </div>
      <HowItWorksStory hero={hero} story={story} />
    </section>
  );
}
