'use strict';
// Instrumented DOM/timer checks. Simulated frame cadence is not measured browser FPS.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, scripts } = require('./check-stage1.cjs');
const r = runtime(true, true), C = r.C;
const ids = ['super-rare', 'unusual', 'double-super-rare'];
let passed = 0;
function check(name, run) { run(); passed += 1; console.log('PASS ' + name); }
function view(id, mode = 'color') { return C.gallery.views.find(v => v.card.rarity === id && v.el.dataset.colorMode === mode); }
function live(v) { return v.el.querySelectorAll('.finish-surface')[0]; }
function snapshot(el) { return JSON.stringify({ style: el.style, children: el.children.map(snapshot) }); }

check('tiers 4–6 remain registered as individual modules', () => {
  ['basic', 'common', 'uncommon', 'rare', ...ids].forEach(id => assert(C.finishes.registry[id]));
  ids.forEach(id => {
    assert(scripts.includes('src/finishes/' + id + '.js'));
    ['mount', 'update', 'destroy', 'lite'].forEach(method => assert.equal(typeof C.finishes.registry[id][method], 'function'));
  });
});

check('gallery retains tiers 0–6 in both modes and preserves catalog/save state', () => {
  assert.equal(C.gallery.views.filter(v => C.rarity(v.card.rarity).tier <= 6).length, 14);
  ids.forEach(id => ['color', 'mono'].forEach(mode => assert(view(id, mode))));
  assert.equal(C.data.cards.filter(card => !card.retired).length, 60);
  assert.equal(C.state.current.serialCounter, 0);
  assert.equal(C.state.current.packs.ready, 2);
  assert.equal(r.store.get('cardable.save'), JSON.stringify(C.state.current));
});

check('Super Rare has three ocean bands above a separate static checkerboard', () => {
  const v = view('super-rare'); v.el.fire('pointerenter');
  const ocean = live(v).querySelectorAll('.finish-sr-wave');
  assert.equal(ocean.length, 3);
  const checker = live(v).querySelectorAll('.finish-sr-checker')[0], beforeChecker = snapshot(checker);
  r.advance(50); const before = ocean.map(band => band.style.transform);
  r.advance(1200); assert.notDeepEqual(ocean.map(band => band.style.transform), before);
  assert.equal(snapshot(checker), beforeChecker);
});

check('Unusual white top glow extends then retracts over a 5.5-second cycle', () => {
  const definition = C.finishes.registry.unusual, host = new r.Element('div');
  const state = definition.mount(host, view('unusual').card, { colorMode: 'color' });
  definition.update(0, {}, state); const start = state.glow.style.transform;
  definition.update(2750, {}, state); assert.equal(state.glow.style.transform, 'scaleY(1)');
  assert.equal(state.glow.style.opacity, 1);
  definition.update(2750, {}, state); assert.equal(state.glow.style.transform, start);
  definition.destroy(state); assert.equal(host.children.length, 0);
});

check('Double Super Rare drifts gold faster than blue and places sparkles along its frame', () => {
  const definition = C.finishes.registry['double-super-rare'], host = new r.Element('div');
  const state = definition.mount(host, view('double-super-rare').card, { colorMode: 'color' });
  definition.update(0, {}, state); const gold = state.el.style['--ssr-gold'], blue = state.el.style['--ssr-blue'];
  definition.update(2250, {}, state);
  assert.notEqual(state.el.style['--ssr-gold'], gold); assert.notEqual(state.el.style['--ssr-blue'], blue);
  assert.equal(C.config.finishMotion.doubleSuperRare.blueCycleMs, C.config.finishMotion.doubleSuperRare.goldCycleMs * 3);
  assert.equal(state.stars.length, 20);
  assert(state.stars.every(star => { const x = parseFloat(star.el.style.left), y = parseFloat(star.el.style.top); return x < 3 || x > 97 || y < 3 || y > 97; }));
  assert(state.stars.every(star => Number(star.el.style.opacity) >= 0 && Number(star.el.style.opacity) <= 1));
  assert(state.el.style['--ssr-gold-mono'].startsWith('hsl(0 0%'));
  definition.destroy(state); assert.equal(host.children.length, 0);
});

check('tiers 4–6 have no invented props and keep the original layer order', () => {
  ids.forEach(id => {
    const v = view(id), face = v.el.children[1].children[0].children[0];
    assert.equal(C.rarity(id).propSpec, null);
    assert.equal(face.children[7].dataset.layer, 'prop'); assert.equal(face.children[7].children.length, 0);
    assert.equal(face.children[1].dataset.layer, 'finish'); assert.equal(face.children[3].dataset.layer, 'foil');
  });
});

check('mono surfaces have distinct neutral palettes and both material renders update their mode', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/finishes.css'), 'utf8');
  ids.forEach(id => {
    assert(css.includes('.finish-' + id + '[data-color-mode="mono"]'));
    const v = view(id); v.setColorMode('mono');
    assert(v.el.querySelectorAll('.finish-surface').every(surface => surface.dataset.colorMode === 'mono'));
    v.setColorMode('color');
  });
});

check('all lite finishes stay static while exactly one full finish updates', () => {
  const active = view('double-super-rare'); active.el.fire('pointerenter');
  const lite = C.gallery.views.filter(v => v !== active), snapshots = lite.map(v => snapshot(v.el));
  const before = snapshot(live(active)); r.advance(1500);
  assert.notEqual(snapshot(live(active)), before);
  assert.deepEqual(lite.map(v => snapshot(v.el)), snapshots);
  assert.equal(C.gallery.views.filter(v => v.mode === 'full').length, 1);
});

check('every new finish pauses off-screen and while the document is hidden', () => {
  ids.forEach(id => {
    const v = view(id); v.el.fire('pointerenter'); r.advance(50);
    v.setVisible(false); const offscreen = snapshot(live(v)); r.advance(800); assert.equal(snapshot(live(v)), offscreen);
    v.setVisible(true); r.advance(50); assert.notEqual(snapshot(live(v)), offscreen);
    r.hidden(true); const hidden = snapshot(live(v)); r.advance(800); assert.equal(snapshot(live(v)), hidden);
    r.hidden(false); r.advance(50); assert.notEqual(snapshot(live(v)), hidden);
  });
});

check('reduced motion freezes each new finish and shows its static equivalent', () => {
  r.reduced(true);
  ids.forEach(id => {
    const v = view(id); v.el.fire('pointerenter'); r.advance(100);
    const before = snapshot(live(v)); r.advance(3500); assert.equal(snapshot(live(v)), before);
    assert.equal(v.el.querySelectorAll('.finish-surface').length, 2);
  });
  r.reduced(false);
});

check('FPS sampler counts one full and all remaining cards as lite under simulated timestamps', () => {
  const active = view('double-super-rare'); active.el.fire('pointerenter'); r.advance(100);
  C.gallery.measure(); r.advance(C.config.finishMotion.profileMs);
  const result = C.gallery.lastProfile;
  assert(result.valid); assert.equal(result.fullCards, 1); assert.equal(result.liteCards, C.gallery.views.length - 1);
  assert(result.fps >= 58 && result.fps <= 61); assert(result.p95Ms < 17);
  // This checks the sampler's arithmetic only, not actual rendering performance.
});

check('FPS sampling rejects hidden/off-screen intervals and full-card changes', () => {
  C.gallery.measure(); r.advance(100); r.hidden(true); r.advance(100); r.hidden(false); r.advance(5000);
  assert.equal(C.gallery.lastProfile.valid, false);
  C.gallery.measure(); view('unusual').el.fire('pointerenter'); r.advance(5000);
  assert.equal(C.gallery.lastProfile.valid, false);
  C.gallery.measure(); view('unusual').setVisible(false); r.advance(5000);
  assert.equal(C.gallery.lastProfile.valid, false); view('unusual').setVisible(true);
});

check('full-card back faces pause finish animation, and all-lite mode stops card work', () => {
  const active = view('unusual'); active.setFace('back');
  const before = snapshot(live(active)); r.advance(1000); assert.equal(snapshot(live(active)), before);
  C.gallery.views.forEach(v => v.setMode('lite')); r.advance(50);
  const updates = C.cardView.stats.updates; r.advance(4000); assert.equal(C.cardView.stats.updates, updates);
});

check('no extra frame loops or infinite CSS animations were added; no harness application errors', () => {
  ids.forEach(id => {
    const source = fs.readFileSync(path.join(__dirname, '../src/finishes/' + id + '.js'), 'utf8');
    assert(!/requestAnimationFrame|setInterval|setTimeout/.test(source));
  });
  assert.equal(r.logs.filter(log => log.level === 'error').length, 0);
  assert.equal(r.logs.filter(log => log.text.includes('[Cardable check] PASS')).length, r.C.dev.checkCount);
});

console.log('\n' + passed + ' Stage 3 (tiers 4–6) behavior checks passed. Visuals and measured browser FPS remain unverified.');
