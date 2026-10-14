// Re-render the submission stills from their HTML sources.
// Playwright is not a project dependency; symlink one in (see deck/README.md).
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const JOBS = [
  { src: 'solution-diagram.html', out: 'solution-diagram.png', w: 1920, h: 1080, scale: 1 },
  { src: 'cover.html', out: 'cover.png', w: 1520, h: 864, scale: 1 },
  { src: 'cover.html', out: 'cover-small.png', w: 1520, h: 864, scale: 380 / 1520 },
];

const browser = await chromium.launch();
for (const job of JOBS) {
  const page = await browser.newPage({
    viewport: { width: job.w, height: job.h },
    deviceScaleFactor: job.scale,
  });
  await page.goto(`file://${join(here, job.src)}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(here, job.out) });
  await page.close();
  console.log(`${job.out}  ${Math.round(job.w * job.scale)}x${Math.round(job.h * job.scale)}`);
}
await browser.close();
