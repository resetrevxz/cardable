'use strict';
// Behavioral/accessibility checks in the instrumented DOM; no browser paint claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runtime, scripts } = require('./check-stage1.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
let passed = 0;
async function check(name, fn) { try { await fn(); passed++; console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name); throw error; } }
function save(pending = false) {
  const r = runtime(), data = clone(r.C.state.current); data.tutorial = { step: 'done', done: true }; data.serialCounter = 2;
  const item = (i, cardId = r.C.data.cards[0].id) => ({ instanceId: 'owned-' + i, cardId, serial: r.C.serial.format(data.playerCode, i), pulledAt: i, seen: false, variantId: null });
  data.inventory = [item(1)];
  if (pending) data.pendingReveal = { packId: r.C.data.packs[0].id, committedAt: 10, cards: [item(2)], keptCount: 0 };
  return data;
}
function boot(initial = save(), dev = false) { const r = runtime(dev, false, initial, true, true); r.advance(600); return r; }
function key(r, name, target = r.document.activeElement, extra = {}) { const event = { key: name, target, preventDefault() { this.prevented = true; }, ...extra }; r.document.fire('keydown', event); return event; }
function open(r) { r.C.events.emit('inventory:request', true); r.advance(1200); }
async function main() {
await check('new save controls and profiler use local classic scripts and preserve boot order', () => {
  assert(scripts.indexOf('src/core/save-files.js') > scripts.indexOf('src/core/state.js'));
  assert(scripts.indexOf('src/ui/preferences.js') < scripts.indexOf('src/boot.js'));
  const r = boot(); assert.equal(r.document.body.querySelectorAll('.preferences-entry').length, 1);
  assert(!r.C.preferences.open); assert(r.C.preferences.el.hidden);
});
await check('export is the exact saved JSON with serials, tutorial, settings and pending progress', () => {
  const r = boot(save(true)); assert.deepEqual(JSON.parse(r.C.saveFiles.exportText()), clone(r.C.state.current));
  assert.deepEqual(clone(r.C.saveFiles.parse(r.C.saveFiles.exportText())), clone(r.C.state.current));
});
await check('JSON export downloads a local blob and releases its URL', () => {
  const r = boot(); let created = 0, revoked = 0, clicked;
  r.window.URL.createObjectURL = blob => { assert.equal(blob.type, 'application/json'); created++; return 'blob:export'; };
  r.window.URL.revokeObjectURL = url => { assert.equal(url, 'blob:export'); revoked++; };
  const create = r.document.createElement; r.document.createElement = tag => { const el = create(tag); if (tag === 'a') el.addEventListener('click', () => { clicked = el; }); return el; };
  r.C.saveFiles.export(); assert.equal(created, 1); assert.equal(clicked.download, 'cardable-save.json'); assert.equal(clicked.href, 'blob:export');
  r.advance(1100); assert.equal(revoked, 1);
});
await check('invalid imports leave state/storage unchanged and reject unsupported schemas, unsafe keys and bad counters', () => {
  const r = boot(), before = r.C.saveFiles.exportText(), stored = r.store.get('cardable.save');
  const cases = ['{', 'null', '[]', '{}', '{"__proto__":{}}'];
  for (const text of cases) assert.throws(() => r.C.saveFiles.parse(text));
  for (const mutate of [v => { v.schemaVersion = 99; }, v => { v.packs.ready = r.C.config.packs.maxStored + 1; }, v => { v.serialCounter = '2'; }, v => { v.currency = -1; }, v => { v.tutorial.step = 'unknown'; }]) {
    const value = JSON.parse(before); mutate(value); assert.throws(() => r.C.saveFiles.parse(JSON.stringify(value)));
  }
  assert.equal(r.C.saveFiles.exportText(), before); assert.equal(r.store.get('cardable.save'), stored);
});
await check('imports validate unique instances/serials, catalog IDs, serial counter and reserved progress', () => {
  const r = boot(), base = save(true);
  for (const mutate of [v => { v.inventory.push(clone(v.inventory[0])); }, v => { v.pendingReveal.cards[0].serial = v.inventory[0].serial; },
    v => { v.inventory[0].cardId = 'missing-card'; }, v => { v.inventory[0].serial = 'bad'; }, v => { v.serialCounter = 0; }, v => { v.pendingReveal.keptCount = 1; }]) {
    const value = clone(base); mutate(value); assert.throws(() => r.C.saveFiles.parse(JSON.stringify(value)));
  }
});
await check('save-file core and Data import reject oversized or invalid JSON without changing progress', async () => {
  const r = boot(); r.C.preferences.show(); const before = r.C.saveFiles.exportText();
  assert.throws(() => r.C.saveFiles.parse(' '.repeat(r.C.config.polish.maxSaveBytes + 1)), /large/);
  assert.throws(() => r.C.saveFiles.parse('{'));
  assert.equal(await r.C.preferences.read({size: 1, text: () => Promise.resolve('{')}), false);
  assert.equal(r.C.saveFiles.exportText(), before);
  assert(r.C.preferences.data.feedback.textContent.includes('JSON'));
});
await check('existing save replacement core keeps its backup and pending-reveal recovery', () => {
  const r = boot(); const before = r.store.get('cardable.save'); r.C.saveFiles.apply(save(true)); r.advance(600);
  assert.equal(r.C.opening.phase, 'revealed'); assert(!r.C.opening.keepButton.hidden);
  assert.equal(r.store.get('cardable.save.before-import'), JSON.stringify(JSON.parse(before), null, 2) + '\n');
});
await check('failed backup or replacement writes preserve the current save and progress', () => {
  const r = boot(), before = r.C.saveFiles.exportText(), store = r.window.localStorage.setItem;
  r.window.localStorage.setItem = () => { throw new Error('full'); }; assert.throws(() => r.C.saveFiles.apply(save(true)), /backup/); assert.equal(r.C.saveFiles.exportText(), before);
  r.window.localStorage.setItem = (key, text) => { if (key === 'cardable.save') throw new Error('full'); return store(key, text); };
  assert.throws(() => r.C.saveFiles.apply(save(true)), /import/); assert.equal(r.C.saveFiles.exportText(), before); assert.equal(r.C.opening.phase, 'idle');
});
await check('the previous local save remains exportable for an undo import', () => {
  const r = boot(), previous = r.C.saveFiles.exportText(); r.C.saveFiles.apply(save());
  assert.equal(r.C.saveFiles.previous(), previous); let text;
  r.window.URL.createObjectURL = blob => { text = blob; return 'blob:previous'; }; r.C.saveFiles.exportPrevious(); assert.equal(text.type, 'application/json');
  r.C.preferences.show(); assert(r.C.preferences.data.restore.hidden); // Legacy raw backup is separate from the verified Stage 11b backup.
});
await check('import recovery retains multi-card kept progress and never rerolls or consumes another pack', () => {
  const r = boot(); const imported = save(true), item = clone(imported.pendingReveal.cards[0]); imported.serialCounter = 3;
  item.instanceId = 'owned-3'; item.serial = r.C.serial.format(imported.playerCode, 3); imported.pendingReveal.cards.push(item); imported.pendingReveal.keptCount = 1;
  const ready = imported.packs.ready; r.C.saveFiles.apply(imported); r.advance(600);
  assert.equal(r.C.opening.phase, 'revealed'); assert.equal(r.C.opening.view.instance.instanceId, 'owned-3'); assert.equal(r.C.state.current.packs.ready, ready); assert.equal(r.C.opening.stats.commits, 0);
  assert.equal(r.C.state.current.pendingReveal.keptCount, 1); assert.equal(r.C.state.current.inventory.length, 1);
});
await check('corrupt JSON and invalid parsed save shapes are backed up and get readable recovery UI', () => {
  for (const text of ['{broken', '{}', '{"packs":{"ready":-1}}', '{"inventory":"bad"}', '{"schemaVersion":1,"serialCounter":-1}']) {
    const r = boot(text); assert(r.C.state.recovery); assert.equal(r.store.get('cardable.save.corrupt'), text);
    assert(r.C.preferences.notice); assert(r.C.preferences.notice.querySelector('p').textContent.includes('backup was kept'));
    assert.equal(r.C.state.current.inventory.length, 0); assert.equal(r.C.state.current.packs.ready, 2);
    r.C.preferences.notice.querySelectorAll('button')[1].fire('click'); assert.equal(r.C.state.recovery, null);
  }
});
await check('ordinary save keeps its memory fallback if local storage throws, with a real UI notice', () => {
  const r = boot(); r.window.localStorage.setItem = () => { throw new Error('blocked'); }; r.C.state.current.currency = 123; r.C.state.save();
  assert(r.C.preferences.notice); r.window.localStorage.getItem = () => { throw new Error('blocked'); }; r.C.state.load(); assert.equal(r.C.state.current.currency, 123);
});
await check('dev checks do not create a spurious corrupted-save notice on a good save', () => { const r = boot(save(), true); assert.equal(r.C.state.recovery, null); assert(!r.C.preferences.notice); });
await check('the import facade reads a file but rejects a wrong envelope without staging a replacement', async () => {
  const r = boot(); r.C.preferences.show(); let reads = 0;
  assert.equal(await r.C.preferences.read({size: 10, text: () => { reads++; return Promise.resolve('{}'); }}), false);
  r.C.preferences.close(); assert.equal(reads, 1); assert(!r.C.preferences.open); assert(r.C.preferences.data.preview.hidden);
});
await check('preferences fades in/out and Esc closes only the modal without closing inventory or skipping tutorial', () => {
  const r = boot(); open(r); r.C.preferences.show(); r.advance(100); assert(r.C.preferences.panel.style.transform.includes('translate3d')); assert(!r.C.preferences.el.hidden);
  key(r, 'Escape'); assert(!r.C.preferences.open); assert(r.C.inventory.open); r.advance(700); assert(r.C.preferences.el.hidden);
});
await check('modal Tab/Shift-Tab cycle visible enabled controls and restore focus to the entry', () => {
  const r = boot(); open(r); const entry = r.document.body.querySelectorAll('.preferences-entry')[0]; entry.focus(); r.C.preferences.show(); r.advance(300);
  const controls = r.C.preferences.panel.querySelectorAll('button, input, select').filter(r.C.accessibility.available); controls[controls.length - 1].focus();
  assert(key(r, 'Tab').prevented); assert.equal(r.document.activeElement, controls[0]); assert(key(r, 'Tab', controls[0], { shiftKey: true }).prevented); assert.equal(r.document.activeElement, controls[controls.length - 1]);
  r.C.preferences.close(); assert.equal(r.document.activeElement, entry);
});
await check('inventory and detail contain keyboard focus and restore their trap after nested preferences', () => {
  const r = boot(); open(r); const sheetControls = r.C.inventory.el.querySelectorAll('button, [tabindex]').filter(r.C.accessibility.available);
  sheetControls[sheetControls.length - 1].focus(); key(r, 'Tab'); assert.equal(r.document.activeElement, sheetControls[0]);
  const tile = r.C.inventory.rendered.get(0); tile.el.fire('click'); r.advance(1200); assert.equal(r.C.detail.phase, 'detail');
  const controls = r.C.detail.el.querySelectorAll('button, [tabindex]').filter(r.C.accessibility.available); controls[controls.length - 1].focus(); key(r, 'Tab'); assert.equal(r.document.activeElement, controls[0]);
});
await check('stored motion preference defaults to the system, survives reload, and remains live', () => {
  const r = boot(); r.reduced(true); assert(r.C.motion.reduced); r.C.motion.setPreference(false); assert(!r.C.motion.reduced);
  const reloaded = boot(clone(r.C.state.current)); reloaded.reduced(true); assert(!reloaded.C.motion.reduced);
  reloaded.C.motion.setPreference(null); assert(reloaded.C.motion.reduced); reloaded.reduced(false); assert(!reloaded.C.motion.reduced);
});
await check('reset during preferences cleans modal/sheet traps and restores interactive menu controls', () => {
  const r = boot(); open(r); r.C.preferences.show(); r.advance(300); r.C.state.reset(); r.advance(1000);
  assert(!r.C.preferences.open); assert(!r.C.inventory.active); assert(!r.pack.inert); assert(r.C.preferences.el.hidden);
});
await check('importing an unfinished cut lesson preserves its result and resumes guidance at the wrapper', () => {
  const r = boot(); const value = save(true); value.tutorial = { step: 'cut', done: false };
  r.C.saveFiles.apply(value); r.advance(200); assert.equal(r.C.opening.phase, 'cutting'); assert.equal(r.C.tutorial.step, 'cut');
  assert.deepEqual(clone(r.C.state.current.pendingReveal), value.pendingReveal); assert.equal(r.C.opening.stats.commits, 0);
});
await check('favicon and hidden-tab title reflect ready stock without changing pack state', () => {
  const r = boot(), favicon = r.document.getElementById('favicon'), ready = favicon.getAttribute('href');
  assert(decodeURIComponent(ready).includes('<circle')); r.C.state.current.packs.ready = 0; r.C.state.save();
  assert(!decodeURIComponent(favicon.getAttribute('href')).includes('<circle')); r.hidden(true); assert.match(r.document.title, /^Cardable \u00b7 .+ \u00b7 \d+%$/);
  r.C.events.emit('pack:ready', { ready: 1, simulated: true }); assert.equal(r.document.title, 'Cardable \u00b7 pack ready'); assert(decodeURIComponent(favicon.getAttribute('href')).includes('<circle'));
  assert.equal(r.C.state.current.packs.ready, 0); r.hidden(false); assert.match(r.document.title, /^Cardable \u00b7 .+ \u00b7 \d+%$/);
});
await check('rarity color setting persists with the save and updates normal cards without altering paired galleries', () => {
  const r = boot(); r.C.config.rarityColorMode = 'mono'; r.C.events.emit('settings:rarityColorMode', 'mono');
  assert.equal(r.C.state.current.settings.rarityColor, 'mono'); const reload = boot(clone(r.C.state.current)); assert.equal(reload.C.config.rarityColorMode, 'mono');
  const gallery = runtime(true, true, clone(r.C.state.current)); assert(gallery.C.gallery.views.some(v => v.el.dataset.colorMode === 'color'));
});
await check('reduced-motion cards have no tilt, lift, parallax, sway, finish animation or particle loops', () => {
  const r = boot(); open(r); const tile = r.C.inventory.rendered.get(0); r.reduced(true); r.move(10, 10, tile.view.el); r.advance(4000);
  assert(tile.view.thumbnail);assert.equal(tile.view.el.querySelectorAll('.card__material--live').length,0);
  assert.equal(tile.view.el.querySelectorAll('.card__face--back').length,0); assert.equal(r.C.dots.stats.ripples, 0);
  const frames = r.C.fx.stats.frameCount; r.advance(1000); assert.equal(r.C.fx.stats.frameCount, frames);
});
await check('burst clicks have bounded ripple storage and settle to a sleeping canvas', () => {
  const r = boot(); r.C.packView.setVisible(false); r.C.inventoryHint.setVisible(false); for (let i = 0; i < 100; i++) r.click(640, 300); r.advance(20);
  assert(r.C.dots.stats.ripples <= r.C.config.dots.ripple.maxSimultaneous); r.advance(1800); const draws = r.C.dots.stats.draws; r.advance(1000); assert.equal(r.C.dots.stats.draws, draws);
});
await check('300 tiles retain virtualization and lite shelf renders through settings and reset', () => {
  const r = boot(save(), true); r.C.events.emit('inventory:preview', true); open(r); const index = r.C.inventory.entries.findIndex((e, i) => i >= 80 && e.owned); r.C.inventory.carousel.snap(index * (parseFloat(r.C.inventory.el.style['--inventory-tile-width']) + 24)); r.C.fx.wake(); r.advance(1200);
  assert(r.C.inventory.rendered.size <= 13); assert.equal(r.C.cardView.stats.fullCards, 0); r.C.preferences.show(); r.advance(300); key(r, ' '); r.advance(3100); assert.equal(r.C.opening.phase, 'idle');
  r.C.preferences.close(); r.C.state.reset(); r.advance(600); assert(!r.C.inventory.active); assert.equal(r.C.cardView.stats.fullCards, 0);
});
await check('profiling records labeled subscriber CPU, bounded raw cadence and one full card', () => {
  const r = boot(); open(r); r.C.inventory.rendered.get(r.C.inventory.center).el.fire('click'); r.advance(1200); r.C.profiler.start('detail over lite shelf'); r.advance(5100); const sample = r.C.profiler.last;
  assert(sample.valid); assert(sample.fps > 59 && sample.fps < 61); assert.equal(sample.fullCards, 1); assert(sample.subscribers.card.calls > 0); assert(sample.subscribers.dots.calls > 0); assert(sample.frames <= r.C.config.polish.profileMaxFrames);
});
await check('profiling reports dropped frames honestly rather than hiding them behind animation delta clamps', () => {
  const r = boot(); r.window.requestAnimationFrame = fn => r.window.setTimeout(() => fn(r.now()), 100); r.C.profiler.start('slow cadence'); r.advance(5500);
  assert(r.C.profiler.last.fps < 15); assert(r.C.profiler.last.p95Ms >= 99); assert(r.C.profiler.last.slowFrames > 0);
});
await check('hiding a tab or changing reduced motion invalidates a profile instead of claiming success', () => {
  const r = boot(); r.C.profiler.start('menu'); r.advance(100); r.hidden(true); assert(r.document.documentElement.classList.contains('is-hidden')); r.advance(10000); r.hidden(false); assert(!r.document.documentElement.classList.contains('is-hidden')); r.advance(5100); assert.equal(r.C.profiler.last.valid, false);
});
await check('focus rings, nonmoving equivalents and material polish preserve ten card layers and static tile widths', () => {
  const css = fs.readFileSync('src/styles/polish.css', 'utf8'); assert(css.includes('1px solid var(--focus-ring)')); assert(css.includes('0 0 0 3px')); assert(css.includes('animation: none !important'));
  assert(css.includes('inventory-silhouette-generation { opacity: 1')); assert(css.includes('card__material--lite.card__glare-render')); assert(css.includes('card__body::after'));
  const r = boot(); open(r); const tile = r.C.inventory.rendered.get(0), width = r.C.inventory.el.style['--inventory-tile-width'];
  tile.el.fire('click'); r.advance(1200); const view = r.C.detail.view; r.move(1250, 700, view.el); r.advance(200); assert(parseFloat(view.el.style['--parallax-x']) > 0); assert.equal(r.C.inventory.el.style['--inventory-tile-width'], width);
  assert.equal(view.el.querySelectorAll('.card__face--front')[0].children.length, 9);
});
await check('essential dim text and dimmed missing-card labels exceed 4.5:1 on dark surfaces', () => {
  function rgb(hex) { return hex.match(/[a-f\d]{2}/gi).map(x => parseInt(x, 16)); }
  function luminance(colors) { return colors.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0); }
  const foreground = rgb('8E8E93'); for (const surface of ['08080A', '0E0E11', '111114', '17171B']) { const back = rgb(surface); assert((luminance(foreground) + .05) / (luminance(back) + .05) >= 4.5); }
  const back = rgb('0E0E11'), side = rgb('F5F5F7').map((v, i) => v * .6 + back[i] * .4); assert((luminance(side) + .05) / (luminance(back) + .05) >= 4.5);
});
await check('stationary tutorial guidance reuses measured geometry while its opacity pulse animates', () => {
  const r = runtime(false, false, null, true, true); r.advance(3000); assert.equal(r.C.tutorial.step, 'hold');
  let reads = 0; const el = r.C.tutorial.instruction, original = el.getBoundingClientRect; el.getBoundingClientRect = function () { reads++; return original.call(this); };
  r.advance(1000); assert.equal(reads, 0); r.window.fire('resize'); r.advance(20); assert(reads > 0);
});
await check('font declarations recognize the local variable fonts while retaining legacy names and system fallbacks', () => {
  const css = fs.readFileSync('src/styles/tokens.css', 'utf8'); assert(css.includes('inter-variable.woff2')); assert(css.includes('jetbrains-mono-variable.woff2')); assert(css.includes('Inter.woff2')); assert(css.includes('system-ui')); assert(css.includes('font-display: swap'));
});
console.log('\n' + passed + ' Stage 8 checks passed. File-picker/download rendering, visual appearance and actual browser 60 fps remain unconfirmed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
