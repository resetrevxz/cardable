'use strict';
// Real classic scripts and real saves/pulls in the instrumented DOM; no paint/FPS claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, scripts } = require('./check-stage1.cjs');
let passed = 0;
function check(name, fn) { try { fn(); passed++; console.log('PASS ' + name); } catch (e) { console.error('FAIL ' + name); throw e; } }
const clone = value => JSON.parse(JSON.stringify(value));
const fresh = (dev = false, save = null) => runtime(dev, false, save, true);
function key(r, type, name, extra = {}) { const e = { key: name, code: name === ' ' ? 'Space' : name, target: r.document.activeElement, repeat: false, preventDefault() {}, ...extra }; r.document.fire(type, e); }
function tap(r, name) { key(r, 'keydown', name); key(r, 'keyup', name); }
function until(r, phase, limit = 20000) { for (let t = 0; r.C.opening.phase !== phase && t < limit; t += 20) r.advance(20); assert.equal(r.C.opening.phase, phase); }
function charge(r) { key(r, 'keydown', ' ', { target: r.document.body }); r.advance(3020); key(r, 'keyup', ' '); until(r, 'cutting'); }
function ready(r) { tap(r, 'Enter'); until(r, 'revealed'); for (let t = 0; r.C.opening.keepButton.hidden && t < 5000; t += 20) r.advance(20); assert(!r.C.opening.keepButton.hidden); }
function keep(r) { r.click(640, 650, r.C.opening.keepButton); }
function stepSave(step, done = false) { const r = runtime(); const s = clone(r.C.state.current); s.tutorial = { step, done }; return s; }

check('fresh save retains two real packs, exact welcome copy, one instruction and accessible Skip', () => {
  const r = fresh(); r.advance(40);
  assert.equal(r.C.state.current.packs.ready, 2); assert.equal(r.C.tutorial.step, 'welcome');
  assert.equal(r.C.tutorial.instruction.textContent, 'You have 2 packs.');
  assert.equal(r.C.tutorial.skipButton.getAttribute('aria-label'), 'Skip tutorial');
  assert.equal(r.C.tutorial.instruction.getAttribute('aria-live'), 'polite');
  assert.equal(r.document.body.querySelectorAll('.tutorial-instruction').length, 1);
  assert(!r.pack.inert); assert(!r.C.menu.idle);
});
check('welcome advances on pack hover or after 2.5 visible seconds', () => {
  const a = fresh(); a.pack.fire('pointerenter'); assert.equal(a.C.tutorial.step, 'hold');
  const b = fresh(); b.advance(2480); assert.equal(b.C.tutorial.step, 'welcome'); b.advance(40); assert.equal(b.C.tutorial.step, 'hold');
  assert.equal(b.C.tutorial.instruction.textContent, 'Hold Space to open.');
});
check('welcome clock pauses while hidden and resumes without a time jump', () => {
  const r = fresh(); r.advance(1200); r.hidden(true); const frames = r.C.fx.stats.frameCount;
  r.advance(10000); assert.equal(r.C.tutorial.step, 'welcome'); assert.equal(r.C.fx.stats.frameCount, frames);
  r.hidden(false); r.advance(1000); assert.equal(r.C.tutorial.step, 'welcome'); r.advance(400); assert.equal(r.C.tutorial.step, 'hold');
});
check('early release and blur keep the hold lesson and preserve stock', () => {
  for (const reason of ['release', 'blur', 'hidden']) {
    const r = fresh(); key(r, 'keydown', ' ', { target: r.document.body }); r.advance(1200);
    if (reason === 'release') key(r, 'keyup', ' '); else if (reason === 'blur') r.window.fire('blur'); else r.hidden(true);
    assert.equal(r.C.opening.phase, 'draining'); assert.equal(r.C.tutorial.step, 'hold'); assert.equal(r.C.state.current.packs.ready, 2);
    if (reason === 'hidden') r.hidden(false); r.advance(750); assert.equal(r.C.opening.phase, 'idle'); assert.equal(r.C.state.current.pendingReveal, null);
  }
});
check('real three-second charge saves the cut milestone in the one durable pull write', () => {
  const r = fresh(); r.pack.fire('pointerenter'); let writes = 0;
  const original = r.window.localStorage.setItem; r.window.localStorage.setItem = (k, v) => { writes++; original(k, v); };
  key(r, 'keydown', ' ', { target: r.document.body }); r.advance(2990); assert.equal(r.C.tutorial.step, 'hold');
  r.advance(30); key(r, 'keyup', ' '); assert.equal(writes, 1); assert.equal(r.C.tutorial.step, 'cut');
  const saved = JSON.parse(r.store.get('cardable.save')); assert.equal(saved.tutorial.step, 'cut');
  assert.equal(saved.packs.ready, 1); assert.equal(saved.stats.packsOpened, 1); assert.equal(saved.serialCounter, 1);
  assert.equal(saved.pendingReveal.cards.length, 1); assert.equal(saved.inventory.length, 0);
});
check('failed pull commit cannot advance tutorial or consume packs', () => {
  const r = fresh(); r.pack.fire('pointerenter'); const before = clone(r.C.state.current);
  r.window.localStorage.setItem = () => { throw Error('quota'); };
  key(r, 'keydown', ' ', { target: r.document.body }); r.advance(3020); key(r, 'keyup', ' ');
  assert.equal(r.C.opening.phase, 'draining'); assert.deepEqual(clone(r.C.state.current), before); assert.equal(r.C.tutorial.step, 'hold');
});
check('ghost shares the cut hint, loops every three seconds, and never writes a seam', () => {
  const r = fresh(); charge(r); r.advance(50);
  const hint = r.document.body.querySelectorAll('.opening-cut-hint')[0];
  assert.equal(hint.dataset.tutorial, 'cut'); assert.equal(r.C.tutorial.instruction.textContent, 'Drag across the top to cut.');
  assert.equal(r.C.tutorial.ghost.parent.parent, hint); assert.equal(r.C.opening.path.length, 0);
  r.advance(3100); assert(r.C.tutorial.stats.ghostCycles >= 1); assert.equal(r.C.opening.path.length, 0);
  r.advance(2050); assert.equal(r.C.opening.enterHint.textContent, 'Press Enter to tear'); assert.equal(Number(r.C.opening.enterHint.style.opacity), 1);
});
check('ghost stops at a valid cut press and stays stopped after release', () => {
  const r = fresh(); charge(r); const host = r.C.opening.wrapper; host.rect = { left: 500, top: 240, width: 180, height: 252 };
  r.document.fire('pointerdown', { target: host, clientX: 900, clientY: 350, pointerId: 1, button: 0, preventDefault() {} });
  const hint = r.document.body.querySelectorAll('.opening-cut-hint')[0]; assert(!hint.classList.contains('is-cut-started'));
  r.document.fire('pointerdown', { target: host, clientX: 510, clientY: host.rect.top + host.rect.height * r.C.config.cut.guideY, pointerId: 1, button: 0, preventDefault() {} });
  assert(hint.classList.contains('is-cut-started')); r.advance(40); const offset = r.C.tutorial.ghost.style.strokeDashoffset;
  r.document.fire('pointerup', { pointerId: 1 }); r.advance(3500); assert.equal(r.C.tutorial.ghost.style.strokeDashoffset, offset);
});
check('cut lesson advances only when the tear finishes; Keep instruction waits for the real button', () => {
  const r = fresh(); charge(r); tap(r, 'Enter'); assert.equal(r.C.tutorial.step, 'cut'); r.advance(1000); assert.equal(r.C.tutorial.step, 'cut');
  until(r, 'rising'); assert.equal(r.C.tutorial.step, 'keep'); assert.equal(r.document.body.dataset.tutorial, '');
  until(r, 'revealed'); for (let t = 0; r.C.opening.keepButton.hidden && t < 5000; t += 20) r.advance(20);
  r.advance(40); assert.equal(r.document.body.dataset.tutorial, 'keep'); assert.equal(r.C.tutorial.instruction.textContent, 'Press Space to keep it.');
  assert(r.C.opening.keepButton.classList.contains('is-tutorial-target'));
});
check('full fresh walkthrough uses one real pack and pull, then inventory, timer and done', () => {
  const r = fresh(); charge(r); ready(r); const instance = clone(r.C.state.current.pendingReveal.cards[0]);
  let writes = 0; const original = r.window.localStorage.setItem; r.window.localStorage.setItem = (k, v) => { writes++; original(k, v); };
  keep(r); assert.equal(writes, 1); assert.equal(r.C.tutorial.step, 'inventory');
  assert.deepEqual(clone(r.C.state.current.inventory[0]), instance); assert.equal(r.C.state.current.packs.ready, 1);
  r.advance(r.C.config.revealMotion.collectionHandoffMs + r.C.config.revealMotion.toastMs + 100); assert.equal(r.document.body.dataset.tutorial, 'inventory'); assert.equal(r.C.tutorial.instruction.textContent, 'Your cards live here.');
  r.advance(6050); assert.equal(r.C.tutorial.step, 'timer'); assert.equal(r.C.tutorial.instruction.textContent, 'A new pack arrives every ' + (r.C.config.packs.regenMs / 3600000) + ' hours.');
  r.advance(4100); assert.equal(r.C.tutorial.step, 'done'); assert.equal(r.C.state.current.tutorial.done, true);
  assert.equal(r.C.state.current.stats.packsOpened, 1); assert.equal(r.C.state.current.serialCounter, 1); assert.equal(r.C.opening.stats.collections, 1);
  assert(!r.document.body.classList.contains('has-tutorial')); r.advance(300); assert(r.C.tutorial.el.hidden);
  assert(!r.logs.some(x => x.level === 'error' || x.text.includes('FAIL')));
});
check('Skip before charge changes only tutorial and fades the guidance away', () => {
  const r = fresh(); r.advance(100); const before = clone(r.C.state.current); r.click(1200, 40, r.C.tutorial.skipButton);
  const after = clone(r.C.state.current); after.tutorial = before.tutorial; assert.deepEqual(after, before);
  assert(!r.C.tutorial.active); assert(!r.C.tutorial.el.hidden); r.advance(300); assert(r.C.tutorial.el.hidden);
  assert.equal(r.document.body.dataset.tutorial, ''); assert(!r.pack.classList.contains('is-tutorial-target'));
});
check('Esc skips and cancels an uncommitted charge, without consuming a pack', () => {
  const r = fresh(); key(r, 'keydown', ' ', { target: r.document.body }); r.advance(1000); tap(r, 'Escape');
  assert.equal(r.C.opening.phase, 'draining'); assert(r.C.state.current.tutorial.done); assert.equal(r.C.state.current.packs.ready, 2);
  r.advance(750); assert.equal(r.C.opening.phase, 'idle'); assert.equal(r.C.state.current.pendingReveal, null);
});
check('clicking Skip during charge removes only guidance; a continued hold still opens the real pack', () => {
  const r = fresh(); key(r, 'keydown', ' ', { target: r.document.body }); r.advance(1000); r.click(1200, 40, r.C.tutorial.skipButton);
  assert.equal(r.C.opening.phase, 'charging'); assert(r.C.state.current.tutorial.done);
  r.advance(2020); key(r, 'keyup', ' '); assert.equal(r.C.state.current.packs.ready, 1); assert(r.C.state.current.pendingReveal);
  assert(r.C.state.current.tutorial.done);
});
check('Skip after commit preserves pending result, stock and normal cut fallback', () => {
  const r = fresh(); charge(r); const before = clone(r.C.state.current); tap(r, 'Escape');
  assert.equal(r.C.opening.phase, 'cutting'); const after = clone(r.C.state.current); after.tutorial = before.tutorial; assert.deepEqual(after, before);
  assert.equal(r.document.body.querySelectorAll('.opening-cut-hint')[0].dataset.tutorial, ''); assert.equal(r.C.opening.enterHint.textContent, 'Enter to tear');
  ready(r); keep(r); assert.equal(r.C.state.current.inventory.length, 1); assert(r.C.state.current.tutorial.done);
});
check('reload resumes noncommitted lessons at the saved step and never shows completed guidance', () => {
  for (const step of ['welcome', 'hold', 'inventory', 'timer']) {
    const r = fresh(false, stepSave(step)); r.advance(40); assert.equal(r.C.tutorial.step, step);
    assert.equal(r.C.state.current.tutorial.step, step); assert.equal(r.C.state.current.packs.ready, 2);
  }
  const r = fresh(false, stepSave('done', true)); r.advance(40); assert(!r.C.tutorial.active); assert.equal(r.document.body.querySelectorAll('.tutorial').length, 1); assert(r.C.tutorial.el.hidden);
});
check('reload restores the saved cut or Keep lesson with identical result and no new pull', () => {
  const r = fresh(); charge(r); const snapshot = clone(r.C.state.current);
  for (const step of ['hold', 'cut', 'keep']) {
    const saved = clone(snapshot); saved.tutorial.step = step; const resumed = fresh(false, saved); resumed.advance(40);
    assert.equal(resumed.C.tutorial.step, step === 'cut' ? 'cut' : 'keep'); assert.equal(resumed.C.opening.phase, step === 'cut' ? 'cutting' : 'revealed');
    if (step !== 'cut') assert(!resumed.C.opening.keepButton.hidden);
    assert.deepEqual(clone(resumed.C.state.current.pendingReveal), snapshot.pendingReveal);
    assert.equal(resumed.C.opening.stats.commits, 0); assert.equal(resumed.C.state.current.serialCounter, 1); assert.equal(resumed.C.state.current.packs.ready, 1);
  }
});
check('failed Keep leaves tutorial at Keep; retry atomically saves inventory milestone', () => {
  const r = fresh(); charge(r); ready(r); const before = clone(r.C.state.current), original = r.window.localStorage.setItem;
  r.window.localStorage.setItem = () => { throw Error('quota'); }; keep(r); assert.deepEqual(clone(r.C.state.current), before); assert.equal(r.C.tutorial.step, 'keep');
  r.window.localStorage.setItem = original; keep(r); assert.equal(r.C.tutorial.step, 'inventory');
  const saved = JSON.parse(r.store.get('cardable.save')); assert.equal(saved.tutorial.step, 'inventory'); assert.equal(saved.pendingReveal, null);
});
check('multi-card packs retain Keep guidance until final collection and recover partial progress', () => {
  const r = fresh(); r.C.data.packs.find(p => p.enabled && p.obtainable === 'timer').cardsPerPack = 2; charge(r); ready(r); keep(r);
  assert.equal(r.C.tutorial.step, 'keep'); assert.equal(r.C.state.current.pendingReveal.keptCount, 1); assert.equal(r.C.state.current.inventory.length, 0);
  const resumed = fresh(false, clone(r.C.state.current)); assert.equal(resumed.C.opening.cardIndex, 1); assert.equal(resumed.C.tutorial.step, 'keep');
  keep(resumed); assert.equal(resumed.C.tutorial.step, 'inventory'); assert.equal(resumed.C.state.current.inventory.length, 2); assert.equal(resumed.C.state.current.serialCounter, 2);
  assert.equal(new Set(resumed.C.state.current.inventory.map(x => x.instanceId)).size, 2);
});
check('inventory timeout is visible time and inventory-open event can advance the future sheet hook', () => {
  const r = fresh(false, stepSave('inventory')); r.advance(2000); r.hidden(true); r.advance(20000); assert.equal(r.C.tutorial.step, 'inventory');
  r.hidden(false); r.advance(3000); assert.equal(r.C.tutorial.step, 'inventory'); r.advance(1100); assert.equal(r.C.tutorial.step, 'timer');
  const a = fresh(false, stepSave('inventory')); a.C.events.emit('inventory:open'); assert.equal(a.C.tutorial.step, 'timer');
});
check('timer copy derives its regeneration interval from config', () => {
  const r = fresh(false, stepSave('inventory')); r.C.config.packs.regenMs = 4 * 3600000; r.C.events.emit('inventory:open');
  assert.equal(r.C.tutorial.instruction.textContent, 'A new pack arrives every 4 hours.');
});
check('spotlight holds an elliptical halo without pointer motion and updates on resize', () => {
  const r = fresh(); r.pack.rect = { left: 500, top: 230, width: 180, height: 252 }; let context;
  r.C.events.on('tutorial:context', value => { context = value; }); r.window.fire('resize'); r.advance(40);
  assert.equal(context.halo.x, 590); assert.equal(context.halo.y, 356); assert.equal(context.halo.rx, 138); assert.equal(context.halo.ry, 174);
  assert(r.drawing.arcs.length > 0); assert(r.drawing.arcs.every(p => Math.hypot((p.x - 590) / 138, (p.y - 356) / 174) < 1));
  r.pack.rect.left = 700; r.window.fire('resize'); r.advance(20); assert.equal(context.halo.x, 790);
});
check('live reduced motion makes ghost/pulses static and lets a stationary highlight sleep', () => {
  const r = fresh(); r.reduced(true); r.pack.fire('pointerenter'); r.C.packView.setVisible(false); r.C.inventoryHint.setVisible(false); r.advance(600);
  assert.equal(r.document.body.style['--tutorial-pulse'], '1'); assert.equal(r.C.fx.stats.running, false);
  const frames = r.C.fx.stats.frameCount, draws = r.C.dots.stats.draws; r.advance(500); assert.equal(r.C.fx.stats.frameCount, frames); assert.equal(r.C.dots.stats.draws, draws);
  charge(r); r.advance(40); assert.equal(Number(r.C.tutorial.ghost.style.strokeDashoffset), 0);
  r.reduced(false); r.advance(100); assert(Number(r.C.tutorial.ghost.style.strokeDashoffset) > 0); r.reduced(true); r.advance(40); assert.equal(Number(r.C.tutorial.ghost.style.strokeDashoffset), 0);
});
check('dev replay starts guidance without resetting owned cards or granting stock; reset restores fresh flow', () => {
  const saved = stepSave('done', true); saved.packs.ready = 1; const r = fresh(true, saved), before = clone(r.C.state.current);
  const button = r.C.dev.panel.querySelectorAll('button').find(x => x.textContent === 'Replay tutorial'); button.fire('click');
  assert.equal(r.C.tutorial.step, 'welcome'); assert.equal(r.C.tutorial.instruction.textContent, 'You have 1 pack.');
  const after = clone(r.C.state.current); after.tutorial = before.tutorial; assert.deepEqual(after, before);
  r.C.state.reset(); assert.equal(r.C.tutorial.step, 'welcome'); assert.equal(r.C.state.current.packs.ready, 2);
});
check('initialization is idempotent and a skipped tutorial retains ordinary front-face reload recovery', () => {
  const r = fresh(); r.C.tutorial.init(); assert.equal(r.document.body.querySelectorAll('.tutorial').length, 1);
  charge(r); tap(r, 'Escape'); const saved = clone(r.C.state.current), resumed = fresh(false, saved);
  assert.equal(resumed.C.opening.phase, 'revealed'); assert(!resumed.C.tutorial.active);
  assert.deepEqual(clone(resumed.C.state.current.pendingReveal), saved.pendingReveal);
});
check('gallery suppresses tutorial, boot is last, and Stage 6 uses local classic scripts only', () => {
  const r = runtime(true, true, null, true); assert(!r.C.tutorial.active); assert.equal(r.document.body.querySelectorAll('.tutorial').length, 0);
  assert(scripts.indexOf('src/ui/tutorial.js') > scripts.indexOf('src/ui/opening.js')); assert.equal(scripts.at(-1), 'src/boot.js');
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/tutorial.css'), 'utf8'); assert(css.includes(':focus-visible')); assert(css.includes('.reduced-motion')); assert(!css.includes('@import'));
});
console.log('\n' + passed + ' Stage 6 checks passed. Browser appearance, screenshots and measured FPS remain unverified.');
