'use strict';
// Actual classic scripts, simulated DOM/clock. Does not establish browser paint or GPU FPS.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runtime } = require('./check-stage1.cjs');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS ' + name); }
const clone = x => JSON.parse(JSON.stringify(x));
function initial(pending = false) {
  const r = runtime(), s = clone(r.C.state.current), card = r.C.data.cards[0];
  s.tutorial = { done: true, step: 'done' };
  const instance = { instanceId: 'new-feature-fixture', cardId: card.id, serial: r.C.serial.format(s.playerCode, 1), pulledAt: 0, seen: false };
  s.inventory = pending ? [] : [instance];
  if (pending) s.pendingReveal = { packId: 'standard', cards: [instance], committedAt: 0, keptCount: 0 };
  return s;
}
function boot(pending = false) { const r = runtime(true, false, initial(pending), false, true); r.advance(40); return r; }
function key(r, name, target = r.document.body, extra = {}) {
  const event = { key: name, target, repeat: false, preventDefault() { this.prevented = true; }, ...extra };
  r.document.fire('keydown', event); return event;
}
function gallery() { const r = runtime(true, true); r.advance(50); return r; }
function open(r, preview = false) { if (preview) r.C.events.emit('inventory:preview', true); r.C.events.emit('inventory:request', true); r.advance(1200); }
function current(r) { return r.C.inventory.rendered.get(r.C.inventory.center); }
function pitch(r) { return parseFloat(r.C.inventory.el.style['--inventory-tile-width']) + r.C.config.inventoryMotion.tileGapPx; }
function press(r, el, x, y) { el.fire('pointerdown', { pointerId: 1, clientX: x, clientY: y, button: 0, isPrimary: true, target: el }); }
function move(r, x, y) { r.document.fire('pointermove', { pointerId: 1, clientX: x, clientY: y, target: r.document.body, preventDefault() {} }); }
function release(r) { r.document.fire('pointerup', { pointerId: 1 }); }

check('R turns the focused gallery card for 600 visible milliseconds with spring easing', () => {
  const r = gallery(), v = r.C.cardView.active, flipper = v.el.querySelectorAll('.card__flipper')[0];
  assert(key(r, 'R').prevented); assert.equal(v.side, 'back'); r.advance(200); assert(flipper.style.transform.includes('rotateY('));
  const pose = flipper.style.transform; r.advance(200); assert.notEqual(flipper.style.transform, pose);
  r.advance(230); assert.equal(flipper.style.transform, ''); assert.equal(v.el.dataset.side, 'back');
  key(r, 'r'); r.advance(630); assert.equal(v.side, 'front'); assert.equal(r.C.config.cardTurn.durationMs, 600);
});
check('R excludes repeats, typing, dev controls, modifier shortcuts and menus', () => {
  const r = gallery(), v = r.C.cardView.active;
  for (const e of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) key(r, 'r', r.document.body, e);
  key(r, 'r', new r.Element('input')); key(r, 'r', r.C.dev.panel.querySelector('button')); assert.equal(v.side, 'front');
  const menu = boot(); key(menu, 'r'); assert.equal(menu.C.opening.phase, 'idle');
});
check('revealed cards flip without an opening pose override or another saved pull', () => {
  const r = boot(true), before = clone(r.C.state.current), v = r.C.opening.view;
  assert.equal(r.C.opening.phase, 'revealed'); key(r, 'r'); r.advance(700); assert.equal(v.side, 'back');
  r.reduced(true); r.advance(50); assert.equal(v.side, 'back'); r.reduced(false); r.advance(50); assert.equal(v.side, 'back');
  assert.deepEqual(clone(r.C.state.current), before); assert.equal(r.C.opening.stats.commits, 0);
});
check('opening rejects R before revealed, including after pose control releases during settling', () => {
  const r = boot(); r.document.fire('keydown', { key: ' ', code: 'Space', target: r.document.body, repeat: false, preventDefault() {} }); r.advance(3050);
  r.document.fire('keyup', { key: ' ', code: 'Space', target: r.document.body, preventDefault() {} }); r.advance(950); key(r, 'Enter');
  while (r.C.opening.phase !== 'settling') r.advance(20);
  const v = r.C.opening.view; assert.equal(v.side, 'front'); assert(!key(r, 'r').prevented); assert.equal(v.side, 'front');
});
check('detail flip button and R share one flip controller, and browsing retains the selected side', () => {
  const r = boot(); open(r); current(r).el.fire('click'); r.advance(1200);
  const v = r.C.detail.view, button = r.C.detail.panel.querySelectorAll('.detail-flip')[0];
  key(r, 'r'); assert.equal(button.getAttribute('aria-pressed'), 'true'); r.advance(650);
  button.fire('click'); r.advance(650); assert.equal(v.side, 'front'); assert.equal(button.getAttribute('aria-pressed'), 'false');
});
check('R hint expires after four seconds, reappears on hover and pauses with a hidden tab', () => {
  const r = boot(true), v = r.C.opening.view, hint = v.el.querySelectorAll('.card__flip-hint')[0];
  assert.equal(Number(hint.style.opacity), 1); r.advance(4100); assert(Number(hint.style.opacity) < 1); r.advance(100); assert.equal(Number(hint.style.opacity), 0);
  v.el.fire('pointerenter'); assert.equal(Number(hint.style.opacity), 1); r.hidden(true); r.advance(10000); assert.equal(Number(hint.style.opacity), 1);
  r.hidden(false); r.advance(4200); assert.equal(Number(hint.style.opacity), 0);
});
check('reduced motion crossfades both faces, and a live change preserves flip progress', () => {
  const r = gallery(), v = r.C.cardView.active; r.reduced(true); key(r, 'r'); r.advance(250);
  const faces = v.el.querySelectorAll('.card__face'); assert(Number(faces[0].style.opacity) > 0); assert(Number(faces[1].style.opacity) > 0);
  assert.equal(v.el.querySelectorAll('.card__flipper')[0].style.transform, 'none'); r.reduced(false); r.advance(400); assert.equal(v.side, 'back');
});
check('hidden flips pause and changing full-card focus clears an unfinished pose and hint', () => {
  const r = gallery(), v = r.C.cardView.active, flipper = v.el.querySelectorAll('.card__flipper')[0];
  key(r, 'r'); r.advance(150); const pose = flipper.style.transform;
  r.hidden(true); r.advance(10000); assert.equal(flipper.style.transform, pose); r.hidden(false); r.advance(500); assert.equal(flipper.style.transform, '');
  key(r, 'r'); r.advance(100); r.C.cardView.focus(r.C.gallery.views.find(x => x !== v));
  assert.equal(v.mode, 'lite'); assert.equal(flipper.style.transform, ''); assert.equal(v.el.dataset.flipAvailable, 'false'); assert.equal(r.C.cardView.stats.fullCards, 1);
});
check('the back has identical geometry across tiers and retains the ten-layer contract', () => {
  const r = gallery(); const signatures = r.C.gallery.views.filter(v => v.finishState !== 'unfound').map(v => {
    const back = v.el.querySelectorAll('.card__face--back')[0]; assert.equal(back.children.length, 9);
    assert.equal(back.querySelectorAll('.card__back-dots').length, 2); assert.equal(back.querySelectorAll('.finish-surface').length, 0);
    return Array.from(back.children).map(layer => layer.dataset.layer + ':' + Array.from(layer.children).map(child => child.className).join(',')).join('|');
  }); assert(signatures.every(x => x === signatures[0]));
  const css = fs.readFileSync('src/styles/card.css', 'utf8'); assert(css.includes('inset: 12px')); assert(css.includes('width: 28%')); assert(css.includes('.card__back-dots--lit'));
});
check('back serial stamps once, pauses when hidden, and tilt/glare keep following the pointer', () => {
  const r = gallery(), v = r.C.cardView.active; key(r, 'r'); r.advance(70);
  const chars = v.el.querySelectorAll('.card__back-char'); assert.equal(chars.map(x => x.textContent).join(''), v.instance.serial); assert(Number(chars[chars.length - 1].style.opacity) < 1);
  const op = chars[0].style.opacity; r.hidden(true); r.advance(5000); assert.equal(chars[0].style.opacity, op); r.hidden(false); r.advance(900); assert(chars.every(x => Number(x.style.opacity) === 1));
  r.move(90, 90, v.el); r.advance(500); assert.notEqual(v.el.style['--mx'], .5); assert(v.el.style['--glare-x']);
  key(r, 'r'); r.advance(700); key(r, 'r'); assert(chars.every(x => Number(x.style.opacity) === 1));
});
check('normal arrow click toggles; a drag only suppresses its generated click and the next press works', () => {
  const r = boot(), arrow = r.C.inventory.arrow;
  press(r, arrow, 640, 680); move(r, 642, 678); release(r); arrow.fire('click'); r.advance(1200); assert(r.C.inventory.open);
  press(r, arrow, 640, 400); move(r, 640, 680); release(r); const rest = r.C.inventory.open; arrow.fire('click'); assert.equal(r.C.inventory.open, rest);
  press(r, arrow, 640, 680); release(r); arrow.fire('click'); assert.equal(r.C.inventory.open, !rest); r.advance(1200);
});
check('arrow Space is excluded, Enter toggles, and I/ArrowUp only open', () => {
  const r = boot(), arrow = r.C.inventory.arrow;
  arrow.fire('keydown', { key: ' ', preventDefault() {} }); assert(!r.C.inventory.active);
  arrow.fire('keydown', { key: 'Enter', repeat: false, preventDefault() {} }); r.advance(1200); assert(r.C.inventory.open);
  key(r, 'i'); key(r, 'ArrowUp'); assert(r.C.inventory.open);
});
check('vertical wheel and horizontal trackpad feed one smooth transform position without native scrolling', () => {
  const r = boot(); open(r, true); const c = r.C.inventory.carousel, shelf = r.C.inventory.shelf;
  shelf.fire('wheel', { deltaY: 180, deltaX: 0, preventDefault() {} }); assert.equal(c.position, 0); assert.equal(c.target, 180);
  r.advance(80); assert(c.position > 0 && c.position < c.target);
  shelf.fire('wheel', { deltaY: 0, deltaX: 180, preventDefault() {} }); assert.equal(c.target, 360); r.advance(1400);
  assert(Math.abs(c.position / pitch(r) - Math.round(c.position / pitch(r))) < .001);
  assert.equal(shelf.scrollLeft, undefined); assert(shelf.children[0].style.transform.includes('translate3d'));
});
check('carousel snap overshoot is bounded to six percent of a tile', () => {
  const r = boot(); const c = r.C.carousel.create(); c.bounds(10000, 200); c.reset(1000); c.snap(2000, 1800);
  let max = 0; for (let i = 0; i < 200; i++) { c.step(1000 / 60, false); max = Math.max(max, c.position); }
  assert(max <= 2012); assert.equal(c.position, 2000);
});
check('reduced carousel motion slides briefly without rotation or snap overshoot', () => {
  const r = boot(); open(r, true); r.reduced(true); const c = r.C.inventory.carousel;
  r.C.inventory.shelf.fire('wheel', { deltaY: 180, deltaX: 0, preventDefault() {} }); r.advance(50);
  assert(c.position > 0 && c.position < 180); assert.equal(current(r).pose.style.transform, 'none');
  r.advance(1100); assert(c.settled()); assert(Math.abs(c.position / pitch(r) - Math.round(c.position / pitch(r))) < .001);
});
check('300 tiles virtualize to +/-6, remain lite on hover, and dial angles cap at fifty degrees', () => {
  const r = boot(); open(r, true); r.C.inventory.carousel.snap(r.C.inventory.entries.findIndex((e, i) => i >= 100 && e.owned) * pitch(r)); r.C.fx.wake(); r.advance(1600);
  assert.equal(r.C.inventory.rendered.size, 13); assert.equal(r.C.cardView.stats.fullCards, 0);
  const tile = current(r), neighbor = r.C.inventory.rendered.get(r.C.inventory.center + 1); tile.el.fire('pointerenter'); r.advance(50); assert.equal(tile.view.mode, 'lite');
  assert(Math.abs(parseFloat(neighbor.pose.style.transform.match(/rotateY\(([-.0-9]+)/)[1]) + 34) < .001); assert.equal(Number(neighbor.pose.style.opacity), .55);
  const far = r.C.inventory.rendered.get(r.C.inventory.center + 6); assert(far.pose.style.transform.includes('rotateY(-50deg)'));
});
check('sort FLIP retains visible DOM nodes, uses bounded staggering, and recenters', () => {
  const r = boot(); open(r, true); r.C.inventory.carousel.snap(40 * pitch(r)); r.C.fx.wake(); r.advance(1400); const old = Array.from(r.C.inventory.rendered.values()), before = clone(r.C.state.current);
  r.C.inventory.filters[2].fire('click'); r.advance(80); assert(old.every(t => !t.view || !t.view.destroyed)); assert(old.every(t => t.el.parent === r.C.inventory.shelf.children[0]));
  assert(old.some(t => t.sortOffset !== 0)); assert(r.C.inventory.rendered.size <= 26); r.advance(1800);
  assert.equal(r.C.inventory.center, 0); assert(r.C.inventory.rendered.size <= 13); assert.deepEqual(clone(r.C.state.current), before);
  assert(r.C.inventory.entries.every((e, i, all) => !i || all[i - 1].rarity.tier <= e.rarity.tier));
});
check('rapid sorting stays bounded, preserves ids/focus geometry, pauses hidden and handles reduced motion', () => {
  const r = boot(); open(r, true);
  for (let i = 0; i < 9; i++) { r.C.inventory.filters[i % 3].fire('click'); r.advance(40); assert(r.C.inventory.rendered.size <= 26); }
  const pose = current(r).el.style.transform; r.hidden(true); r.advance(10000); assert.equal(current(r).el.style.transform, pose); r.hidden(false);
  r.reduced(true); r.advance(500); assert.equal(current(r).pose.style.transform, 'none'); assert(r.C.inventory.rendered.size <= 13);
  assert.equal(current(r).el.getAttribute('id'), 'inventory-tile-' + r.C.inventory.center);
});
check('version comes from config, settings expose it on hover/focus, and no runtime dependencies were added', () => {
  const r = boot(); assert.equal(r.C.config.version, '1.0.0'); assert(r.document.body.querySelectorAll('.preferences-version').every(x => x.textContent === 'v1.0.0'));
  const css = fs.readFileSync('src/styles/polish.css', 'utf8'); assert(css.includes('.preferences-entry:hover .preferences-version'));
  const inventory = fs.readFileSync('src/ui/inventory.js', 'utf8'); assert(!inventory.includes('scrollLeft')); assert(!inventory.includes('requestAnimationFrame'));
  assert(!r.logs.some(x => x.level === 'error' || x.text.includes('FAIL')));
});
console.log('\n' + passed + ' N1–N6 behavior groups passed. Browser screenshots, paint/compositing and measured 60 FPS remain unconfirmed.');
