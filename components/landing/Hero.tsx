import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Ban, Check, GitBranch, Mic, Play, ShieldCheck, Users } from 'lucide-react';
import closeoutNote from '@/data/fixtures/capture/closeout-chw-r2.json';
import { personaFor, roleLabel } from '@/lib/governance/access';
import { LandingHeader, GUIDED_DEMO_HREF, INCIDENT_ROOM_HREF } from './LandingHeader';
import type { HeroFacts } from './data';
import styles from './landing.module.css';

/** Values the read-back highlights in the close-out note (number, asset tag). */
const READ_BACK = ['5 minutes', 'LD-23-04'];

const GLASS =
  'rounded-2xl border border-white/15 bg-[rgba(30,24,52,0.42)] text-white shadow-[0_18px_50px_-20px_rgba(10,8,30,0.6)] backdrop-blur-xl';

/** Split the note into plain text and highlighted read-back values. */
function markReadBack(text: string): { text: string; marked: boolean }[] {
  const parts: { text: string; marked: boolean }[] = [];
  let rest = text;
  for (const value of READ_BACK) {
    const at = rest.indexOf(value);
    if (at === -1) continue;
    parts.push({ text: rest.slice(0, at), marked: false }, { text: value, marked: true });
    rest = rest.slice(at + value.length);
  }
  parts.push({ text: rest, marked: false });
  return parts;
}

export function Hero({ facts }: { facts: HeroFacts }) {
  const technician = personaFor(closeoutNote.speaker_role);
  const note = markReadBack(closeoutNote.transcript);

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="relative isolate flex min-h-[max(100svh,760px)] flex-col overflow-hidden bg-[linear-gradient(180deg,#5d5577_0%,#8a7a91_22%,#97858f_40%,#3a3150_72%,#211b31_100%)]">
        {/* The photo sits low in the panel; its sky fades into the panel's own sky, so the headline has open space. */}
        <div className="absolute inset-x-0 top-[330px] -z-10 h-[460px] [mask-image:linear-gradient(180deg,transparent_0%,black_16%,black_78%,transparent_100%)] sm:top-[320px] sm:h-[560px] lg:bottom-0 lg:top-[24%] lg:h-auto lg:[mask-image:linear-gradient(180deg,transparent_0%,black_16%)]">
          <Image
            src="/landing/expert-dusk.jpg"
            alt="A senior chief engineer on a Singapore rooftop at dusk, looking out over the city."
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_10%]"
          />
        </div>
        {/* Darken the top for the header and headline. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(24,20,44,0.55)_0%,rgba(24,20,44,0.12)_38%,rgba(24,20,44,0)_60%)]"
        />


        <LandingHeader />

        <div className="relative z-10 mx-auto flex w-full max-w-[880px] flex-col items-center px-5 pt-14 text-center sm:pt-20 lg:pt-16">
          <h1
            id="hero-title"
            className="[text-shadow:0_2px_30px_rgba(20,16,40,0.35)]"
            style={{
              // Inline: the unlayered `main h1` rule in globals.css sets app-title colour and type.
              color: '#ffffff',
              fontFamily: 'var(--font-serif-display), Georgia, serif',
              fontSize: 'clamp(3rem, 1.6rem + 5.2vw, 6.25rem)',
              fontWeight: 400,
              lineHeight: 0.98,
              letterSpacing: '-0.015em',
            }}
          >
            The expert retires.
            <br />
            <em className="italic text-white/90">His judgement stays.</em>
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-[1.55] text-white/85 sm:text-[19px]">
            Keystone turns spoken know-how into governed Intelligence Pills: reusable rules, traced to the
            expert who said them.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={GUIDED_DEMO_HREF}
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-[#15121f] py-1.5 pl-6 pr-1.5 text-[15px] font-medium text-white shadow-lg ring-1 ring-white/10 transition-colors hover:bg-black focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Start the guided demo
              <span className="grid size-9 place-items-center rounded-full bg-[#8b7cf6] transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
            <Link
              href={INCIDENT_ROOM_HREF}
              className="inline-flex min-h-12 items-center rounded-full border border-white/30 bg-white/10 px-6 text-[15px] font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Open the incident room
            </Link>
          </div>
        </div>

        {/* Product glimpses: real demo data, decorative layout. Desktop floats them over the photo. */}
        <div className="relative z-10 mt-auto grid gap-3 px-4 pb-4 pb-44 pt-[260px] sm:grid-cols-2 sm:pt-[330px] lg:static lg:block lg:p-0">
          {/* Left: a frontline voice note with its read-back. */}
          <figure
            className={`${GLASS} ${styles.glassIn} p-4 text-left lg:absolute lg:left-[4%] lg:top-[39%] lg:w-[300px]`}
            style={{ animationDelay: '250ms' }}
          >
            <figcaption className="flex items-center gap-2 text-[12px] text-white/75">
              <span className="grid size-6 place-items-center rounded-full bg-white/15">
                <Mic className="size-3.5" aria-hidden="true" />
              </span>
              Voice note · {closeoutNote.asset_id} · 0:{String(closeoutNote.duration_sec).padStart(2, '0')}
            </figcaption>
            <blockquote className="mt-3 text-[13.5px] leading-[1.55] text-white/95">
              {note.map((part, i) =>
                part.marked ? (
                  <mark key={i} className="rounded bg-[#f6c26b]/25 px-1 text-white underline decoration-[#f6c26b] decoration-2 underline-offset-[3px]">
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </blockquote>
            <p className="mt-3 flex items-center justify-between gap-2 border-t border-white/15 pt-2.5 text-[12px] text-white/75">
              <span>
                {technician.name} · {roleLabel(technician.role)}
              </span>
              <span className="inline-flex items-center gap-1 text-[#b8f0c8]">
                <Check className="size-3.5" aria-hidden="true" /> Read back
              </span>
            </p>
          </figure>

          {/* Left dock: the four steps, as in an app rail. */}
          <div
            aria-hidden="true"
            className={`${GLASS} ${styles.glassIn} hidden flex-col items-center gap-3 rounded-full px-2 py-3 lg:absolute lg:left-[calc(4%+312px)] lg:top-[41%] lg:flex`}
            style={{ animationDelay: '350ms' }}
          >
            <Mic className="size-4 text-white/90" />
            <ShieldCheck className="size-4 text-white/70" />
            <GitBranch className="size-4 text-white/70" />
            <Users className="size-4 text-white/70" />
          </div>

          {/* Left, lower: the deterministic gate. */}
          <div
            className={`${GLASS} ${styles.glassIn} p-4 text-left lg:absolute lg:left-[9%] lg:top-[calc(39%+222px)] lg:w-[340px]`}
            style={{ animationDelay: '450ms' }}
          >
            <p className="flex items-start gap-2 text-[14px] font-medium leading-snug">
              <span className="shrink-0 whitespace-nowrap rounded-md border border-white/30 px-1.5 py-0.5 font-mono text-[11px] text-white/85">
                {facts.ruleId}
              </span>
              {facts.ruleTitle}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ff6b6b]/25 px-2 py-0.5 font-medium text-[#ffd0d0] ring-1 ring-[#ff8a8a]/40">
                <Ban className="size-3" aria-hidden="true" /> Blocked until
              </span>
              {facts.gateEvidence.map((key) => (
                <span key={key} className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-white/85 ring-1 ring-white/20">
                  {key}
                </span>
              ))}
            </div>
          </div>

          {/* Right: the expert's words, with the timestamp they are traced to. */}
          <figure
            className={`${GLASS} ${styles.glassIn} p-4 text-left lg:absolute lg:right-[4%] lg:top-[41%] lg:w-[320px]`}
            style={{ animationDelay: '550ms' }}
          >
            <figcaption className="flex items-center justify-between gap-2 text-[12px] text-white/75">
              <span>
                {facts.pillName} · v{facts.version}
              </span>
              <span className="font-mono">{facts.timestamp}</span>
            </figcaption>
            <blockquote
              className="mt-2.5 text-[21px] leading-[1.2] text-white"
              style={{ fontFamily: 'var(--font-serif-display), Georgia, serif' }}
            >
              “{facts.quoteFragment}”
            </blockquote>
            <p className="mt-3 flex items-center gap-2 text-[12.5px] text-white/80">
              <span className="grid size-7 place-items-center rounded-full bg-white text-[#1d1a2b]">
                <Play className="size-3.5 translate-x-px fill-current" aria-hidden="true" />
              </span>
              Hear the expert · {facts.expert}
            </p>
          </figure>

          {/* Right, lower: the governance outcome. */}
          <p
            className={`${GLASS} ${styles.glassIn} hidden items-center gap-2 rounded-full px-4 py-2.5 text-[13px] lg:absolute lg:right-[8%] lg:top-[calc(41%+200px)] lg:flex`}
            style={{ animationDelay: '650ms' }}
          >
            <ShieldCheck className="size-4 text-[#b8f0c8]" aria-hidden="true" />
            Peer-confirmed before Shadow
          </p>
        </div>
      </div>
      {/* No hard edge: the hero dissolves into the page. Outside the panel's clip and 2 px past its
          edge, so a fractional-pixel bottom never shows a dark seam. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-[2px] z-[5] h-[172px] bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--canvas)_60%,transparent)_55%,var(--canvas)_100%)]"
      />
    </section>
  );
}
