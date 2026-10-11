// The demo walkthrough on the landing page. One URL in, one embed out:
// YouTube and Vimeo links become privacy-friendly players, a direct video
// file (or a path under public/) plays in a native <video>. Anything else is a
// configuration mistake, so it fails the build instead of rendering a guess.

export type DemoVideo =
  | { kind: 'youtube'; embedUrl: string }
  | { kind: 'vimeo'; embedUrl: string }
  | { kind: 'file'; src: string; type: string };

/** File extensions a <video> element can play, by MIME type. */
const FILE_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
};

const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'youtube-nocookie.com']);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;

/** "90", "90s", "1m30s", "1h2m3s" → seconds; anything else → null. */
function startSeconds(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || !match[0]) return null;
  const [, h = '0', m = '0', s = '0'] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function youtube(id: string | undefined, start: number | null): DemoVideo | null {
  if (!id || !YOUTUBE_ID.test(id)) return null;
  const query = new URLSearchParams({ rel: '0' });
  if (start) query.set('start', String(start));
  return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${query}` };
}

function vimeo(id: string | undefined, hash: string | null | undefined): DemoVideo | null {
  if (!id || !VIMEO_ID.test(id)) return null;
  const query = new URLSearchParams({ dnt: '1' });
  if (hash) query.set('h', hash);
  return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}?${query}` };
}

function file(src: string, pathname: string): DemoVideo | null {
  const ext = pathname.split('.').pop()?.toLowerCase() ?? '';
  const type = FILE_TYPES[ext];
  return type ? { kind: 'file', src, type } : null;
}

function classify(url: URL): DemoVideo | null {
  const host = url.hostname.replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const start = startSeconds(url.searchParams.get('t') ?? url.searchParams.get('start'));

  if (host === 'youtu.be') return youtube(parts[0], start);
  if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === '/watch') return youtube(url.searchParams.get('v') ?? undefined, start);
    if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) return youtube(parts[1], start);
    return null;
  }
  if (host === 'player.vimeo.com' && parts[0] === 'video') return vimeo(parts[1], url.searchParams.get('h'));
  if (host === 'vimeo.com') {
    // vimeo.com/123456789 or, for an unlisted video, vimeo.com/123456789/abcdef1234
    const id = parts.find((p) => VIMEO_ID.test(p));
    const hash = id ? parts[parts.indexOf(id) + 1] : undefined;
    return vimeo(id, hash ?? url.searchParams.get('h'));
  }
  return file(url.href, url.pathname);
}

function absoluteUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Turns the configured walkthrough URL into an embed, or null when none is
 * configured. Throws on a URL it cannot play, naming the setting to fix.
 */
export function parseDemoVideoUrl(raw: string | undefined): DemoVideo | null {
  const value = raw?.trim();
  if (!value) return null;

  let video: DemoVideo | null = null;
  if (value.startsWith('/') && !value.startsWith('//')) {
    // A root-relative path: a file served from public/.
    video = file(value, value.split(/[?#]/)[0]);
  } else {
    const url = absoluteUrl(value);
    if (url && (url.protocol === 'https:' || url.protocol === 'http:')) video = classify(url);
  }

  if (!video) {
    throw new Error(
      `Demo video: cannot embed "${value}". Set NEXT_PUBLIC_DEMO_VIDEO_URL (or DEMO_VIDEO_URL in ` +
        'components/landing/data.ts) to a YouTube or Vimeo link, or to an .mp4/.webm file URL or /public path.',
    );
  }
  return video;
}
