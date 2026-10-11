'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { _electron } = require('playwright');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-pass3-'));
const output = path.join(root, 'qa-output', 'optimization');
const evidence = { groups: [], errors: [], network: [] };
let app;
(async () => {
  try {
    app = await _electron.launch({ executablePath: require('electron'), args: [root, '--qa-test', '--test-user-data=' + profile] });
    const page = await app.firstWindow();
    page.on('pageerror', error => evidence.errors.push(error.stack));
    page.on('console', message => { if (message.type() === 'error') evidence.errors.push(message.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url())) evidence.network.push(request.url()); });
    await page.waitForFunction(() => window.Cardable?.preferences?.initialized && Cardable.state.current);
    await page.evaluate(() => { Cardable.tutorial.skipButton.click(); if (Cardable.friendly?.active) Cardable.friendly.close(); Cardable.settings.set('idleFade', 'never'); });
    await page.waitForFunction(() => !Cardable.setup?.loading);
    await page.waitForTimeout(250);
    const welcome = page.getByRole('button', { name: 'Start collecting', exact: true });
    if (await welcome.isVisible()) await welcome.click();
    const quality = await page.evaluate(() => {
      const C = Cardable, failures = [];
      C.settings.applyPreset('high');
      C.settings.withPolicy('very-low', () => {
        if (C.settings.getRequested('quality') !== 'high' || C.settings.get('quality') !== 'very-low') failures.push('Requested quality changed with temporary policy.');
      });
      for (const tier of ['very-low', 'low', 'medium', 'high', 'very-high']) C.settings.withPolicy(tier, () => {
        if (C.quality.rank !== C.quality.profile.rank) failures.push('Effective rank differs for ' + tier);
        const cfg = Object.assign({}, C.config.cardView.spring), spring = C.springs.create(0);
        let value = 0, velocity = 0;
        for (const dt of [4.17, 16.67, 40, 100]) {
          let remaining = Math.max(0, Math.min(dt * (C.settings.get('uiAnimationSpeed') || 1), C.config.shell.maxFrameDeltaMs)) / 1000;
          while (remaining > 0) {
            const step = Math.min(remaining, cfg.stepMs / (C.quality.profile.rank === 4 ? 2000 : 1000));
            velocity += (cfg.stiffness * (1 - value) - cfg.damping * velocity) / cfg.mass * step;
            value += velocity * step; remaining -= step;
          }
          if (Math.abs(1 - value) < cfg.epsilon && Math.abs(velocity) < cfg.epsilon) { value = 1; velocity = 0; }
          spring.step(dt, 1);
          if (spring.value !== value || spring.velocity !== velocity) failures.push('Spring trajectory differs for ' + tier);
        }
      });
      return failures;
    });
    assert.deepEqual(quality, []);
    evidence.groups.push('Requested quality survives temporary policies; allocation-free effective ranks and spring trajectories match all five tiers.');
    const formats = await page.evaluate(() => {
      const C = Cardable, at = new Date(2026, 9, 11, 13, 25).getTime(), failures = [];
      for (const format of ['system', 'dmy', 'mdy', 'iso']) for (const time of ['system', '12', '24']) {
        C.settings.set('dateFormat', format); C.settings.set('timeFormat', time);
        const date = new Date(at), opts = { hour: '2-digit', minute: '2-digit' };
        if (time !== 'system') opts.hour12 = time === '12';
        const expected = (format === 'iso' ? date.toISOString().slice(0, 10) : date.toLocaleDateString(format === 'dmy' ? 'en-GB' : format === 'mdy' ? 'en-US' : undefined)) + ' ' + date.toLocaleTimeString(undefined, opts);
        if (C.formats.date(at, true) !== expected) failures.push({ format, time, expected, actual: C.formats.date(at, true) });
      }
      return failures;
    });
    assert.deepEqual(formats, []);
    evidence.groups.push('All twelve date/time combinations match native locale output and change immediately.');
    const resources = await page.evaluate(() => {
      const C = Cardable, item = C.packView.front, retired = [];
      for (let i = 0; i < 40; i++) {
        item.ensureRear();
        retired.push(...C.packFaces.faces(item.el));
        C.packMarkup.setPack(item.el, C.data.packs[i % C.data.packs.length]);
      }
      const retained = item.glass._packFaces || [];
      return { retained: retained.length, live: retained.filter(f => !f.dead).length, retiredBuffers: retired.filter(f => f.dead && (f.body.width || f.dyn.width)).length, rear: item.rearBuilt };
    });
    assert.equal(resources.retained, 1); assert.equal(resources.live, 1); assert.equal(resources.retiredBuffers, 0); assert.equal(resources.rear, false);
    evidence.resources = resources;
    evidence.groups.push('Forty front/back pack rebuilds retain one front controller, no retired canvas buffers, and no stale rear.');
    await page.evaluate(() => { Cardable.packMarkup.setPack(Cardable.packView.front.el, Cardable.packs.upcoming(1)[0]); });
    const dpr = await page.evaluate(() => {
      const C = Cardable, face = C.packFaces.faces(C.packView.front.el)[0];
      C.settings.applyPreset('high'); face.paint();
      C.settings.applyPreset('very-low'); face.draw();
      return { width: face.body.width, expected: Math.round(face.size.w * Math.min(devicePixelRatio, 1)), ratio: face.ratio };
    });
    assert.equal(dpr.width, dpr.expected); assert.equal(dpr.ratio, 1);
    evidence.groups.push('A canvas quality change reallocates to the new budget before drawing.');
    const kit = await page.evaluate(async () => {
      const host = document.createElement('div'), button = document.createElement('button'); button.textContent = 'Pass 3 control'; host.appendChild(button); document.body.appendChild(host);
      const artwork = document.createElement('div'); artwork.className = 'collectible-card'; const artButton = document.createElement('button'); artwork.appendChild(artButton); host.appendChild(artwork);
      await new Promise(resolve => setTimeout(resolve, 0));
      const result = { chrome: button.classList.contains('cb-control'), art: artButton.classList.contains('cb-control') }; host.remove(); return result;
    });
    assert.deepEqual(kit, { chrome: true, art: false });
    evidence.groups.push('Batched UI enhancement still mounts new controls and excludes artwork children.');
    const geometry = await page.evaluate(() => {
      const C=Cardable, host=document.createElement('div'); host.style.cssText='position:fixed;width:600px;height:400px;left:0;top:0'; document.body.appendChild(host);
      const grid=C.inventoryGrid.create(host,{select(){},activate(){},context(){},blocked(){return false;}}),entries=C.collection.project(C.data.cards,[], 'all').entries;
      grid.setModel(entries,null);grid.resize(400);const original=grid.layout;grid.resize(420);const same=grid.layout===original;
      host.style.width='900px';grid.resize(420);const changed=grid.layout!==original;grid.clear();host.remove();return {same,changed};
    });
    assert.deepEqual(geometry,{same:true,changed:true});
    evidence.groups.push('Height-only sheet changes reuse row geometry; width changes rebuild it.');
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'pass3-menu.png') });
    await page.evaluate(() => {
      const C = Cardable, instances = [];
      C.data.cards.filter(c => !c.retired && c.active !== false).forEach((card, i) => [null, ...C.data.variants.map(v => v.id)].forEach((variantId, j) => instances.push({ instanceId: 'budget-' + i + '-' + j, cardId: card.id, variantId, serial: 'TEST-' + i + '-' + j, pulledAt: Date.now(), seen: true })));
      const create = C.inventoryTiles.create; window.mountBatch = 0; window.maxMountBatch = 0;
      C.inventoryTiles.create = function (...args) { window.mountBatch++; return create.apply(this, args); };
      C.events.on('fx:frame', () => { window.maxMountBatch = Math.max(window.maxMountBatch, window.mountBatch); window.mountBatch = 0; });
      C.events.emit('inventory:fixture', { cards: C.data.cards, instances }); C.inventoryModel.update({ viewMode: 'grid' }); C.inventory.request('expanded');
    });
    for (const tier of ['very-low', 'low', 'medium', 'high']) {
      await page.evaluate(tier => { Cardable.settings.applyPreset(tier); Cardable.inventory.grid.scrollTop = 2800; }, tier);
      await page.waitForTimeout(800);
      assert(await page.locator('.inventory-grid .inventory-tile').count() <= 80);
      await page.locator('.inventory-grid').focus(); await page.keyboard.press('End');
      await page.waitForTimeout(700);
      const selected = await page.evaluate(() => ({ selected: Cardable.inventory.center, count: Cardable.inventory.entries.length, centered: document.querySelectorAll('.inventory-grid .is-centered').length, focused: document.activeElement.classList.contains('is-centered'), scroll: Cardable.inventory.grid.scrollTop, scrollHeight: Cardable.inventory.grid.scrollHeight, mounted: Array.from(Cardable.inventory.rendered.values()).map(t => ({ index: t.index, centered: t.centered })), running: Cardable.fx.stats.running, scope: Cardable.fx.scopeLabel }));
      evidence.selection = selected;
      await page.screenshot({ path: path.join(output, 'pass3-grid.png') });
      assert.equal(selected.selected, selected.count - 1); assert.equal(selected.centered, 1); assert.equal(selected.focused, true);
      await page.keyboard.press('Home'); await page.waitForTimeout(700);
      evidence.groups.push(tier + ': bounded grid, far scroll, End/Home and selected-card keyboard focus.');
    }
    evidence.maxMountBatch = await page.evaluate(() => window.maxMountBatch);
    assert(evidence.maxMountBatch <= 4, 'A keyboard mount and one scheduled mount batch remain bounded');
    await page.screenshot({ path: path.join(output, 'pass3-grid.png') });
    await page.evaluate(() => Cardable.inventory.request('peek'));
    await page.waitForFunction(() => !Cardable.inventory.active);
    for (const pack of await page.evaluate(() => Cardable.data.packs.filter(p => p.enabled).map(p => p.id))) {
      const starting = await page.evaluate(id => {
        const C = Cardable; C.settings.applyPreset('very-low'); C.settings.set('cutscenes', 'off'); C.settings.set('skipAllCutscenes', true); C.settings.set('motion', 'on');
        C.state.current.packs.ready = 4; C.state.current.packs.introSeen[id] = true; C.state.save();
        const before = { inventory: C.state.current.inventory.length, currency: C.state.current.currency };
        if (!C.opening.openNow(id)) throw new Error('Cannot open ' + id); return before;
      }, pack);
      const deadline = Date.now() + 30000;
      while (true) {
        const phase = await page.evaluate(() => Cardable.opening.phase);
        if (phase === 'revealed' && await page.evaluate(() => !Cardable.opening.keepButton.hidden)) break;
        if (Date.now() > deadline) throw new Error(pack + ' stuck in ' + phase);
        if (phase === 'cutting') await page.evaluate(() => Cardable.opening.finishCut());
        if (phase === 'vaultWaiting' || phase === 'boxWaiting') await page.keyboard.press('Enter');
        if (await page.locator('.shuffle-stage[data-state="pick"]').count()) { await page.keyboard.press('1'); await page.keyboard.press('Enter'); }
        await page.waitForTimeout(80);
      }
      await page.evaluate(() => { Cardable.opening.keepCurrent(); Cardable.opening.keepCurrent(); });
      await page.waitForFunction(() => Cardable.opening.phase === 'idle');
      const ending = await page.evaluate(() => ({ inventory: Cardable.state.current.inventory.length, pending: Cardable.state.current.pendingReveal }));
      assert.equal(ending.inventory, starting.inventory + 1); assert.equal(ending.pending, null);
      evidence.groups.push(pack + ': opening strategy/cut/choice/reveal and repeated Keep yield exactly one card.');
      console.log('Pack checked: ' + pack);
    }
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.network, []);
  } finally {
    if (app) await app.close();
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'pass3-check.json'), JSON.stringify(evidence, null, 2));
    if (path.resolve(profile).startsWith(path.resolve(os.tmpdir(), 'cardable-pass3-'))) fs.rmSync(profile, { recursive: true, force: true });
  }
  console.log(JSON.stringify(evidence, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
