import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';
// Vercel preview deployments inject the Vercel toolbar (vercel.live); production does not.
const isVercelPreview = process.env.VERCEL_ENV === 'preview';

/**
 * Origin of a remote demo-walkthrough file, if one is configured, so a native
 * <video> can load it (components/landing/video.ts). YouTube/Vimeo embeds are
 * iframes (frame-src); a path under public/ is 'self'. Read at build time,
 * like NEXT_PUBLIC_DEMO_VIDEO_URL itself.
 */
function demoVideoOrigin(): string[] {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? '');
    return url.protocol === 'https:' ? [url.origin] : [];
  } catch {
    return [];
  }
}

const vercelLive = isVercelPreview ? ['https://vercel.live'] : [];

/**
 * Nonce-free CSP, as strict as the app allows:
 * - script-src needs 'unsafe-inline' for Next's inline RSC bootstrap scripts
 *   (a nonce would force every page dynamic); dev adds 'unsafe-eval' for
 *   React Refresh / dev stack traces.
 * - style-src needs 'unsafe-inline' for React Flow, motion and next/font style tags.
 * - Fonts are self-hosted by next/font/google at build time: no Google origins at runtime.
 * - Frames: only the YouTube (privacy-enhanced) and Vimeo players DemoVideo embeds.
 * - Nothing may frame Keystone (clickjacking on Switch user / approvals / sign-out).
 */
const csp = [
  "default-src 'self'",
  ["script-src 'self' 'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...vercelLive].join(' '),
  ["style-src 'self' 'unsafe-inline'", ...vercelLive].join(' '),
  ["img-src 'self' data: blob:", ...(isVercelPreview ? ['https://vercel.live', 'https://vercel.com'] : [])].join(' '),
  ["font-src 'self' data:", ...(isVercelPreview ? ['https://vercel.live', 'https://assets.vercel.com'] : [])].join(' '),
  ["connect-src 'self'", ...(isDev ? ['ws:'] : []), ...(isVercelPreview ? ['https://vercel.live', 'wss://ws-us3.pusher.com'] : [])].join(' '),
  ["media-src 'self' blob:", ...demoVideoOrigin()].join(' '),
  ['frame-src https://www.youtube-nocookie.com https://player.vimeo.com', ...vercelLive].join(' '),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // No upgrade-insecure-requests: Vercel already serves HTTPS with HSTS, and the
  // directive would break a local `next start` over http://localhost.
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only features Keystone never uses. Speech synthesis needs no permission; the
  // features the video iframes request (fullscreen, encrypted-media, pip, …) are left at defaults.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@tencent-ai/agent-sdk'],

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  // Pills and demo data are read from disk at request time (lib/pills/load.ts, lib/data),
  // via paths the bundler cannot trace — ship them with every server route.
  outputFileTracingIncludes: {
    '/**': ['./pills/**/*', './data/**/*'],
    '/api/llm/*': [
      './node_modules/@tencent-ai/agent-sdk/cli/bin/**/*',
      './node_modules/@tencent-ai/agent-sdk/cli/*.json',
      './node_modules/@tencent-ai/agent-sdk/cli/dist/codebuddy-headless.js',
      './node_modules/@tencent-ai/agent-sdk/cli/dist/lazy-headless/**/*',
    ],
  },
};

export default nextConfig;
