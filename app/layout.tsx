import type { Metadata } from 'next';
import { Caveat, Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { AppShell } from '@/components/app-shell';
import './globals.css';

// Display / headings: Fraunces, variable, soft axis (weights 600–700 used).
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Body / UI / tables.
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

// Marginalia only — the expert's handwritten voice.
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MOSAIC — Intelligence Pills',
  description: 'Turn expert judgement into governed, versioned Intelligence Pills.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable} ${caveat.variable}`}
    >
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
