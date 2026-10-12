import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/shell/BrandMark';
import { demoPasscode, sessionSecret } from '@/lib/auth/config';
import { personaOptions } from '@/lib/auth/personas';
import { safeNextPath } from '@/lib/auth/redirect';
import { getSession } from '@/lib/auth/session';
import { initialPersona } from '@/lib/auth/sign-in-choice';
import { isKnownRole } from '@/lib/governance/access';
import { splitCast, storyLine } from '@/lib/guide/cast';
import { DEMO_PATH } from '@/lib/journey';
import { SignInForm } from './SignInForm';

export const metadata: Metadata = {
  title: 'Sign in · Keystone',
  description: 'Demo sign-in: choose a persona to see Keystone as that role.',
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next));
  const as = first(params.as);
  // Only an explicit ?as= preselects; a leftover session never does, so Enter
  // on this form cannot sign in as someone the visitor did not pick.
  const preselected = initialPersona(as, isKnownRole);
  const session = await getSession();
  const { cast, others } = splitCast(personaOptions());
  const guideSteps = DEMO_PATH.length;
  const { isDefault } = demoPasscode();
  const configured = sessionSecret() !== null;

  return (
    <div data-app-shell className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-[1040px] items-center justify-between gap-4 px-4 pt-5 sm:px-8 sm:pt-7">
        <Link href="/" aria-label="Keystone home" className="inline-flex items-center rounded-lg focus-visible:outline-offset-4">
          <BrandLogo markSize={32} textClassName="text-[24px]" />
        </Link>
        <Link href="/" className="text-[13px] text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          Back to overview
        </Link>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="max-w-[640px] space-y-2">
          <p className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12px] font-medium text-ink-muted">
            Demo sign-in
          </p>
          <h1>Sign in to Keystone</h1>
          <p className="text-[15px] text-ink-muted">
            What you see and what you may approve depends on the person you pick. Masked data never leaves the server.
            {session ? (
              <>
                {' '}
                You are signed in as <span className="font-medium text-ink">{session.name}</span>; pick again to switch.
              </>
            ) : null}
          </p>
        </div>

        {configured ? (
          <SignInForm
            cast={cast.map((p) => ({ ...p, story: storyLine(p.role) }))}
            others={others}
            guideSteps={guideSteps}
            next={next}
            preselected={preselected}
            passcodeHint={isDefault ? 'keystone' : null}
          />
        ) : (
          <p role="alert" className="mt-8 rounded-xl border border-line bg-surface p-4 text-sm text-ink">
            Sign-in is not configured on this deployment (KEYSTONE_SESSION_SECRET is missing), so no session can be
            issued.
          </p>
        )}

        <p className="mt-10 max-w-[640px] text-[12px] text-ink-muted">
          This is a demo login with a shared passcode, so anyone can try every role. A production deployment signs in
          through your organisation&apos;s identity provider instead.
        </p>
      </main>
    </div>
  );
}
