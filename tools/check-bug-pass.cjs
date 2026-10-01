'use strict';
// Real classic scripts; simulated DOM, clocks, storage and input. No rendered browser claims.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runtime, scripts, html } = require('./check-stage1.cjs');
let passed = 0;
const evidence = { environment: 'Node VM / instrumented DOM; no browser paint, GPU, heap or file-open evidence', groups: [], resourceAudit: null };
const clone = value => JSON.parse(JSON.stringify(value));
function check(name, fn) { try { fn(); passed++; evidence.groups.push(name); console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name); throw error; } }
function save() { const s = clone(runtime().C.state.current); s.tutorial = { step: 'done', done: true }; return s; }
function boot(dev = false, initial = save(), tutorial = true) { const r = runtime(dev, false, initial, tutorial, true); r.advance(40); return r; }
function key(r, name, type = 'keydown', extra = {}) { const event = { key: name, code: name === ' ' ? 'Space' : name, target: r.document.activeElement, repeat: false, preventDefault() { this.prevented = true; }, ...extra }; r.document.fire(type, event); return event; }
function tap(r, name, extra) { key(r, name, 'keydown', extra); key(r, name, 'keyup', extra); }
function until(r, condition, limit = 24000) { for (let age = 0; !condition() && age < limit; age += 40) r.advance(40); assert(condition()); }
function charge(r, ms = 3000) { key(r, ' ', 'keydown', { target: r.document.body }); r.advance(ms); key(r, ' ', 'keyup'); }
function cut(r) { charge(r); until(r, () => r.C.opening.phase === 'cutting'); }
function reveal(r) { tap(r, 'Enter'); until(r, () => r.C.opening.phase === 'revealed' && !r.C.opening.keepButton.hidden); }
function openInventory(r, preview = false) { if (preview) r.C.events.emit('inventory:preview', true); r.C.events.emit('inventory:request', true); r.advance(1200); }
function pointer(r, type, el, x, y, id = 1) { const event = { pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: true, target: el, pointerType: 'mouse', preventDefault() {} }; if (type === 'pointerdown' && el !== r.C.opening.wrapper) el.fire(type, event); else r.document.fire(type, event); }
function descendants(el) { return [el, ...el.children.flatMap(descendants)]; }
function listeners(target) { return [...target.listeners.values()].reduce((n, list) => n + list.length, 0); }
function resources(r) { const nodes = descendants(r.document.body); const rolling = nodes.filter(el => el.classList.contains('rolling-number') || el.classList.contains('collectible-card')).reduce((n,el)=>n+descendants(el).length,0); return { nodes: nodes.length, structuralNodes: nodes.length-rolling, attachedDOMListeners: nodes.reduce((n, el) => n + listeners(el), 0), globalListeners: listeners(r.document) + listeners(r.window), events: r.C.events.listenerCount, subscribers: r.C.fx.stats.subscribers, liveViews: r.C.cardView.stats.liveViews, tasks: r.tasks.size, full: r.C.cardView.stats.fullCards }; }

check('9c-01: I / ArrowUp cannot steal detail focus; preferences block inventory requests', () => {
  const r = boot(true); openInventory(r, true); r.C.inventory.rendered.get(r.C.inventory.center).el.fire('click'); r.advance(1200);
  const focused = r.document.activeElement; tap(r, 'i'); tap(r, 'ArrowUp'); assert.equal(r.document.activeElement, focused); assert(r.C.inventory.content.inert);
  r.C.preferences.show(); const focus = r.document.activeElement; r.C.events.emit('inventory:request', false); assert(r.C.inventory.open); assert.equal(r.document.activeElement, focus);
});
check('9c-02: closing mid sheet or shelf drag releases capture and reaches closed', () => {
  for (const kind of ['sheet', 'shelf']) {
    const r = boot(true); openInventory(r, true); const el = kind === 'sheet' ? r.C.inventory.grip : r.C.inventory.shelf;
    pointer(r, 'pointerdown', el, 300, 400); pointer(r, 'pointermove', el, kind === 'sheet' ? 300 : 150, kind === 'sheet' ? 470 : 400); assert(el.hasPointerCapture(1));
    r.C.events.emit('inventory:request', false); assert(!el.hasPointerCapture(1)); assert(!r.C.inventory.gesturesActive); r.advance(2000); assert(!r.C.inventory.active);
    pointer(r, 'pointerup', el, 100, 500); assert(!r.C.inventory.open);
  }
});
check('9c-03: sort mid drag cancels the old coordinate anchor and settles at the new first card', () => {
  const r = boot(true); openInventory(r, true); const el = r.C.inventory.shelf;
  pointer(r, 'pointerdown', el, 300, 400); pointer(r, 'pointermove', el, 150, 400); r.C.inventoryModel.update({sortMode:'rarity-asc'});
  assert(!el.hasPointerCapture(1)); pointer(r, 'pointermove', el, 50, 400); pointer(r, 'pointerup', el, 50, 400); r.advance(2000);
  assert(Number.isFinite(r.C.inventory.center)); assert(r.C.inventory.rendered.size <= 13); assert(!r.C.inventory.gesturesActive);
});
check('9c-04: resize mid drag cancels capture without leaving stale geometry', () => {
  for (const elName of ['grip', 'shelf']) { const r = boot(true); openInventory(r, true); const el = r.C.inventory[elName];
    pointer(r, 'pointerdown', el, 300, 400); pointer(r, 'pointermove', el, 100, 480); r.window.innerHeight = 1080; r.window.innerWidth = 1920; r.window.fire('resize');
    assert(!r.C.inventory.gesturesActive); assert(!el.hasPointerCapture(1)); pointer(r, 'pointerup', el, 0, 400); r.advance(1600); assert(r.C.inventory.open);
  }
});
check('9c-05: recovered ordinary and strict writes cannot reload the stale fallback', () => {
  for (const strict of [false, true]) { const r = boot(), original = r.window.localStorage.setItem;
    r.window.localStorage.setItem = () => { throw Error('disabled'); }; r.C.state.current.currency = 1; r.C.state.save();
    r.window.localStorage.setItem = original; const candidate = clone(r.C.state.current); candidate.currency = 2;
    if (strict) assert(r.C.state.commit(candidate)); else { r.C.state.current = candidate; r.C.state.save(); }
    r.C.state.load(); assert.equal(r.C.state.current.currency, 2);
  }
});
check('9c-06: a corrupt reserved card is backed up and replaced without a startup error', () => {
  const s = save(); s.pendingReveal = { packId: 'standard', committedAt: 0, cards: [{ instanceId: 'missing', cardId: 'missing', serial: 'missing', pulledAt: 0, seen: false }] };
  const r = boot(false, s); assert.equal(r.C.state.current.pendingReveal, null); assert(r.store.get('cardable.save.corrupt')); assert(r.C.state.recovery); assert(!r.logs.some(x => x.level === 'error'));
});
check('9c-07: timer restart does not accumulate visibility handlers or scheduled intervals', () => {
  const r = boot(), before = listeners(r.document); for (let i = 0; i < 50; i++) { r.C.timers.stop(); r.C.timers.start(); }
  assert.equal(listeners(r.document), before); r.C.timers.stop(); assert.equal(listeners(r.document), before - 1);
  let calls = 0; const tick = r.C.timers.tick; r.C.timers.tick = () => { calls++; }; r.hidden(true); r.hidden(false); assert.equal(calls, 0); r.C.timers.tick = tick;
});
check('9c-08: reconciliation exactly at release is one write; failed commit changes nothing', () => {
  for (const failed of [false, true]) { const r = boot(); r.C.timers.stop(); r.C.state.current.packs = { ready: 1, timerStartedAt: r.date() - r.C.config.packs.regenMs + 3000 }; r.C.state.save();
    const before = clone(r.C.state.current), original = r.window.localStorage.setItem; let writes = 0;
    r.window.localStorage.setItem = (k, v) => { writes++; if (failed) throw Error('quota'); return original(k, v); };
    charge(r); assert.equal(writes, 1);
    if (failed) { assert.equal(r.C.opening.phase, 'draining'); assert.deepEqual(clone(r.C.state.current), before); }
    else { assert.equal(r.C.state.current.packs.ready, 1); assert.equal(r.C.state.current.stats.packsOpened, 1); assert.equal(r.C.state.current.serialCounter, 1); }
  }
});
check('9c-09: console checks during revealed/detail are isolated from the reserved state', () => {
  const r = boot(true); cut(r); reveal(r); const before = clone(r.C.state.current), view = r.C.opening.view;
  assert(r.C.dev.runChecks()); assert.deepEqual(clone(r.C.state.current), before); assert.equal(r.C.opening.view, view); assert.equal(r.C.opening.phase, 'revealed');
  assert(!r.logs.some(x => x.text.includes('FAIL')));
});
check('9c-10: local reload repairs a lagging serial counter and allocates the next unique serial', () => {
  const s = save(); s.serialCounter = 0; s.inventory = [{ cardId: runtime().C.data.cards[0].id, instanceId: 'counter', serial: 'CBL-' + s.playerCode + '-000099', pulledAt: 0, seen: false }];
  const r = boot(false, s); assert.equal(r.C.state.current.serialCounter, 99); assert(r.C.serial.next().endsWith('-000100'));
});
check('9c-11: console checks PASS when storage is blocked, with honest session-only coverage', () => {
  for (const access of ['getItem', 'setItem']) {
    const r = boot(true), before = clone(r.C.state.current);
    r.window.localStorage[access] = () => { throw Error('disabled'); };
    assert(r.C.dev.runChecks()); assert.deepEqual(clone(r.C.state.current), before);
    assert(r.logs.some(x => x.text.includes('PASS unavailable storage preserves session state')));
    assert(!r.logs.some(x => x.text.includes('FAIL')));
  }
});
check('9c-12: tutorial Skip is keyboard reachable with the inventory focus trap active', () => {
  const s = save(); s.tutorial = { step: 'welcome', done: false }; const r = boot(false, s); openInventory(r);
  const skip = r.C.tutorial.skipButton; assert(r.C.accessibility.focusables(r.C.inventory.el, [skip]).includes(skip));
  skip.focus(); const event = key(r, 'Tab'); assert(event.prevented); assert(r.C.inventory.el.contains(r.document.activeElement));
  skip.fire('click'); assert(!r.C.tutorial.active); assert(r.C.inventory.open);
});
check('9c-13: dev persistence simulations cannot poison the player fallback cache', () => {
  const s = save(); s.currency = 17; const r = boot(true, s); assert(r.C.dev.runChecks());
  r.window.localStorage.getItem = () => { throw Error('blocked'); }; r.window.localStorage.setItem = () => { throw Error('blocked'); };
  r.C.state.load(); assert.equal(r.C.state.current.currency, 17); assert(r.C.state.current.tutorial.done);
});
check('input matrix: Space / R / Enter / Esc / Up / I / Tab respect inventory, detail and typing', () => {
  const r = boot(true); openInventory(r, true); const stock = r.C.state.current.packs.ready;
  key(r, ' ', 'keydown', { target: r.document.body }); r.advance(3500); key(r, ' ', 'keyup'); assert.equal(r.C.opening.phase, 'idle'); assert.equal(r.C.state.current.packs.ready, stock);
  tap(r, 'R'); tap(r, 'Enter', { target: new r.Element('input') }); tap(r, 'i', { target: new r.Element('input') }); assert(!r.C.detail.view);
  for (let i = 0; i < 20; i++) r.C.inventory.arrow.fire('click'); assert(r.C.inventory.open); r.advance(1600);
  r.C.inventory.shelf.focus(); key(r, 'Tab', 'keydown', { shiftKey: true }); assert(r.C.inventory.el.contains(r.document.activeElement));
  tap(r, 'Escape'); r.advance(1600); assert(!r.C.inventory.active);
});
check('2.9 s drains, 3.0 s commits, repeated releases and hidden holds are harmless', () => {
  for (const ms of [2900, 3000]) { const r = boot(); charge(r, ms); key(r, ' ', 'keyup'); assert.equal(r.C.opening.stats.commits, ms === 3000 ? 1 : 0); if (ms === 2900) { r.advance(800); assert.equal(r.C.opening.phase, 'idle'); } }
  const r = boot(); key(r, ' ', 'keydown', { target: r.document.body }); r.advance(2900); r.hidden(true); r.advance(10000); assert.equal(r.C.opening.phase, 'draining'); assert.equal(r.C.state.current.pendingReveal, null); r.hidden(false); r.advance(800); assert.equal(r.C.opening.phase, 'idle');
});
check('cuts reject outside starts, preserve normalized resize coordinates and finish in every direction', () => {
  for (const direction of ['right', 'left', 'up', 'down', 'diagonal']) { const r = boot(); cut(r); const host = r.C.opening.wrapper; host.rect = { left: 100, top: 100, width: 200, height: 280 }; r.window.fire('resize');
    pointer(r, 'pointerdown', host, 50, 50); assert.equal(r.C.opening.path.length, 0);
    const start = direction === 'left' ? [295, 240] : direction === 'up' ? [200, 375] : [105, 105];
    pointer(r, 'pointerdown', host, ...start); pointer(r, 'pointermove', host, start[0] + 2, start[1] + 2); assert.equal(r.C.opening.phase, 'cutting');
    const original = clone(r.C.opening.path); host.rect.width = 400; host.rect.height = 560; r.window.fire('resize'); assert.deepEqual(clone(r.C.opening.path), original);
    const end = direction === 'left' ? [-1000, 380] : direction === 'up' ? [300, -1000] : direction === 'down' ? [110, 2000] : direction === 'diagonal' ? [2000, 2000] : [2000, 110];
    pointer(r, 'pointermove', host, ...end); assert.equal(r.C.opening.phase, 'tearing'); assert(!host.hasPointerCapture(1)); assert.equal(r.C.opening.stats.tears, 1); assert(r.C.opening.path.length <= r.C.config.openingMotion.maxPathSamples);
  }
});
check('reload every committed phase resumes the same reserved serial without reroll or consumption', () => {
  const r = boot(); cut(r); const pending = clone(r.C.state.current.pendingReveal), phases = ['cutting', 'tearing', 'rising', 'preFlip', 'flipping', 'settling', 'revealed'];
  // Legendary supplies a nonzero anticipation phase.
  pending.cards[0].cardId = r.C.data.cards.find(c => c.rarity === 'legendary').id;
  r.C.state.current.pendingReveal = pending; r.C.state.save(); tap(r, 'Enter');
  const checked = new Set(['cutting']);
  const recover = () => { const b = boot(false, clone(r.C.state.current)); assert.equal(b.C.opening.phase, 'revealed'); assert.equal(b.C.opening.stats.commits, 0); assert.equal(b.C.opening.view.instance.serial, pending.cards[0].serial); assert.equal(b.C.state.current.packs.ready, 1); };
  recover(); until(r, () => { if (phases.includes(r.C.opening.phase) && !checked.has(r.C.opening.phase)) { checked.add(r.C.opening.phase); recover(); } return r.C.opening.phase === 'revealed'; });
  assert(phases.every(p => checked.has(p)));
  while (r.C.opening.keepButton.hidden) r.advance(40); r.C.input.keep(); assert.equal(r.C.opening.phase, 'collecting'); const b = boot(false, clone(r.C.state.current)); assert.equal(b.C.opening.phase, 'idle'); assert.equal(b.C.state.current.inventory.length, 1);
});
check('timer hidden catch-up, forward/backward jumps and cap do not bank time or duplicate arrivals', () => {
  const r = boot(), C = r.C; C.state.current.packs = { ready: 0, timerStartedAt: r.date() }; C.state.save(); r.hidden(true); const frames = C.fx.stats.frameCount;
  r.wall(C.config.packs.regenMs * (C.config.packs.maxStored + 1)); r.advance(1100); assert.equal(C.fx.stats.frameCount, frames); r.hidden(false); assert.equal(C.state.current.packs.ready, C.config.packs.maxStored); assert.equal(C.state.current.packs.timerStartedAt, null);
  C.timers.tick(r.date() + C.config.packs.regenMs * 10); C.timers.openPack(r.date()); assert.equal(C.timers.progress(r.date()), 0);
  r.wall(-C.config.packs.regenMs); C.timers.tick(r.date()); assert.equal(C.state.current.packs.ready, C.config.packs.maxStored - 1); assert.equal(C.timers.progress(r.date()), 0);
});
check('blocked localStorage preserves the pack, failed Keep is retryable, import/export/reset are durable', () => {
  const r = boot(), original = r.window.localStorage.setItem; r.window.localStorage.setItem = () => { throw Error('blocked'); }; const stock = r.C.state.current.packs.ready;
  charge(r); assert.equal(r.C.opening.phase, 'draining'); r.advance(800); assert.equal(r.C.state.current.packs.ready, stock);
  r.window.localStorage.setItem = original; cut(r); reveal(r); const before = clone(r.C.state.current); r.window.localStorage.setItem = () => { throw Error('quota'); }; r.C.input.keep(); assert.deepEqual(clone(r.C.state.current), before); assert.equal(r.C.opening.phase, 'revealed');
  r.window.localStorage.setItem = original; r.C.input.keep(); r.advance(4000); const text = r.C.saveFiles.exportText(), candidate = r.C.saveFiles.parse(text); r.C.saveFiles.apply(candidate); assert.deepEqual(clone(r.C.state.current), JSON.parse(text));
  r.C.state.reset(); assert.equal(r.C.state.current.inventory.length, 0); assert.equal(r.C.state.current.packs.ready, 2); assert.equal(r.C.state.current.pendingReveal, null);
});
check('tutorial skips and reloads every milestone, and dev replay preserves the collection', () => {
  for (const step of ['welcome', 'hold', 'cut', 'keep', 'inventory', 'timer']) { const s = save(); s.tutorial = { step, done: false };
    if (['cut', 'keep'].includes(step)) { const a = boot(); cut(a); s.pendingReveal = clone(a.C.state.current.pendingReveal); s.serialCounter = 1; }
    const r = boot(false, s); const savedStep = r.C.tutorial.step; const reloaded = boot(false, clone(r.C.state.current)); assert.equal(reloaded.C.tutorial.step, savedStep);
    tap(r, 'Escape'); assert(r.C.state.current.tutorial.done); assert.equal(r.C.tutorial.step, 'done'); assert.equal(r.C.state.current.packs.ready, s.packs.ready);
  }
  const r = boot(true), before = clone(r.C.state.current); r.C.dev.panel.querySelectorAll('button').find(b => b.textContent === 'Replay tutorial').fire('click'); assert(r.C.tutorial.active); assert.deepEqual(clone(r.C.state.current.inventory), before.inventory); r.C.tutorial.skipButton.fire('click'); assert(!r.C.tutorial.active);
});
check('inventory 0 / 1 / 2 instances stacks duplicates, hides names, and shows unowned Secret unfound', () => {
  for (const n of [0, 1, 2]) { const s = save(), card = runtime().C.data.cards.find(c => !c.retired); s.inventory = Array.from({ length: n }, (_, i) => ({ cardId: card.id, instanceId: 'owned-' + i, serial: 'CBL-' + s.playerCode + '-' + String(i + 1).padStart(6, '0'), pulledAt: 0, seen: false })); s.serialCounter = n;
    const r = boot(false, s); openInventory(r); const entries = r.C.inventory.entries, entry = entries.find(e => e.card.id === card.id); assert.equal(entry.instances.length, n); assert(r.C.cardView.stats.fullCards <= 1);
    const secretIndex = r.C.inventory.entries.findIndex(e => e.rarity.id === 'secret'); r.C.inventory.carousel.snap(secretIndex * (parseFloat(r.C.inventory.shelf.style['--inventory-tile-width']) + r.C.config.inventoryMotion.tileGapPx)); r.C.fx.wake(); r.advance(1800); const secret = r.C.inventory.rendered.get(secretIndex); assert(secret && secret.view.finishState === 'unfound');
    for (const tile of r.C.inventory.rendered.values()) if (!tile.entry.owned && tile.entry.rarity.id !== 'secret') assert(tile.el.getAttribute('aria-label').startsWith('Unknown '));
  }
});
check('300-tile rapid sort, detail close while lifting and live reduced motion remain bounded', () => {
  const r = boot(true); openInventory(r, true); r.C.inventory.shelf.fire('wheel', { deltaY: 600, preventDefault() {} });
  for (let i = 0; i < 9; i++) { r.C.inventoryModel.update({sortMode:['catalog','generation','rarity-asc'][i%3]}); r.advance(60); assert(r.C.inventory.rendered.size <= 26); }
  r.advance(1800); r.C.inventory.rendered.get(r.C.inventory.center).el.fire('click'); r.advance(40); tap(r, 'Escape'); r.reduced(true); r.advance(1600); assert.equal(r.C.detail.phase, 'closed'); assert(r.C.inventory.rendered.size <= 13); assert(r.C.cardView.stats.fullCards <= 1);
  assert(!r.logs.some(x => x.level === 'error'));
});
check('all thirteen finishes and both Secret states in both modes pause offscreen and hidden', () => {
  const r = runtime(true, true); r.advance(100);
  assert.equal(r.C.gallery.views.length, 28);
  for (const view of r.C.gallery.views) { r.C.cardView.focus(view); r.advance(80); assert.equal(r.C.cardView.stats.fullCards, 1);
    view.setVisible(false); const updates = view.stats.updates; r.advance(200); assert.equal(view.stats.updates, updates); view.setVisible(true);
    r.hidden(true); const hidden = view.stats.updates; r.advance(500); assert.equal(view.stats.updates, hidden); r.hidden(false); r.advance(50);
    r.reduced(true); r.advance(80); r.reduced(false);
  }
  assert(!r.logs.some(x => x.level === 'error' || x.text.includes('FAIL')));
});
check('50 real openings with back-to-back toasts keep DOM, subscriptions, listeners and tasks bounded', () => {
  const r = boot(true), C = r.C, samples = [];
  const select = C.dev.panel.querySelector('select');
  for (let i = 0; i < 50; i++) {
    if (!C.state.current.packs.ready) { C.state.current.packs.ready = 2; C.state.current.packs.timerStartedAt = null; C.state.save(); }
    select.value = ['common', 'legendary', 'secret'][i % 3]; select.fire('change'); cut(r); reveal(r); C.input.keep(); r.advance(1150); assert.equal(C.opening.phase, 'idle');
    if (i === 0) assert(C.opening.toast && !C.opening.toast.hidden);
    // Begin the next pack with the old toast present on alternating iterations.
    if (i % 2) r.advance(2800);
    samples.push(resources(r));
  }
  r.advance(4000); const final = resources(r), steady = samples.slice(1);
  for (const field of ['globalListeners', 'events', 'subscribers']) assert(steady.every(s => s[field] === steady[0][field]), field);
  assert(final.liveViews <= 1 && final.full === 0); assert(Math.max(...steady.map(s => s.liveViews)) <= 2); assert(Math.max(...steady.map(s => s.tasks)) <= 6);
  // Compare equivalent toast/tier phases, rather than treating a mounted thumbnail as a leak.
  for (let phase = 0; phase < 6; phase++) {
    const samePhase = samples.filter((_, i) => i % 6 === phase);
    assert(Math.max(...samePhase.map(s => s.structuralNodes)) - Math.min(...samePhase.map(s => s.structuralNodes)) <= 2, JSON.stringify(samePhase.map(s=>({nodes:s.nodes,listeners:s.attachedDOMListeners,views:s.liveViews}))));
    assert(samePhase.every(s => s.attachedDOMListeners === samePhase[0].attachedDOMListeners));
  }
  assert.equal(C.state.current.inventory.length, 50); assert.equal(new Set(C.state.current.inventory.map(i => i.serial)).size, 50);
  assert.equal(C.opening.stats.commits, 50); assert.equal(C.opening.stats.collections, 50); assert(!r.logs.some(x => x.level === 'error' || x.text.includes('FAIL')));
  evidence.resourceAudit = { packs: 50, initial: steady[0], final, maxLiveViews: Math.max(...steady.map(s => s.liveViews)), maxTasks: Math.max(...steady.map(s => s.tasks)), maxNodes: Math.max(...steady.map(s => s.nodes)), minNodes: Math.min(...steady.map(s => s.nodes)), heapMeasurement: 'Not performed; retained DOM/listener/timer/subscriber counts only' };
});
check('responsive geometry remains finite at three viewports, 80–150% scale, and DPR 1–2', () => {
  const r = boot(true); openInventory(r, true);
  for (const [width, height] of [[1280, 720], [1920, 1080], [420, 720]]) for (const zoom of [.8, 1, 1.5]) { r.window.innerWidth = width / zoom; r.window.innerHeight = height / zoom; r.window.devicePixelRatio = zoom * 2; r.window.fire('resize'); r.advance(100);
    assert(!String(r.C.inventory.el.style.transform).includes('NaN')); assert(!String(r.C.inventory.shelf.children[0].style.transform).includes('NaN')); assert(r.C.inventory.rendered.size <= 13);
  }
});
check('normal use emits no console errors or warnings; dev checks all print PASS', () => {
  const r = boot(); cut(r); reveal(r); r.C.input.keep(); r.advance(4000); openInventory(r); tap(r, 'Escape'); r.advance(1600);
  assert(!r.logs.some(x => ['warn', 'error'].includes(x.level))); const dev = boot(true); assert(dev.C.dev.runChecks());
  assert(!dev.logs.some(x => x.text.includes('FAIL'))); assert(dev.logs.filter(x => x.text.includes('[Cardable check] PASS')).length >= 16);
});
check('file compatibility audit: only existing local classic scripts, local font sources, no runtime fetch/modules', () => {
  assert(scripts.every(file => fs.existsSync(file))); assert(!html.includes('type="module"')); assert(!/<(?:script|link)[^>]*(?:src|href)="https?:/.test(html));
  for (const file of scripts) assert(!/\bfetch\s*\(|XMLHttpRequest|\bimport\s*\(/.test(fs.readFileSync(file, 'utf8')), file);
  const css = fs.readFileSync('src/styles/tokens.css', 'utf8'); assert(css.includes('@font-face')); assert(css.includes('font-display: swap')); assert(css.includes('assets/fonts/'));
});
evidence.passedGroups = passed;
fs.writeFileSync('docs/BUG-PASS-9C-EVIDENCE.json', JSON.stringify(evidence, null, 2) + '\n');
console.log('\n' + passed + ' bug-pass behavior groups passed. Browser screenshots, file opening, heap growth and rendered FPS remain unconfirmed.');
