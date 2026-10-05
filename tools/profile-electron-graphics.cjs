'use strict';
// Sequential, private-profile measurements of the actual desktop renderer.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { _electron } = require('playwright');
const root = process.env.CARDABLE_GRAPHICS_ROOT || path.resolve(__dirname, '..');
const output = process.env.CARDABLE_GRAPHICS_OUTPUT || path.join(root, 'qa-output', 'optimization');
const label = process.env.CARDABLE_GRAPHICS_LABEL || 'desktop';
const tiers = (process.env.CARDABLE_GRAPHICS_TIERS || 'very-low,low,medium,high').split(',');
const scenes = (process.env.CARDABLE_GRAPHICS_SCENES || 'menu:standard,menu:rare,menu:classic,menu:royal,menu:titan,menu:picker,settings:mythical,detail:exotic,detail:ascendant,inventory:shelf,inventory:grid,studio:orbit,intro:mythical,intro:ascendant,intro:secret').split(',');
const duration = Number(process.env.CARDABLE_GRAPHICS_MS) || 3000;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-graphics-'));
const evidence = { environment: null, samples: [], errors: [], network: [] };
let application;
async function boot(page) {
  await page.waitForFunction(() => window.Cardable?.state?.current && Cardable.preferences.initialized);
  await page.evaluate(() => {
    const C = Cardable;
    C.tutorial.skipButton.click();
    localStorage.setItem('cardable.qol.welcomeSeen', '1');
    localStorage.setItem('cardable.qol.versionSeen', C.config.version);
    localStorage.removeItem('cardable.qol.lastSeen');
    if (C.friendly?.active) C.friendly.close();
  });
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    const binary = process.env.CARDABLE_QA_BINARY;
    // Fail in the runner before Electron can show a native startup error dialog.
    // Detached source baselines must have their own runtime dependencies.
    if (!binary) {
      const resolve = require('node:module').createRequire(path.join(root, 'package.json'));
      for (const dependency of ['electron-updater', 'discord-rpc']) resolve.resolve(dependency);
    }
    application = await _electron.launch({ executablePath: binary || require('electron'), args: [...(binary ? [] : [root]), '--qa-test', `--test-user-data=${profile}`] });
    const page = await application.firstWindow();
    await page.addInitScript(() => {
      window.Cardable = {}; window.studioProbe = { kind: 'Simple', error: null }; let renderer;
      Object.defineProperty(Cardable, 'studioRenderer', { configurable: true, get: () => renderer, set(value) {
        renderer = value; const create = value.create;
        value.create = function (...args) { try { const result = create.apply(this, args); window.studioProbe.kind = result.kind; return result; } catch (error) { window.studioProbe.error = error.message; throw error; } };
      } });
    });
    page.on('pageerror', error => evidence.errors.push(error.stack));
    page.on('console', message => { if (message.type() === 'error') evidence.errors.push(message.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url())) evidence.network.push(request.url()); });
    await boot(page);
    evidence.environment = await application.evaluate(async ({ app, screen }) => ({ version: app.getVersion(), electron: process.versions.electron, gpu: await app.getGPUInfo('basic'), features: app.getGPUFeatureStatus(), display: screen.getPrimaryDisplay() }));
    for (const tier of tiers) for (const scene of scenes) {
      // Reload releases all views/GL contexts/subscribers from the preceding scene.
      await page.evaluate(() => {
        const C = Cardable, next = C.state.fresh();
        next.tutorial.done = true; next.tutorial.step = 'done';
        if (!C.state.commit(C.state.validate(next, true))) throw new Error('Cannot seed private profile');
      });
      await page.reload(); await boot(page);
      await application.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.restore(); win.show(); win.focus(); });
      await page.evaluate(({ tier, scene }) => {
        const C = Cardable, [kind, id] = scene.split(':');
        C.settings.applyPreset(tier); C.settings.set('idleFade', 'never'); C.settings.set('fpsLimit', 'display');
        if (kind === 'menu') C.packs.forceNext(id);
        if (['detail', 'settings', 'studio'].includes(kind)) {
          const card = C.data.cards.find(c => c.rarity === (kind === 'studio' ? 'rare' : id) && !c.retired);
          const instance = { instanceId: 'desktop-profile', cardId: card.id, variantId: 'galaxy-holo', serial: C.serial.format(C.state.current.playerCode, 1), pulledAt: Date.now(), seen: true, packId: 'standard', cardSkinId: 'standard' };
          C.state.current.inventory.push(instance); C.state.current.serialCounter = 1; C.state.save();
          if (kind === 'settings') C.preferences.show();
          else { C.inventoryModel.update({ showUnowned: false }); C.inventory.request('expanded'); }
        }
        if (kind === 'inventory') {
          const instances = [];
          C.data.cards.filter(c => !c.retired && c.active !== false).forEach((card, i) => [null, ...C.data.variants.map(v => v.id)].forEach((variantId, j) => instances.push({ instanceId: 'profile-' + i + '-' + j, cardId: card.id, variantId, serial: 'TEST-' + i + '-' + j, pulledAt: Date.now(), seen: true })));
          C.events.emit('inventory:fixture', { cards: C.data.cards, instances }); C.inventoryModel.update({ viewMode: id }); C.inventory.request('expanded');
        }
        if (kind === 'intro') {
          const rarity = C.rarity(id), intro = C.opening.intro;
          C.packView.setVisible(false); C.opening.el.hidden = false; document.body.classList.add('is-rarity-cinematic');
          C.events.emit('opening:context', { active: true, phase: 'rarityIntro' }); C.events.emit('reveal:context', { hideCursor: true, gridDim: 1, halo: null });
          intro.start(rarity.openingIntro, rarity.name, 'DESKTOP-PROFILE-SEED');
          const start = performance.now(), offset = { mythical: 12000, ascendant: 16000, secret: 14000 }[id];
          C.fx.subscribe(now => { intro.update(offset + now - start, now); return true; }, 'profile-cinematic');
        }
      }, { tier, scene });
      await page.waitForTimeout(1200);
      if (scene.startsWith('detail:') || scene.startsWith('studio:')) {
        await page.locator('.inventory-tile.is-centered').click();
        await page.waitForFunction(() => Cardable.detail.phase === 'detail');
        if (scene.startsWith('studio:')) {
          await page.getByRole('button', { name: 'Inspect card in studio', exact: true }).click();
          await page.waitForFunction(() => Cardable.studio.active && document.querySelector('.studio-shell.is-ready'));
          await page.getByRole('button', { name: 'Director', exact: true }).click();
          await page.getByRole('button', { name: 'Build cinematic orbit', exact: true }).click();
          const preview = page.getByRole('button', { name: 'Preview', exact: true });
          await page.evaluate(() => { window.studioProbe.reduced = Cardable.motion.reduced; window.studioProbe.keyframes = Cardable.studioController.scene.keyframes.length; window.studioProbe.previewDisabled = document.querySelector('.director-preview').disabled; });
          if (await preview.isEnabled()) await preview.click();
        }
        await page.waitForTimeout(600);
      }
      const sample = await page.evaluate(async ({ scene, duration }) => {
        const C = Cardable, gaps = [], js = [], [kind, id] = scene.split(':'), begin = performance.now(), initialFrames = C.fx.stats.frameCount; let previous;
        const off = C.events.on('fx:frame', event => js.push(event.jsMs));
        await new Promise(resolve => {
          function frame(now) {
            if (previous != null) gaps.push(now - previous); previous = now;
            if (kind === 'inventory') { const seconds = (now - begin) / 1000; if (id === 'grid') C.inventory.grid.scrollTop = 1500 + seconds * 700; else C.inventory.carousel.move((20 + seconds * 3) * 180); }
            if (now - begin < duration) requestAnimationFrame(frame); else resolve();
          }
          requestAnimationFrame(frame);
        });
        off(); const percentile = (values, p) => values.length ? values.slice().sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] : null;
        return { browserFps: 1000 * gaps.length / gaps.reduce((a, b) => a + b, 0), gameFrames: C.fx.stats.frameCount - initialFrames, elapsedMs: performance.now() - begin, p95Ms: percentile(gaps, .95), jsP95Ms: percentile(js, .95), nodes: document.body.querySelectorAll('*').length, dpr: devicePixelRatio, paused: C.fx.stats.paused, renderer: kind === 'intro' ? C.opening.intro.rendererStats : kind === 'studio' ? window.studioProbe : null };
      }, { scene, duration });
      evidence.samples.push({ tier, scene, ...sample });
      fs.writeFileSync(path.join(output, label + '.json'), JSON.stringify(evidence, null, 2));
      console.log(JSON.stringify({ tier, scene, fps: Math.round(sample.browserFps), gameFrames: sample.gameFrames, p95: sample.p95Ms, jsP95: sample.jsP95Ms }));
      if (process.env.CARDABLE_GRAPHICS_SCREENSHOTS === '1') {
        const window = await application.browserWindow(page);
        const png = await window.evaluate(async win => (await win.webContents.capturePage()).toPNG().toString('base64'));
        fs.writeFileSync(path.join(output, label + '-' + tier + '-' + scene.replace(':', '-') + '.png'), Buffer.from(png, 'base64'));
      }
    }
    evidence.environment.gpu = await application.evaluate(({ app }) => app.getGPUInfo('basic'));
    evidence.environment.features = await application.evaluate(({ app }) => app.getGPUFeatureStatus());
    if (evidence.errors.length || evidence.network.length) throw new Error('Application errors or network requests; inspect evidence');
  } finally {
    if (application) await application.close();
    fs.writeFileSync(path.join(output, label + '.json'), JSON.stringify(evidence, null, 2));
    const target = path.resolve(profile), prefix = path.resolve(os.tmpdir(), 'cardable-graphics-');
    if (target.startsWith(prefix)) fs.rmSync(target, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
