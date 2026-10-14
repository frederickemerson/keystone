// Record the product, for real, one clip per act.
//
// Everything here is the deployed site at keystone-tencent.vercel.app. No
// mock-ups: where a shot would need one, the act gets no footage and the film
// uses motion graphics instead, which is an honest absence rather than a
// staged screen.
//
// Clips are 1920x1080 VP9. Playwright flushes the file on context.close(), so
// every recording closes its own context.
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'assets/footage');
const RAW = join(OUT, '_raw');
mkdirSync(RAW, { recursive: true });

const BASE = process.env.TARGET || 'https://keystone-tencent.vercel.app';
const DOMAIN = new URL(BASE).hostname;
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

// Each clip must outlast the narration it carries, with headroom to cut on.
// Recording is cheap; being short in the edit is not.
const narration = JSON.parse(readFileSync(join(ROOT, 'narration.json'), 'utf8'));
const TARGET = Object.fromEntries(
  Object.entries(narration.actTotals).map(([id, secs]) => [id, Math.round(secs * 1.4 + 6)]),
);

const log = [];

/**
 * Hold the shot until it is long enough, drifting gently so the frame is never
 * static for more than a few seconds — the script's own direction.
 */
async function holdTo(page, id, startedAt) {
  const target = (TARGET[id] ?? 20) * 1000;
  let drift = 1;
  while (Date.now() - startedAt < target) {
    await page.waitForTimeout(1400);
    if (Date.now() - startedAt >= target) break;
    await page.mouse.wheel(0, 140 * drift);
    drift *= -1;
    await page.waitForTimeout(1200);
  }
}

async function shoot(id, role, fn) {
  if (only.length && !only.includes(id)) return;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
  });
  await ctx.addCookies([{ name: 'keystone_session', value: await cookieFor(role), domain: DOMAIN, path: '/', httpOnly: true, secure: BASE.startsWith('https'), sameSite: 'Lax' }]);
  const page = await ctx.newPage();
  const startedAt = Date.now();
  let note = 'ok';
  try { note = (await fn(page, startedAt)) ?? 'ok'; await holdTo(page, id, startedAt); }
  catch (e) { note = `ERROR ${String(e.message).slice(0, 120)}`; }
  const before = new Set(readdirSync(RAW));
  await ctx.close();
  await browser.close();
  const made = readdirSync(RAW).filter((f) => !before.has(f) || f.endsWith('.webm'));
  const newest = made.map((f) => join(RAW, f)).sort((a, b) => a.localeCompare(b)).pop();
  const dest = join(OUT, `${id}.webm`);
  if (newest) renameSync(newest, dest);
  log.push({ id, note, file: `assets/footage/${id}.webm` });
  console.log(`${id.padEnd(10)} ${note}`);
}

const settle = (p, ms = 900) => p.waitForTimeout(ms);

// ACT 2 — the teach exercise: scenario, board, contradiction.
await shoot('act-02', 'chief_engineer', async (page) => {
  await page.goto(`${BASE}/teach`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page, 1800);
  for (let i = 0; i < 4; i++) { await page.getByRole('button', { name: /Then what/i }).click(); await settle(page, 1500); }
  await settle(page, 1600);
  await page.getByRole('button', { name: /ask me/i }).click();
  await settle(page, 1200);
  const account = 'Leak detector on 28 went off at 02:14. I traced it to a coupling in the ceiling void, and the water was tracking along a conduit toward the riser cupboard where DB-27B sits, so I treated it as electrical straight away.';
  for (const chunk of account.match(/.{1,3}/g)) { await page.locator('textarea').type(chunk, { delay: 0 }); }
  await settle(page, 900);
  await page.getByRole('button', { name: /That is the account/i }).click();
  await settle(page, 1600);
  // Answer through to the contradiction.
  const picks = ['The whole riser', 'Written sign-off from a Licensed', 'Insulation resistance tested', 'The area confirmed dry',
    'The duty Licensed Electrical Worker', 'Reset the tripped breaker', 'Re-energise because the board looks dry',
    'Open the riser cupboard', 'Thirty minutes', 'Two metres', 'The branch sub-valve'];
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
    if (await page.locator('[aria-label="Two answers disagree"]').count() > 0) {
      await settle(page, 3200);
      const yes = page.getByRole('button', { name: /that is what separates them/i });
      if (await yes.count() > 0) { await yes.click(); await settle(page, 2000); }
    }
  }
  await settle(page, 2500);
  // Tour the result: the board, what was said, then the drafted rule.
  await page.mouse.wheel(0, 500); await settle(page, 2600);
  await page.mouse.wheel(0, 500); await settle(page, 2600);
  await page.mouse.wheel(0, -700); await settle(page, 2200);
  return 'teach: scenario → account → contradiction → draft';
});

// ACT 3 — frontline capture on the incident, as the technician.
await shoot('act-03', 'technician', async (page) => {
  await page.goto(`${BASE}/incident/INC-2026-1011?step=10#blocked-gate`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page, 1600);
  await page.locator('button:has-text("Escalate")').first().click();
  await settle(page, 1800);
  const card = page.locator('#capture-task').first();
  await card.scrollIntoViewIfNeeded();
  await page.locator('button:has-text("Answer")').first().click();
  await settle(page, 1400);
  const boxes = card.locator('input[type="checkbox"]');
  for (let i = 0; i < await boxes.count(); i++) { await boxes.nth(i).check().catch(() => {}); await settle(page, 500); }
  await page.locator('button:has-text("Continue")').first().click();
  await settle(page, 1400);
  const demo = page.locator('button:has-text("Demo note")').first();
  if (await demo.count() > 0) { await demo.click(); await settle(page, 1000); }
  const use = page.locator('button:has-text("Use this demo note")').first();
  if (await use.count() > 0) { await use.click(); await settle(page, 2200); }
  for (let i = 0; i < 6; i++) {
    const b = card.locator('button:has-text("Right")').first();
    if (await b.count() === 0) break;
    await b.click(); await settle(page, 700);
  }
  const draft = page.locator('button:has-text("Draft rule")').first();
  if (await draft.count() > 0 && await draft.isEnabled()) { await draft.click(); await settle(page, 3000); }
  await page.mouse.wheel(0, 420); await settle(page, 2600);
  return 'frontline: blocked → escalate → consent → note → read-back → draft';
});

// ACT 4 — the gate holding, in the incident room.
await shoot('act-04', 'technician', async (page) => {
  await page.goto(`${BASE}/incident/INC-2026-1011?step=10#blocked-gate`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page, 2400);
  await page.mouse.wheel(0, 320); await settle(page, 1600);
  await page.mouse.wheel(0, 260); await settle(page, 2400);
  return 'incident room: TS-07 blocked, missing evidence';
});

// ACT 8 + 9 — pulse: what to look at first, and the new-skill panel.
await shoot('act-08', 'asset_operations_manager', async (page) => {
  await page.goto(`${BASE}/pulse`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page, 2000);
  const attention = page.locator('section:has-text("What to look at first")').first();
  if (await attention.count() > 0) await attention.scrollIntoViewIfNeeded();
  await settle(page, 3600);
  return 'pulse: attention list';
});

await shoot('act-09', 'asset_operations_manager', async (page) => {
  await page.goto(`${BASE}/pulse`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page, 1500);
  const panel = page.locator('section:has-text("new skill")').first();
  if (await panel.count() > 0) { await panel.scrollIntoViewIfNeeded(); await settle(page, 5000); }
  else { await page.mouse.wheel(0, 1400); await settle(page, 4000); }
  // Then the incident it found, so the claim is followed through on screen.
  const link = page.locator('a[href*="INC-2026-0923"]').first();
  if (await link.count() > 0) { await link.click(); await page.waitForLoadState('networkidle'); await settle(page, 3000); await page.mouse.wheel(0, 600); await settle(page, 3000); }
  return 'pulse: possible new skill → the incident behind it';
});

// ACT 10 — the registry: recurrence and the blind-spot row.
await shoot('act-10', 'chief_engineer', async (page) => {
  await page.goto(`${BASE}/registry/technical-services-chilled-water-leak`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page, 2200);
  await page.mouse.wheel(0, 900); await settle(page, 2600);
  await page.mouse.wheel(0, 900); await settle(page, 2600);
  return 'registry: rules, recurrence, provenance';
});

writeFileSync(join(ROOT, 'footage.json'), JSON.stringify({ base: BASE, clips: log }, null, 2) + '\n');
console.log(`\n${log.length} clips written to assets/footage/`);
