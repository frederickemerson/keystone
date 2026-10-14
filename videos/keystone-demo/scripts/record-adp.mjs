// One /connectors session, recorded, covering four acts:
//   act-00 / act-05  the agent answering the same question (the callback)
//   act-06           a follow-up carried on the same thread
//   act-07           disputing an answer
// One session because ADP is rate-limited to 3 calls a minute and 15 a day per
// session: four separate recordings would exhaust the demo's own budget.
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
const marks = [];
const mark = (label) => { marks.push({ label, at: Math.round((Date.now() - t0) / 100) / 10 }); console.log(`  ${label} @ ${marks.at(-1).at}s`); };

await page.goto(`${BASE}/connectors`, { waitUntil: 'networkidle', timeout: 60000 });
const t0 = Date.now();
await page.waitForTimeout(1500);

// Pick the preset the cold open uses, so the question on screen is the one
// the narration names.
const preset = page.locator('button:has-text("Who must approve re-energising")').first();
await preset.scrollIntoViewIfNeeded();
await page.waitForTimeout(1600);
await preset.click();
await page.waitForTimeout(1600);

// Find the ask control and fire the first question.
const ask = page.getByRole('button', { name: /^Ask the ADP agent$/i }).first();
mark('before first ask');
if (await ask.count() > 0) {
  await ask.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await ask.click();
  mark('asked');
  await page.waitForTimeout(26000);           // the answer, and time to read it
  mark('answer settled');
}

// A follow-up, on the same thread.
const follow = page.locator('button:has-text("Does that change if the area is still wet")').first();
if (await follow.count() > 0) {
  await follow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  await follow.click();
  mark('follow-up asked');
  await page.waitForTimeout(26000);
  mark('follow-up settled');
}

// Disputing the answer.
const dispute = page.locator('button:has-text("This answer is wrong")').first();
if (await dispute.count() > 0) {
  await dispute.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await dispute.click();
  mark('dispute form open');
  await page.waitForTimeout(6000);
  await page.mouse.wheel(0, 320);
  await page.waitForTimeout(5000);
}
mark('end');

const before = new Set(readdirSync(RAW));
await ctx.close();
await browser.close();
const made = readdirSync(RAW).filter((f) => !before.has(f));
if (made[0]) renameSync(join(RAW, made[0]), join(OUT, 'adp-session.webm'));
console.log('\nmarks:', JSON.stringify(marks));
