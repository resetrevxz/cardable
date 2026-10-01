'use strict';
// Behavioral verification with an instrumented DOM. No browser rendering/FPS claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, scripts } = require('./check-stage1.cjs');
const r = runtime(true, true), C = r.C;
let passed = 0;
function check(name, callback) { callback(); passed += 1; console.log('PASS ' + name); }
function instance(card, serial = 'CBL-2345-000123') { return { cardId: card.id, instanceId: 'check-' + card.id, serial, pulledAt: 0, seen: false }; }
function serialize(element) { return JSON.stringify({ tag: element.tagName, attrs: element.attrs, classes: element.className, children: element.children.map(child => JSON.parse(serialize(child))) }); }

check('tiers 0–3 remain registered with the required lifecycle methods', () => {
  ['basic', 'common', 'uncommon', 'rare'].forEach(id => assert(C.finishes.registry[id]));
  Object.values(C.finishes.registry).forEach(finish => ['mount', 'update', 'destroy', 'lite'].forEach(method => assert.equal(typeof finish[method], 'function')));
  assert(scripts.indexOf('src/fx/springs.js') < scripts.indexOf('src/finishes/index.js'));
  assert(scripts.indexOf('src/finishes/rare.js') < scripts.indexOf('src/ui/card.js'));
  const unsupported = { ...C.card('gen1-basic-01'), rarity: 'not-a-tier' };
  assert.throws(() => C.cardView.create(unsupported, instance(unsupported)), /not implemented/);
});

check('gallery retains four original tiers in both modes, uses an isolated Uncommon fixture, and preserves save/data', () => {
  const original = C.gallery.views.filter(view => C.rarity(view.card.rarity).tier <= 3);
  assert.equal(original.length, 8);
  assert.equal(original.filter(view => view.el.dataset.colorMode === 'color').length, 4);
  assert.equal(original.filter(view => view.el.dataset.colorMode === 'mono').length, 4);
  assert.equal(C.data.cards.length, 6);
  assert(!C.data.cards.some(card => card.rarity === 'uncommon'));
  assert.equal(C.gallery.views.filter(view => view.card.rarity === 'uncommon').length, 2);
  assert.equal(C.state.current.serialCounter, 0);
  assert.equal(C.state.current.packs.ready, 2);
  assert.equal(r.store.get('cardable.save'), JSON.stringify(C.state.current));
});

check('each face has layers 1–9 above its shared layer-0 shadow in the specified order', () => {
  const view = C.gallery.views[0];
  assert.equal(view.el.children[0].dataset.layer, 'shadow');
  const faces = view.el.children[1].children[0].children;
  assert.equal(faces.length, 2);
  const names = ['body', 'finish', 'art', 'foil', 'beam', 'glare', 'text', 'prop', 'edge'];
  faces.forEach(face => assert.deepEqual(face.children.map(layer => layer.dataset.layer), names));
  faces.forEach(face => assert.deepEqual(face.children.map(layer => Number(layer.dataset.layerIndex)), [1,2,3,4,5,6,7,8,9]));
});

check('content is data-driven: name, VRAM, three additional specs, serial on both sides, and 12 meter ticks', () => {
  const view = C.gallery.views[3], face = view.el.children[1].children[0].children[0];
  assert.equal(face.querySelector('h2').textContent, view.card.name);
  assert.equal(face.querySelector('dl').children.length, 3);
  assert.equal(view.el.querySelectorAll('.card__meter-tick').length, 12);
  assert.equal(view.el.querySelectorAll('.card__meter-tick').filter(tick => String(tick.dataset.filled) === 'true').length, 4);
  assert.equal(view.el.querySelectorAll('.card__serial-char').map(char => char.textContent).join(''), view.instance.serial);
  assert.equal(Array.from(view.el.querySelectorAll('.card__back-serial')[0].children).map(c => c.textContent).join(''), view.instance.serial);
  assert.equal(C.cardSpecs.rows(view.card).length, 4);
  assert.equal(C.cardSpecs.vram(view.card), '8 GB');
});

check('GPU art is deterministic by seed, changes with the seed, and supports motif/image dispatch', () => {
  const original = C.card('gen1-basic-01');
  assert.equal(serialize(C.art.render(original)), serialize(C.art.render(original)));
  const other = { ...original, art: { ...original.art, seed: original.art.seed + 1 } };
  assert.notEqual(serialize(C.art.render(original)), serialize(C.art.render(other)));
  assert.notEqual(serialize(C.art.render(original)), serialize(C.art.render(C.card('gen1-rare-01'))));
  assert.throws(() => C.art.render({ ...original, art: { kind: 'image', src: 'https://example.invalid/card.png' } }), /local/);
  assert.equal(C.art.render({ ...original, art: { kind: 'image', src: 'assets/cards/sample.webp' } }).src, 'assets/cards/sample.webp');
});

check('the shared spring uses 140/16/1, overshoots with weight, and converges without instability', () => {
  assert.equal(C.config.cardView.spring.stiffness, 140); assert.equal(C.config.cardView.spring.damping, 16);
  const spring = C.springs.create(0); let maximum = 0;
  for (let i = 0; i < 240; i += 1) maximum = Math.max(maximum, spring.step(1000 / 60, 1));
  assert(maximum > 1); assert(spring.settled()); assert.equal(spring.value, 1);
  spring.reset(); assert.equal(spring.velocity, 0);
});

check('only one full card updates; live tilt stays capped at 14 degrees with unified light/shadow variables', () => {
  const view = C.gallery.views[0]; view.setMode('full');
  assert.equal(C.gallery.views.filter(card => card.mode === 'full').length, 1);
  const lite = C.gallery.views[1], updates = lite.stats.updates;
  view.el.rect = { left: 0, top: 0, width: 300, height: 420 };
  r.move(300, 0, view.el); r.advance(20);
  assert(parseFloat(view.el.style['--ry']) > 0 && parseFloat(view.el.style['--ry']) < 14);
  r.advance(1000);
  assert(Math.abs(parseFloat(view.el.style['--rx'])) <= 14); assert(Math.abs(parseFloat(view.el.style['--ry'])) <= 14);
  assert(parseFloat(view.el.style['--far-edge-alpha']) > 0);
  assert(parseFloat(view.el.style['--shadow-x']) < 0);
  assert(Number.isFinite(parseFloat(view.el.style['--lamp-angle'])));
  assert(view.el.style['--core-x'] !== view.el.style['--glare-x']);
  assert.equal(lite.stats.updates, updates);
  assert.equal(view.el.style['--mode-duration'], '150ms');
});

check('idle sway starts after three seconds of stillness and reduced motion removes it with a smaller cap', () => {
  const view = C.cardView.active;
  r.move(150, 210, view.el); r.advance(2100);
  assert(Math.abs(parseFloat(view.el.style['--rx'])) < 0.05);
  r.advance(1500); const before = view.el.style['--rx']; r.advance(500); assert.notEqual(view.el.style['--rx'], before);
  r.reduced(true); r.move(300, 0, view.el); r.advance(1500);
  assert(Math.abs(parseFloat(view.el.style['--rx'])) <= 3); assert(Math.abs(parseFloat(view.el.style['--ry'])) <= 3);
  assert.equal(parseFloat(view.el.style['--lift']), 0);
  r.advance(500); const updates = view.stats.updates; r.advance(3500); assert.equal(view.stats.updates, updates);
  r.reduced(false);
});

check('off-screen and hidden-tab effects suspend, then resume on return', () => {
  const view = C.cardView.active; view.setVisible(false); r.advance(100);
  const updates = view.stats.updates; r.advance(1000); assert.equal(view.stats.updates, updates);
  view.setVisible(true); r.advance(20); assert(view.stats.updates > updates);
  r.hidden(true); const hiddenUpdates = view.stats.updates; r.advance(2000); assert.equal(view.stats.updates, hiddenUpdates);
  r.hidden(false); r.advance(20); assert(view.stats.updates > hiddenUpdates);
});

check('flipping changes the face and accessible state; keyboard can turn it back', () => {
  const view = C.cardView.active;
  view.setFace('back'); assert.equal(view.el.dataset.side, 'back');
  const faces = view.el.children[1].children[0].children;
  assert.equal(faces[0].getAttribute('aria-hidden'), 'true'); assert.equal(faces[1].getAttribute('aria-hidden'), 'false');
  view.el.fire('keydown', { key: 'Enter', preventDefault() {} }); assert.equal(view.side, 'front');
});

check('serial stamp uses 35ms character offsets, can replay, and has an immediate reduced-motion equivalent', () => {
  const view = C.cardView.active;
  view.stamp(); assert(view.el.querySelectorAll('.card__serial')[0].classList.contains('is-stamping'));
  assert.equal(view.el.querySelectorAll('.card__serial-char')[1].style['--char-delay'], '35ms');
  r.advance(800); assert(!view.el.querySelectorAll('.card__serial')[0].classList.contains('is-stamping'));
  r.reduced(true); view.stamp(); assert(!view.el.querySelectorAll('.card__serial')[0].classList.contains('is-stamping'));
  r.reduced(false);
});

check('color-mode changes refresh both finish renders; explicitly paired gallery modes stay independent', () => {
  const normal = C.cardView.create(C.card('gen1-rare-01'), instance(C.card('gen1-rare-01')));
  r.document.body.appendChild(normal.el);
  C.events.emit('settings:rarityColorMode', 'mono'); assert.equal(normal.el.dataset.colorMode, 'mono');
  assert(normal.el.querySelectorAll('.finish-surface').every(surface => surface.dataset.colorMode === 'mono'));
  assert.equal(C.gallery.views[3].el.dataset.colorMode, 'color');
  normal.destroy(); assert.equal(normal.destroyed, true);
});

check('lite mode stops per-frame card work, gallery controls remain usable, and no application errors were logged', () => {
  const stamping = C.gallery.views[0]; stamping.setMode('full'); stamping.stamp(); stamping.setMode('lite');
  assert(!stamping.el.querySelectorAll('.card__serial')[0].classList.contains('is-stamping'));
  stamping.stamp(); assert(!stamping.el.querySelectorAll('.card__serial')[0].classList.contains('is-stamping'));
  C.gallery.views.forEach(view => view.setMode('lite'));
  r.advance(20); const updates = C.cardView.stats.updates; r.advance(4000); assert.equal(C.cardView.stats.updates, updates);
  assert.equal(C.cardView.stats.fullCards, 0);
  assert.equal(r.logs.filter(log => log.level === 'error').length, 0);
  assert.equal(r.logs.filter(log => log.text.includes('[Cardable check] PASS')).length, r.C.dev.checkCount);
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/card.css'), 'utf8');
  assert(css.includes('[data-color-mode="mono"] .card__face { filter: grayscale(1); }'));
  assert(css.includes('outline: 2px solid var(--keyline)'));
});

console.log('\n' + passed + ' Stage 2 behavior checks passed. Browser screenshots, actual material appearance, and measured 60 fps remain unverified.');
