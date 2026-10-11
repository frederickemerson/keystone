// Keystone demo auth — post-sign-in redirect target. Relative paths only:
// anything that could leave the origin ("//evil", "/\\evil", "https://…",
// "javascript:…") falls back to the default.

export const DEFAULT_AFTER_SIGN_IN = "/pulse";

const PROBE_ORIGIN = "http://keystone.invalid";

export function safeNextPath(raw: string | null | undefined, fallback: string = DEFAULT_AFTER_SIGN_IN): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  // Must be a single-slash absolute path; no backslashes or control characters
  // (browsers treat "\" as "/" and strip tabs/newlines, turning "/\t/x" into "//x").
  if (!raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) return fallback;
  // Never bounce back into the auth flow.
  if (url.pathname === "/sign-in" || url.pathname.startsWith("/api/auth/")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
