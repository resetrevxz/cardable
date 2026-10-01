'use strict';
// Real scripts, instrumented DOM and clocks. No browser paint or measured FPS claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, html, scripts } = require('./check-stage1.cjs');
const r = runtime(true), C = r.C;
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function dev(label) { const button = C.dev.panel.children.find(el => el.tagName === 'button' && el.textContent === label); assert(button, label); r.click(70, 70, button); }
function snapshot(el) { return JSON.stringify({ style: el.style, dataset: el.dataset, children: el.children.map(snapshot) }); }
function fluidFill() { return 1 - Number(C.packView.front.fluid.style.transform.match(/translateY\(([^%]+)/)[1]) / 100; }

check('real menu replaces placeholders with local classic-script components', () => {
  assert(!html.includes('placeholder'));
  ['numbers','pack','currency','inventory-hint'].forEach(id => assert(scripts.includes('src/ui/' + id + '.js')));
  assert(scripts.indexOf('src/core/currency.js') < scripts.indexOf('src/ui/currency.js'));
  assert.equal(scripts.at(-1), 'src/boot.js');
  assert.equal(C.packView.el.dataset.pack, C.data.packs.find(pack => pack.enabled && pack.obtainable === 'timer').id);
  assert.equal(C.packView.el.dataset.state, 'ready'); assert.equal(C.packView.stats.readyMoments, 0);
  assert.equal(C.packView.vials.length, 2); assert(C.packView.vials.every(vial => vial.value === 1));
});
check('ready pack floats, leans with smoothed shine, and two stored packs move out of sync', () => {
  r.advance(100); const before = C.packView.front.pose.style.transform;
  r.move(1200, 50, r.pack); r.advance(500);
  assert.notEqual(C.packView.front.pose.style.transform, before);
  assert.notEqual(C.packView.front.pose.style.transform, C.packView.back.pose.style.transform);
  assert.equal(C.packView.back.el.style.opacity, 0.45);
  const shine = parseFloat(r.pack.style['--shine-x']); assert(shine > 50 && shine < 1200 / 1280 * 100);
  assert(C.packView.front.pose.style.transform.includes('rotateY('));
});
check('dev consumption drains vials with slosh, removes rear pack, starts the real timer and saves', () => {
  dev('Consume a pack (dev only)'); assert.equal(C.state.current.packs.ready, 1);
  assert.equal(C.packView.back.el.style.opacity, 0); assert.equal(C.state.current.packs.timerStartedAt, r.date());
  r.advance(100); assert(C.packView.vials[1].value < 1 && C.packView.vials[1].value > 0);
  assert(!C.packView.vials[1].fill.style.transform.includes('rotate(0deg)'));
  r.advance(500); assert.equal(C.packView.vials[1].value, 0);
  dev('Consume a pack (dev only)'); r.advance(500);
  assert.equal(C.state.current.packs.ready, 0); assert.equal(r.pack.dataset.state, 'waiting');
  assert(C.packView.vials.every(vial => vial.value === 0));
  assert.equal(r.store.get('cardable.save'), JSON.stringify(C.state.current));
});
check('waiting glass fill follows progress every frame, with meniscus and drifting specks', () => {
  dev('Waiting: halfway'); r.advance(20); const a = fluidFill();
  assert(Math.abs(a - C.timers.progress(r.date())) < 0.000001);
  assert(a > 0.5 && a < 0.501); const speck = C.packView.front.specks[0], before = speck.el.style.transform;
  r.advance(100); const b = fluidFill(); assert(b > a); assert(b - a < 0.00001);
  assert.notEqual(speck.el.style.transform, before);
  assert(r.pack.querySelectorAll('.pack-meniscus').length === 2); assert.equal(C.packView.front.specks.length, C.config.menuMotion.speckCount);
  assert(Math.abs(b - C.timers.progress(r.date())) < 0.000001);
});
check('countdown formats hours, minutes, seconds and rolls only the changed numeric slot', () => {
  assert.equal(C.timers.format((7 * 3600 + 12 * 60) * 1000), '7h 12m');
  assert.equal(C.timers.format((42 * 60 + 10) * 1000), '42m 10s'); assert.equal(C.timers.format(38000), '38s');
  [['hours','7h 12m'],['minutes','42m 10s'],['seconds','38s']].forEach(([unit, text]) => { dev('Waiting: ' + unit); r.advance(30); assert.equal(C.packView.digits.text, text); });
  const host = new r.Element('span'), digits = C.numbers.create(host);
  digits.set('42m 10s'); const slots = digits.slots.slice(); digits.set('42m 11s');
  assert.equal(digits.changes, 1); assert.equal(digits.slots.filter(slot => slot.start !== null).length, 1);
  assert.equal(digits.slots[0], slots[0]); assert.equal(digits.slots[5], slots[5]);
  assert.equal(digits.slots[5].current.style.transform, 'translateY(100%)');
  digits.update(r.now() + C.config.menuMotion.digitMs); assert.equal(digits.slots[5].current.style.transform, 'translateY(0%)');
  digits.set('9', false); const ones = digits.slots[0]; digits.set('10'); assert.equal(digits.slots[1], ones);
  assert(digits.slots.every(slot => slot.start !== null)); assert.equal(digits.slots[1].current.textContent, '0');
});
check('live timer digits roll at the second boundary', () => {
  C.state.current.packs = { ready: 0, timerStartedAt: r.date() - C.config.packs.regenMs + 38000 }; C.state.save();
  r.advance(50); assert.equal(C.packView.digits.text, '38s');
  r.advance(1000); assert.equal(C.packView.digits.text, '37s'); assert(C.packView.digits.changes > 0);
  assert(C.packView.digits.slots.some(slot => slot.start !== null));
});
check('near-ready completes fluid and plays exactly one sweep/lift while filling the first vial', () => {
  dev('Waiting: nearly ready'); r.advance(20); assert(fluidFill() > 0.999);
  const before = C.packView.stats.readyMoments; r.advance(2300);
  assert.equal(C.state.current.packs.ready, 1); assert.equal(C.packView.stats.readyMoments, before + 1);
  assert(r.pack.classList.contains('is-arriving')); assert.equal(fluidFill(), 1);
  assert(parseFloat(r.pack.style['--arrival-lift']) < 0); assert(parseFloat(r.pack.style['--arrival-opacity']) > 0);
  C.timers.tick(r.date()); C.events.emit('pack:ready', { ready: 1, gained: 1 }); assert.equal(C.packView.stats.readyMoments, before + 1);
  r.advance(1200); assert(!r.pack.classList.contains('is-arriving')); assert.equal(C.packView.vials[0].value, 1);
});
check('grant/skip controls use real ready events, stock cap pauses time without banking', () => {
  const before = C.packView.stats.readyMoments; dev('Grant a pack'); r.advance(500);
  assert.equal(C.state.current.packs.ready, 2); assert.equal(C.state.current.packs.timerStartedAt, null); assert.equal(C.packView.stats.readyMoments, before + 1);
  assert(C.packView.vials.every(v => v.value === 1)); dev('Grant a pack'); assert.equal(C.packView.stats.readyMoments, before + 1);
  r.wall(C.config.packs.regenMs * 3); C.timers.tick(r.date()); assert.equal(C.state.current.packs.timerStartedAt, null);
  dev('Consume a pack (dev only)'); assert.equal(C.state.current.packs.timerStartedAt, r.date()); assert.equal(C.timers.progress(r.date()), 0);
  dev('Skip timer'); assert.equal(C.state.current.packs.ready, 2); assert.equal(C.packView.stats.readyMoments, before + 2);
  dev('Skip timer'); assert.equal(C.state.current.packs.ready, 2); assert.equal(C.packView.stats.readyMoments, before + 3);
});
check('currency adds save once and count up/shimmer without earning or spending actions', () => {
  let writes = 0; const stop = C.events.on('save:written', () => writes++);
  const before = C.state.current.currency; dev('Add currency (dev only)'); assert.equal(writes, 1); stop();
  assert.equal(C.state.current.currency, before + C.config.menuMotion.previewCurrencyAmount);
  r.advance(100); const n = Number(C.currencyView.digits.text); assert(n > before && n < C.state.current.currency);
  const shimmer = C.currencyView.el.querySelectorAll('.currency-shimmer')[0]; assert(shimmer.style.opacity > 0);
  r.advance(1100); assert.equal(Number(C.currencyView.digits.text), C.state.current.currency);
  assert(shimmer.style.opacity < 0.000001); assert.equal(r.store.get('cardable.save'), JSON.stringify(C.state.current));
  assert.throws(() => C.currency.add(-1), /non-negative/); assert.throws(() => C.currency.add(0.5), /safe integer/);
});
check('idle retains the pack and fades timer/stock, keycap, currency, arrow and peek; focus holds chrome', () => {
  r.move(600, 350); r.advance(2600); assert(C.menu.idle); const before = C.packView.front.pose.style.transform, draws = C.dots.stats.draws;
  r.advance(100); assert.notEqual(C.packView.front.pose.style.transform, before); assert(!r.pack.classList.contains('idle-chrome'));
  assert.equal(C.dots.stats.draws, draws);
  ['pack-meta','pack-key-hint'].forEach(name => assert(r.pack.querySelectorAll('.' + name)[0].classList.contains('idle-chrome')));
  assert(C.currencyView.el.classList.contains('idle-chrome')); assert(C.inventoryHint.el.classList.contains('idle-chrome'));
  r.move(601, 350); assert(!C.menu.idle);
  r.document.activeElement = C.inventoryHint.arrow; r.document.fire('keydown', { key: 'Tab' }); r.document.fire('focusin'); r.advance(3000); assert(!C.menu.idle);
  r.document.activeElement = null; r.document.fire('focusout'); r.advance(1);
});
check('inventory arrow is visual only, and peek card lips reflect owned count without a shelf', () => {
  const arrow = C.inventoryHint.arrow; assert.equal(arrow.getAttribute('aria-disabled'), 'true'); assert.equal(arrow.getAttribute('aria-label'), 'Inventory');
  const before = JSON.stringify(C.state.current); r.click(600, 650, arrow); r.click(600, 350, r.pack); assert.equal(JSON.stringify(C.state.current), before); assert.equal(C.inventoryHint.peek.children.length, 0);
  assert.equal(C.cardView.stats.fullCards, 0);
  C.state.current.inventory.push({ cardId: C.data.cards[0].id }); C.state.save(); assert.equal(C.inventoryHint.peek.children.length, 1);
  C.state.current.inventory.pop(); C.state.save();
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/pack.css'), 'utf8'); assert(css.includes('transform: translateY(-3px)'));
});
check('hidden tabs stop rendering, catch up on return, and update titles from real state', () => {
  dev('Waiting: empty'); r.advance(100); r.hidden(true); assert.equal(r.document.title, 'Cardable');
  const updates = C.packView.stats.updates, before = snapshot(r.pack); r.advance(1000); assert.equal(C.packView.stats.updates, updates); assert.equal(snapshot(r.pack), before);
  r.wall(C.config.packs.regenMs * 1.5); const moments = C.packView.stats.readyMoments;
  r.hidden(false); r.advance(100); assert.equal(C.state.current.packs.ready, 1); assert.equal(C.packView.stats.readyMoments, moments + 1);
  assert.equal(r.document.title, 'Cardable'); r.hidden(true); assert.equal(r.document.title, 'Cardable · pack ready');
  r.advance(1000); r.hidden(false); r.advance(100); assert(!r.pack.classList.contains('is-arriving')); assert.equal(C.packView.stats.readyMoments, moments + 1);
  r.hidden(true); C.timers.openPack(r.date()); assert.equal(r.document.title, 'Cardable'); r.hidden(false);
});
check('synthetic title events never mutate state or play a pack arrival', () => {
  const before = JSON.stringify(C.state.current), moments = C.packView.stats.readyMoments;
  dev('Test pack-ready title'); r.hidden(true); r.advance(1100); assert.equal(r.document.title, 'Cardable · pack ready');
  assert.equal(JSON.stringify(C.state.current), before); assert.equal(C.packView.stats.readyMoments, moments); r.hidden(false); assert.equal(r.document.title, 'Cardable');
});
check('backwards and initially absent timer timestamps persist after reconciliation', () => {
  C.state.current.packs = { ready: 0, timerStartedAt: r.date() + 10000 }; C.state.save(); C.timers.tick(r.date());
  assert.equal(C.state.current.packs.timerStartedAt, r.date()); assert.equal(JSON.parse(r.store.get('cardable.save')).packs.timerStartedAt, r.date());
  C.state.current.packs.timerStartedAt = null; C.state.save(); C.timers.tick(r.date()); assert.equal(JSON.parse(r.store.get('cardable.save')).packs.timerStartedAt, r.date());
  assert.equal(C.timers.progress(r.date()), 0);
});
check('reduced motion stops float/lean/particles/rolls/slosh and uses fades for arrival/shimmer', () => {
  dev('Waiting: halfway'); r.reduced(true); r.advance(100);
  const pose = C.packView.front.pose.style.transform, speck = snapshot(C.packView.front.specks[0].el);
  r.move(100, 100); r.advance(100); assert.equal(C.packView.front.pose.style.transform, pose); assert.equal(snapshot(C.packView.front.specks[0].el), speck);
  assert(C.packView.front.pose.style.transform.includes('rotateX(0deg)')); assert.equal(C.packView.front.el.style['--meniscus-wave'], '0px');
  const a = fluidFill(); r.advance(100); assert(fluidFill() > a);
  dev('Grant a pack'); dev('Add currency (dev only)'); r.advance(100);
  assert.equal(r.pack.style['--arrival-sweep'], '0%'); assert.equal(r.pack.style['--arrival-lift'], '0px');
  assert(C.packView.vials.every(v => !v.fill.style.transform.includes('rotate(') || v.fill.style.transform.includes('rotate(0deg)')));
  assert.equal(C.currencyView.el.querySelectorAll('.currency-shimmer')[0].style.transform, 'translateX(0%)');
  assert(C.currencyView.digits.slots.every(slot => slot.start === null));
  dev('Grant a pack'); r.advance(4000); assert.equal(C.fx.stats.running, false);
  const frames = C.fx.stats.frameCount; r.advance(1000); assert.equal(C.fx.stats.frameCount, frames); r.reduced(false);
});
check('a load-time twenty-hour catch-up plays once, caps at two, and reload does not replay it', () => {
  const save = { schemaVersion: 1, playerCode: '7K3F', createdAt: 1, packs: { ready: 0, timerStartedAt: Date.now() - 20 * 3600000 } };
  const loaded = runtime(false, false, save); assert.equal(loaded.C.state.current.packs.ready, 2); assert.equal(loaded.C.packView.stats.readyMoments, 1);
  loaded.advance(1000); assert.equal(loaded.C.packView.stats.readyMoments, 1);
  const reloaded = runtime(false, false, JSON.parse(loaded.store.get('cardable.save'))); assert.equal(reloaded.C.packView.stats.readyMoments, 0); assert.equal(reloaded.C.state.current.packs.timerStartedAt, null);
});
check('save reset refreshes all menu components and gallery keeps pack animation disabled', () => {
  dev('Reset save'); r.advance(1200); assert.equal(C.state.current.currency, 0); assert.equal(C.currencyView.digits.text, '0');
  assert.equal(C.state.current.packs.ready, 2); assert(C.packView.vials.every(v => v.value === 1));
  assert.equal(C.state.current.pendingReveal, null); assert.equal(C.state.current.serialCounter, 0);
  const gallery = runtime(true, true); gallery.advance(200); assert.equal(gallery.C.packView.visible, false); assert.equal(gallery.C.packView.stats.updates, 0);
  assert.equal(gallery.C.gallery.views.length, 28); assert.equal(gallery.C.cardView.stats.fullCards, 1);
});
check('Stage 0 checks pass, no application errors, and menu effects add no separate animation loops', () => {
  assert.equal(r.logs.filter(log => log.level === 'error').length, 0); assert.equal(r.logs.filter(log => log.text.includes('[Cardable check] PASS')).length, r.C.dev.checkCount);
  ['pack','currency','numbers','inventory-hint'].forEach(id => {
    const source = fs.readFileSync(path.join(__dirname, '../src/ui/' + id + '.js'), 'utf8'); assert(!/requestAnimationFrame|setInterval|setTimeout/.test(source));
  });
});
console.log('\n' + passed + ' Stage 4 behavior groups passed. Browser screenshots, appearance and measured FPS remain unverified.');
