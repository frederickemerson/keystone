// The cold open, honestly.
//
// The script's Act 0 claimed the agent invented a version number. That is not
// something to stage, and it is not reliably reproducible. What IS real, and
// is the same point, is the product's own label: ask the published agent
// something the approved pill does not cover and it answers anyway — then says
// it retrieved nothing, and marks the answer ungrounded. A confident guess and
// a real answer look identical until something measures the difference.
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'assets/footage');
const RAW = join(OUT, '_raw');
mkdirSync(RAW, { recursive: true });
const BASE = 'https://keystone-tencent.vercel.app';

const r = await fetch(`${BASE}/api/auth/sign-in`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE },
  body: JSON.stringify({ passcode: 'keystone', role: 'chief_engineer' }),
});
const value = (r.headers.getSetCookie?.() ?? []).join(';').match(/keystone_session=([^;]+)/)?.[1];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
});
await ctx.addCookies([{ name: 'keystone_session', value, domain: 'keystone-tencent.vercel.app', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/connectors`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);

const probe = page.locator('button:has-text("Ask the ADP agent")').first();
await probe.scrollIntoViewIfNeeded();
await page.waitForTimeout(1400);

// A real operational question the approved pill has nothing to say about.
const QUESTION = 'What is our policy on rooftop solar panel cleaning intervals?';
// Start a NEW question, or the text is appended to the one already asked and
// the screen shows a run-on sentence.
const fresh = page.locator('button:has-text("Start a new question")').first();
if (await fresh.count() > 0) { await fresh.click(); await page.waitForTimeout(1200); }
const box = page.locator('textarea').first();
await box.click();
await box.fill('');
for (const chunk of QUESTION.match(/.{1,2}/g)) await box.type(chunk, { delay: 28 });
await page.waitForTimeout(1200);
await probe.click();
console.log('asked an out-of-scope question');
await page.waitForTimeout(30000);

const body = await page.locator('body').innerText();
const grounded = body.match(/retrieved (\d+) passages?/i);
const ungrounded = /ungrounded|answered from its prompt alone|retrieved no/i.test(body);
console.log('passages reported:', grounded ? grounded[1] : 'none stated');
console.log('labelled ungrounded:', ungrounded);
await page.waitForTimeout(6000);

const before = new Set(readdirSync(RAW));
await ctx.close();
await browser.close();
const made = readdirSync(RAW).filter((f) => !before.has(f));
if (made[0]) renameSync(join(RAW, made[0]), join(OUT, 'adp-ungrounded.webm'));
console.log('saved assets/footage/adp-ungrounded.webm');
