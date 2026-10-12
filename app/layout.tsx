import type { Metadata } from 'next';
import { Caveat, Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { AppShell } from '@/components/app-shell';
import { getSession } from '@/lib/auth/session';
import { listPillRefs } from '@/lib/pills/load';
import { pillTitle } from '@/components/mosaic/pillTitle';
import type { CrumbNames } from '@/lib/guide/nav';
import './globals.css';

// Display / headings (600–700), body, UI and tables.
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

// Rule ids, versions, evidence keys.
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

// Only the landing notebook's single expert quote is handwritten (never in the app).
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-caveat',
  display: 'swap',
});

// The hero headline and every app page title (`main h1`): the editorial serif.
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Keystone — expert judgement, governed',
  description: 'Keystone turns expert judgement into governed, versioned Intelligence Pills.',
  // Private demo: never indexed (see also app/robots.ts).
  robots: { index: false, follow: false },
};

/** Pill display names for the shell's breadcrumbs. Signed-out visitors get none. */
function crumbNames(signedIn: boolean): CrumbNames {
  if (!signedIn) return { pills: {} };
  return { pills: Object.fromEntries(listPillRefs().map((ref) => [ref.id, pillTitle(ref)])) };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The verified demo session (signed cookie) — the acting identity in the shell.
  const session = await getSession();
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${caveat.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <AppShell session={session} names={crumbNames(session !== null)}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
