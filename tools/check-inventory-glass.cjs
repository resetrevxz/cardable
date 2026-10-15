'use strict';

// Browser mode uses the disposable local origin. Native mode keeps the QA
// player's user-data directory in a fresh temp folder, as the other QA launchers do.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium, _electron } = require('playwright');

const root = path.resolve(__dirname, '..');
const native = process.env.CARDABLE_TEST_NATIVE === '1';
const out = path.join(root, 'qa-output/inventory-glass');
const evidence = { native, checks: [], tiers: [], sizes: [], gridFocus: [], errors: [], network: [], screens: [] };
let app, browser, local, page;

async function shot(name) {
  const file = path.join(out, (native ? 'native-' : 'browser-') + name + '.png');
  await page.waitForTimeout(180);
  let buffer;
  if (native) {
    const base64 = await app.evaluate(async ({ BrowserWindow }) =>
      (await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));
    buffer = Buffer.from(base64, 'base64');
  } else buffer = await page.screenshot();
  fs.writeFileSync(file, buffer);
  evidence.screens.push(file);
}

async function ready() {
  await page.waitForFunction(() => Cardable.preferences?.initialized && !Cardable.setup.loading);
  await page.evaluate(() => {
    Cardable.tutorial.skipButton.click();
    if (Cardable.friendly?.active) Cardable.friendly.close();
  });
  if (await page.getByRole('button', { name: 'Start collecting', exact: true }).count()) {
    await page.getByRole('button', { name: 'Start collecting', exact: true }).click();
  }
  await page.waitForFunction(() => !Cardable.setup.loading);
}

async function viewport(width) {
  let actualWidth = width;
  if (native) {
    await app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setContentSize(w, 820), width);
    await page.waitForTimeout(240);
    const actual = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getContentSize());
    assert.equal(actual[0], width, 'native window content width');
    actualWidth = actual[0];
  } else {
    await page.setViewportSize({ width, height: 820 });
  }
  await page.waitForTimeout(180);
  const result = await page.evaluate(() => ({
    width: innerWidth,
    compositionWidth: Cardable.viewport.width,
    overflow: document.documentElement.scrollWidth > innerWidth,
    sheetWidth: Cardable.inventory.el.getBoundingClientRect().width
  }));
  if (!native) assert.equal(result.width, width);
  assert.equal(result.overflow, false, 'no horizontal page overflow at ' + width);
  evidence.sizes.push({ requestedWidth: width, nativeContentWidth: native ? actualWidth : undefined, ...result });
}

async function sheetStyle() {
  return page.evaluate(() => {
    const el = Cardable.inventory.el, css = getComputedStyle(el), root = getComputedStyle(document.documentElement);
    return {
      glassQuality: Cardable.settings.get('glassQuality'), quality: Cardable.settings.get('quality'),
      filter: css.backdropFilter, webkitFilter: css.getPropertyValue('-webkit-backdrop-filter') || css.backdropFilter, fill: css.backgroundImage,
      background: css.backgroundColor, tint: root.getPropertyValue('--inventory-bg-rgb').trim(),
      opacity: root.getPropertyValue('--inventory-bg-opacity').trim(),
      chrome: root.getPropertyValue('--inventory-chrome-rgb').trim(),
      artifacts: document.querySelectorAll('.cb-inventory-glass-edge,.cb-inventory-optics,.cb-gallery-glass-edge').length
    };
  });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    if (native) {
      app = await _electron.launch({ executablePath: require('electron'), args: [root, '--qa-test', '--test-user-data=' + fs.mkdtempSync(path.join(os.tmpdir(), 'cardable-glass-'))] });
      page = await app.firstWindow();
      await app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0]; if (win.isMaximized()) win.unmaximize(); win.setContentSize(1280, 820);
      });
    } else {
      local = await require('./qa-local-server.cjs').start(root);
      browser = await chromium.launch({ channel: 'msedge', headless: true });
      page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
    }
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => evidence.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') evidence.errors.push(message.text()); });
    page.on('request', request => {
      if (/^https?:/i.test(request.url()) && (!local || !request.url().startsWith(local.url))) evidence.network.push(request.url());
    });
    if (!native) await page.goto(local.url + '/index.html');
    await ready();

    await page.evaluate(() => {
      const C = Cardable;
      C.settings.set('motion', 'off');
      C.settings.set('fpsLimit', '60');
      const cards = C.data.cards.filter(card => !card.retired && card.active !== false);
      const instances = cards.slice(0, 48).map((card, i) => ({
        instanceId: 'glass-' + i, cardId: card.id, serial: 'GLASS-' + i, pulledAt: i + 1, seen: true
      }));
      window.glassFixture = { cards: C.data.cards, instances };
      C.events.emit('inventory:fixture', glassFixture);
      C.inventoryModel.update({ showUnowned: false, viewMode: 'grid', groupMode: 'none' });
    });

    // The named surface contract is the same at every glass tier: no live
    // backdrop filters, generated edge nodes or SVG optics implementation.
    for (const tier of ['very-low', 'low', 'medium', 'high']) {
      await page.evaluate(value => Cardable.settings.applyPreset(value), tier);
      await page.waitForTimeout(90);
      const style = await sheetStyle();
      evidence.tiers.push({ tier, ...style });
      assert.equal(style.filter, 'none', tier + ' backdrop filter');
      assert.equal(style.webkitFilter, 'none', tier + ' prefixed backdrop filter');
      assert.equal(style.artifacts, 0, tier + ' has no obsolete optics or edge nodes');
      assert(style.fill !== 'none' || !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(style.background), tier + ' has a printed or solid surface');
    }
    await page.evaluate(() => { Cardable.settings.applyPreset('low'); Cardable.settings.set('glassQuality', 'high'); });
    const independent = await sheetStyle();
    assert.equal(independent.quality, 'low');
    assert.equal(independent.glassQuality, 'high');
    assert(independent.fill.includes('gradient'), 'independent High glass keeps its richer static gradient');
    for (const glassFirst of [true, false]) {
      await page.evaluate(first => {
        const C = Cardable;
        if (first) { C.settings.set('reduceTransparency', false); C.settings.set('glassQuality', 'medium'); C.settings.set('reduceTransparency', true); }
        else { C.settings.set('reduceTransparency', true); C.settings.set('glassQuality', 'high'); }
      }, glassFirst);
      const reduced = await sheetStyle();
      assert.equal(reduced.filter, 'none', 'reduce transparency order ' + glassFirst);
      assert.doesNotMatch(reduced.background, /rgba/i, 'reduce transparency order ' + glassFirst + ' is opaque');
    }
    await page.evaluate(() => { Cardable.settings.set('reduceTransparency', false); Cardable.settings.applyPreset('high'); });
    evidence.checks.push('All four graphics tiers use printed glass with no backdrop filter or obsolete optics/edge nodes; High glass remains independent and uses the richer static gradient.');

    await page.evaluate(() => {
      Cardable.settings.set('inventoryBackground', 'graphite'); Cardable.settings.set('inventoryOpacity', 78);
      Cardable.inventory.request('normal');
    });
    await page.waitForFunction(() => Cardable.inventory.active && Cardable.inventory.rendered.size > 0);
    await page.waitForTimeout(150);
    const cardTextBaseline = await page.evaluate(() => {
      const name = Cardable.inventory.el.querySelector('.inventory-tile .card__name');
      return name && getComputedStyle(name).color;
    });
    await shot('graphite-grid');
    await page.evaluate(() => Cardable.inventory.request(false));
    await page.waitForFunction(() => !Cardable.inventory.active);

    const normalization = await page.evaluate(() => {
      const schema = Cardable.settingsSchema;
      return {
        zero: schema.normalize({ inventoryOpacity: 0 }).inventoryOpacity,
        low: schema.normalize({ inventoryOpacity: -40 }).inventoryOpacity,
        high: schema.normalize({ inventoryOpacity: 140 }).inventoryOpacity,
        invalid: schema.normalize({ inventoryOpacity: 'not-a-number' }).inventoryOpacity,
        missing: schema.normalize({}).inventoryOpacity,
        named: schema.normalize({ inventoryBackground: 'slate' }).inventoryBackground,
        custom: schema.normalize({ inventoryBackground: '#a1b2c3' }).inventoryBackground
      };
    });
    assert.deepEqual(normalization, { zero: 0, low: 0, high: 100, invalid: 78, missing: 78, named: 'slate', custom: '#A1B2C3' });

    // Use the rendered Appearance controls, including their slider events.
    await page.evaluate(() => Cardable.preferences.show('inventoryBackground'));
    const appearance = page.locator('.settings-group[data-group="Appearance"]');
    const backgroundRow = appearance.locator('[data-setting="inventoryBackground"]');
    const opacityRow = appearance.locator('[data-setting="inventoryOpacity"]');
    const range = opacityRow.locator('input[type="range"]');
    const search = page.getByRole('searchbox', { name: 'Search settings' });
    await search.fill('inventory opacity');
    assert(await opacityRow.isVisible(), 'settings search reveals the matching inventory opacity row');
    assert.equal(await backgroundRow.isVisible(), false, 'settings search filters unrelated inventory background row');
    await search.fill('');
    await backgroundRow.scrollIntoViewIfNeeded();
    assert.equal(await backgroundRow.locator('.cbs-inventory-tile').count(), 6);
    assert(await page.locator('.cbs-dock[aria-label="Setting preview"]').count(), 'settings dock preview exists');
    await shot('settings-previews');
    async function chooseCustomColor(hex) {
      await page.locator('[aria-label="Custom inventory background color"]').evaluate((input, value) => {
        input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
      }, hex);
    }
    await backgroundRow.getByRole('radio', { name: 'Slate inventory background' }).click();
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--inventory-bg-rgb').trim()), '62,74,88');
    await chooseCustomColor('#ffffff');
    await backgroundRow.getByRole('button', { name: 'Reset Inventory background' }).click();
    await page.waitForFunction(() => Cardable.settings.get('inventoryBackground') === 'graphite');
    await range.evaluate(input => { input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await backgroundRow.locator('.cbs-inventory-mini-tint').first().evaluate(el => el.style.opacity), '0', 'slider input previews zero opacity on tiles');
    await range.evaluate(input => input.dispatchEvent(new Event('change', { bubbles: true })));
    assert.deepEqual(await page.evaluate(() => [Cardable.settings.get('inventoryOpacity'), Cardable.state.current.settings.inventoryOpacity]), [0, 0], 'zero opacity is committed and persisted');
    await range.evaluate(input => { input.value = '100'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForFunction(() => Cardable.settings.get('inventoryOpacity') === 100);
    await chooseCustomColor('#ffffff');
    await range.evaluate(input => { input.value = '100'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForFunction(() => Cardable.settings.get('inventoryBackground') === '#FFFFFF' && Cardable.settings.get('inventoryOpacity') === 100);

    // The light sheet owns dark chrome; collectible card typography retains its
    // own computed color when the surrounding chrome changes.
    await page.evaluate(() => { Cardable.preferences.close(); });
    await page.waitForFunction(() => !Cardable.preferences.open);
    await page.evaluate(() => Cardable.inventory.request('normal'));
    await page.waitForFunction(() => Cardable.inventory.active && Cardable.inventory.rendered.size > 0);
    await page.waitForTimeout(160);
    const lightAppearance = await page.evaluate(() => {
      const sheet = Cardable.inventory.el, header = sheet.querySelector('.inventory-header');
      const cardName = sheet.querySelector('.inventory-tile .card__name');
      return {
        background: getComputedStyle(sheet).backgroundColor,
        filter: getComputedStyle(sheet).backdropFilter,
        headerColor: header && getComputedStyle(header).color,
        cardNameColor: cardName && getComputedStyle(cardName).color,
        headerText: header && header.textContent.trim(),
        tint: getComputedStyle(document.documentElement).getPropertyValue('--inventory-bg-rgb').trim(),
        chrome: getComputedStyle(document.documentElement).getPropertyValue('--inventory-chrome-rgb').trim(),
        opacity: Cardable.data.inventoryChromeColors('#FFFFFF', 100).opacity
      };
    });
    assert.match(lightAppearance.tint, /^255,255,255$/);
    assert.match(lightAppearance.chrome, /^18,20,26$/);
    assert.equal(lightAppearance.opacity, 1);
    assert.equal(lightAppearance.filter, 'none');
    assert(lightAppearance.headerText.includes('Inventory'));
    assert.match(lightAppearance.headerColor, /18, 20, 26/);
    assert.equal(lightAppearance.cardNameColor, cardTextBaseline, 'card front retains its own text color');
    await shot('light-custom');
    await page.evaluate(() => Cardable.settings.set('highContrast', true));
    const forcedOpaque = await page.evaluate(() => ({
      chrome: Cardable.data.inventoryChromeColors('#FFFFFF', 0).opacity,
      background: getComputedStyle(Cardable.inventory.el).backgroundColor
    }));
    assert.equal(forcedOpaque.chrome, 1);
    assert.doesNotMatch(forcedOpaque.background, /rgba/i, 'high contrast keeps an opaque inventory surface');
    await page.evaluate(() => { Cardable.settings.set('highContrast', false); Cardable.settings.set('reduceTransparency', true); });
    const reducedOpaque = await page.evaluate(() => ({
      opacity: Cardable.data.inventoryChromeColors('#FFFFFF', 0).opacity,
      background: getComputedStyle(Cardable.inventory.el).backgroundColor
    }));
    assert.equal(reducedOpaque.opacity, 1);
    assert.doesNotMatch(reducedOpaque.background, /rgba/i, 'reduced transparency keeps an opaque inventory surface');
    await page.evaluate(() => Cardable.settings.set('reduceTransparency', false));
    evidence.checks.push('Appearance tiles, custom color and opacity slider work; zero/default/clamp normalization holds; white 100% uses dark chrome, preserves card-front text, and reduced transparency/high contrast force opacity.');

    // Exercise save export/import and page reload in the isolated QA profile.
    const exported = await page.evaluate(() => Cardable.saveTools.exportText());
    const exportShape = await page.evaluate(text => {
      const parsed = Cardable.saveTools.parse(text);
      return { background: parsed.save.settings.inventoryBackground, opacity: parsed.save.settings.inventoryOpacity };
    }, exported);
    assert.deepEqual(exportShape, { background: '#FFFFFF', opacity: 100 });
    await page.evaluate(() => { Cardable.settings.set('inventoryBackground', 'graphite'); Cardable.settings.set('inventoryOpacity', 50); });
    await page.evaluate(text => Cardable.saveTools.importText(text), exported);
    assert.deepEqual(await page.evaluate(() => [Cardable.settings.get('inventoryBackground'), Cardable.settings.get('inventoryOpacity')]), ['#FFFFFF', 100]);
    await page.reload();
    await ready();
    assert.deepEqual(await page.evaluate(() => [Cardable.settings.get('inventoryBackground'), Cardable.settings.get('inventoryOpacity')]), ['#FFFFFF', 100]);
    evidence.checks.push('Inventory appearance settings survive checked save export/import and a real page reload in the disposable context.');

    await page.evaluate(() => {
      const cards = Cardable.data.cards.filter(card => !card.retired && card.active !== false);
      window.glassFixture = { cards: Cardable.data.cards, instances: cards.slice(0, 48).map((card, i) => ({
        instanceId: 'glass-' + i, cardId: card.id, serial: 'GLASS-' + i, pulledAt: i + 1, seen: true
      })) };
      Cardable.events.emit('inventory:fixture', glassFixture);
      Cardable.inventoryModel.update({ showUnowned: false, viewMode: 'grid', groupMode: 'none' });
      Cardable.inventory.request('normal');
    });
    await page.waitForFunction(() => Cardable.inventory.active && Cardable.inventory.rendered.size > 0);

    // Check all requested viewport sizes without leaving controls or the gallery mounted.
    if (native) {
      for (const width of [1280, 1440]) await viewport(width);
    } else {
      for (const width of [390, 760, 1280]) await viewport(width);
    }
    // Keep the grid-focus regression and final gallery specimen on the same
    // stable desktop width after the small viewport has been checked.
    await viewport(1280);

    // Native keeps a 1920-wide composition and can otherwise fit a complete row.
    // Use the supported compact detent/short window to exercise the same boundary.
    await page.evaluate(() => Cardable.settings.set('inventoryHeight', 'compact'));
    if (native) await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1280, 680));
    await page.waitForTimeout(400);

    // Focus first and last cards in the normal-height grid where one row is
    // taller than the available viewport.
    const grid = page.locator('.inventory-grid');
    async function focusAndMeasure(key) {
      await grid.focus(); await page.keyboard.press(key); await page.waitForTimeout(120);
      const result = await page.evaluate(() => {
        const el = document.querySelector('.inventory-grid'), active = document.getElementById(el.getAttribute('aria-activedescendant'));
        const clip = el.getBoundingClientRect(), card = active && (active.querySelector('.collectible-card') || active.querySelector('.inventory-mystery'));
        const rect = card && card.getBoundingClientRect();
        const rows = [...new Set([...el.querySelectorAll('.inventory-tile')].map(tile => Math.round(tile.getBoundingClientRect().top)))].sort((a,b) => a-b);
        const rowHeight = Math.min(...rows.slice(1).map((top,index) => top-rows[index]));
        return { key: document.activeElement === el ? 'grid' : 'tile', selected: Cardable.inventory.center,
          viewportHeight: clip.height, rowHeight, cardHeight: rect && rect.height, top: rect && rect.top, gridTop: clip.top, gridBottom: clip.bottom,
          clippedAtTop: !!rect && rect.top < clip.top - 1 };
      });
      assert(Number.isFinite(result.rowHeight) && result.rowHeight > result.viewportHeight, key + ' reproduces an oversized card row in the normal grid: ' + JSON.stringify(result));
      assert.equal(result.clippedAtTop, false, key + ' focused card is not cropped at grid top');
      assert(result.top >= result.gridTop - 1 && result.top <= result.gridBottom, key + ' card starts within grid viewport');
      evidence.gridFocus.push({ key, ...result });
    }
    await focusAndMeasure('Home');
    assert.equal(await page.evaluate(() => Cardable.inventory.center), 0);
    await focusAndMeasure('End');
    assert.equal(await page.evaluate(() => Cardable.inventory.center), 47);
    await page.evaluate(() => Cardable.settings.set('rarityColor', 'mono'));
    await shot('mono');
    await page.evaluate(() => Cardable.settings.set('rarityColor', 'color'));
    await page.evaluate(() => Cardable.inventory.request(false));
    await page.waitForFunction(() => !Cardable.inventory.active);
    await page.mouse.move(1, 1);
    await page.evaluate(() => Cardable.packView.openButton.focus());
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.inventory-grid .inventory-tile').count(), 0, 'grid tiles clean up after close');
    await page.evaluate(() => Cardable.ui.gallery());
    await page.waitForSelector('.cb-gallery-glass-stage');
    assert(await page.locator('.cb-gallery-glass-stage .cb-inventory-glass').count() > 0, 'gallery still contains printed glass specimens');
    assert.equal(await page.locator('.cb-gallery-glass-stage .cb-inventory-glass-edge,.cb-gallery-glass-stage .cb-inventory-optics').count(), 0);
    await page.locator('.cb-gallery-glass-stage').scrollIntoViewIfNeeded();
    await shot('gallery-material');
    await page.getByRole('button', { name: 'Close gallery', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.cb-gallery'));
    assert.equal(await page.locator('.cb-inventory-glass-edge,.cb-inventory-optics').count(), 0, 'gallery cleanup removes obsolete artifacts');
    assert.deepEqual(evidence.errors, []);
    assert.deepEqual(evidence.network, []);
    evidence.checks.push('Responsive browser/native widths, normal-grid Home/End focus with an oversized row, gallery specimen/cleanup, no renderer network or console/page errors.');
    console.log(JSON.stringify(evidence, null, 2));
  } catch (error) {
    evidence.failure = error.stack;
    console.error(error);
    process.exitCode = 1;
    if (page && !page.isClosed()) await shot('failure').catch(() => {});
  } finally {
    fs.writeFileSync(path.join(out, (native ? 'native' : 'browser') + '-report.json'), JSON.stringify(evidence, null, 2));
    if (app) await app.close();
    if (browser) await browser.close();
    if (local) await local.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
