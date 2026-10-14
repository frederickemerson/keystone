// Render each 1920x1080 slide of deck.html to PNG.
//
// The deck is HTML for the same reason the solution diagram is: it reuses the
// product's own type and colour, and a figure that changes in the description
// changes here by editing one line, not by nudging a text box.
//
// Playwright comes from the session rig; see README.md in this folder.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'slides');
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await page.goto(`file://${join(here, 'deck.html')}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const ids = await page.$$eval('.slide', (nodes) => nodes.map((n) => n.id));
for (const id of ids) {
  const el = await page.$(`#${id}`);
  await el.screenshot({ path: join(out, `${id}.png`) });
  process.stdout.write(`${id} `);
}
console.log(`\n${ids.length} slides -> ${out}`);
await browser.close();
