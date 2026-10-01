'use strict';
// Real classic scripts in the instrumented DOM. These checks do not certify browser paint.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runtime } = require('./check-stage1.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
let passed = 0;
function check(name, fn) { try { fn(); passed++; console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name); throw error; } }
function quiet(r) { r.C.packView.setVisible(false); r.C.inventoryHint.setVisible(false); r.advance(600); return r; }
function pending(count = 1) {
  const base = runtime(), state = clone(base.C.state.current); state.tutorial = { done: true, step: 'done' }; state.serialCounter = count;
  state.pendingReveal = { packId: 'standard', committedAt: 1, keptCount: 0, cards: Array.from({ length: count }, (_, i) => ({
    instanceId: 'fix-' + i, cardId: base.C.data.cards[1].id, serial: base.C.serial.format(state.playerCode, i + 1), pulledAt: 1, seen: false
  })) };
  const r = runtime(true, false, state); r.advance(600); return r;
}
function keep(r) { r.click(640, 650, r.C.opening.keepButton); }
function key(r, type, name) { r.document.fire(type, { key: name, code: name === ' ' ? 'Space' : name, repeat: false, target: r.document.body, preventDefault() {} }); }
function groups(r) { return r.wordmark.querySelector('svg').children.find(el => el.tagName === 'g').children; }

check('F1 Keep fades/scales the entire ten-layer root, then hides it at thumbnail handoff', () => {
  const r = pending(), view = r.C.opening.view, before = clone(r.C.state.current.pendingReveal.cards); keep(r);
  assert.equal(r.C.opening.phase, 'collecting'); assert.equal(view.mode, 'lite'); assert.equal(view.visible, false); assert(view.el.inert);
  r.advance(80); assert(Number(view.el.style.opacity) > 0 && Number(view.el.style.opacity) < 1); assert(view.el.style.transform.startsWith('scale(')); assert.equal(r.C.opening.toast.style.visibility, 'hidden');
  r.advance(100); assert.equal(view.el.style.opacity, 0); assert.equal(view.el.style.visibility, 'hidden'); assert.equal(r.C.opening.toast.style.visibility, 'visible');
  assert.deepEqual(clone(r.C.state.current.inventory), before); assert.equal(r.C.opening.stats.keeps, 1);
});
check('F1 toast and flying thumbnails are permanently lite, art-only, clipped and not focusable', () => {
  const r = pending(); keep(r);
  const thumbs = r.document.body.querySelectorAll('.collectible-card').filter(el => el.dataset.thumbnail === 'true');
  assert.equal(thumbs.length, 2); assert.equal(r.C.cardView.stats.fullCards, 0);
  for (const el of thumbs) {
    assert.equal(el.dataset.mode, 'lite'); assert.equal(el.getAttribute('tabindex'), '-1');
    assert.equal(el.querySelectorAll('.card__name, .card__generation, .card__vram, .card__spec, .card__serial-char').length, 0);
  }
  assert.equal(r.C.opening.toast.children.length, 2); assert.equal(r.C.opening.toast.querySelectorAll('.collection-toast-detail')[0].textContent, 'Added to inventory');
  const css = fs.readFileSync('src/styles/opening.css', 'utf8'), cardCss = fs.readFileSync('src/styles/card.css', 'utf8');
  assert(css.includes('aspect-ratio: 5 / 7; overflow: hidden; border-radius: var(--thumbnail-radius)'));
  assert(cardCss.includes('[data-thumbnail="true"] .card__art-window { inset: 1px;'));
  assert(cardCss.includes('[data-thumbnail="true"] .card__edge { outline: none; border: 1px solid var(--keyline)'));
});
check('F2 toast surface and slots are mounted at boot, hide by visibility, and never animate blur opacity', () => {
  const r = pending(), toast = r.C.opening.toast, thumb = toast.children[0];
  assert(toast.hidden); assert.equal(toast.style.visibility, 'hidden'); assert(toast.style.transform.includes('100vh')); assert.equal(toast.children.length, 2);
  keep(r); assert.equal(toast.children[0], thumb); assert.equal(toast.style.visibility, 'hidden'); assert.equal(toast.style.opacity, undefined);
  assert.equal(toast.style.willChange, ''); r.advance(180); assert.equal(toast.style.willChange, 'transform'); r.advance(170); assert.equal(toast.style.visibility, 'visible'); assert.equal(toast.style.willChange, ''); assert.equal(toast.style.opacity, undefined);
  r.advance(2100); assert.equal(toast.style.willChange, 'transform'); r.advance(150); assert(toast.hidden); assert.equal(toast.style.willChange, '');
  assert.equal(toast.children[0], thumb);
});
check('F1/F2 multi-card collection preserves one toast and thumbnail ownership through reset/reuse', () => {
  const r = pending(2); keep(r); assert.equal(r.C.state.current.pendingReveal.keptCount, 1);
  r.advance(10000); keep(r); assert.equal(r.C.opening.phase, 'collecting');
  assert.equal(r.C.opening.toast.querySelectorAll('.collection-toast-name')[0].textContent, '2 cards');
  assert.equal(r.C.opening.el.querySelectorAll('.collection-flight').length, 2);
  r.C.state.reset(); assert.equal(r.C.opening.toast.style.visibility, 'hidden'); assert.equal(r.C.opening.toast.querySelectorAll('.collectible-card').length, 0);
});
check('F3 click settings match all requested defaults and cap queued/active rings at three', () => {
  const r = quiet(runtime()), cfg = r.C.config.dots.ripple;
  assert.deepEqual(clone(cfg), { speed: 320, lifeMs: 1100, peakAlpha: 0.28, ringWidth: 24, maxRadius: 240, secondRingScale: 0.30, secondDelayMs: 200, maxSimultaneous: 3 });
  for (let i = 0; i < 30; i++) r.click(13 + i * 26, 507);
  r.advance(100); assert.equal(r.C.dots.stats.ripples, 3); assert(r.drawing.arcs.every(dot => dot.alpha <= cfg.peakAlpha));
  assert(r.drawing.arcs.every(dot => dot.x > 13 + 25 * 26));
  r.advance(1500); assert.equal(r.C.dots.stats.ripples, 0); assert.equal(r.drawing.arcs.length, 0);
});
check('F3 ring grows at 320 px/s, has soft 24px edges, 200ms echo and never exceeds 240px', () => {
  const r = quiet(runtime()); r.click(793, 507); r.advance(100);
  assert.equal(r.C.dots.stats.rings, 1);
  for (const dot of r.drawing.arcs) assert(Math.abs(Math.hypot(dot.x - 793, dot.y - 507) - 32) <= 18);
  r.advance(140); assert.equal(r.C.dots.stats.rings, 2);
  r.advance(650); assert(r.drawing.arcs.length); assert(r.drawing.arcs.every(dot => Math.hypot(dot.x - 793, dot.y - 507) <= 252));
  r.advance(450); assert.equal(r.C.dots.stats.ripples, 0); const draws = r.C.dots.stats.draws; r.advance(500); assert.equal(r.C.dots.stats.draws, draws);
});
check('F4 charging fades the frozen cursor layer in 200ms, ignores moves/clicks, and retains pack pulses only', () => {
  const r = quiet(runtime()); r.move(1040, 100); r.advance(60); assert(r.drawing.arcs.length);
  r.C.events.emit('opening:context', { phase: 'charging', active: true }); r.advance(100); assert(r.C.dots.stats.cursorGain > 0 && r.C.dots.stats.cursorGain < 1);
  r.move(50, 50); r.click(50, 50); r.advance(120); assert.equal(r.C.dots.stats.cursorGain, 0); assert.equal(r.C.dots.stats.clickRipples, 0); assert.equal(r.C.dots.stats.trailCells, 0); assert.equal(r.drawing.arcs.length, 0);
  r.C.events.emit('dots:pulse', { x: 640, y: 360, intensity: .65 }); r.advance(100);
  assert.equal(r.C.dots.stats.pulseRipples, 1); assert(r.drawing.arcs.every(dot => Math.hypot(dot.x - 640, dot.y - 360) < 110));
});
check('F4 draining/dissolving stay suppressed and cutting restores cursor dots over 300ms', () => {
  const r = quiet(runtime()); r.move(1000, 100); r.advance(20);
  for (const phase of ['charging', 'draining', 'dissolving']) { r.C.events.emit('opening:context', { phase, active: true }); r.advance(220); r.move(1040, 100); r.advance(20); assert.equal(r.C.dots.stats.cursorGain, 0); }
  r.C.events.emit('opening:context', { phase: 'cutting', active: true }); r.advance(150); assert(r.C.dots.stats.cursorGain > 0 && r.C.dots.stats.cursorGain < 1);
  r.advance(180); assert.equal(r.C.dots.stats.cursorGain, 1); assert(r.drawing.arcs.length); const draws = r.C.dots.stats.draws; r.advance(500); assert.equal(r.C.dots.stats.draws, draws);
});
check('F4 actual early release and successful charge restore dots without duplicate layers', () => {
  const r = runtime(); r.move(1100, 100); key(r, 'keydown', ' '); r.advance(800); assert.equal(r.C.dots.stats.cursorGain, 0);
  key(r, 'keyup', ' '); assert.equal(r.C.opening.phase, 'draining'); r.advance(1100); assert.equal(r.C.opening.phase, 'idle'); assert.equal(r.C.dots.stats.cursorGain, 1);
  key(r, 'keydown', ' '); r.advance(3020); assert.equal(r.C.opening.phase, 'dissolving'); assert.equal(r.C.dots.stats.cursorGain, 0);
  key(r, 'keyup', ' '); r.advance(1250); assert.equal(r.C.opening.phase, 'cutting'); assert.equal(r.C.dots.stats.cursorGain, 1);
});
check('F5 fixed slots measure all safe pool glyphs, center identical-weight text and never squeeze', () => {
  const r = quiet(runtime()), svg = r.wordmark.querySelector('svg'), width = svg.getAttribute('width');
  assert.equal(groups(r).length, 8);
  for (const group of groups(r)) for (const text of group.children[0].children) { assert.equal(text.getAttribute('textLength'), null); assert.equal(text.getAttribute('text-anchor'), 'middle'); }
  assert.equal(svg.style.fontWeight, '600'); assert.equal(svg.style.fontSize, '40px');
  assert(Object.values(r.C.config.logo.pool).flat().every(glyph => !['∂', '®'].includes(glyph)));
  r.wordmark.fire('pointerenter'); for (let i = 0; i < 80; i++) { r.move(40, 40); r.advance(50); assert.equal(svg.getAttribute('width'), width); assert(r.C.logo.stats.swapping <= 2); assert(r.C.logo.stats.changed <= 4); }
});
check('F5 swaps are irregular, slide/fade/blur only and settle in random batches within 700ms', () => {
  const r = quiet(runtime()); r.wordmark.fire('pointerenter'); let animated = false;
  for (let i = 0; i < 70; i++) {
    r.move(40, 40); r.advance(50);
    for (const group of groups(r)) for (const text of group.children[0].children) {
      assert(!String(text.style.transform).includes('scale'));
      if (Number(text.style.opacity) > 0 && Number(text.style.opacity) < 1) animated = true;
    }
  }
  assert(animated); assert(r.C.logo.stats.swaps > 4);
  r.wordmark.fire('pointerleave'); for (let i = 0; i < 14; i++) { r.advance(50); assert(r.C.logo.stats.swapping <= 2); }
  assert.equal(r.C.logo.stats.active, false); assert.equal(groups(r).map(group => group.children[0].children[0].textContent).join(''), 'cardable');
});
check('F5 idle scramble uses a single slot, no automatic reveal; reduced motion resets all glyphs', () => {
  const r = quiet(runtime()); r.C.menu.holdVisible('check', true); r.C.events.emit('logo:wave');
  const bound = 2 * r.C.config.logo.swapMaxMs + r.C.config.logo.holdMaxMs + 4 * r.C.config.shell.frameMs;
  for (let i = 0; i < Math.ceil(bound / 50); i++) { r.advance(50); assert(r.C.logo.stats.swapping <= 1); }
  assert.equal(r.C.logo.stats.active, false); r.wordmark.fire('pointerenter'); r.advance(500); r.reduced(true); r.advance(20);
  assert.equal(r.C.logo.stats.active, false); assert.equal(groups(r).map(group => group.children[0].children[0].textContent).join(''), 'cardable');
});
check('F6 every visible pack component shares one pose, with SVG seals and an external grounded shadow', () => {
  const r = runtime(), front = r.C.packView.front, back = r.C.packView.back;
  assert.equal(front.shadow.parentElement, front.el); assert(!front.pose.contains(front.shadow));
  for (const item of [front, back]) for (const part of item.el.querySelectorAll('.pack-brand, .pack-label, .pack-wrapper, .pack-shine, .pack-sweep, .pack-reflection')) assert(item.pose.contains(part));
  assert.equal(front.el.querySelectorAll('.pack-crimp').length, 2); assert(front.el.querySelectorAll('.pack-crimp').every(el => el.tagName === 'svg' && el.children[0].getAttribute('d').includes('V11')));
  assert.equal(front.el.querySelectorAll('.pack-brand')[0].tagName, 'svg'); assert.equal(front.el.querySelectorAll('.pack-label')[0].textContent, 'Standard Pack');
  assert.equal(r.C.config.shell.packHeight / r.C.config.shell.packWidth, 7.4 / 5);
  assert.equal(front.glass.style.transform, undefined);
});
check('F6 float stays aligned at both extrema, shadow breathes oppositely, rear phase differs, spring caps at 8deg', () => {
  const r = runtime(), front = r.C.packView.front, back = r.C.packView.back;
  r.advance(1500); const high = front.pose.style.transform, highShadow = Number(front.shadow.style.opacity), highScale = Number(front.shadow.style.transform.match(/scale\(([^)]+)/)[1]);
  r.advance(3000); assert.notEqual(front.pose.style.transform, high); assert(Number(front.shadow.style.opacity) > highShadow); assert(Number(front.shadow.style.transform.match(/scale\(([^)]+)/)[1]) > highScale);
  assert.notEqual(front.pose.style.transform, back.pose.style.transform); assert.equal(back.el.style.opacity, .45);
  r.move(1280, 0); r.advance(20); const first = Number(front.pose.style.transform.match(/rotateY\(([^d]+)/)[1]); assert(first > 0 && first < 8);
  for (let i = 0; i < 40; i++) { r.advance(20); for (const angle of front.pose.style.transform.matchAll(/rotate[XY]\(([^d]+)/g)) assert(Math.abs(Number(angle[1])) <= 8); }
  assert.equal(front.glass.style.transform, undefined); assert(front.el.style['--pack-sweep-x']); assert(front.el.style['--pack-sweep-opacity']);
});
check('F1–F6 live reduced motion and hidden tabs stop presentation and retain durable state', () => {
  const r = pending(), state = clone(r.C.state.current); r.reduced(true); keep(r); r.advance(200);
  assert.equal(r.C.opening.toast.style.transform, 'translateX(-50%)'); assert.equal(r.C.opening.toast.style.clipPath, 'none'); assert.equal(r.C.opening.toast.style.willChange, '');
  const clip = r.C.opening.toast.style.clipPath; r.hidden(true); r.advance(4000); assert.equal(r.C.opening.toast.style.clipPath, clip); assert.equal(r.C.opening.phase, 'collecting');
  r.hidden(false); r.advance(1200); assert.equal(r.C.opening.phase, 'idle'); assert.equal(r.C.state.current.inventory[0].serial, state.pendingReveal.cards[0].serial);
  assert(r.C.packView.front.pose.style.transform.includes('translateY(0px)')); r.click(100, 100); r.advance(50); assert.equal(r.C.dots.stats.ripples, 0);
  assert(!r.logs.some(log => log.level === 'error' || log.text.includes('FAIL')));
});
console.log('\n' + passed + ' F1–F6 checks passed. Screenshots, first-frame glass compositing and browser FPS remain unconfirmed.');
