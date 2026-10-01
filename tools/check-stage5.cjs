'use strict';
// Real offline scripts with instrumented DOM, storage and clocks. No browser paint/FPS claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, html, scripts } = require('./check-stage1.cjs');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function setup(dev = false, save = null) {
  const r = runtime(dev, false, save);
  r.C.opening.wrapper.rect = { left: 550, top: 230, width: 180, height: 252 };
  r.window.fire('resize'); r.advance(40); return r;
}
function key(r, type, name, extra = {}) {
  const event = { key: name, code: name === ' ' ? 'Space' : name, target: r.document.activeElement, repeat: false,
    prevented: false, preventDefault() { this.prevented = true; }, ...extra };
  r.document.fire(type, event); return event;
}
function charge(r) { key(r, 'keydown', ' '); r.advance(3000); key(r, 'keyup', ' '); assert.equal(r.C.opening.phase, 'dissolving'); }
function cutting(r) { charge(r); r.advance(930); assert.equal(r.C.opening.phase, 'cutting'); }
function pointer(r, type, x, y, extra = {}) {
  const rect = r.C.opening.wrapper.getBoundingClientRect();
  r.document.fire(type, { target: r.C.opening.wrapper, pointerId: 7, pointerType: 'mouse', button: 0, isPrimary: true,
    clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y, preventDefault() {}, ...extra });
}
function finish(r) { key(r, 'keydown', 'Enter'); assert.equal(r.C.opening.phase, 'tearing'); key(r, 'keyup', 'Enter'); r.advance(1600); assert.equal(r.C.opening.phase, 'rising'); }
function stable(value) { return JSON.stringify(value); }

check('local classic-script order includes opening, shared markup and effects, with boot last', () => {
  assert(html.includes('src/styles/opening.css'));
  assert(scripts.indexOf('src/ui/pack-markup.js') < scripts.indexOf('src/ui/pack.js'));
  assert(scripts.indexOf('src/fx/cut-geometry.js') < scripts.indexOf('src/ui/opening.js'));
  assert.equal(scripts.at(-1), 'src/boot.js');
  const r = setup(); assert(r.C.opening.initialized); assert.equal(r.C.opening.phase, 'idle'); assert(r.C.opening.el.hidden);
  assert.equal(r.C.cardView.stats.fullCards, 0);
});
check('Space is linear, repeats are ignored, fluid/leak/keycap and hold ripples advance', () => {
  const r = setup(), C = r.C; let starts = 0;
  C.events.on('charge:start', () => starts++);
  assert(key(r, 'keydown', ' ').prevented); r.advance(1500);
  assert.equal(C.opening.phase, 'charging'); assert(Math.abs(C.opening.fill - 0.5) < 0.01);
  assert(C.opening.hint.classList.contains('is-held')); assert(C.dots.stats.ripples > 0);
  assert(Math.abs(Number(C.opening.glass.el.style['--charge-leak']) - 0.25) < 0.01);
  assert(r.pack.inert); assert(!C.menu.idle); assert.equal(C.state.current.packs.ready, 2);
  key(r, 'keydown', ' ', { repeat: true }); assert.equal(starts, 1);
  r.advance(800); assert(!C.opening.glass.pose.style.transform.startsWith('translate(0px,0px)'));
  key(r, 'keyup', ' '); r.advance(720); assert.equal(C.opening.phase, 'idle'); assert.equal(C.state.current.serialCounter, 0);
});
check('release at 2999ms drains from the current fill with slosh and preserves the pack', () => {
  const r = setup(), C = r.C; key(r, 'keydown', ' '); r.advance(2999); key(r, 'keyup', ' ');
  assert.equal(C.opening.phase, 'draining'); const fill = C.opening.fill;
  r.advance(200); assert(C.opening.fill > 0 && C.opening.fill < fill);
  assert.notEqual(C.opening.glass.el.style['--meniscus-wave'], '0px');
  r.advance(520); assert.equal(C.opening.phase, 'idle'); assert(!r.pack.inert);
  assert.equal(C.state.current.packs.ready, 2); assert.equal(C.state.current.pendingReveal, null); assert.equal(C.state.current.serialCounter, 0);
});
check('Esc cancels, suppresses held-key repeats, and permits a fresh charge after drain', () => {
  const r = setup(); key(r, 'keydown', ' '); r.advance(2000); assert(key(r, 'keydown', 'Escape').prevented);
  r.advance(720); assert.equal(r.C.opening.phase, 'idle');
  key(r, 'keydown', ' ', { repeat: true }); assert.equal(r.C.opening.phase, 'idle');
  key(r, 'keyup', ' '); key(r, 'keydown', ' '); assert.equal(r.C.opening.phase, 'charging');
});
check('blur and hidden cancellation never complete a charge; hidden drain waits for visible frames', () => {
  const a = setup(); key(a, 'keydown', ' '); a.advance(2700); a.window.fire('blur'); assert.equal(a.C.opening.phase, 'draining');
  a.advance(720); assert.equal(a.C.state.current.pendingReveal, null);
  const r = setup(); key(r, 'keydown', ' '); r.advance(2999); r.hidden(true);
  assert.equal(r.C.opening.phase, 'draining'); const updates = r.C.opening.stats.updates;
  r.advance(20000); assert.equal(r.C.opening.stats.updates, updates); assert.equal(r.C.state.current.packs.ready, 2);
  r.hidden(false); r.advance(200); assert.equal(r.C.opening.phase, 'draining');
  r.advance(520); assert.equal(r.C.opening.phase, 'idle'); assert.equal(r.C.state.current.pendingReveal, null);
});
check('waiting, editable, unrelated controls and gallery never begin charging', () => {
  const r = setup();
  for (const tag of ['input', 'select', 'textarea', 'button']) {
    const target = new r.Element(tag); key(r, 'keydown', ' ', { target }); assert.equal(r.C.opening.phase, 'idle');
  }
  const editable = new r.Element('div'); editable.isContentEditable = true;
  key(r, 'keydown', ' ', { target: editable }); assert.equal(r.C.opening.phase, 'idle');
  r.C.state.current.packs = { ready: 0, timerStartedAt: r.date() }; r.C.state.save();
  key(r, 'keydown', ' '); assert.equal(r.C.opening.phase, 'idle');
  const g = runtime(true, true); key(g, 'keydown', ' '); g.advance(3500); assert.equal(g.C.opening.phase, 'idle'); assert.equal(g.C.state.current.pendingReveal, null);
});
check('exact 3000ms key release commits once in a single complete storage write', () => {
  const r = setup(), C = r.C, old = C.state.current; const writes = [];
  const original = r.window.localStorage.setItem;
  r.window.localStorage.setItem = (name, value) => { writes.push(JSON.parse(value)); return original(name, value); };
  charge(r);
  assert.equal(writes.length, 1); assert.notEqual(C.state.current, old);
  const saved = writes[0]; assert.equal(saved.packs.ready, old.packs.ready - 1); assert.equal(saved.packs.timerStartedAt, old.packs.timerStartedAt == null ? r.date() : old.packs.timerStartedAt);
  assert.equal(saved.serialCounter, 1); assert.equal(saved.stats.packsOpened, 1); assert.equal(saved.inventory.length, 0);
  assert.equal(saved.pendingReveal.packId, C.data.packs.find(p => p.enabled && p.obtainable === 'timer').id);
  assert.equal(saved.pendingReveal.cards.length, 1); assert.match(saved.pendingReveal.cards[0].serial, /^CBL-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-\d{6,}$/);
  key(r, 'keydown', ' ', { repeat: true }); key(r, 'keyup', ' '); key(r, 'keydown', 'Escape'); r.advance(930);
  assert.equal(C.opening.stats.commits, 1); assert.equal(writes.length, 1);
});
check('failed durable save preserves stock, counter, statistics, forced tier and prior saved JSON', () => {
  const r = setup(true), C = r.C; const select = C.dev.panel.querySelector('select'); select.value = 'rare'; select.fire('change');
  const before = stable(C.state.current), saved = r.store.get('cardable.save');
  const original = r.window.localStorage.setItem; r.window.localStorage.setItem = () => { throw new Error('quota'); };
  key(r, 'keydown', ' ', { target: r.document.body }); r.advance(3000); key(r, 'keyup', ' ');
  assert.equal(C.opening.phase, 'draining'); assert.equal(stable(C.state.current), before); assert.equal(r.store.get('cardable.save'), saved);
  assert.equal(C.dev.peekForcedTier(), 'rare'); assert(C.opening.error.textContent.includes('pack is still here'));
  r.advance(720); r.window.localStorage.setItem = original; charge(r);
  assert.equal(C.dev.peekForcedTier(), null); assert.equal(C.card(C.state.current.pendingReveal.cards[0].cardId).rarity, 'rare');
  assert.equal(C.state.current.serialCounter, 1); assert.equal(C.state.current.stats.packsOpened, 1);
});
check('unavailable storage rejects the commit while ordinary saving retains its memory fallback', () => {
  const r = setup(); Object.defineProperty(r.window, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
  key(r, 'keydown', ' '); r.advance(3000); key(r, 'keyup', ' ');
  assert.equal(r.C.opening.phase, 'draining'); assert.equal(r.C.state.current.packs.ready, 2); assert.equal(r.C.state.current.pendingReveal, null);
  assert.doesNotThrow(() => r.C.state.save());
});
check('dissolve is bounded and hidden tabs pause visual phases without replaying elapsed time', () => {
  const r = setup(); charge(r); r.advance(300); const opacity = r.C.opening.glass.el.style.opacity;
  assert(r.C.opening.stats.particles > 0 && r.C.opening.stats.particles <= r.C.config.openingMotion.dissolveCount);
  r.hidden(true); const updates = r.C.opening.stats.updates; r.advance(20000);
  assert.equal(r.C.opening.stats.updates, updates); assert.equal(r.C.opening.glass.el.style.opacity, opacity);
  r.hidden(false); r.advance(200); assert.equal(r.C.opening.phase, 'dissolving');
  r.advance(500); assert.equal(r.C.opening.phase, 'cutting'); assert.equal(r.C.cardView.stats.fullCards, 0);
});
check('reload restores the same instances at Keep without another pull', () => {
  const r = setup(); charge(r); const snapshot = JSON.parse(r.store.get('cardable.save'));
  const restored = setup(false, snapshot); assert.equal(restored.C.opening.phase, 'revealed'); assert(!restored.C.opening.keepButton.hidden);
  assert.equal(stable(restored.C.state.current.pendingReveal), stable(snapshot.pendingReveal));
  assert.equal(restored.C.state.current.packs.ready, 1); assert.equal(restored.C.state.current.serialCounter, 1); assert.equal(restored.C.opening.stats.commits, 0);
});
check('pointer must press; partial seams persist and resume only near either endpoint', () => {
  const r = setup(); cutting(r); pointer(r, 'pointermove', 0.4, 0.5); assert.equal(r.C.opening.path.length, 0);
  pointer(r, 'pointerdown', 0.2, 0.5); assert(r.C.opening.wrapper.hasPointerCapture(7));
  pointer(r, 'pointermove', 0.55, 0.53); r.advance(20); assert(r.C.opening.path.length > 2); assert(r.C.opening.seam.getAttribute('d').includes('L'));
  pointer(r, 'pointerup', 0.55, 0.53); assert(!r.C.opening.wrapper.hasPointerCapture(7));
  const before = stable(r.C.opening.path), first = r.C.opening.path[0], last = r.C.opening.path.at(-1);
  pointer(r, 'pointerdown', 0.9, 0.1); pointer(r, 'pointermove', 0.95, 0.2); assert.equal(stable(r.C.opening.path), before);
  pointer(r, 'pointerdown', first.x, first.y); assert.equal(stable(r.C.opening.path[0]), stable(last));
  pointer(r, 'pointermove', 0.02, 0.49); pointer(r, 'pointerup', 0.02, 0.49);
  assert.equal(r.C.opening.phase, 'cutting'); assert(r.C.opening.path.at(-1).x < first.x);
});
check('hot seam fades over 300ms while the dark smoothed seam remains', () => {
  const r = setup(); cutting(r); pointer(r, 'pointerdown', 0.2, 0.5); pointer(r, 'pointermove', 0.5, 0.55); pointer(r, 'pointerup', 0.5, 0.55); r.advance(20);
  const svg = r.C.opening.seam.parent; assert(svg.querySelectorAll('.opening-cut-glint').length > 0);
  const dark = r.C.opening.seam.getAttribute('d'); r.advance(350);
  assert.equal(svg.querySelectorAll('.opening-cut-glint').length, 0); assert.equal(r.C.opening.seam.getAttribute('d'), dark);
});
check('horizontal wandering cut reaches 80% span, uses its path for polygons and tears exactly once', () => {
  const r = setup(); cutting(r); pointer(r, 'pointerdown', 0.04, 0.5);
  pointer(r, 'pointermove', 0.4, 0.55); pointer(r, 'pointermove', 0.65, 0.45); assert.equal(r.C.opening.phase, 'cutting');
  pointer(r, 'pointermove', 0.93, 0.53); assert.equal(r.C.opening.phase, 'tearing');
  assert.equal(r.C.opening.split.axis, 'x'); assert.equal(r.C.opening.split.path[0].x, 0); assert.equal(r.C.opening.split.path.at(-1).x, 1);
  assert(r.C.opening.halves.every(el => el.style.clipPath.startsWith('polygon('))); assert.notEqual(r.C.opening.halves[0].style.clipPath, r.C.opening.halves[1].style.clipPath);
  assert(!r.C.opening.wrapper.hasPointerCapture(7)); pointer(r, 'pointermove', 0.98, 0.55); assert.equal(r.C.opening.stats.tears, 1);
});
check('vertical cut splits left/right; repeated short travel cannot satisfy the span threshold', () => {
  const r = setup(); cutting(r); pointer(r, 'pointerdown', 0.5, 0.04); pointer(r, 'pointermove', 0.53, 0.9);
  assert.equal(r.C.opening.phase, 'tearing'); assert.equal(r.C.opening.split.axis, 'y');
  assert.equal(r.C.opening.split.path[0].y, 0); assert.equal(r.C.opening.split.path.at(-1).y, 1);
  const s = setup(); cutting(s); pointer(s, 'pointerdown', 0.4, 0.5);
  for (let i = 0; i < 30; i++) pointer(s, 'pointermove', i % 2 ? 0.4 : 0.6, i % 2 ? 0.5 : 0.55);
  assert.equal(s.C.opening.phase, 'cutting'); assert(s.C.cutGeometry.metrics(s.C.opening.path, 180, 252).span < 0.8);
});
check('loop removal produces a simple tear boundary without changing the recorded scratch path', () => {
  const r = setup(), g = r.C.cutGeometry;
  const raw = [{ x: .05, y: .5 }, { x: .3, y: .25 }, { x: .6, y: .65 }, { x: .3, y: .65 }, { x: .6, y: .25 }, { x: .9, y: .5 }];
  const before = stable(raw), simple = g.simple(raw), result = g.finish(raw, 180, 252);
  assert(simple.length < raw.length); assert.equal(stable(raw), before); assert.equal(result.halves.length, 2);
  assert(result.path.every(p => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
});
check('resize keeps normalized cuts and scales seam coordinates; the grid retains high-DPI sizing', () => {
  const r = setup(); cutting(r); pointer(r, 'pointerdown', 0.2, 0.5); pointer(r, 'pointermove', 0.5, 0.55); pointer(r, 'pointerup', 0.5, 0.55); r.advance(20);
  const before = stable(r.C.opening.path), old = r.C.opening.seam.getAttribute('d');
  r.C.opening.wrapper.rect = { left: 200, top: 100, width: 360, height: 504 }; r.window.devicePixelRatio = 2; r.window.fire('resize'); r.advance(20);
  assert.equal(stable(r.C.opening.path), before); assert.notEqual(r.C.opening.seam.getAttribute('d'), old); assert.equal(r.canvas.width, 2560);
});
check('blade has lag and native-cursor ownership clears on release, leave, blur and lost capture', () => {
  const r = setup(); cutting(r); pointer(r, 'pointerdown', .2, .5); pointer(r, 'pointermove', .4, .52); r.advance(20);
  const cursor = r.document.getElementById('cursor-glow'); assert(cursor.classList.contains('is-blade')); assert(r.C.opening.wrapper.classList.contains('has-blade'));
  pointer(r, 'pointermove', .6, .52); r.advance(20);
  const x = Number(cursor.style.transform.match(/translate3d\(([^p]+)/)[1]); assert(x < 550 + 180 * .6);
  r.window.fire('blur'); assert(!r.C.opening.wrapper.hasPointerCapture(7)); assert(!r.C.opening.wrapper.classList.contains('has-blade')); assert.equal(r.C.opening.phase, 'cutting');
  const last = r.C.opening.path.at(-1); pointer(r, 'pointerdown', last.x, last.y); r.C.opening.wrapper.capture = null; r.C.opening.wrapper.fire('lostpointercapture');
  assert(!r.C.opening.wrapper.classList.contains('has-blade'));
  r.C.opening.wrapper.fire('pointerenter'); r.C.opening.wrapper.fire('pointerleave'); assert(!cursor.classList.contains('is-blade'));
});
check('cut hint appears at 2s, Enter hint at 5s, and Enter immediately completes a partial path', () => {
  const r = setup(); cutting(r); assert.equal(r.C.opening.hint.style.opacity, 0); r.advance(2100); assert.equal(r.C.opening.hint.style.opacity, 1);
  assert.equal(r.C.opening.enterHint.style.opacity, 0); r.advance(3000); assert.equal(r.C.opening.enterHint.style.opacity, 1);
  pointer(r, 'pointerdown', .5, .3); pointer(r, 'pointermove', .52, .55); pointer(r, 'pointerup', .52, .55);
  const pending = stable(r.C.state.current.pendingReveal); finish(r); assert.equal(r.C.opening.split.axis, 'y'); assert.equal(stable(r.C.state.current.pendingReveal), pending);
  const s = setup(); cutting(s); assert(key(s, 'keydown', 'Enter').prevented); assert.equal(s.C.opening.phase, 'tearing'); assert.equal(s.C.opening.split.axis, 'x');
});
check('tear lifts, emits bounded fibers, falls away and hands the reserved result to rising', () => {
  const r = setup(); cutting(r); const pending = stable(r.C.state.current.pendingReveal); key(r, 'keydown', 'Enter'); key(r, 'keyup', 'Enter');
  r.advance(200); assert(r.C.opening.stats.particles > 0 && r.C.opening.stats.particles <= 32);
  assert(r.C.opening.halves.some(el => !el.style.transform.includes('translate3d(0px,0px')));
  r.advance(800); assert(r.C.opening.halves.every(el => Number(el.style.opacity) < 1));
  r.advance(600); assert.equal(r.C.opening.phase, 'rising'); assert(r.C.opening.halves.every(el => Number(el.style.opacity) === 0));
  assert.equal(r.C.opening.stats.particles, 0); assert.equal(stable(r.C.state.current.pendingReveal), pending); assert.equal(r.C.state.current.inventory.length, 0);
  key(r, 'keydown', ' '); r.advance(3500); key(r, 'keyup', ' '); assert.equal(r.C.opening.stats.commits, 1); assert.equal(r.C.cardView.stats.fullCards, 1);
  r.reduced(true); r.advance(10000); assert.equal(r.C.opening.phase, 'revealed');
  const frames = r.C.fx.stats.frameCount; r.advance(1000); assert.equal(r.C.fx.stats.frameCount, frames); assert(!r.C.fx.stats.running);
});
check('live reduced motion removes ripples/vibration/particles and uses direct blade positioning and tear fades', () => {
  const r = setup(); key(r, 'keydown', ' '); r.advance(2400); r.reduced(true); r.advance(20);
  assert.equal(r.C.dots.stats.ripples, 0); assert.equal(r.C.opening.glass.el.style['--meniscus-wave'], '0px'); assert.equal(r.C.opening.glass.pose.style.transform, 'translate(0px,0px)');
  r.advance(600); key(r, 'keyup', ' '); r.advance(930); assert.equal(r.C.opening.phase, 'cutting');
  pointer(r, 'pointermove', .5, .5); r.advance(20);
  assert(r.document.getElementById('cursor-glow').style.transform.startsWith('translate3d(640px,356px'));
  key(r, 'keydown', 'Enter'); r.advance(200); assert.equal(r.C.opening.stats.particles, 0);
  assert(r.C.opening.halves.every(el => el.style.transform === 'none' && Number(el.style.opacity) < 1));
  r.reduced(false); r.advance(1400); assert.equal(r.C.opening.phase, 'rising');
});
check('dev replay does not alter the committed result, and reset releases the terminal checkpoint', () => {
  const r = setup(true); cutting(r); finish(r); r.advance(10000); const before = stable(r.C.state.current);
  const button = r.C.dev.panel.querySelectorAll('button').find(el => el.textContent === 'Replay committed reveal'); assert(!button.disabled);
  r.click(70, 70, button); assert.equal(r.C.opening.phase, 'cutting'); assert.equal(stable(r.C.state.current), before); assert.equal(r.C.opening.path.length, 0);
  r.C.state.reset(); assert.equal(r.C.opening.phase, 'idle'); assert(!r.pack.inert); assert(!r.C.dev.panel.inert); assert.equal(r.C.state.current.pendingReveal, null);
  assert(r.C.opening.hint.style.opacity === 0); key(r, 'keydown', ' ', { target: r.document.body }); assert.equal(r.C.opening.hint.style.opacity, 1);
  assert(r.logs.some(line => line.text.includes('[Cardable opening] idle → charging')));
  assert(!r.logs.some(line => line.level === 'error')); assert(!r.logs.some(line => line.text.includes('FAIL')));
});
check('multiple cards use candidate serial allocation and one commit without changing pack data', () => {
  const r = setup(); const pack = r.C.data.packs.find(p => p.enabled && p.obtainable === 'timer'), count = pack.cardsPerPack;
  try {
    pack.cardsPerPack = 3; // Test fixture only; the source data stays unchanged.
    let writes = 0; const original = r.window.localStorage.setItem; r.window.localStorage.setItem = (name, value) => { writes++; original(name, value); };
    charge(r); assert.equal(writes, 1); const cards = r.C.state.current.pendingReveal.cards;
    assert.equal(cards.length, 3); assert.equal(new Set(cards.map(card => card.serial)).size, 3); assert.equal(r.C.state.current.serialCounter, 3); assert.equal(r.C.state.current.packs.ready, 1);
  } finally { pack.cardsPerPack = count; }
});
check('forced Common and Secret use the real catalog and retain the configured empty-tier downgrade', () => {
  for (const tierId of ['common', 'secret']) {
    const r = setup(true), C = r.C, select = C.dev.panel.querySelector('select'); select.value = tierId; select.fire('change');
    charge(r); const instance = C.state.current.pendingReveal.cards[0], rarity = C.card(instance.cardId).rarity;
    const tiers = C.data.rarities, index = tiers.findIndex(tier => tier.id === tierId);
    const expected = tiers.slice(0, index + 1).reverse().find(tier => tier.pullable && C.data.cards.some(card => card.rarity === tier.id && card.pullable !== false));
    assert.equal(rarity, expected.id); assert.equal(C.dev.peekForcedTier(), null); assert.equal(C.opening.stats.commits, 1);
    assert.equal(C.cardView.stats.fullCards, 0);
  }
});
check('stationary cutting sleeps after hints settle; hidden tearing pauses and resumes without reroll', () => {
  const r = setup(); cutting(r); r.advance(5200); const frames = r.C.fx.stats.frameCount; r.advance(500);
  assert.equal(r.C.fx.stats.frameCount, frames); assert(!r.C.fx.stats.running);
  key(r, 'keydown', 'Enter'); r.advance(300); r.hidden(true);
  const transform = r.C.opening.halves[0].style.transform, pending = stable(r.C.state.current.pendingReveal);
  r.advance(50000); assert.equal(r.C.opening.halves[0].style.transform, transform); assert.equal(r.C.opening.phase, 'tearing');
  r.hidden(false); r.advance(200); assert.equal(r.C.opening.phase, 'tearing'); r.advance(1200);
  assert.equal(r.C.opening.phase, 'rising'); assert.equal(stable(r.C.state.current.pendingReveal), pending);
  assert.equal(r.C.opening.wrapper.getAttribute('tabindex'), '-1');
});
check('shared scheduler is the only animation loop and market/audio remain absent', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/opening.js'), 'utf8');
  assert(!source.includes('requestAnimationFrame(')); assert(!source.includes('setInterval(')); assert(source.includes('card:revealed')); assert(source.includes('card:kept'));
  const r = setup(); assert.equal(r.C.config.flags.market, false); assert.equal(r.C.config.flags.audio, false); assert.equal(r.C.config.flags.variants, false);
});
console.log('\n' + passed + ' Stage 5 behavior groups passed. Browser appearance, screenshots and measured FPS remain unverified.');
