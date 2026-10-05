'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { _electron } = require('playwright');
const root = path.resolve(__dirname, '..'), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-desktop-optimization-'));
const output = path.join(root, 'qa-output', 'optimization');
const baseline = process.argv.includes('--baseline');
const evidence = { baseline, groups: [], metrics: {}, errors: [], network: [] };
let application;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    const binary = process.env.CARDABLE_QA_BINARY;
    application = await _electron.launch({ executablePath: binary || require('electron'), args: [...(binary ? [] : [root]), '--qa-test', `--test-user-data=${profile}`] });
    const page = await application.firstWindow();
    await page.addInitScript(() => {
      window.Cardable = {}; window.activeVisuals = new Map(); let fx, id = 0;
      Object.defineProperty(Cardable, 'fx', { configurable: true, get: () => fx, set(value) {
        fx = value; const subscribe = value.subscribe;
        value.subscribe = function (update, label) { const key = label || 'subscriber-' + ++id;
          return subscribe.call(this, function (...args) { const active = update(...args); if (active === true) window.activeVisuals.set(key, true); else window.activeVisuals.delete(key); return active; }, label);
        };
      } });
    });
    function watch(page) {
      page.on('pageerror', error => evidence.errors.push(error.stack));
      page.on('console', message => { if (message.type() === 'error') evidence.errors.push(message.text()); });
      page.on('request', request => { if (/^https?:/.test(request.url())) evidence.network.push(request.url()); });
    }
    watch(page);
    await page.waitForFunction(() => window.Cardable?.state?.current && Cardable.preferences.initialized);
    await page.evaluate(() => {
      const C = Cardable; C.tutorial.skipButton.click();
      localStorage.setItem('cardable.qol.welcomeSeen', '1'); localStorage.setItem('cardable.qol.versionSeen', C.config.version); localStorage.removeItem('cardable.qol.lastSeen');
      if (C.friendly?.active) C.friendly.close();
    });
    await page.reload();
    await page.waitForFunction(() => Cardable.preferences.initialized && !Cardable.tutorial.active);
    await page.waitForTimeout(150);
    await page.evaluate(() => { if (Cardable.friendly?.active) Cardable.friendly.close(); });
    await page.evaluate(() => { Cardable.settings.set('idleFade', 'never'); Cardable.settings.applyPreset('high'); Cardable.state.current.packs.ready = Cardable.config.packs.maxStored; Cardable.timers.tick(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const C = Cardable, original = C.native.window.setPack; window.desktopPackCalls = 0;
      C.native = Object.assign({}, C.native, { window: Object.assign({}, C.native.window, { setPack(value) { window.desktopPackCalls++; return original(value); } }) });
      const toolbar = C.inventory.toolbar, update = toolbar.update;
      toolbar.update = function (...args) { const active = update.apply(this, args); window.toolbarActive = active; return active; };
    });
    await application.evaluate(({ BrowserWindow }) => {
      global.optimizationCounts = { packs: 0, progress: 0, flash: 0, overlay: 0, runtime: 0 };
      const win = BrowserWindow.getAllWindows()[0];
      for (const [method, key] of [['setProgressBar', 'progress'], ['flashFrame', 'flash'], ['setOverlayIcon', 'overlay']]) {
        const original = win[method]; win[method] = function (...args) { global.optimizationCounts[key]++; return original.apply(this, args); };
      }
      const send = win.webContents.send;
      win.webContents.send = function (channel, ...args) { if (channel === 'window:runtime-state') global.optimizationCounts.runtime++; return send.call(this, channel, ...args); };
    });
    await page.evaluate(() => { for (let i = 0; i < 25; i++) Cardable.events.emit('timer:tick', { now: Date.now() }); });
    await page.waitForTimeout(200);
    evidence.metrics.duplicateFullStock = await application.evaluate(() => ({ ...global.optimizationCounts }));
    evidence.metrics.duplicateFullStock.packs = await page.evaluate(() => window.desktopPackCalls);
    if (!baseline) assert.equal(evidence.metrics.duplicateFullStock.packs, 0, 'Unchanged full stock should not cross IPC');
    await page.evaluate(() => Cardable.settings.set('taskbarProgress', false)); await page.waitForTimeout(100);
    const hiddenProgress = await application.evaluate(() => global.optimizationCounts.progress);
    await page.evaluate(() => Cardable.settings.set('taskbarProgress', true)); await page.waitForTimeout(100);
    assert.equal(await application.evaluate(() => global.optimizationCounts.progress), hiddenProgress + 1, 'Taskbar preference changes must still reach the native window');
    await page.evaluate(() => { window.layoutRefreshes = 0; Cardable.events.on('layout:resize', () => window.layoutRefreshes++); });
    const bounds = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
    for (let i = 0; i < 12; i++) {
      await application.evaluate(({ BrowserWindow }, { bounds, i }) => BrowserWindow.getAllWindows()[0].setPosition(bounds.x + (i % 2 ? 0 : 12), bounds.y), { bounds, i });
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(200);
    evidence.metrics.windowMove = { layoutRefreshes: await page.evaluate(() => window.layoutRefreshes), runtimeMessages: await application.evaluate(() => global.optimizationCounts.runtime) };
    if (!baseline) assert.equal(evidence.metrics.windowMove.layoutRefreshes, 0, 'Window position does not change renderer geometry');
    await application.evaluate(({ BrowserWindow }, bounds) => BrowserWindow.getAllWindows()[0].setSize(bounds.width + 20, bounds.height), bounds);
    await page.waitForTimeout(400);
    assert(await page.evaluate(() => window.layoutRefreshes > 0), 'Real resize must refresh layout');
    await application.evaluate(({ BrowserWindow }, bounds) => BrowserWindow.getAllWindows()[0].setBounds(bounds), bounds);
    await page.waitForTimeout(400);
    await page.evaluate(() => Cardable.settings.set('interfaceSize', '125')); await page.waitForTimeout(300);
    const expectedZoom = await page.evaluate(async () => { const size = await cardableDesktop.window.getRuntimeState(); return Cardable.viewport.scale(size.width, size.height, 1.25); });
    assert(Math.abs(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor()) - expectedZoom) < .0001, 'Interface scale change must survive geometry caching');
    await page.evaluate(() => Cardable.settings.set('interfaceSize', 'auto')); await page.waitForTimeout(300);
    await page.evaluate(() => { Cardable.settings.applyPreset('very-low'); Cardable.settings.set('motion', 'on'); });
    await page.mouse.move(24, 200);
    await page.waitForTimeout(2200);
    if (!baseline) await page.waitForFunction(() => !Cardable.fx.stats.running, null, { timeout: 10000 });
    const resting = await page.evaluate(() => ({ frames: Cardable.fx.stats.frameCount, layouts: window.layoutRefreshes }));
    await page.waitForTimeout(1100);
    evidence.metrics.staticVeryLow = await page.evaluate(resting => ({ frames: Cardable.fx.stats.frameCount - resting.frames, layouts: window.layoutRefreshes - resting.layouts, active: Array.from(window.activeVisuals.keys()), toolbar: window.toolbarActive, inventoryProgress: Cardable.inventory.progress, reduced: Cardable.motion.reduced }), resting);
    if (!baseline) { assert.equal(evidence.metrics.staticVeryLow.layouts, 0); assert.equal(evidence.metrics.staticVeryLow.frames, 0, 'Still Very Low menu should stop requesting visual frames'); }
    evidence.groups.push('Identical full-stock events and window moves measured; real resizing still refreshes layout.');

    // All ten skins and all four tiers must still reach the native Mini renderer.
    const miniReady = application.waitForEvent('window');
    assert.equal(await page.evaluate(() => cardableDesktop.window.toggleMini()), true);
    const mini = await miniReady;
    assert(mini); watch(mini);
    await mini.waitForSelector('#name');
    await page.waitForTimeout(500);
    evidence.metrics.miniVisibility = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(win => ({ title: win.getTitle(), visible: win.isVisible(), minimized: win.isMinimized() })));
    console.log(JSON.stringify(evidence.metrics));
    await page.waitForFunction(() => Cardable.fx.stats.paused);
    const packs = await page.evaluate(() => Cardable.data.packs.filter(pack => pack.enabled).map(pack => pack.id));
    for (const tier of ['very-low', 'low', 'medium', 'high']) for (const pack of packs) {
      await page.evaluate(({ tier, pack }) => { Cardable.settings.applyPreset(tier); Cardable.packs.forceNext(pack); }, { tier, pack });
      await mini.waitForFunction(({ tier, pack }) => document.documentElement.dataset.quality === tier && Cardable.pack(pack).name === document.getElementById('name').textContent, { tier, pack });
      assert.equal(await mini.locator('#open').isEnabled(), true);
    }
    if (!baseline) {
      await page.evaluate(() => { Cardable.settings.applyPreset('high'); Cardable.packs.forceNext('standard'); Cardable.settings.set('reflectionQuality', 'very-low'); Cardable.settings.set('particleQuality', 'low'); });
      await mini.waitForFunction(() => document.documentElement.dataset.reflectionQuality === 'very-low' && document.documentElement.dataset.particleQuality === 'low');
      assert.equal(await mini.locator('.pack-reflection').first().evaluate(el => getComputedStyle(el).display), 'none');
      assert.equal(await mini.evaluate(() => document.documentElement.dataset.quality), 'high');
      await page.evaluate(() => Cardable.settings.applyPreset('high'));
      await mini.waitForFunction(() => document.documentElement.dataset.reflectionQuality === 'high');
      assert.equal(await page.evaluate(() => cardableDesktop.window.setPack({ ready: 1, progress: 0, packId: 'standard', countdown: '0s', quality: 'high', canMini: true, graphics: { reflectionQuality: 'invalid' } })), false);
      evidence.groups.push('Mini follows independent reflection/particle settings and validates incoming graphics tiers.');
    }
    const sleeping = await page.evaluate(() => Cardable.fx.stats.frameCount);
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => Cardable.fx.stats.frameCount), sleeping, 'Hidden full window must sleep in Mini');
    await page.evaluate(() => { const C = Cardable; C.state.current.packs.ready = 0; C.state.current.packs.timerStartedAt = Date.now() - C.config.packs.regenMs + 600; C.state.save(); C.timers.tick(); });
    await mini.waitForFunction(() => !document.getElementById('open').disabled, null, { timeout: 4000 });
    assert.equal(await page.evaluate(() => Cardable.state.current.packs.ready), 1);
    await mini.screenshot({ path: path.join(output, baseline ? 'mini-before.png' : 'mini-after.png') });
    await mini.getByRole('button', { name: 'Restore full window', exact: true }).click();
    await page.waitForFunction(() => !Cardable.fx.stats.paused);
    await page.evaluate(() => { if (Cardable.friendly?.active) Cardable.friendly.close(); });
    evidence.groups.push('40 Mini skin/tier combinations, hidden visual sleep, real elapsed refill and restored rendering.');

    // Renderer re-navigation must receive native geometry even if nothing moved.
    await page.reload(); await page.waitForFunction(() => Cardable.preferences.initialized && Cardable.viewport.root && !Cardable.fx.stats.paused);
    assert(await page.evaluate(() => Cardable.viewport.root.classList.contains('is-composed')));
    await page.evaluate(() => { Cardable.settings.set('unfocusedMode', 'pause'); });
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
    await page.waitForFunction(() => Cardable.fx.stats.paused);
    await application.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.restore(); win.show(); win.focus(); });
    await page.waitForFunction(() => !Cardable.fx.stats.paused);
    evidence.groups.push('Reload geometry/visibility handoff and native minimize/restore respect pause controls.');
    await page.evaluate(() => {
      const C = Cardable; if (C.friendly?.active) C.friendly.close();
      C.settings.applyPreset('low'); C.settings.set('cutscenes', 'off'); C.settings.set('motion', 'on'); C.settings.set('fpsLimit', '45'); C.packs.forceNext('standard');
      C.state.current.packs.ready = 2; C.state.save();
    });
    await page.keyboard.down('Space'); await page.waitForTimeout(450); await page.keyboard.up('Space');
    await page.waitForFunction(() => Cardable.opening.phase === 'idle');
    assert.equal(await page.evaluate(() => Cardable.state.current.packs.ready), 2, 'Early release must not consume stock');
    await page.keyboard.down('Space'); await page.waitForTimeout(3200); await page.keyboard.up('Space');
    await page.waitForFunction(() => Cardable.opening.phase === 'cutting', null, { timeout: 12000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Cardable.opening.phase === 'revealed' && !Cardable.opening.keepButton.hidden && !Cardable.opening.keepButton.disabled, null, { timeout: 16000 });
    await page.locator('.opening-keep').click();
    await page.waitForFunction(() => Cardable.state.current.inventory.length === 1 && !Cardable.state.current.pendingReveal && Cardable.opening.phase === 'idle');
    await page.waitForTimeout(900);
    const saved = await page.evaluate(() => ({ inventory: Cardable.state.current.inventory, currency: Cardable.state.current.currency, ready: Cardable.state.current.packs.ready, settings: Cardable.state.current.settings }));
    assert.equal(saved.ready, 1);
    await page.reload(); await page.waitForFunction(() => Cardable.preferences.initialized);
    assert.deepEqual(await page.evaluate(() => ({ inventory: Cardable.state.current.inventory, currency: Cardable.state.current.currency, ready: Cardable.state.current.packs.ready, settings: Cardable.state.current.settings })), saved);
    evidence.groups.push('Native 45 FPS keyboard journey: early-release cancellation, three-second charge, keyboard tear, pointer Keep, exact ownership/stock/currency/settings after reload.');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.network, []);
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    if (application) await application.close().catch(() => {});
    fs.writeFileSync(path.join(output, baseline ? 'desktop-work-baseline.json' : 'desktop-work-after.json'), JSON.stringify(evidence, null, 2));
    const target = path.resolve(profile), prefix = path.resolve(os.tmpdir(), 'cardable-desktop-optimization-');
    if (target.startsWith(prefix)) fs.rmSync(target, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
