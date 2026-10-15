// Re-shoot /teach after it changed: it now opens on a chooser ("What would you
// like to teach today?") with a Describe-a-situation card beside the
// chilled-water leak, and a session lives at /teach?pill=<id>.
//
// Two clips, both real screens of the local production build:
//   teach-chooser.webm  chooser → describe a situation → it is drawn → hold
//   act-02.webm         the chilled-water session: scenario → account →
//                       coverage board → contradiction → draft
// Phase timestamps are written to assets/footage/teach-marks.json so the edit
// can punch in on the moment, not guess it.
import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'assets/footage');
const RAW = join(OUT, '_raw');
mkdirSync(RAW, { recursive: true });

const BASE = process.env.TARGET || 'http://localhost:3999';
const DOMAIN = new URL(BASE).hostname;
const PILL = 'technical-services-chilled-water-leak';
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));

async function cookieFor(role) {
  const r = await fetch(`${BASE}/api/auth/sign-in`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ passcode: 'keystone', role }),
  });
  const v = (r.headers.getSetCookie?.() ?? []).join(';').match(/keystone_session=([^;]+)/)?.[1];
  if (!v) throw new Error(`sign-in ${role}: ${r.status}`);
  return v;
}

const marksByClip = {};

async function shoot(id, role, fn) {
  if (only.length && !only.includes(id)) return;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
  });
  await ctx.addCookies([{ name: 'keystone_session', value: await cookieFor(role), domain: DOMAIN, path: '/', httpOnly: true, secure: BASE.startsWith('https'), sameSite: 'Lax' }]);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = [];
  const mark = (label) => { marks.push({ label, at: Math.round((Date.now() - t0) / 100) / 10 }); };
  let note = 'ok';
  try { note = (await fn(page, mark)) ?? 'ok'; } catch (e) { note = `ERROR ${String(e.message).slice(0, 160)}`; }
  mark('end');
  const before = new Set(readdirSync(RAW));
  await ctx.close();
  await browser.close();
  const made = readdirSync(RAW).filter((f) => !before.has(f) || f.endsWith('.webm'));
  const newest = made.map((f) => join(RAW, f)).sort((a, b) => a.localeCompare(b)).pop();
  if (newest) renameSync(newest, join(OUT, `${id}.webm`));
  marksByClip[id] = { note, marks };
  console.log(`${id.padEnd(14)} ${note}`);
  for (const m of marks) console.log(`   ${String(m.at).padStart(6)}s  ${m.label}`);
}

const settle = (p, ms = 900) => p.waitForTimeout(ms);

// The chooser, and the thing nobody has drawn yet. Up to three takes: the
// provider chain is live and which model answers varies take to take.
for (let take = 1; take <= 3; take++) {
await shoot('teach-chooser', 'chief_engineer', async (page, mark) => {
  await page.goto(`${BASE}/teach`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page, 2200);
  mark('chooser');
  // A glance at the chilled-water card first, so the choice reads as a choice.
  await page.mouse.move(1500, 700, { steps: 24 });
  await settle(page, 1400);
  await page.mouse.move(670, 640, { steps: 30 });
  await settle(page, 900);
  await page.locator('article:has-text("Describe a situation") button').first().click();
  mark('describe open');
  await settle(page, 900);
  const box = page.locator('#describe-situation');
  await box.click();
  const text = 'Condensate drain on the Level 12 AHU blocked overnight. Water pooled under the raised floor of the comms room and was tracking toward the UPS cabinet.';
  for (const chunk of text.match(/.{1,2}/g)) await box.type(chunk, { delay: 22 });
  mark('typed');
  await settle(page, 700);
  await page.getByRole('button', { name: /Draw this situation/i }).click();
  mark('draw clicked');
  await page.locator('text=/Live ·|Recorded output|could not be reached|No model answered|Over the live quota/').first().waitFor({ timeout: 45000 }).catch(() => {});
  mark('drawn');
  const badge = await page.locator('article:has-text("Describe a situation") p.font-mono').last().innerText().catch(() => '');
  await settle(page, 8500);
  return `chooser → describe → drawn · badge: ${badge}`;
});
if (/TokenHub/.test(marksByClip['teach-chooser']?.note ?? '') || only.length) break;
}

// The chilled-water session, as the chief engineer.
await shoot('act-02', 'chief_engineer', async (page, mark) => {
  await page.goto(`${BASE}/teach?pill=${PILL}`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page, 1800);
  mark('scenario');
  for (let i = 0; i < 4; i++) { await page.getByRole('button', { name: /Then what/i }).click(); await settle(page, 2100); }
  await settle(page, 2400);
  await page.getByRole('button', { name: /ask me/i }).click();
  mark('question');
  await settle(page, 1200);
  const account = 'Leak detector on 28 went off at 02:14. I traced it to a coupling in the ceiling void, and the water was tracking along a conduit toward the riser cupboard where DB-27B sits, so I treated it as electrical straight away.';
  for (const chunk of account.match(/.{1,3}/g)) { await page.locator('textarea').type(chunk, { delay: 0 }); }
  await settle(page, 900);
  await page.getByRole('button', { name: /That is the account/i }).click();
  mark('account given');
  await settle(page, 3000);
  const picks = ['The whole riser', 'Written sign-off from a Licensed', 'Insulation resistance tested', 'The area confirmed dry',
    'The duty Licensed Electrical Worker', 'Reset the tripped breaker', 'Re-energise because the board looks dry',
    'Open the riser cupboard', 'Thirty minutes', 'Two metres', 'The branch sub-valve'];
  let contradictionSeen = false;
  for (let step = 0; step < 12; step++) {
    const card = page.locator('section:has(p[tabindex="-1"])').first();
    if (await card.count() === 0) break;
    let clicked = false;
    for (const label of picks) {
      const b = card.locator(`button:has-text("${label}")`).first();
      if (await b.count() > 0 && await b.isVisible()) { await b.click(); clicked = true; await settle(page, 700); }
    }
    const all = page.getByRole('button', { name: /That is all of them/i });
    if (await all.count() > 0 && await all.isEnabled()) { await all.click(); clicked = true; }
    if (!clicked) break;
    await settle(page, 900);
    if (!contradictionSeen && await page.locator('[aria-label="Two answers disagree"]').count() > 0) {
      contradictionSeen = true;
      mark('contradiction');
      await settle(page, 5600);
      const yes = page.getByRole('button', { name: /that is what separates them/i });
      if (await yes.count() > 0) { await yes.click(); mark('condition confirmed'); await settle(page, 3400); }
    }
  }
  mark('answers done');
  await settle(page, 4600);
  await page.mouse.wheel(0, 500); await settle(page, 3200);
  mark('tour');
  await page.mouse.wheel(0, 500); await settle(page, 3200);
  await page.mouse.wheel(0, -700); await settle(page, 3000);
  await settle(page, 9500);
  return `teach: scenario → account → contradiction(${contradictionSeen}) → draft`;
});

writeFileSync(join(OUT, 'teach-marks.json'), JSON.stringify({ base: BASE, clips: marksByClip }, null, 2) + '\n');
console.log('\nmarks written to assets/footage/teach-marks.json');
