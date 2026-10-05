'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { _electron } = require('playwright');
const root = path.resolve(__dirname, '..');
const binary = process.env.CARDABLE_QA_BINARY || path.join(root, 'dist/win-unpacked/Cardable.exe');
const output = process.env.CARDABLE_QA_OUTPUT || path.join(root, 'qa-output');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-regression-'));
const evidence = { groups: [], errors: [], network: [], metrics: [], screens: [] };
let application;
async function launch(dev = false) {
  const start = performance.now();
  application = await _electron.launch({ executablePath: binary, args: ['--qa-test', `--test-user-data=${profile}`, ...(dev ? ['--qa-dev-workspace'] : [])], timeout: 30000 });
  const page = await application.firstWindow();
  page.on('pageerror', error => evidence.errors.push(error.stack));
  page.on('console', message => { if (message.type() === 'error') evidence.errors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url())) evidence.network.push(request.url()); });
  await page.waitForFunction(() => window.Cardable && Cardable.state && Cardable.state.current && Cardable.preferences.initialized);
  evidence.metrics.push({ startupMs: Math.round(performance.now() - start), mode: dev ? 'developer' : 'normal' });
  return page;
}
async function close() { const app = application; application = null; await app.close(); }
async function shot(page, name) { await page.screenshot({ path: path.join(output, name + '.png') }); evidence.screens.push(name + '.png'); }
(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    let page = await launch();
    await page.evaluate(() => Cardable.tutorial.skipButton.click());
    const security = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
    assert.equal(security.contextIsolation, true); assert.equal(security.nodeIntegration, false); assert.equal(security.sandbox, true); assert.equal(security.webSecurity, true);
    assert(await page.evaluate(() => typeof require === 'undefined' && typeof process === 'undefined' && !cardableDesktop.ipcRenderer));
    await shot(page, 'menu');
    await page.keyboard.press('s'); await page.waitForFunction(() => Cardable.preferences.open);
    assert(await page.locator('.settings-update-box').isVisible());
    await page.keyboard.press('Tab'); assert(await page.evaluate(() => Cardable.preferences.panel.contains(document.activeElement)));
    await page.evaluate(() => { const scroll = document.querySelector('.settings-scroll'); scroll.scrollTop = scroll.scrollHeight; });
    await page.waitForTimeout(350); await shot(page, 'desktop-settings');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !Cardable.preferences.open);
    evidence.groups.push('Native security preferences, renderer isolation, keyboard Settings/focus trap and desktop presentation.');

    // Durable real instances, not an inventory-only presentation fixture.
    await page.evaluate(() => {
      const C = Cardable, next = C.state.fresh(), cards = C.data.cards.filter(card => !card.retired && card.active !== false);
      next.tutorial.done = true; next.tutorial.step = 'done'; next.currency = 987654;
      next.inventory = Array.from({ length: 600 }, (_, i) => ({ instanceId: 'qa-' + i, cardId: cards[i % cards.length].id, variantId: i % 4 === 0 ? C.data.variants[0].id : null, cardSkinId: null, packId: 'standard', serial: C.serial.format(next.playerCode, i + 1), pulledAt: Date.now() - i, seen: true }));
      next.serialCounter = next.inventory.length;
      const scene = C.studioScenes.defaults(next.inventory[0]); scene.props = [C.studioScenes.prop({ type: 'fan', id: 'qa-fan' })];
      next.studio = { slots: [{ name: 'Migration QA scene', thumbnail: '', scene }], last: {} };
      if (!C.state.commit(C.state.validate(next, true))) throw new Error('QA save did not persist');
      C.events.emit('save:replaced', C.state.current); C.settings.applyPreset('medium');
      C.settings.set('fpsLimit', '60'); C.settings.set('cutscenes', 'off'); C.inventory.request('expanded');
    });
    await page.waitForFunction(() => Cardable.inventory.active && Cardable.inventory.rendered.size > 0);
    await page.waitForTimeout(700);
    const shelf = await page.locator('.inventory-shelf').boundingBox();
    const before = await page.evaluate(() => Cardable.inventory.carousel.position);
    await page.mouse.move(shelf.x + shelf.width / 2, shelf.y + shelf.height / 2); await page.mouse.down();
    await page.mouse.move(shelf.x + shelf.width / 2 - 210, shelf.y + shelf.height / 2, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(500); assert.notEqual(await page.evaluate(() => Cardable.inventory.carousel.position), before);
    const count = await page.evaluate(() => ({ total: Cardable.inventory.entries.length, rendered: Cardable.inventory.rendered.size }));
    assert(count.total > 100); assert(count.rendered <= 11);
    await page.getByRole('button', { name: 'Sort cards', exact: true }).click();
    await page.getByRole('button', { name: 'Name A–Z', exact: true }).click();
    await page.getByRole('button', { name: 'Filter cards', exact: true }).click();
    await page.getByRole('button', { name: 'Owned', exact: true }).click();
    await page.getByRole('button', { name: 'Close options', exact: true }).click();
    await page.getByRole('button', { name: 'Search cards', exact: true }).click();
    await page.locator('.inventory-search input').fill('brand:NVIDIA');
    await page.waitForTimeout(200); assert(await page.evaluate(() => Cardable.inventory.entries.length > 0 && Cardable.inventory.entries.every(entry => entry.card.brand.toLowerCase() === 'nvidia')));
    await page.locator('.inventory-search input').fill(''); await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await page.locator('.inventory-tile.is-centered').click(); await page.waitForFunction(() => Cardable.detail.phase === 'detail');
    await page.getByRole('button', { name: 'Flip · R', exact: true }).click(); await page.waitForFunction(() => Cardable.detail.view.side === 'back');
    await page.waitForTimeout(800);
    await page.keyboard.press('r'); await page.waitForFunction(() => Cardable.detail.view.side === 'front');
    await shot(page, 'detail');
    await page.getByRole('button', { name: 'Inspect card in studio', exact: true }).click();
    await page.waitForFunction(() => Cardable.studio.active && !!document.querySelector('.studio-shell.is-ready'), null, { timeout: 15000 });
    assert(await page.evaluate(() => !!Cardable.studioController.scene));
    await page.evaluate(() => { Cardable.studioController.scene.camera.yaw = .4; Cardable.studioController.scene.director.duration = 5; });
    await shot(page, 'studio');
    await page.getByRole('button', { name: 'Director', exact: true }).click();
    await page.getByRole('button', { name: 'Build cinematic orbit', exact: true }).click();
    assert(await page.evaluate(() => Cardable.studioController.scene.keyframes.length > 0));
    await page.getByRole('button', { name: 'Preview', exact: true }).click(); await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Pause preview', exact: true }).click();
    await page.getByRole('slider', { name: 'Timeline playhead', exact: true }).fill('2');
    await shot(page, 'director'); await page.evaluate(() => Cardable.studio.exit()); await page.waitForFunction(() => !Cardable.studio.active);
    assert(await page.evaluate(() => Object.values(Cardable.state.current.studio.last).some(scene => scene.keyframes.length > 0 && scene.director.playhead === 2)));
    await page.getByRole('button', { name: 'Close card detail', exact: true }).click(); await page.waitForFunction(() => Cardable.detail.phase === 'closed');
    await page.getByRole('button', { name: 'Switch to Grid', exact: true }).click();
    await page.locator('.inventory-grid').evaluate(el => { el.scrollTop = 2800; }); await page.waitForTimeout(250);
    assert(await page.locator('.inventory-grid .inventory-tile').count() <= 80); await shot(page, 'grid');
    evidence.groups.push('600 durable instances: shelf drag, bounded DOM, sort/filter/search, detail mouse/keyboard flip, Studio load/save/exit, Director orbit/play/pause/scrub, virtual grid scroll.');

    for (const [width, height] of [[960,640],[1920,1080],[2560,1080],[3840,2160]]) {
      await application.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(size[0], size[1]), [width,height]);
      await page.waitForTimeout(200);
      assert(await page.evaluate(() => document.querySelector('.inventory-sheet').getBoundingClientRect().width > 0));
      if (width === 2560) await shot(page, 'ultrawide-grid');
    }
    await page.keyboard.press('F11'); await page.waitForFunction(async () => await cardableDesktop.window.isFullscreen());
    await page.keyboard.press('F11'); await page.waitForFunction(async () => !(await cardableDesktop.window.isFullscreen()));
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440,900));
    await page.evaluate(() => Cardable.inventory.request('peek')); await page.waitForFunction(() => !Cardable.inventory.active);
    await page.evaluate(() => {
      Cardable.settings.applyPreset('high');
      for (let n=0;n<85;n++) Cardable.events.emit('fx:frame',{realDt:100,targetFps:60});
    });
    assert(await page.evaluate(() => !Cardable.preferences.nudge.hidden));
    const packs = await page.evaluate(() => Cardable.data.packs.filter(pack => pack.enabled).map(pack => pack.id));
    for (const pack of packs) {
      const starting = await page.evaluate(id => {
        const C = Cardable; C.settings.applyPreset('very-low'); C.settings.set('cutscenes','off'); C.settings.set('motion','on');
        C.state.current.packs.ready = 4; C.state.current.packs.introSeen[id] = true; C.state.save();
        const before = C.state.current.inventory.length; if (!C.opening.openNow(id)) throw new Error('Cannot open ' + id); return before;
      }, pack);
      const deadline = Date.now() + 22000;
      while (true) {
        const phase = await page.evaluate(() => Cardable.opening.phase);
        if (phase === 'revealed' && await page.evaluate(() => !Cardable.opening.keepButton.hidden)) break;
        if (Date.now() > deadline) throw new Error(`Pack ${pack} stuck in ${phase}`);
        if (phase === 'cutting') await page.evaluate(() => Cardable.opening.finishCut());
        if (phase === 'vaultWaiting' || phase === 'boxWaiting') await page.keyboard.press('Enter');
        if (await page.locator('.picker-option:not([disabled])').count()) {
          await page.locator('.picker-option').first().click(); await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(80);
      }
      assert(await page.evaluate(() => Cardable.preferences.nudge.hidden), 'Performance nudge must not cover a reveal');
      await page.evaluate(() => Cardable.opening.keepCurrent());
      await page.waitForFunction(() => Cardable.opening.phase === 'idle');
      assert.equal(await page.evaluate(() => Cardable.state.current.inventory.length), starting + 1);
      if (pack === packs[0]) {
        await page.locator('.settings-nudge').getByRole('button', { name:'Dismiss', exact:true }).click();
        evidence.groups.push('Low-FPS suggestion is deferred during opening and returns safely to the menu.');
      }
      evidence.groups.push('Pack open/cut or strategy/choice/reveal/Keep: ' + pack);
      console.log('Pack regression passed: ' + pack);
    }
    // Exercise the real Chromium download and file-input import pathways.
    await page.keyboard.press('s'); await page.waitForFunction(() => Cardable.preferences.open);
    const originalCurrency = await page.evaluate(() => Cardable.state.current.currency);
    const file = path.join(profile, 'exported-save.json');
    await application.evaluate(({ BrowserWindow }, file) => {
      global.cardableDownloadState = null;
      BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (event, item) => {
        item.setSavePath(file);
        item.once('done', (event, state) => { global.cardableDownloadState = state; });
      });
    }, file);
    await page.getByRole('button', { name:'Export save', exact:true }).click();
    const downloadDeadline = Date.now() + 30000;
    while (!await application.evaluate(() => global.cardableDownloadState)) {
      if (Date.now() > downloadDeadline) throw new Error('Native save download did not complete');
      await page.waitForTimeout(100);
    }
    assert.equal(await application.evaluate(() => global.cardableDownloadState), 'completed');
    const imported = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(imported.save.currency, originalCurrency); assert.equal(imported.app, 'cardable');
    // Export itself may legitimately pay the existing Export achievement after
    // its snapshot is created. Import preview must not mutate that live state.
    const liveBeforeImport = await page.evaluate(() => Cardable.state.current.currency);
    await page.locator('.settings-drop-zone input[type=file]').setInputFiles(file);
    await page.waitForFunction(() => !Cardable.settingsData.current.preview.hidden);
    assert.equal(await page.evaluate(() => Cardable.state.current.currency), liveBeforeImport);
    const replace = page.locator('.settings-import-preview button').first();
    await replace.click(); await replace.click();
    await page.waitForFunction(() => !Cardable.preferences.open);
    assert.equal(await page.evaluate(() => Cardable.state.current.currency), originalCurrency);
    await page.evaluate(() => Cardable.saveTools.expireUndo());
    evidence.groups.push('Real Chromium save download, JSON file-input import, validated preview and two-click replacement preserve progress.');
    // Engine sampling exercises all cinematic backends and teardown without rerolling state.
    const cinematic = await page.evaluate(() => {
      const C=Cardable, rows=[];
      for (const quality of ['very-low','low','medium','high']) {
        C.settings.applyPreset(quality); C.settings.set('motion','off'); C.settings.set('cutscenes','full');
        for (const id of ['legendary','mythical','exotic','ascendant','secret']) {
          const rarity=C.rarity(id), intro=C.opening.intro; intro.start(rarity.openingIntro,rarity.name,'ELECTRON-QA');
          const duration=intro.durationMs; intro.update(Math.min(1000,duration/2),performance.now());
          rows.push({quality,id,duration,pixels:intro.canvas.width*intro.canvas.height}); intro.stop();
        }
      }
      return rows;
    }); assert(cinematic.every(row => row.duration>0 && row.pixels>0)); evidence.cinematics=cinematic;
    const performanceSample = await page.evaluate(async () => {
      const C=Cardable; C.settings.applyPreset('medium'); C.settings.set('fpsLimit','60');
      const stop=C.fx.subscribe(()=>true,'electron-qa-fps'), at=performance.now(), before=C.fx.stats.frameCount;
      await new Promise(resolve=>setTimeout(resolve,1200)); const fps=(C.fx.stats.frameCount-before)*1000/(performance.now()-at); stop();
      return {fps,stats:JSON.parse(JSON.stringify(C.fx.stats))};
    }); evidence.metrics.push(performanceSample);
    evidence.metrics.push(await application.evaluate(({ app }) => ({ processes: app.getAppMetrics().map(metric => ({ type: metric.type, cpu: metric.cpu, memory: metric.memory })) })));
    const photo = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0,0,96,64);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      await Cardable.studioAlbum.save({ id:'electron-persistence-photo', name:'Persistence photo', createdAt:Date.now(), w:96, h:64, blob, thumb:blob });
      return { name:'Persistence photo', bytes:Array.from(new Uint8Array(await blob.arrayBuffer())) };
    });
    const saved = await page.evaluate(() => ({ count: Cardable.state.current.inventory.length, currency: Cardable.state.current.currency, serials: Cardable.state.current.inventory.map(i=>i.serial), studio:Cardable.state.current.studio, settings:Cardable.state.current.settings }));
    await close();
    page = await launch();
    assert.deepEqual(await page.evaluate(() => ({ count: Cardable.state.current.inventory.length, currency: Cardable.state.current.currency, serials:Cardable.state.current.inventory.map(i=>i.serial), studio:Cardable.state.current.studio, settings:Cardable.state.current.settings })), saved);
    assert.deepEqual(await page.evaluate(async () => {
      await Cardable.studio.openAlbum(); Cardable.studioAlbumUI.close();
      const photo = await Cardable.studioAlbum.get('electron-persistence-photo');
      return { name:photo.name, bytes:Array.from(new Uint8Array(await photo.blob.arrayBuffer())) };
    }), photo);
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
    await new Promise((resolve,reject) => {
      const second=spawn(binary,['--qa-test',`--test-user-data=${profile}`],{stdio:'pipe'}); let text='';
      second.stdout.on('data',data=>{text+=data;}); second.on('error',reject); second.on('exit',code=>code===0&&text.includes('Another instance')?resolve():reject(new Error('Single-instance failure')));
    });
    assert.equal(await application.evaluate(({ BrowserWindow })=>BrowserWindow.getAllWindows()[0].isMinimized()), false);
    await close();
    page=await launch(true); await page.waitForFunction(()=>Cardable.dev && Cardable.dev.ui && Cardable.dev.ui.panel);
    const checks=await page.evaluate(async()=>{
      const D=Cardable.dev;
      // Use the existing Checks tool: it suspends dev clock/encode overrides
      // and runs fixtures in their own storage context, restoring in finally.
      D.tools.get('checks.run').run();
      return {bug:D.checkSummary==='● Existing logic checks passed',logicReport:D.output.textContent,schedule:D.checkPackSchedule(),picker:D.checkPicker(),journal:D.checkJournal(),achievements:D.checkAchievements(),studio:await D.checkStudio()};
    });
    evidence.checks=checks; assert.equal(checks.bug,true); assert.equal(checks.schedule.pass,true); assert.equal(checks.picker.pass,true);
    assert.equal(checks.journal.passed,true); assert.equal(checks.achievements.passed,true); assert.equal(checks.studio.pending.length,0);
    evidence.groups.push('Repeated launch preserves exact cards/serials, settings, Studio content and IndexedDB photo PNG bytes; second instance restores window; existing developer logic/Studio photo+IndexedDB checks.');
    assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.network,[]);
    console.log(JSON.stringify(evidence,null,2));
  } finally {
    if(application) await close().catch(()=>{});
    fs.writeFileSync(path.join(output,'regression.json'),JSON.stringify(evidence,null,2));
    if(path.resolve(profile).startsWith(path.join(os.tmpdir(),'cardable-regression-'))) fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
