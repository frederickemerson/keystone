'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Check, Compass } from 'lucide-react';
import type { PersonaOption } from '@/lib/auth/personas';
import { resolveSignIn } from '@/lib/auth/sign-in-choice';
import { DEMO_PATH } from '@/lib/journey';
import { personaFor, roleLabel } from '@/lib/governance/access';
import { browserSessionStorage, guideReducer, writeGuideState } from '@/lib/guide/state';
import { cn } from '@/lib/ui/cn';

export interface CastOption extends PersonaOption {
  /** What this persona does in the guided demo's story. */
  story: string;
}

function PersonaCard({
  persona,
  selected,
  onSelect,
  detail,
}: {
  persona: PersonaOption;
  selected: boolean;
  onSelect: () => void;
  detail: string;
}) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-surface px-4 py-3 transition-colors duration-150 hover:border-lavender/60',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lavender-ink',
        selected ? 'border-lavender-ink bg-lavender-tint shadow-[0_0_0_1px_var(--lavender-ink)]' : 'border-line',
      )}
    >
      <input type="radio" name="persona" value={persona.role} checked={selected} onChange={onSelect} className="sr-only" />
      <span className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-medium text-ink">
          {persona.name} <span className="font-normal text-ink-muted">· {persona.label}</span>
        </span>
        {selected ? <Check className="size-4 shrink-0 text-lavender-ink" aria-hidden="true" /> : null}
      </span>
      <span className="text-[13px] text-ink-muted">{detail}</span>
    </label>
  );
}

export function SignInForm({
  cast,
  others,
  guideSteps,
  next,
  preselected,
  passcodeHint,
}: {
  cast: CastOption[];
  others: PersonaOption[];
  guideSteps: number;
  next: string;
  preselected: string | null;
  /** The public default passcode, shown only when no passcode is configured. */
  passcodeHint: string | null;
}) {
  const [role, setRole] = useState<string | null>(preselected);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'guide' | 'persona' | null>(null);
  const passcodeRef = useRef<HTMLInputElement>(null);
  const guide = personaFor(DEMO_PATH[0].role);
  const chosen = [...cast, ...others].find((p) => p.role === role);
  const otherChosen = others.some((p) => p.role === role);

  async function signIn(asGuide: boolean) {
    const intent = resolveSignIn({ guide: asGuide, role, next });
    if (intent.kind === 'invalid') {
      setError(intent.error);
      return;
    }
    if (passcode.length === 0) {
      setError('Enter the demo passcode first.');
      passcodeRef.current?.focus();
      return;
    }
    setBusy(intent.kind);
    setError(null);
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: intent.role, passcode, next: intent.next }),
      });
      const body = (await res.json().catch(() => ({}))) as { next?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Sign-in failed.');
        setBusy(null);
        return;
      }
      // The guide opens on its first step in this tab (sessionStorage); a
      // plain sign-in leaves any tour as it was.
      if (intent.kind === 'guide') writeGuideState(browserSessionStorage(), guideReducer(null, { type: 'start' }));
      // A full document navigation, not router.replace(): the session cookie
      // changes what every server component renders, so the client router
      // cache built while signed out is wrong for every route. In particular a
      // <Link> prefetched before sign-in holds the middleware's redirect back
      // to /sign-in?next=…, and a soft navigation replays that stale redirect.
      // `busy` stays set until the page unloads.
      window.location.assign(body.next ?? intent.next);
    } catch {
      setError('Sign-in failed. Check your connection and try again.');
      setBusy(null);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void signIn(false);
      }}
      className="mt-8 space-y-8"
      noValidate
    >
      <div className="max-w-[420px] space-y-2">
        <label htmlFor="passcode" className="block text-[15px] font-semibold text-ink">
          Demo passcode
        </label>
        <input
          ref={passcodeRef}
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          aria-describedby={passcodeHint ? 'passcode-hint' : undefined}
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-[15px] text-ink outline-none focus-visible:border-lavender-ink focus-visible:ring-2 focus-visible:ring-lavender/40"
        />
        {passcodeHint ? (
          <p id="passcode-hint" className="text-[13px] text-ink-muted">
            Demo passcode: <span className="font-mono text-ink">{passcodeHint}</span>
          </p>
        ) : null}
      </div>

      <section
        aria-labelledby="guide-title"
        className="glass-night relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#2a2342_0%,#15121f_70%)] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-[34rem]">
            <p className="flex items-center gap-2 text-[12px] font-medium text-lavender-on-night">
              <Compass className="size-3.5" aria-hidden="true" /> Recommended for a first visit
            </p>
            <h2 id="guide-title" className="mt-1.5 font-serif text-[30px] font-normal leading-[1.05] tracking-[-0.01em] text-white">
              Take the guided demo
            </h2>
            <p className="mt-2 text-[14px] leading-snug text-white/85">
              One story in {guideSteps} short steps: an expert&apos;s sentence becomes a rule, the rule stops an unsafe
              action, and a technician&apos;s note becomes the next version. The guide switches people for you. You start
              as {guide.name}, {roleLabel(guide.role)}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signIn(true)}
            disabled={busy !== null}
            className="group inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[15px] font-medium text-night transition-colors hover:bg-white/90 focus-visible:outline-white disabled:opacity-60 sm:self-center"
          >
            {busy === 'guide' ? 'Starting…' : 'Start the guided demo'}
            <span className="grid size-9 place-items-center rounded-full bg-lavender text-white transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </button>
        </div>
      </section>

      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">Or choose who you are</legend>
        <p className="mb-3 mt-0.5 text-[13px] text-ink-muted">The people in the demo story come first, with their part in it.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {cast.map((p) => (
            <PersonaCard key={p.role} persona={p} selected={p.role === role} onSelect={() => setRole(p.role)} detail={`In the story: ${p.story}.`} />
          ))}
        </div>
        {others.length > 0 ? (
          <details className="group mt-4" open={otherChosen}>
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-full px-1 text-[14px] font-medium text-ink underline-offset-4 hover:underline">
              Other roles ({others.length})
              <ArrowRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {others.map((p) => (
                <PersonaCard key={p.role} persona={p} selected={p.role === role} onSelect={() => setRole(p.role)} detail={p.summary} />
              ))}
            </div>
          </details>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-blocked">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {/* The form's only submit button, disabled until a person is chosen:
            Enter on a fresh form does nothing rather than pick someone. */}
        <button type="submit" className="btn-pill btn-pill-primary min-h-11 px-5 text-[15px]" disabled={busy !== null || !chosen}>
          {busy === 'persona' ? 'Signing in…' : chosen ? `Sign in as ${chosen.name}` : 'Sign in'}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
        {!chosen ? <p className="text-[13px] text-ink-muted">Choose a person above, or start the guided demo.</p> : null}
      </div>
    </form>
  );
}
