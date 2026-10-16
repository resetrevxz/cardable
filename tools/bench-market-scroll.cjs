'use strict';
// How smoothly the Market's long lists scroll, per quality tier: the page is scrolled by script at a steady speed for a
// few seconds while frame gaps are recorded. Reports the median and 95th percentile gap, the worst gap, and the count of
// frames slower than 25 ms. Headless Chromium on whatever machine runs it: numbers compare tiers and builds, they are not
// a promise about other hardware.
//   node tools/bench-market-scroll.cjs [tier,tier,...] [route]      (env WIDTH, HEIGHT)
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const tiers = (process.argv[2] || 'very-low,low,medium,high').split(',');
const route = process.argv[3] || 'discover';
const width = Number(process.env.WIDTH || 1440), height = Number(process.env.HEIGHT || 900);

(async () => {
  const local = await require('./qa-local-server.cjs').start(root);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const tier of tiers) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(local.url + '/index.html');
      await page.waitForFunction(() => Cardable.preferences && Cardable.preferences.initialized && !Cardable.setup.loading);
      await page.evaluate((t) => { Cardable.tutorial.skipButton.click(); Cardable.settings.applyPreset(t); }, tier);
      await page.waitForFunction(() => Cardable.market.ui.shell.canOpen());
      await page.evaluate((r) => { Cardable.market.store.markGuideSeen(); Cardable.market.open({ name: r, params: {} }); }, route);
      await page.waitForSelector('.mk-page'); await page.waitForTimeout(1200);
      const r = await page.evaluate(() => new Promise((resolve) => {
        const el = document.querySelector('.mk-main'), gaps = [], tiles = document.querySelectorAll('.mk-tile, .mk-row').length;
        let last = performance.now(), start = last, dir = 1;
        const max = el.scrollHeight - el.clientHeight;
        function tick(now) {
          gaps.push(now - last); last = now;
          el.scrollTop += 18 * dir; if (el.scrollTop <= 0) dir = 1; else if (el.scrollTop >= max) dir = -1;
          if (now - start < 4000) requestAnimationFrame(tick);
          else { gaps.shift(); gaps.sort((a, b) => a - b); const q = (p) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))];
            resolve({ frames: gaps.length, medianMs: +q(0.5).toFixed(1), p95Ms: +q(0.95).toFixed(1), worstMs: +gaps[gaps.length - 1].toFixed(1), slow25: gaps.filter((g) => g > 25).length, scrollable: max, items: tiles }); }
        }
        requestAnimationFrame(tick);
      }));
      console.log(JSON.stringify(Object.assign({ tier, route }, r)));
      await page.close();
    }
  } finally { await browser.close(); await local.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
