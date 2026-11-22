// Regenerates icons/*.png from the game's procedural art.
// Usage: python3 -m http.server 8000 (in repo root), then: node tools/make-icons.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync } from 'node:fs';

const base = process.env.BASE || 'http://localhost:8000';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/tools/icon.html`);
await page.waitForFunction(() => window.ready);
const out = [
  ['icons/icon-192.png', 192, false],
  ['icons/icon-512.png', 512, false],
  ['icons/icon-maskable-512.png', 512, true],
  ['icons/apple-touch-icon.png', 180, false],
];
for (const [file, size, maskable] of out) {
  const url = await page.evaluate(([s, m]) => window.drawIcon(s, m), [size, maskable]);
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', file);
}
await browser.close();
