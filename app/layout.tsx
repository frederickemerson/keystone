import type { Metadata } from 'next';
import { Caveat, Geist, Geist_Mono } from 'next/font/google';
import { AppShell } from '@/components/app-shell';
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

// Only the landing notebook's single expert quote is handwritten.
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Keystone — expert judgement, governed',
  description: 'Keystone turns expert judgement into governed, versioned Intelligence Pills.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${caveat.variable}`}
    >
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
