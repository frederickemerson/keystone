# Keystone: production-readiness and security audit

Date: 2026-10-12 · Scope: `/Users/frederick/Documents/Projects/acdi` at `b9ffca6` (main, clean apart from one untracked PNG) and the live deployment `https://mosaic-psi-rouge.vercel.app`. This was a read-only review: no code was changed. Against the live site I sent only single, normal requests: one demo sign-in and one tenant-message draft. Nothing was load-tested.

**Production audit: 70/100, launchable with caveats.** Auth, secrets handling and git history are clean. The one material risk is cost. Any visitor can reach a live OpenAI model (`gpt-5.4-mini-2026-03-17`, confirmed live) and the Jev API through the public demo passcode `keystone`, with no quota or rate limit. A second, lower-priority gap is the missing security headers and indexing controls.

---

## Must fix before judging (shortlist)

1. **Cap LLM/Jev spend.** Do (a) today: it is a dashboard-only change. Then do (b) or (c). See H-1.
   - (a) Set a hard monthly budget on the OpenAI project that holds this key, and use a dedicated key for the demo. Do the same on TypeSafe/Jev if it offers a cap.
   - (b) Add a per-session and per-IP quota that falls back to the recorded fixture.
   - (c) Add a Vercel WAF rate-limit rule on `/api/llm/*` and `/api/jev/*`.
2. **Make the passcode non-public, or accept the exposure deliberately.** Set `KEYSTONE_DEMO_PASSCODE` in Vercel to a random value and put it in the submission notes for judges. The hint then disappears automatically (`isDefault` becomes false). See H-1 and M-3.
3. **Add security headers and noindex.** These are a few lines in `next.config.ts` plus an `app/robots.ts` file. See M-1 and M-2.

---

## Findings by severity

### HIGH

#### H-1: Unbounded paid-API spend through a public passcode
**Evidence.**
- `/sign-in` renders `Demo passcode: keystone` because `KEYSTONE_DEMO_PASSCODE` is unset in production. A live sign-in with that passcode returned 200.
- A live `POST /api/llm/tenant-message` returned `source: live, provider: openai, attempts: []`. That means OpenAI is the first and only live provider on Vercel (CodeBuddy and TokenHub are not configured there), so each request makes exactly one OpenAI call.
- No route has a rate limit or quota: `app/api/llm/extract/route.ts`, `app/api/llm/tenant-message/route.ts`, `app/api/jev/suggest/route.ts`.
- Any persona can call `/api/llm/extract`, which has no role check.
- Re-signing in is free and mints a fresh session, so a cookie-based counter on its own is not enough.

**Quantified (worst case, `/api/llm/extract`).** The body cap is 64 KB (`lib/llm/requests.ts`). That is roughly 17–20k input tokens once embedded in the prompt. Output is capped at `maxOutputTokens: 6_000` (`lib/llm/providers.ts`). The OpenAI price is an assumption (about $0.75/M input and $4.50/M output); check it on OpenAI's pricing page.

| Load | Cost |
| --- | --- |
| One worst-case call | about $0.04–0.05 |
| Naive script at 1 req/s | about $150–180/hour |
| 100 concurrent loops (one call every ~10 s each, so ~10 req/s) | about $1,500/hour, plus Vercel function time (`maxDuration` 60 s) |

Tenant-message calls are cheaper because the prompt is fixed and small, but they are just as unbounded.

Jev calls also have no limit. Each one is bounded only by its 3 s timeout, and its prompt is fixed (pill-authored questions and stored event text), so the exposure is per-call metering rather than prompt abuse.

Mitigating factors:
- The output must pass a strict zod schema, so this is not a general-purpose free LLM proxy.
- Provider errors are never echoed back.

**Fix.** Do these in order. Each one is useful on its own.

1. **Provider-side cap (no code).**
   - OpenAI dashboard: give the demo its own Project, set a hard budget (e.g. $50), and put that project's key into Vercel `OPENAI_API_KEY`.
   - Rotate the old key after the swap.
2. **Per-session and per-IP quota with graceful fallback (small code change).**
   - In `lib/auth/token.ts` `signSession`, add `.setJti(crypto.randomUUID())`, and return `jti` from `verifySession`.
   - Add a new file, `lib/auth/quota.ts`, using `@upstash/ratelimit` with the Upstash Redis Vercel Marketplace integration. Use three sliding windows, keyed `session:<jti>`, `ip:<x-forwarded-for first hop>` and `global`:

     | Key | Limit |
     | --- | --- |
     | session | 30 calls / 8 h |
     | IP | 60 calls / h |
     | global | 1,500 calls / day |

   - In `lib/llm/providers.ts` `generateJson`, accept a `live: boolean` flag. When it is false, skip straight to the recorded fixture with `reason: 'Live quota reached; showing the recorded fixture.'`. This reuses the existing fixture path, so the demo never breaks.
   - Call the quota check in both `/api/llm/*` routes. In `/api/jev/suggest`, return `reply({ available: false, reason: 'Suggestions quota reached' })` instead.
3. **Zero-code alternative to step 2.** Add a Vercel Firewall custom rule: path prefix `/api/llm/` or `/api/jev/`, rate limit 20 requests per 60 s per IP, action `deny` (429). Check that the plan supports rate-limit rules.
4. **Shrink the worst-case call.** In `lib/llm/requests.ts`, set `turns` to `.max(30)` and `text` to `.max(1_500)`, and lower `limit` to `24_000`. In `lib/llm/providers.ts`, lower the extract call's `maxOutputTokens` to about 2,500, which is enough for four candidates.
5. **Optional.** Restrict `/api/llm/extract` to roles that capture expertise, via `capabilities()` or the roles.json grant in the route.

### MEDIUM

#### M-1: No security headers on the live site
**Evidence.** `curl -I` on `/`, `/sign-in`, `/pulse` (signed in) and `/robots.txt` returns only HSTS, which Vercel adds by default. The following are all missing: `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options` and `Permissions-Policy`. `X-Powered-By: Next.js` is present. Because of this, the app can be framed (clickjacking of the "Switch user", approval and sign-out buttons), and CSP gives no defence in depth.

**Fix.** In `next.config.ts`:
```ts
poweredByHeader: false,
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Content-Security-Policy', value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",          // Next inline bootstrap; move to nonces later
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "media-src 'self' blob:",
        "frame-src https://www.youtube-nocookie.com https://player.vimeo.com", // DemoVideo.tsx embeds
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join('; ') },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }];
},
```
Before deploying, check in the browser console that the landing video and the React Flow canvas render with no CSP violations.

#### M-2: The demo is indexable
**Evidence.** `/robots.txt` returns 404, and `/` has no `<meta name="robots">`. Search engines can index the landing and sign-in pages, and with them the public passcode hint.

**Fix.**
- Add `app/robots.ts` returning `{ rules: { userAgent: '*', disallow: '/' } }`. If the landing page should stay discoverable, use `allow: '/'` with `disallow: ['/sign-in', '/api/']` instead.
- In `app/layout.tsx`, add `metadata.robots = { index: false, follow: false }`.

#### M-3: No rate limit on sign-in (only matters once the passcode is secret)
**Evidence.** `app/api/auth/sign-in/route.ts` makes a constant-time comparison (`lib/auth/passcode.ts`, SHA-256 followed by `timingSafeEqual`, which is correct), but nothing limits the number of attempts. While the passcode is public this is moot. Once it is made secret, it must be at least 16 random characters, or the route needs the same Upstash limiter (e.g. 10 attempts per IP per 15 min).

**Fix.** Use the IP limiter from H-1, step 2, before `passcodeMatches`.

#### M-4: Middleware is opt-in, so new routes are public by default
**Evidence.** `middleware.ts` `config.matcher` lists the protected prefixes. Every current app screen and `/api/llm|jev` is covered, and I confirmed that `/pulse` and `/api/llm/extract` return 307/401 live. The risk is that any new page or API route is public unless someone remembers to add it.

**Fix.** Invert the matcher to protect everything except an allowlist:
```ts
matcher: ['/((?!$|sign-in|api/auth/|_next/|icon\\.svg|apple-icon|landing/|favicon).*)']
```
Then add a test in `lib/auth/__tests__/middleware.test.ts` that enumerates `app/**/page.tsx` and `app/api/**/route.ts` and asserts each one is either protected or explicitly allowlisted.

### LOW

#### L-1: Login and logout CSRF
**Evidence.** `POST /api/auth/sign-in` accepted a `text/plain` body: the live check returned 200. That makes it reachable from a cross-site HTML form, so an attacker can sign a victim into a persona they choose. `sign-out` likewise accepts any cross-site POST. `switch` is protected by the `SameSite=Lax` cookie. `/api/llm/*` and `/api/jev/*` are protected because they enforce `application/json` (`readRequest`). The impact is trivial for a shared-passcode demo.

**Fix.** In `sign-in`, `switch` and `sign-out`:
- reject requests whose `Origin` header is present and is not `new URL(request.url).origin` (return 403);
- in `sign-in` and `switch`, also require `content-type: application/json`.

#### L-2: Session hardening
**What is already correct:**
- HS256 with the algorithm pinned, plus issuer, audience, `exp` and `iat` (`lib/auth/token.ts`).
- The role/name pair is checked against roles.json.
- Production fails closed when the secret is missing or shorter than 32 characters (`lib/auth/config.ts`). The live sign-in succeeded, so the secret is configured.
- The live cookie flags are `Secure; HttpOnly; SameSite=lax; Max-Age=28800`.
- `safeNextPath` (`lib/auth/redirect.ts`) correctly rejects `//`, backslashes, control characters and cross-origin targets. I found no open redirect.

**Gaps:**
- Tokens cannot be revoked; sign-out only clears the cookie. This is acceptable for an 8-hour demo.
- The cookie name has no `__Host-` prefix.

**Fix (optional).** Rename `SESSION_COOKIE` in `lib/auth/config.ts` to `__Host-keystone_session`. It already uses `Secure` and `Path=/` with no Domain; in local dev over http, keep the plain name. The `jti` added in H-1 also enables a denylist if one is ever needed.

#### L-3: Production dependency advisories
**Evidence.** `npm audit --omit=dev` reports 2 vulnerabilities (1 high, 1 moderate). Both come from the copy of `postcss@8.4.31` nested inside `next@15.5.27`: GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q and related source-map path traversals. PostCSS only processes the repo's own CSS at build time, so this is not exploitable at runtime. The suggested fix (`npm audit fix --force`) jumps to next@16, a breaking change.

**Fix.** Add `"overrides": { "next": { "postcss": "^8.5.29" } }` to `package.json`, then run `npm i && npm run build && npm test`. If the build complains, leave it and record the build-time-only justification.

Separately, `@tencent-ai/agent-sdk` (`serverExternalPackages`, which spawns a CLI) is a large supply-chain surface that the live deployment does not use, since no CodeBuddy key is set on Vercel. Consider removing it from the production bundle via `outputFileTracingIncludes` if it is not needed for judging.

#### L-4: Client error boundary renders `error.message`
**Evidence.** `app/error.tsx` prints `error.message`. In production, Next.js replaces server-component error messages with a generic message plus a digest, so stacks and paths do not leak from the server. Client-side render errors would still show their raw message. API routes never echo provider errors: `callProvider` maps every SDK error to `'error'`, `askNoul` returns typed reasons, and zod failures return the generic `Invalid request fields.`.

**Fix (optional).** In `app/error.tsx`, show `error.digest ? \`Reference: ${error.digest}\` : 'Unexpected error'` in place of `error.message` when `process.env.NODE_ENV === 'production'`.

### INFO (no action needed)
- **Client bundle is clean.** I ran `npm run build` (exit 0). No value from `.env.local` (`TOKENHUB_API_KEY`, `OPENAI_API_KEY`, `JEV_API_KEY`, `KEYSTONE_SESSION_SECRET`) appears in `.next/static`. Neither do the env var names, `api.typesafe.ai` or the development session key. The only provider strings are display labels ("TokenHub", "OpenAI"). No `NEXT_PUBLIC_*` secrets exist, and no browser source maps are emitted. Every LLM/Jev module imports `server-only`.
- **Git history is clean.** `git log -p --all` matches for `sk-`, `jev:apikey`, `apikey_` and `AKID` are all test placeholders (e.g. `jev:apikey_TEST…`, `sk-test-…`) or prose ("risk-engineering"). `AKID` has 0 hits. `.env.local` was never committed and is gitignored. No values are reproduced here.
- **Responses show provider names and model ids.** API responses include `provider`, `model`, `attempts` and `reason`, by design for demo transparency. This reveals the provider chain to signed-in users, but no keys or prompts.
- **Prompt-injection posture is sound.**
  - Transcript text is framed as data.
  - The system prompt forbids tools.
  - CodeBuddy runs with `permissionMode: 'plan'`, an empty tool list, deny-all `canUseTool`, no MCP and no settings sources.
  - Every output is zod-validated, and the model-supplied identity, sensitivity and status keys are overwritten (tenant-message).
  - Jev questions come only from pill-declared keys.
  - Clearance is checked before event text is sent to Jev (`canSee`), and tenant drafts are re-scoped by role server-side.

---

## Evidence checked
- Code: `middleware.ts`, `lib/auth/{config,token,session,passcode,redirect,personas}.ts`, all six `app/api/**/route.ts` files, `lib/llm/{requests,providers,client}.ts`, `lib/jev/client.ts`, `app/error.tsx`, `app/sign-in/page.tsx`, `next.config.ts`, `.gitignore`.
- Commands: `npm audit --omit=dev`; `npm run build` followed by a value and name grep of `.next/static`; `git log -p --all` pattern counts with values redacted; `npm ls postcss`.
- Live: `curl -I` on `/`, `/sign-in`, `/pulse`, `/robots.txt` and `/api/llm/extract` (401). I also made one demo sign-in (cookie flags, text/plain acceptance) and one authenticated `tenant-message` call (live provider = OpenAI, 3.7 s).

## Evidence missing
- **Vercel env and plan.** It is unknown whether `JEV_API_KEY` is set in production and whether the plan includes WAF rate limiting.
- **Spend caps.** It is unknown whether OpenAI or Jev already have budget caps.
- **Exact pricing.** Exact OpenAI pricing for `gpt-5.4-mini` and the Jev per-call price. The cost estimate above uses assumed rates.

## Next action
Set a hard budget on a dedicated OpenAI project key in the dashboard now (5 minutes). Then add the Vercel WAF rate-limit rule, or the Upstash quota with fixture fallback, before judges arrive.
