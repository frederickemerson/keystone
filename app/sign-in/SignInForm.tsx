'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type { PersonaOption } from '@/lib/auth/personas';
import { cn } from '@/lib/ui/cn';

export function SignInForm({
  personas,
  next,
  preselected,
  passcodeHint,
}: {
  personas: PersonaOption[];
  next: string;
  preselected: string | null;
  /** The public default passcode, shown only when no passcode is configured. */
  passcodeHint: string | null;
}) {
  const [role, setRole] = useState<string | null>(preselected);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role) {
      setError('Choose a person to sign in as.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, passcode, next }),
      });
      const body = (await res.json().catch(() => ({}))) as { next?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Sign-in failed.');
        setBusy(false);
        return;
      }
      // A full document navigation, not router.replace(): the session cookie
      // changes what every server component renders, so the client router
      // cache built while signed out is wrong for every route. In particular a
      // <Link> prefetched before sign-in (e.g. the landing page's "Hear the
      // onboarding call" → /capture) holds the middleware's redirect back to
      // /sign-in?next=/capture, and a soft navigation replays that stale
      // redirect onto the current URL, leaving this form on "Signing in…".
      // `busy` stays true until the page unloads.
      window.location.assign(body.next ?? '/pulse');
    } catch {
      setError('Sign-in failed. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-8" noValidate>
      <fieldset>
        <legend className="mb-3 text-[15px] font-semibold text-ink">Who are you?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {personas.map((p) => {
            const selected = p.role === role;
            return (
              <label
                key={p.role}
                className={cn(
                  'relative flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-surface px-4 py-3 transition-colors duration-150 hover:border-line-strong',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marker',
                  selected ? 'border-ink shadow-[0_0_0_1px_var(--charcoal)]' : 'border-line',
                )}
              >
                <input
                  type="radio"
                  name="persona"
                  value={p.role}
                  checked={selected}
                  onChange={() => setRole(p.role)}
                  className="sr-only"
                />
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-ink">
                    {p.name} <span className="font-normal text-ink-muted">· {p.label}</span>
                  </span>
                  {selected ? <Check className="size-4 shrink-0 text-ink" aria-hidden="true" /> : null}
                </span>
                <span className="text-[13px] text-ink-muted">{p.summary}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="max-w-[420px] space-y-2">
        <label htmlFor="passcode" className="block text-[15px] font-semibold text-ink">
          Demo passcode
        </label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          aria-describedby={passcodeHint ? 'passcode-hint' : undefined}
          className="min-h-11 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-[15px] text-ink outline-none focus-visible:border-ink"
        />
        {passcodeHint ? (
          <p id="passcode-hint" className="text-[13px] text-ink-muted">
            Demo passcode: <span className="font-mono text-ink">{passcodeHint}</span>
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-blocked">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-pill btn-pill-primary min-h-11 px-5 text-[15px]" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
