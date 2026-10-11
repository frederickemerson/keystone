import Image from 'next/image';
import { Play } from 'lucide-react';
import type { DemoVideo as DemoVideoSource } from './video';

const POSTER = '/landing/video-poster.png';
const TITLE = 'Keystone walkthrough video';

/** The configured walkthrough. Players load lazily, so the page stays light until you get here. */
function Player({ video }: { video: DemoVideoSource }) {
  if (video.kind === 'file') {
    return (
      <video
        controls
        preload="metadata"
        playsInline
        poster={POSTER}
        aria-label={TITLE}
        className="absolute inset-0 size-full bg-charcoal object-contain"
      >
        <source src={video.src} type={video.type} />
        Your browser can’t play this video. <a href={video.src}>Download the walkthrough</a>.
      </video>
    );
  }
  return (
    <iframe
      src={video.embedUrl}
      title={TITLE}
      loading="lazy"
      allow={
        video.kind === 'youtube'
          ? 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
          : 'fullscreen; picture-in-picture; clipboard-write'
      }
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="absolute inset-0 size-full border-0"
    />
  );
}

/** No video configured yet: the cover, marked as coming soon. Nothing here pretends to play. */
function ComingSoon() {
  return (
    <figure className="absolute inset-0 m-0">
      <Image
        src={POSTER}
        alt="Keystone cover: the expert retires, his judgement stays."
        fill
        sizes="(min-width: 1240px) 1176px, calc(100vw - 32px)"
        className="object-cover"
      />
      {/* The cover recedes to a backdrop so the "coming soon" overlay is the one thing to read. */}
      <div className="absolute inset-0 bg-cream-paper/80" aria-hidden="true" />
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-5">
        <span
          className="grid size-12 place-items-center rounded-full bg-charcoal text-cream-paper shadow-[0_8px_28px_rgb(0_0_0/0.18)] sm:size-20"
          aria-hidden="true"
        >
          <Play className="ml-0.5 size-4 sm:ml-1 sm:size-7" fill="currentColor" strokeWidth={1.5} />
        </span>
        <span className="rounded-full border border-charcoal/70 bg-surface px-3 py-1 text-[13px] font-medium text-ink sm:px-5 sm:py-2 sm:text-[16px]">
          Walkthrough video — coming soon
        </span>
      </figcaption>
    </figure>
  );
}

export function DemoVideo({ video }: { video: DemoVideoSource | null }) {
  return (
    <section aria-labelledby="video-title" className="border-t border-line">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-16 sm:px-8 lg:pb-28 lg:pt-24">
        <div className="grid gap-x-16 gap-y-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
          <h2
            id="video-title"
            className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[52px]"
          >
            See it in action
          </h2>
          <p className="max-w-[36rem] text-[19px] leading-[1.55] text-ink">
            From the expert’s onboarding call to the incident room.
          </p>
        </div>
        <div className="relative mt-10 aspect-video overflow-hidden rounded-xl border border-charcoal bg-dew-drop shadow-[0_2px_20px_rgb(0_0_0/0.06)] lg:mt-12">
          {video ? <Player video={video} /> : <ComingSoon />}
        </div>
      </div>
    </section>
  );
}
