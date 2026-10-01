'use strict';
// Instrumented DOM and simulated clock only; this does not measure browser paint/GPU FPS.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, scripts } = require('./check-stage1.cjs');
const r = runtime(true, true), C = r.C, ids = ['ascendant', 'secret', 'limited'];
let passed = 0;
function check(name, callback) { callback(); passed++; console.log('PASS ' + name); }
function view(id, mode = 'color', state) { return C.gallery.views.find(v => v.card.rarity === id && v.el.dataset.colorMode === mode && (!state || v.finishState === state)); }
function snapshot(el) { return JSON.stringify({ attrs: el.attrs, dataset: el.dataset, style: el.style, text: el.textContent, children: el.children.map(snapshot) }); }
function mount(id, state) { return C.finishes.registry[id].mount(new r.Element('div'), view(id).card, { colorMode: 'color', state }); }
function word(state) { return state.glyphs.map(g => g.textContent).join(''); }
check('all thirteen finishes register and tier modules preserve exact design and prop text', () => {
  assert.equal(Object.keys(C.finishes.registry).length, 13);
  ids.forEach(id => {
    assert(scripts.includes('src/finishes/' + id + '.js'));
    const source = fs.readFileSync(path.join(__dirname, '../src/finishes/' + id + '.js'), 'utf8'), tier = C.rarity(id);
    ['mount', 'update', 'destroy', 'lite'].forEach(method => assert.equal(typeof C.finishes.registry[id][method], 'function'));
    (id === 'secret' ? ['foundDesignSpec', 'unfoundDesignSpec', 'foundPropSpec', 'unfoundPropSpec'] : ['designSpec', 'propSpec']).forEach(key => assert(source.includes(tier[key])));
    assert(!/requestAnimationFrame|setTimeout|setInterval/.test(source));
  });
});
check('gallery has fourteen states in each color mode, one full, and an unchanged save/catalog', () => {
  assert.equal(C.gallery.views.length, 28);
  ['color', 'mono'].forEach(mode => {
    assert.equal(C.gallery.views.filter(v => v.el.dataset.colorMode === mode).length, 14);
    ids.forEach(id => assert(view(id, mode)));
    ['found', 'unfound'].forEach(state => assert(view('secret', mode, state)));
  });
  assert.equal(C.gallery.views.filter(v => v.mode === 'full').length, 1);
  assert.equal(view('secret', 'color', 'found').el.querySelectorAll('.card__art-window').length, 1);
  assert.equal(C.data.cards.length, 6); assert.equal(C.state.current.inventory.length, 0);
  assert.equal(C.state.current.serialCounter, 0); assert.equal(C.state.current.packs.ready, 2);
  assert.equal(r.store.get('cardable.save'), JSON.stringify(C.state.current));
});
check('all new states preserve ten layers and separate live/lite props at layer eight', () => {
  C.gallery.views.filter(v => ids.includes(v.card.rarity)).forEach(v => {
    assert.equal(v.el.children[0].dataset.layer, 'shadow');
    const face = v.el.children[1].children[0].children[0];
    assert.deepEqual(face.children.map(el => el.dataset.layer), ['body','finish','art','foil','beam','glare','text','prop','edge']);
    assert.equal(face.children[7].querySelectorAll('.finish-prop').length, 2);
    assert.equal(face.children[1].querySelectorAll('.finish-prop').length, 0);
  });
});
check('Ascendant has seeded 2–3 second splashes, one-second fades, moving pastel sides and aurora', () => {
  const def = C.finishes.registry.ascendant, a = mount('ascendant'), b = mount('ascendant');
  assert.equal(a.nextAt, b.nextAt); assert(a.nextAt >= 2000 && a.nextAt <= 3000);
  def.update(a.nextAt, {}, a); assert.equal(a.splash.style.opacity, 0);
  const birth = a.birth; assert(a.nextAt - birth >= 2000 && a.nextAt - birth <= 3000);
  def.update(500, {}, a); assert.equal(a.splash.style.opacity, C.config.finishMotion.ascendant.splashOpacity);
  assert(a.el.style['--asc-angle']); assert(a.prop.style['--aurora-color-1']); assert(a.prop.style['--aurora-mono-1']);
  def.update(500, {}, a); assert.equal(a.splash.style.opacity, 0);
  const frame = a.prop.querySelectorAll('.finish-ascendant-frame')[0]; assert(frame.querySelector('clipPath')); assert(frame.querySelector('linearGradient'));
  def.destroy(a); def.destroy(b);
});
check('Secret locks one letter exactly every 300 ms, including a flash on the sixth letter', () => {
  const def = C.finishes.registry.secret, state = mount('secret', 'found');
  def.update(299, {}, state); assert.equal(state.locked, 0);
  for (let i = 1; i <= 6; i++) {
    def.update(i === 1 ? 1 : 300, {}, state); assert.equal(state.locked, i);
    assert.equal(word(state).slice(0, i), 'Secret'.slice(0, i));
    assert.equal(Number(state.glyphs[i - 1].style['--lock-flash']), 1);
  }
  assert.equal(word(state), 'Secret'); assert.equal(state.phase, 'cover');
  assert.equal(state.el.dataset.phase, 'cover'); assert.equal(state.prop.dataset.phase, 'cover'); def.destroy(state);
});
check('Found inverts, accelerates/grows lines to total black coverage, then returns to scrambling', () => {
  const def = C.finishes.registry.secret, state = mount('secret', 'found'), cfg = C.config.finishMotion.secret;
  def.update(1800, {}, state); const before = state.lines[0].style.transform;
  def.update(cfg.coverMs - 1, {}, state);
  const scale = Number(state.lines[0].style.transform.match(/scaleY\(([^)]+)/)[1]);
  assert(scale * cfg.lineHeightPercent > 100 / cfg.lineCount); assert.notEqual(before, state.lines[0].style.transform);
  def.update(1, {}, state); assert.equal(state.phase, 'scramble'); assert.equal(state.locked, 0); assert.notEqual(word(state), 'Secret');
  assert.equal(state.prop.dataset.phase, 'scramble'); def.destroy(state);
});
check('Unfound only scrambles, stays black, and conceals name/specs/art/serial on both faces', () => {
  const def = C.finishes.registry.secret, state = mount('secret', 'unfound'), before = word(state);
  def.update(60, {}, state); assert.notEqual(word(state), before);
  def.update(10000, {}, state); assert.equal(state.locked, 0); assert.equal(state.phase, 'scramble');
  assert.equal(state.prop.querySelectorAll('.finish-secret-frame')[0].querySelector('g').children[0].getAttribute('opacity'), '0.95');
  const v = view('secret', 'color', 'unfound');
  ['card__name','card__memory','card__specs','card__serial','card__back-serial','card__art-window'].forEach(name => assert.equal(v.el.querySelectorAll('.' + name).length, 0));
  assert.equal(v.el.getAttribute('aria-label'), C.rarity('secret').unfoundDescription + ' Press Enter to turn the card.');
  assert.equal(v.el.querySelectorAll('.card__unknown')[0].textContent, C.rarity('secret').unfoundDescription);
  v.stamp(); def.destroy(state);
});
check('ownership selects Secret state; gallery overrides do not grant ownership', () => {
  const record = view('secret').card, instance = view('secret').instance;
  let v = C.cardView.create(record, instance, { autoFocus: false }); assert.equal(v.finishState, 'unfound'); v.destroy();
  C.state.current.inventory.push({ cardId: record.id });
  v = C.cardView.create(record, instance, { autoFocus: false }); assert.equal(v.finishState, 'found'); assert.equal(v.description, C.rarity('secret').foundDescription); v.destroy();
  C.state.current.inventory.pop();
  v = C.cardView.create(record, instance, { owned: true, autoFocus: false }); assert.equal(v.finishState, 'found'); v.destroy();
  assert.equal(C.state.current.inventory.length, 0);
});
check('Limited shares Unusual glow, adds a floating logo, and remains excluded from pulls', () => {
  const def = C.finishes.registry.limited, state = mount('limited');
  assert(state.el.classList.contains('finish-unusual')); assert.equal(state.el.querySelectorAll('.finish-unusual-glow').length, 1);
  assert.equal(state.prop.querySelectorAll('.finish-limited-border').length, 1);
  def.update(100, { x: 0.8 }, state); const before = state.logo.style.transform; def.update(1000, { x: 0.2 }, state); assert.notEqual(state.logo.style.transform, before);
  assert.equal(C.rarity('limited').pullable, false); assert.equal(C.rarity('limited').availableUntil, null);
  assert.equal(view('limited').description, C.rarity('limited').availableDescription);
  def.destroy(state);
});
check('Limited descriptions substitute availableUntil and switch after expiry without changing data', () => {
  const tier = C.rarity('limited'), def = C.finishes.registry.limited, original = tier.availableUntil;
  try {
    tier.availableUntil = '2099-10-01T00:00:00Z'; assert.equal(def.describe(view('limited').card).description, 'Only obtainable for a limited time till 2099-10-01');
    tier.availableUntil = '2000-10-01T00:00:00Z'; assert.equal(def.describe(view('limited').card).description, 'Was obtainable for a limited time till 2000-10-01');
  } finally { tier.availableUntil = original; }
});
check('mono styling is explicitly neutral and mode changes update full/lite surfaces and props', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/finishes.css'), 'utf8');
  ids.forEach(id => {
    const v = view(id); v.setColorMode('mono'); assert(v.el.querySelectorAll('.finish-surface').every(el => el.dataset.colorMode === 'mono')); v.setColorMode('color');
    assert(css.includes('.finish-' + id + '-prop[data-color-mode="mono"]'));
  });
  assert(css.includes('--limited-border: #C3C3C3')); assert(css.includes('--aurora-mono-1,#EEE'));
  assert(css.includes('.finish-secret[data-phase="cover"] { --secret-bg: #FAFAFA; --secret-ink: #050505; }'));
});
check('every new state pauses offscreen, hidden, on the back, and under reduced motion', () => {
  C.gallery.views.filter(v => ids.includes(v.card.rarity)).forEach(v => {
    v.el.fire('pointerenter'); r.advance(100); v.setVisible(false);
    let before = snapshot(v.el); r.advance(1000); assert.equal(snapshot(v.el), before);
    v.setVisible(true); r.advance(100); r.hidden(true); before = snapshot(v.el); r.advance(1000); assert.equal(snapshot(v.el), before);
    r.hidden(false); r.advance(100); v.setFace('back'); const surfaces = v.el.querySelectorAll('.finish-surface'); before = surfaces.map(snapshot); r.advance(1000); assert.deepEqual(surfaces.map(snapshot), before);
    v.setFace('front'); r.reduced(true); r.advance(100); before = surfaces.map(snapshot); r.advance(1000); assert.deepEqual(surfaces.map(snapshot), before); r.reduced(false);
  });
});
check('new static posters stay unchanged while one full finish animates; lifecycle removes props', () => {
  ids.forEach(id => {
    const v = view(id); v.el.fire('pointerenter'); r.advance(100);
    const lite = v.el.querySelectorAll('.card__material--lite'), before = lite.map(snapshot); r.advance(1000); assert.deepEqual(lite.map(snapshot), before);
    const host = new r.Element('div'), def = C.finishes.registry[id], state = def.mount(host, v.card, { colorMode: 'mono', state: v.finishState });
    def.update(100, {}, state); def.destroy(state); assert.equal(host.children.length, 0);
    assert.equal(def.lite(v.card, { colorMode: 'mono', state: v.finishState }).querySelectorAll('.finish-prop').length, 1);
  });
});
check('FPS sampler counts one full plus twenty-seven lite cards with simulated 60 Hz timestamps', () => {
  view('secret', 'mono', 'found').el.fire('pointerenter'); r.advance(100); C.gallery.measure(); r.advance(5000);
  const sample = C.gallery.lastProfile; assert(sample.valid); assert.equal(sample.fullCards, 1); assert.equal(sample.liteCards, 27); assert(sample.fps > 58 && sample.fps <= 61);
  assert(sample.p95Ms < 17); console.log('SIMULATED sampler result: ' + JSON.stringify(sample));
});
check('all-lite mode stops card work, Stage 0 checks pass, and the harness logs no errors', () => {
  C.gallery.views.forEach(v => v.setMode('lite')); r.advance(100); const before = C.cardView.stats.updates; r.advance(3000); assert.equal(C.cardView.stats.updates, before);
  assert.equal(r.logs.filter(log => log.level === 'error').length, 0);
  assert.equal(r.logs.filter(log => log.text.includes('[Cardable check] PASS')).length, r.C.dev.checkCount);
});
console.log('\n' + passed + ' Stage 3 (tiers 10–12) behavior checks passed. Browser visuals and measured rendering FPS remain unverified.');
