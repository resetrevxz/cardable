'use strict';
// DOM/animation behavior only. No browser-rendering or measured-FPS claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, scripts } = require('./check-stage1.cjs');
const r = runtime(true, true), C = r.C, ids = ['legendary', 'mythical', 'exotic'];
let passed = 0;
function check(name, callback) { callback(); passed += 1; console.log('PASS ' + name); }
function view(id, mode = 'color') { return C.gallery.views.find(v => v.card.rarity === id && v.el.dataset.colorMode === mode); }
function finish(v) { return v.el.querySelectorAll('.finish-surface')[0]; }
function prop(v, lite = false) { return v.el.querySelectorAll('.finish-prop')[lite ? 1 : 0]; }
function snapshot(el) { return JSON.stringify({ attrs: el.attrs, style: el.style, children: el.children.map(snapshot) }); }
function traverse(el, callback) { callback(el); el.children.forEach(child => traverse(child, callback)); }

check('tiers 7–9 register separately, with no tiers 10–12 yet', () => {
  assert.equal(Object.keys(C.finishes.registry).length, 10);
  ids.forEach(id => {
    assert(scripts.includes('src/finishes/' + id + '.js'));
    ['mount', 'update', 'destroy', 'lite'].forEach(method => assert.equal(typeof C.finishes.registry[id][method], 'function'));
  });
  ['ascendant', 'secret', 'limited'].forEach(id => assert.equal(C.finishes.registry[id], undefined));
});

check('gallery displays tiers 0–9 in color and mono without altering catalog or save', () => {
  assert.equal(C.gallery.views.length, 20);
  assert.equal(C.gallery.views.filter(v => v.el.dataset.colorMode === 'mono').length, 10);
  ids.forEach(id => ['color', 'mono'].forEach(mode => assert(view(id, mode))));
  assert.equal(C.data.cards.length, 6); assert.equal(C.state.current.serialCounter, 0);
  assert.equal(C.state.current.packs.ready, 2);
  assert.equal(r.store.get('cardable.save'), JSON.stringify(C.state.current));
});

check('backgrounds stay at layer 2 and both prop renders mount at layer 8', () => {
  ids.forEach(id => {
    const face = view(id).el.children[1].children[0].children[0];
    assert.deepEqual(face.children.map(layer => layer.dataset.layer), ['body', 'finish', 'art', 'foil', 'beam', 'glare', 'text', 'prop', 'edge']);
    assert.equal(face.children[7].children.length, 2);
    assert(face.children[7].children[0].classList.contains('card__material--live'));
    assert(face.children[7].children[1].classList.contains('card__material--lite'));
    assert.equal(face.children[7].children[0].children.length, 1); assert.equal(face.children[7].children[1].children.length, 1);
    assert.equal(face.children[1].querySelectorAll('.finish-prop').length, 0);
  });
});

check('Legendary contains its gold/maroon waving checker band, crown sparkles, and tip sparks', () => {
  const v = view('legendary'); v.el.fire('pointerenter');
  assert(finish(v).querySelector('pattern')); assert(finish(v).querySelector('mask'));
  assert.equal(finish(v).querySelectorAll('.finish-sparkle').length, 16);
  assert.equal(prop(v).querySelectorAll('.finish-sparkle').length, 8);
  assert.equal(prop(v).querySelectorAll('.finish-tip-spark').length, 7);
  const wave = finish(v).querySelectorAll('.finish-legendary-band')[0];
  r.advance(50); const before = wave.style.transform; r.advance(800); assert.notEqual(wave.style.transform, before);
});

check('crown red glow rotates, blue mythril stays static, and green has a distinct shiny outline', () => {
  const v = view('legendary'), crown = prop(v);
  ['crown-red-gem', 'crown-blue-gem', 'crown-green-gem'].forEach(name => assert.equal(crown.querySelectorAll('.' + name).length, 1));
  const glow = crown.querySelectorAll('.crown-red-glow')[0], blue = crown.querySelectorAll('.crown-mythril')[0];
  const before = glow.getAttribute('transform'), blueBefore = snapshot(blue);
  r.advance(1000); assert.notEqual(glow.getAttribute('transform'), before); assert.equal(snapshot(blue), blueBefore);
  assert.equal(crown.querySelectorAll('.crown-green-gem')[0].getAttribute('stroke'), 'var(--gem-green-edge)');
});

check('Mythical slowly pulses ruby shine, with white-to-red flames originating at the bottom', () => {
  const v = view('mythical'); v.el.fire('pointerenter');
  const shine = finish(v).querySelectorAll('.finish-mythical-shine')[0], flames = prop(v).querySelectorAll('.finish-flame');
  assert.equal(flames.length, C.config.finishMotion.mythical.flameCount);
  assert(flames.every(flame => / 100Z$/.test(flame.getAttribute('d'))));
  const gradient = prop(v).querySelector('linearGradient');
  assert.equal(gradient.children[0].getAttribute('stop-color'), 'var(--highlight)');
  assert.equal(gradient.children[2].getAttribute('stop-color'), 'var(--flame-tip)');
  assert(prop(v).querySelector('mask'));
  assert.equal(prop(v).querySelectorAll('.finish-mythical-label-measure')[0].textContent, v.card.name);
  r.advance(50); const before = shine.style.opacity, fireBefore = snapshot(flames[0]);
  r.advance(1200); assert.notEqual(shine.style.opacity, before); assert.notEqual(snapshot(flames[0]), fireBefore);
});

check('Exotic has deterministic seeded shapes and a clipped squircle border with a traveling white dash', () => {
  const v = view('exotic'); v.el.fire('pointerenter');
  const shapes = finish(v).querySelectorAll('.finish-exotic-shape'); assert.equal(shapes.length, 9);
  const frame = prop(v).querySelectorAll('.finish-exotic-frame')[0];
  assert.equal(frame.getAttribute('data-shape'), 'squircle'); assert(frame.querySelector('clipPath'));
  assert.equal(frame.querySelectorAll('.exotic-pink-outline').length, 1); assert.equal(frame.querySelectorAll('.exotic-dark-border').length, 1);
  const highlight = frame.querySelectorAll('.exotic-border-highlight')[0];
  assert.equal(highlight.getAttribute('pathLength'), '1000'); assert.equal(highlight.getAttribute('stroke-dasharray'), '85 915');
  r.advance(50); const before = highlight.style.strokeDashoffset, shapeBefore = snapshot(shapes[0]);
  r.advance(900); assert.notEqual(highlight.style.strokeDashoffset, before); assert.notEqual(snapshot(shapes[0]), shapeBefore);
  const colorPositions = shapes.map(shape => [shape.style.left, shape.style.top, shape.children[0].getAttribute('d')]);
  const monoPositions = finish(view('exotic', 'mono')).querySelectorAll('.finish-exotic-shape').map(shape => [shape.style.left, shape.style.top, shape.children[0].getAttribute('d')]);
  assert.deepEqual(colorPositions, monoPositions);
});

check('SVG definition identifiers are unique across full/lite and color/mono renders', () => {
  const identifiers = [];
  traverse(r.document.body, el => { const id = el.getAttribute('id'); if (id && id.startsWith('finish-')) identifiers.push(id); });
  assert(identifiers.length > 30); assert.equal(new Set(identifiers).size, identifiers.length);
});

check('color-mode changes reach both backgrounds and both props; mono has neutral gem/flame/border tokens', () => {
  ids.forEach(id => {
    const v = view(id); v.setColorMode('mono');
    assert.equal(v.el.querySelectorAll('.finish-surface').length, 4);
    assert(v.el.querySelectorAll('.finish-surface').every(surface => surface.dataset.colorMode === 'mono'));
    v.setColorMode('color');
  });
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/finishes.css'), 'utf8');
  ids.forEach(id => assert(css.includes('.finish-' + id + '-prop[data-color-mode="mono"]')));
  assert(css.includes('--gem-red: #AAA')); assert(css.includes('--flame-tip: #555')); assert(css.includes('--exotic-border: #222'));
});

check('one full background/prop animates while every other card and its lite prop stay static', () => {
  const v = view('legendary'); v.el.fire('pointerenter');
  const others = C.gallery.views.filter(item => item !== v), before = others.map(item => snapshot(item.el));
  const fullProp = snapshot(prop(v)), liteProp = snapshot(prop(v, true));
  r.advance(1200); assert.notEqual(snapshot(prop(v)), fullProp); assert.equal(snapshot(prop(v, true)), liteProp);
  assert.deepEqual(others.map(item => snapshot(item.el)), before);
  assert.equal(C.gallery.views.filter(item => item.mode === 'full').length, 1);
});

check('all new props and backgrounds pause off-screen, hidden, and on the back face', () => {
  ids.forEach(id => {
    const v = view(id); v.el.fire('pointerenter'); r.advance(50);
    v.setVisible(false); const offscreen = snapshot(v.el); r.advance(700); assert.equal(snapshot(v.el), offscreen);
    v.setVisible(true); r.advance(50);
    r.hidden(true); const hidden = snapshot(v.el); r.advance(700); assert.equal(snapshot(v.el), hidden);
    r.hidden(false); r.advance(50); v.setFace('back');
    const background = snapshot(finish(v)), props = snapshot(prop(v)); r.advance(700);
    assert.equal(snapshot(finish(v)), background); assert.equal(snapshot(prop(v)), props); v.setFace('front');
  });
});

check('reduced motion freezes new effects and selects static props through the shared crossfade', () => {
  r.reduced(true);
  ids.forEach(id => {
    const v = view(id); v.el.fire('pointerenter'); r.advance(50);
    const before = snapshot(finish(v)), props = snapshot(prop(v)); r.advance(2000);
    assert.equal(snapshot(finish(v)), before); assert.equal(snapshot(prop(v)), props);
  });
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/card.css'), 'utf8');
  assert(css.includes('.reduced-motion .card__prop .card__material--live { opacity: 0; }'));
  assert.equal(view('exotic').el.style['--mode-duration'], '150ms');
  r.reduced(false);
});

check('FPS sampler includes one full and nineteen lite cards with simulated timestamps', () => {
  view('exotic').el.fire('pointerenter'); r.advance(100); C.gallery.measure(); r.advance(5000);
  const sample = C.gallery.lastProfile; assert(sample.valid);
  assert.equal(sample.fullCards, 1); assert.equal(sample.liteCards, 19);
  assert(sample.fps > 58 && sample.fps <= 61); assert(sample.p95Ms < 17);
  // No actual GPU/paint work occurs in this harness.
});

check('finish lifecycle destroys live props and preserves standalone lite prop rendering', () => {
  ids.forEach(id => {
    const host = new r.Element('div'), definition = C.finishes.registry[id], card = view(id).card;
    const state = definition.mount(host, card, { colorMode: 'mono' });
    definition.update(100, {}, state); definition.destroy(state); assert.equal(host.children.length, 0);
    const lite = definition.lite(card, { colorMode: 'mono' }); assert.equal(lite.querySelectorAll('.finish-prop').length, 1);
  });
});

check('all-lite mode stops card work; finish modules add no separate loops and no harness errors', () => {
  C.gallery.views.forEach(v => v.setMode('lite')); r.advance(50);
  const before = C.cardView.stats.updates; r.advance(3000); assert.equal(C.cardView.stats.updates, before);
  ids.forEach(id => {
    const source = fs.readFileSync(path.join(__dirname, '../src/finishes/' + id + '.js'), 'utf8');
    assert(!/requestAnimationFrame|setInterval|setTimeout/.test(source));
    assert(source.includes(C.rarity(id).designSpec)); assert(source.includes(C.rarity(id).propSpec));
  });
  assert.equal(r.logs.filter(log => log.level === 'error').length, 0);
  assert.equal(r.logs.filter(log => log.text.includes('[Cardable check] PASS')).length, 6);
});

console.log('\n' + passed + ' Stage 3 (tiers 7–9) behavior checks passed. Browser visuals, screenshots, and measured FPS remain unverified.');
