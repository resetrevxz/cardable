'use strict';
// Reproducible moving-scene stress test in a private file:// browser context.
// Raw rAF gaps measure browser cadence. The game's scheduler can sleep/reset
// between native grid scroll events, so its realDt is not used as grid FPS.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const output = process.env.CARDABLE_QA_OUTPUT || path.resolve(__dirname, '../../../outputs/inventory-optimization');
const index = process.env.PROFILE_INDEX || path.resolve(__dirname, '../index.html');
const mode = process.env.PROFILE_MODE || 'shelf';
const tiers = (process.env.PROFILE_TIERS || 'very-low,low,medium,high').split(',');
const label = process.env.PROFILE_LABEL || mode;
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const tier of tiers) {
      const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
      const errors = [], network = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
      await page.goto(pathToFileURL(index).href);
      await page.evaluate(({ tier, mode }) => {
        const C = Cardable, instances = [];
        C.tutorial.skipButton.click(); C.settings.applyPreset(tier); C.settings.set('fpsLimit', 'display');
        C.data.cards.filter(card => !card.retired && card.active !== false).forEach((card, i) => {
          [null, ...C.data.variants.map(variant => variant.id)].forEach((variantId, j) => {
            instances.push({ instanceId: 'perf-' + i + '-' + j, cardId: card.id, variantId,
              serial: 'TEST-' + i + '-' + j, pulledAt: Date.now(), seen: true });
          });
        });
        C.events.emit('inventory:fixture', { cards: C.data.cards, instances });
        C.inventory.request('expanded');
        if (mode === 'grid') C.inventoryModel.update({ viewMode: 'grid' });
      }, { tier, mode });
      // Optional ablations make individual rendering costs repeatable.
      if (process.env.PROFILE_SET) await page.evaluate(key => Cardable.settings.set(key, 'low'), process.env.PROFILE_SET);
      if (process.env.PROFILE_CSS) await page.addStyleTag({ content: process.env.PROFILE_CSS });
      await page.waitForTimeout(1500);
      const result = await page.evaluate(async mode => {
        const C = Cardable, gaps = [], js = [], mutations = { child: 0, attributes: 0 };
        let previous = null, maxMounted = 0;
        const observer = new MutationObserver(records => {
          records.forEach(record => mutations[record.type === 'childList' ? 'child' : 'attributes']++);
        });
        observer.observe(C.inventory.el, { subtree: true, childList: true, attributes: true });
        const off = C.events.on('fx:frame', event => js.push(event.jsMs));
        const begin = performance.now();
        await new Promise(resolve => {
          function step(now) {
            if (previous !== null) gaps.push(now - previous);
            previous = now;
            const seconds = (now - begin) / 1000;
            if (mode === 'grid') C.inventory.grid.scrollTop = 1800 + seconds * 600;
            else C.inventory.carousel.move((20 + seconds * 3) * (C.config.inventoryMotion.tileGapPx + 150));
            maxMounted = Math.max(maxMounted, C.inventory.rendered.size);
            if (seconds < 5) requestAnimationFrame(step); else resolve();
          }
          requestAnimationFrame(step);
        });
        off(); observer.disconnect();
        const percentile = (values, fraction) => values.slice().sort((a, b) => a - b)[Math.floor((values.length - 1) * fraction)];
        const elapsed = gaps.reduce((sum, value) => sum + value, 0);
        return { tier: C.settings.get('quality'), mode, frames: gaps.length, averageFps: gaps.length * 1000 / elapsed,
          rawP50: percentile(gaps, .5), rawP95: percentile(gaps, .95), rawP99: percentile(gaps, .99),
          jsP95: percentile(js, .95), mutations, mounted: C.inventory.rendered.size, maxMounted,
          nodes: C.inventory.el.querySelectorAll('*').length, entries: C.inventory.entries.length,
          targetFps: C.fx.stats.targetFps, focused: document.hasFocus() };
      }, mode);
      results.push(Object.assign(result, { errors, network }));
      await page.screenshot({ path: path.join(output, tier + '-' + label + '.png') });
      await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, label + '.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
