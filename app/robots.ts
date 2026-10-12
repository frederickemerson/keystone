import type { MetadataRoute } from 'next';

// A private demo: nothing here should be indexed (the sign-in page carries the
// demo passcode hint). Pages also send <meta name="robots" content="noindex, nofollow">.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
