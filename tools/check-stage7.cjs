'use strict';
// Real classic scripts in the shared instrumented DOM. This cannot measure browser paint cost.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, scripts } = require('./check-stage1.cjs');
let passed = 0;
function check(name, fn) { try { fn(); passed++; console.log('PASS ' + name); } catch (e) { console.error('FAIL ' + name); throw e; } }
const clone = value => JSON.parse(JSON.stringify(value));
function save(count = 3, cardIndex = 0) {
  const r = runtime(); const result = clone(r.C.state.current); const card = r.C.data.cards[cardIndex];
  result.tutorial = { step: 'done', done: true };
  result.inventory = Array.from({ length: count }, (_, i) => ({ instanceId: 'owned-' + i, cardId: card.id, serial: r.C.serial.format(result.playerCode, i + 1), pulledAt: i, seen: false }));
  return result;
}
function boot(initial = save(), dev = false, tutorial = false) { const r = runtime(dev, false, initial, tutorial, true); r.advance(40); return r; }
function open(r) { r.C.events.emit('inventory:request', true); r.advance(1100); assert(r.C.inventory.open); }
function key(r, name, target = r.document.activeElement, extra = {}) { const event = { key: name, code: name === ' ' ? 'Space' : name, target, repeat: false, preventDefault() {}, ...extra }; r.document.fire('keydown', event); return event; }
function pitch(r) { return parseFloat(r.C.inventory.el.style['--inventory-tile-width']) + r.C.config.inventoryMotion.tileGapPx; }
function select(r, index) { r.C.inventory.carousel.snap(index * pitch(r)); r.C.fx.wake(); r.advance(1100); assert.equal(r.C.inventory.center, index); }
function current(r) { return r.C.inventory.rendered.get(r.C.inventory.center); }
function detail(r, index = r.C.inventory.center) { const tile = r.C.inventory.rendered.get(index); tile.el.fire('click'); r.advance(1100); assert.equal(r.C.detail.phase, 'detail'); return tile; }
function preview(r) { r.C.events.emit('inventory:preview', true); open(r); }
function press(r, el, x, y, id = 1) { const event = { button: 0, isPrimary: true, pointerId: id, clientX: x, clientY: y, target: el, preventDefault() {} }; el.fire('pointerdown', event); r.document.fire('pointerdown', event); }
function move(r, x, y, id = 1) { r.document.fire('pointermove', { pointerId: id, clientX: x, clientY: y, pointerType: 'mouse', target: r.document.body, preventDefault() {} }); }
function release(r, id = 1, cancel = false) { r.document.fire(cancel ? 'pointercancel' : 'pointerup', { pointerId: id }); }

check('production arrow is enabled, classic local scripts load inventory/detail before boot, gallery stays separate', () => {
  const r = boot(); assert.equal(r.C.inventory.arrow.getAttribute('aria-disabled'), null); assert.equal(r.C.inventory.arrow.getAttribute('aria-expanded'), 'false');
  assert(scripts.indexOf('src/core/collection.js') < scripts.indexOf('src/ui/inventory.js')); assert(scripts.indexOf('src/ui/detail.js') < scripts.indexOf('src/boot.js'));
  const gallery = runtime(true, true, null, false, true); assert(!gallery.C.inventory.active); assert.equal(gallery.document.body.querySelectorAll('.inventory-sheet').length, 0);
});
check('arrow, I and ArrowUp open; Esc/arrow close; repeats and editable targets are excluded', () => {
  for (const method of ['arrow', 'i', 'ArrowUp']) {
    const r = boot(); if (method === 'arrow') r.C.inventory.arrow.fire('click'); else key(r, method, r.document.body);
    r.advance(1100); assert(r.C.inventory.open); assert.equal(r.C.inventory.arrow.getAttribute('aria-expanded'), 'true');
    if (method === 'arrow') r.C.inventory.arrow.fire('click'); else key(r, 'Escape'); r.advance(1300); assert(!r.C.inventory.active);
    assert.equal(r.C.inventory.arrow.parent, r.document.getElementById('inventory-affordance'));
  }
  const r = boot(); key(r, 'i', new r.Element('input')); key(r, 'i', r.document.body, { repeat: true }); assert(!r.C.inventory.active);
});
check('sheet spring and menu depth reach 62vh, scale .96, blur 8px and 40-percent dim', () => {
  const r = boot(); r.C.events.emit('inventory:request', true); r.advance(100);
  assert(r.C.inventory.progress > 0 && r.C.inventory.progress < 1); assert(r.C.inventory.el.style.transform.includes('translate3d'));
  r.advance(1100); assert.equal(parseFloat(r.C.inventory.el.style.height), 720 * .62);
  assert.equal(Number(r.document.body.style['--inventory-menu-scale']), .96); assert.equal(r.document.body.style['--inventory-menu-blur'], '8px'); assert.equal(Number(r.document.body.style['--inventory-menu-opacity']), .6);
  assert(r.pack.inert); assert(!r.C.menu.idle); r.C.events.emit('inventory:request', false); r.advance(1300); assert(!r.pack.inert); assert(!r.document.body.classList.contains('inventory-depth-active'));
});
check('drag follows pointer with bounded rubber-band and restores springs on release', () => {
  const r = boot(); open(r); const grip = r.C.inventory.grip;
  press(r, grip, 640, 260); move(r, 640, -400); r.advance(20);
  assert(r.C.inventory.progress > 1); assert(r.C.inventory.progress < 1 + r.C.config.inventoryMotion.rubberBandPx / 446.4); assert(grip.hasPointerCapture(1));
  release(r); r.advance(1200); assert.equal(r.C.inventory.progress, 1); assert(!grip.hasPointerCapture(1));
  press(r, grip, 640, 260); move(r, 640, 1100); r.advance(20); assert(r.C.inventory.progress < 0); release(r); r.advance(1400); assert(!r.C.inventory.active);
});
check('a fresh upward flick opens below half travel; stale velocity no longer counts as a flick', () => {
  const a = boot(); press(a, a.C.inventory.arrow, 640, 650); a.advance(20); move(a, 640, 595); release(a); a.advance(1200); assert(a.C.inventory.open);
  const b = boot(); press(b, b.C.inventory.arrow, 640, 650); b.advance(20); move(b, 640, 595); b.advance(1000); release(b); b.advance(1400); assert(!b.C.inventory.active);
});
check('pointer cancellation, blur and hiding release sheet capture and settle at the previous rest', () => {
  for (const action of ['cancel', 'blur', 'hidden']) {
    const r = boot(); open(r); press(r, r.C.inventory.grip, 640, 280); move(r, 640, 360); r.advance(20);
    if (action === 'cancel') release(r, 1, true); else if (action === 'blur') r.window.fire('blur'); else { r.hidden(true); r.advance(1000); r.hidden(false); }
    assert(!r.C.inventory.grip.hasPointerCapture(1)); r.advance(1200); assert.equal(r.C.inventory.progress, 1);
  }
});
check('projection groups duplicates, counts owned designs, excludes pending cards and orders generation/tier/id', () => {
  const r = boot(); const C = r.C, p = C.collection.project(C.data.cards, C.state.current.inventory, 'all');
  assert.equal(p.owned, 1); assert.equal(p.total, C.data.cards.length); assert.equal(p.entries[0].instances.length, 3); assert(p.entries[0].isNew);
  for (let i = 1; i < p.entries.length; i++) { const a = p.entries[i - 1], b = p.entries[i]; assert(a.generation.order < b.generation.order || a.generation.order === b.generation.order && a.rarity.tier <= b.rarity.tier); }
  const other = C.data.cards[1]; C.state.current.pendingReveal = { cards: [{ cardId: other.id }] }; assert.equal(C.collection.project(C.data.cards, C.state.current.inventory, 'all').owned, 1);
});
check('empty collection shows silhouettes with generation only and a Secret Unfound finish', () => {
  const r = boot(save(0)); open(r); assert.equal(r.C.inventory.count.text, '0 / ' + r.C.data.cards.length);
  const silhouettes = r.C.inventory.el.querySelectorAll('.inventory-silhouette'); assert.equal(silhouettes.length, r.C.data.cards.length - 1);
  for (const el of silhouettes) { assert.equal(el.children.length, 1); assert(el.children[0].textContent.startsWith('Generation')); }
  const secret = Array.from(r.C.inventory.rendered.values()).find(t => t.entry.rarity.finish === 'secret'); assert.equal(secret.view.finishState, 'unfound');
  assert.equal(secret.view.el.querySelectorAll('.card__name').length, 0); assert.equal(secret.view.el.querySelectorAll('.card__back-serial').length, 0);
  assert.equal(r.C.inventory.el.querySelectorAll('.inventory-empty')[0].textContent, 'Open your first pack.');
});
check('header counts up unique cards and fluid line settles to owned/catalog fraction', () => {
  const r = boot(); r.C.events.emit('inventory:request', true); r.advance(200);
  const p = Number(r.C.inventory.el.style['--inventory-progress']); assert(p > 0 && p < 1 / r.C.data.cards.length);
  r.advance(900); assert.equal(r.C.inventory.count.text, '1 / ' + r.C.data.cards.length); assert.equal(Number(r.C.inventory.el.style['--inventory-progress']), 1 / r.C.data.cards.length);
  assert.equal(r.C.inventory.el.querySelectorAll('.inventory-count')[0].getAttribute('aria-label'), '1 of 6 cards collected');
});
check('duplicates use one card view, offset stack backs and x3; New persists until detail viewing', () => {
  const r = boot(); open(r); const tile = current(r); assert.equal(tile.count.textContent, 'x3'); assert(!tile.backs[0].hidden && !tile.backs[1].hidden); assert(!tile.newDot.hidden);
  const old = clone(r.C.state.current.inventory); tile.el.fire('pointerenter'); r.advance(200); assert.deepEqual(clone(r.C.state.current.inventory), old);
  detail(r); assert(r.C.state.current.inventory.every(i => i.seen)); assert(tile.newDot.hidden);
  assert(JSON.parse(r.store.get('cardable.save')).inventory.every(i => i.seen));
});
check('filter ordering and sliding underline preserve tile widths and use registry descriptions', () => {
  const r = boot(); open(r); const width = r.C.inventory.el.style['--inventory-tile-width'];
  r.C.inventory.filters[2].rect = { left: 240, top: 50, width: 80, height: 20 }; r.C.inventory.filters[2].fire('click'); r.advance(1200);
  assert.equal(r.C.inventory.order, 'rarity'); assert.equal(r.C.inventory.filters[2].getAttribute('aria-selected'), 'true');
  assert(r.C.inventory.el.querySelectorAll('.inventory-filter-underline')[0].style.transform.includes('190'));
  assert(r.C.inventory.entries.every((e, i, all) => !i || all[i - 1].rarity.tier <= e.rarity.tier)); assert.equal(r.C.inventory.el.style['--inventory-tile-width'], width);
  r.C.inventory.filters[1].fire('click'); r.advance(1200); assert.equal(r.C.inventory.order, 'generation'); assert(r.C.inventory.groupLabel.textContent.startsWith('Generation'));
});
check('vertical wheel supports pixel, line and page deltas, then spring-snaps with clamped bounds', () => {
  const r = boot(); open(r); const shelf = r.C.inventory.shelf;
  shelf.fire('wheel', { deltaY: 1, deltaX: 0, deltaMode: 1, preventDefault() {} }); assert.equal(r.C.inventory.carousel.target, 24);
  r.advance(1100); assert.equal(r.C.inventory.carousel.position, 0);
  shelf.fire('wheel', { deltaY: 1, deltaX: 0, deltaMode: 2, preventDefault() {} }); r.advance(1100); assert.equal(r.C.inventory.carousel.position, (r.C.inventory.entries.length - 1) * pitch(r));
  shelf.fire('wheel', { deltaY: -100000, deltaX: 0, preventDefault() {} }); r.advance(1100); assert.equal(r.C.inventory.carousel.position, 0);
});
check('coverflow smoothly scales/dims neighbors, centers pulse, and hover changes transforms without layout', () => {
  const r = boot(); open(r); const tile = current(r), neighbor = r.C.inventory.rendered.get(1); const width = r.C.inventory.el.style['--inventory-tile-width'];
  assert(tile.pose.style.transform.includes('scale(1)')); assert(neighbor.pose.style.transform.includes('scale(0.82)')); assert.equal(Number(neighbor.pose.style.opacity), .55);
  tile.el.fire('pointerenter'); r.advance(50); assert(tile.pose.style.transform.includes('translateY(-6px)')); assert.equal(r.C.inventory.el.style['--inventory-tile-width'], width);
  r.C.inventory.carousel.reset(pitch(r)); r.C.fx.wake(); r.advance(30); assert(current(r).pose.style.transform.includes('scale(1.')); assert(r.C.inventory.stats.snaps > 0);
});
check('horizontal pointer drag carries momentum and suppresses its trailing click', () => {
  const r = boot(); open(r); const shelf = r.C.inventory.shelf; press(r, shelf, 700, 500); r.advance(20); move(r, 420, 500); r.advance(20);
  assert(shelf.hasPointerCapture(1)); assert(r.C.inventory.carousel.position > 0); release(r); assert(!shelf.hasPointerCapture(1));
  current(r).el.fire('click'); assert.equal(r.C.detail.phase, 'closed'); r.advance(1300); assert(r.C.inventory.center > 0);
  assert(Math.abs(r.C.inventory.carousel.position / pitch(r) - Math.round(r.C.inventory.carousel.position / pitch(r))) < .001);
});
check('300-tile preview is dev-only and leaves saves, catalogs and serial allocation untouched', () => {
  const r = boot(save(), true), before = clone(r.C.state.current), catalog = clone(r.C.data.cards), text = r.store.get('cardable.save'); preview(r);
  assert.equal(r.C.inventory.entries.length, 300); assert.equal(r.C.inventory.shelf.querySelectorAll('.inventory-tile').length, 300); assert.equal(r.C.inventory.count.text, '225 / 300');
  assert.deepEqual(clone(r.C.state.current), before); assert.deepEqual(clone(r.C.data.cards), catalog); assert.equal(r.store.get('cardable.save'), text);
  const other = boot(); other.C.events.emit('inventory:preview', true); open(other); assert.equal(other.C.inventory.entries.length, other.C.data.cards.length);
});
check('virtualization mounts at most +/-6, destroys departed views and keeps 300 placeholders', () => {
  const r = boot(save(), true); preview(r); select(r, 20); assert.equal(r.C.inventory.rendered.size, 13);
  const views = Array.from(r.C.inventory.rendered.values()).map(t => t.view).filter(Boolean); select(r, 170);
  assert(views.every(v => v.destroyed)); assert.equal(r.C.inventory.rendered.size, 13); assert.equal(r.C.inventory.shelf.querySelectorAll('.inventory-tile').length, 300);
  assert(Array.from(r.C.inventory.rendered.keys()).every(i => i >= 164 && i <= 176)); assert(r.C.inventory.stats.maxMounted <= 13);
});
check('all shelf cards remain lite during centering and hover', () => {
  const r = boot(save(), true); preview(r); const ownedIndex = r.C.inventory.entries.findIndex(e => e.owned); select(r, ownedIndex);
  assert.equal(r.C.cardView.stats.fullCards, 0); assert.equal(current(r).view.mode, 'lite');
  const neighbor = Array.from(r.C.inventory.rendered.values()).find(t => t.index !== ownedIndex && t.view && t.entry.owned);
  neighbor.el.fire('pointerenter'); r.advance(40); assert.equal(neighbor.view.mode, 'lite'); assert.equal(r.C.cardView.stats.fullCards, 0);
  neighbor.el.fire('pointerleave'); r.advance(40); assert.equal(current(r).view.mode, 'lite');
});
check('shared-element lift moves the same owned card node and keeps the shelf geometry occupied', () => {
  const r = boot(); open(r); const tile = current(r), original = tile.visual, originalView = tile.view;
  tile.card.rect = { left: 510, top: 350, width: 180, height: 252 }; tile.el.fire('click');
  assert.equal(r.C.detail.mount.children[0], original); assert.equal(r.C.detail.view, originalView); assert.equal(tile.card.style.visibility, 'hidden'); assert.equal(r.C.detail.phase, 'lifting');
  const pose = r.C.detail.mount.style.transform; r.advance(150); assert.notEqual(r.C.detail.mount.style.transform, pose); r.advance(1000); assert.equal(r.C.detail.phase, 'detail');
  assert.equal(r.C.cardView.stats.fullCards, 1); assert(r.C.inventory.shelf.inert);
});
check('detail exposes all specs, name, generation, original tier text, badge and 12-segment meter', () => {
  const r = boot(); open(r); detail(r); const panel = r.C.detail.panel, card = r.C.data.cards[0];
  assert.equal(panel.querySelectorAll('.detail-name')[0].textContent, card.name); assert.equal(panel.querySelectorAll('.detail-kicker')[0].textContent, 'Generation 1');
  assert.equal(panel.querySelectorAll('.detail-specs')[0].children.length, r.C.cardSpecs.rows(card).length);
  assert.equal(panel.querySelectorAll('.detail-description')[0].textContent, r.C.rarity(card.rarity).description); assert.equal(panel.querySelectorAll('.detail-meter')[0].children.length, 12);
  assert.equal(panel.querySelectorAll('.detail-vram')[0].textContent, '2 GB GDDR5');
});
check('duplicate serial browser crossfades instances, keeps one full view, and flips the engraved back', () => {
  const r = boot(); open(r); detail(r); const panel = r.C.detail.panel;
  assert(panel.querySelectorAll('.detail-serial-arrow')[0].disabled); const old = r.C.detail.view;
  panel.querySelectorAll('.detail-serial-arrow')[1].fire('click'); r.advance(200);
  assert(old.destroyed); assert.equal(r.C.detail.serialIndex, 1); assert.equal(r.C.cardView.stats.fullCards, 1);
  assert.equal(r.C.detail.view.instance.serial, r.C.state.current.inventory[1].serial); panel.querySelectorAll('.detail-flip')[0].fire('click'); assert.equal(r.C.detail.view.side, 'back');
  panel.querySelectorAll('.detail-serial-arrow')[1].fire('click'); r.advance(200); assert.equal(r.C.detail.view.side, 'back'); assert.equal(r.C.detail.serialIndex, 2);
  assert.equal(Array.from(r.C.detail.view.el.querySelectorAll('.card__back-serial')[0].children).map(c => c.textContent).join(''), r.C.state.current.inventory[2].serial); assert(panel.querySelectorAll('.detail-serial-arrow')[1].disabled);
});
check('detail shine lives inside glare, runs once, and leaves the original ten-layer stack intact', () => {
  const r = boot(); open(r); const tile = current(r); tile.el.fire('click'); r.advance(220);
  const view = r.C.detail.view, shine = view.el.querySelectorAll('.card__reveal-shine')[0]; assert(Number(shine.style.opacity) > 0);
  assert(shine.parent.classList.contains('card__glare')); assert.equal(view.el.querySelectorAll('.card__face')[0].children.length, 9);
  r.advance(1200); assert(Number(shine.style.opacity) < 0.00001); assert.equal(view.stats.stamps, 0);
});
check('outside click and Esc return the same element to its tile and restore keyboard focus', () => {
  for (const action of ['outside', 'escape']) {
    const r = boot(); open(r); const tile = detail(r), visual = r.C.detail.view.el;
    if (action === 'outside') r.C.detail.el.fire('click', { target: r.C.detail.el }); else key(r, 'Escape');
    assert.equal(r.C.detail.phase, 'returning'); r.advance(1300); assert.equal(r.C.detail.phase, 'closed');
    assert.equal(tile.visual, visual); assert.equal(visual.parent, tile.card); assert.equal(tile.card.style.visibility, ''); assert.equal(r.document.activeElement, tile.el);
    assert(!r.C.inventory.shelf.inert); assert(r.C.inventory.open);
  }
});
check('closing during lift preserves partial panel/backdrop opacity without a flash', () => {
  const r = boot(); open(r); current(r).el.fire('click'); r.advance(100);
  const panelOpacity = Number(r.C.detail.panel.style.opacity), dim = Number(r.document.body.style['--detail-focus']);
  r.C.detail.closeButton.fire('click'); r.advance(20);
  assert(Number(r.C.detail.panel.style.opacity) <= panelOpacity); assert(Number(r.document.body.style['--detail-focus']) <= dim);
  r.advance(1300); assert.equal(r.C.detail.phase, 'closed');
});
check('detail drag down dismisses, shorter drags spring back, and cancellation releases capture', () => {
  const r = boot(); open(r); detail(r); const mount = r.C.detail.mount;
  press(r, mount, 500, 300); r.advance(20); move(r, 500, 320); r.advance(300); release(r); r.advance(600); assert.equal(r.C.detail.phase, 'detail');
  press(r, mount, 500, 300); move(r, 500, 330); r.advance(20); release(r, 1, true); assert(!mount.hasPointerCapture(1)); r.advance(600); assert.equal(r.C.detail.phase, 'detail');
  press(r, mount, 500, 300); move(r, 500, 450); release(r); r.advance(1300); assert.equal(r.C.detail.phase, 'closed');
});
check('unowned plain detail stays a silhouette, and unowned Secret stays Unfound without leaked specs or serials', () => {
  const r = boot(save(0)); open(r); detail(r); assert.equal(r.C.detail.view, null); assert.equal(r.C.detail.panel.querySelectorAll('.detail-name')[0].textContent, '???');
  assert.equal(r.C.detail.panel.querySelectorAll('.detail-specs').length, 0); assert(r.C.detail.panel.querySelectorAll('.detail-flip')[0].hidden);
  r.C.detail.closeButton.fire('click'); r.advance(1200); const secret = r.C.inventory.entries.findIndex(e => e.rarity.finish === 'secret'); select(r, secret); detail(r);
  assert.equal(r.C.detail.view.finishState, 'unfound'); assert.equal(r.C.detail.panel.querySelectorAll('.detail-name')[0].textContent, '???');
  assert.equal(r.C.detail.view.el.querySelectorAll('.card__back-serial').length, 0); assert.equal(r.C.state.current.inventory.length, 0);
});
check('only the detail card is full, and shelf actions cannot steal focus while it is lifted', () => {
  const r = boot(save(), true); preview(r); const owned = r.C.inventory.entries.findIndex(e => e.owned); select(r, owned); detail(r);
  assert.equal(r.C.cardView.stats.fullCards, 1); assert(Array.from(r.C.inventory.rendered.values()).every(t => !t.view || t.view.mode === 'lite'));
  const tile = Array.from(r.C.inventory.rendered.values()).find(t => t.view); if (tile) tile.el.fire('pointerenter'); r.advance(40); assert.equal(r.C.cardView.active, r.C.detail.view);
});
check('serial browsing and preview seen flags never allocate serials or mutate real inventory', () => {
  const r = boot(save(), true), before = clone(r.C.state.current), stored = r.store.get('cardable.save'); preview(r);
  const index = r.C.inventory.entries.findIndex(e => e.owned && e.instances.length > 1); select(r, index); detail(r);
  r.C.detail.panel.querySelectorAll('.detail-serial-arrow')[1].fire('click'); r.advance(300);
  assert.deepEqual(clone(r.C.state.current), before); assert.equal(r.store.get('cardable.save'), stored);
});
check('sheet/detail pause while hidden and resume without skipping visible-time transitions', () => {
  const r = boot(); r.C.events.emit('inventory:request', true); r.advance(100); const p = r.C.inventory.progress, frames = r.C.fx.stats.frameCount;
  r.hidden(true); r.advance(10000); assert.equal(r.C.inventory.progress, p); assert.equal(r.C.fx.stats.frameCount, frames); r.hidden(false); r.advance(1200);
  current(r).el.fire('click'); r.advance(100); const pose = r.C.detail.mount.style.transform, n = r.C.detail.view.stats.updates;
  r.hidden(true); r.advance(10000); assert.equal(r.C.detail.mount.style.transform, pose); assert.equal(r.C.detail.view.stats.updates, n); r.hidden(false); r.advance(1200); assert.equal(r.C.detail.phase, 'detail');
});
check('reduced motion uses fades, static coverflow, no menu blur and an operational downward dismissal', () => {
  const r = boot(); r.reduced(true); r.C.events.emit('inventory:request', true); r.advance(180);
  assert.equal(r.C.inventory.el.style.transform, 'none'); assert(Number(r.C.inventory.el.style.opacity) > 0 && Number(r.C.inventory.el.style.opacity) < 1);
  r.advance(1000); assert.equal(r.document.body.style['--inventory-menu-blur'], '0px'); assert(current(r).pose.style.transform === 'none');
  detail(r); const mount = r.C.detail.mount; press(r, mount, 500, 300); move(r, 500, 500); release(r); r.advance(150); assert.equal(r.C.detail.phase, 'returning');
  assert(Number(mount.style.opacity) > 0 && Number(mount.style.opacity) < 1); r.advance(600); assert.equal(r.C.detail.phase, 'closed');
});
check('live reduced-motion changes during sheet/detail motion retain a visible card and clean geometry', () => {
  const r = boot(); r.C.events.emit('inventory:request', true); r.advance(120); r.reduced(true); r.advance(800); assert.equal(r.C.inventory.progress, 1);
  current(r).el.fire('click'); r.advance(100); r.reduced(false); r.advance(1200); assert.equal(r.C.detail.phase, 'detail'); assert.equal(Number(r.C.detail.mount.style.opacity), 1);
  r.window.innerWidth = 900; r.window.innerHeight = 600; r.window.fire('resize'); r.advance(1200); assert(Number.isFinite(parseFloat(r.C.detail.mount.style.width))); assert(r.C.detail.mount.style.transform.includes('translate3d'));
});
check('live color/mono updates reach shelf and detail while collection geometry stays fixed', () => {
  const r = boot(save(1, 4)); open(r); const index = r.C.inventory.entries.findIndex(e => e.owned); select(r, index); const width = r.C.inventory.el.style['--inventory-tile-width'];
  r.C.config.rarityColorMode = 'mono'; r.C.events.emit('settings:rarityColorMode', 'mono'); assert.equal(current(r).view.el.dataset.colorMode, 'mono');
  detail(r); r.C.config.rarityColorMode = 'color'; r.C.events.emit('settings:rarityColorMode', 'color'); assert.equal(r.C.detail.view.el.dataset.colorMode, 'color');
  assert.equal(r.C.inventory.el.style['--inventory-tile-width'], width);
});
check('close sheet during detail waits for the return, then clears full views and visibility holds', () => {
  const r = boot(); open(r); detail(r); r.C.events.emit('inventory:request', false); assert.equal(r.C.detail.phase, 'returning'); assert(r.C.inventory.active);
  r.advance(2600); assert(!r.C.inventory.active); assert.equal(r.C.detail.phase, 'closed'); assert.equal(r.C.cardView.stats.fullCards, 0); assert(!r.pack.inert);
});
check('reset cleans detail and preview views and restores real catalog without leaked capture', () => {
  const r = boot(save(), true); preview(r); select(r, r.C.inventory.entries.findIndex(e => e.owned)); detail(r);
  press(r, r.C.detail.mount, 500, 300); move(r, 500, 330); r.C.state.reset(); r.advance(100);
  assert(!r.C.inventory.active); assert(!r.C.inventory.preview); assert.equal(r.C.detail.phase, 'closed'); assert.equal(r.C.cardView.stats.fullCards, 0); assert(!r.C.detail.mount.hasPointerCapture(1)); assert.equal(r.C.inventory.entries.length, r.C.data.cards.length);
});
check('opening is blocked while inventory/detail is active; committed openings reject inventory requests', () => {
  const r = boot(); open(r); const stock = r.C.state.current.packs.ready; key(r, ' ', r.document.body); r.C.input.chargeStart(); r.advance(3200); assert.equal(r.C.opening.phase, 'idle'); assert.equal(r.C.state.current.packs.ready, stock);
  r.C.inventory.arrow.fire('click'); r.advance(1400); r.document.fire('keyup', { key: ' ', code: 'Space', target: r.document.body, preventDefault() {} }); key(r, ' ', r.document.body); r.advance(3200);
  assert(r.C.state.current.pendingReveal); r.C.events.emit('inventory:request', true); assert(!r.C.inventory.active);
});
check('real timer/title remain active through inventory and tutorial advances when sheet actually opens', () => {
  const initial = save(); initial.tutorial = { step: 'inventory', done: false }; const r = boot(initial, false, true); open(r);
  assert.equal(r.C.tutorial.step, 'timer'); assert.equal(r.document.body.dataset.tutorial, ''); r.advance(5000); assert.equal(r.C.tutorial.step, 'timer');
  r.hidden(true); assert.equal(r.document.title, 'Cardable · pack ready'); r.hidden(false);
  r.C.events.emit('inventory:request', false); r.advance(1400); assert.equal(r.document.body.dataset.tutorial, 'timer'); r.advance(4100); assert(r.C.state.current.tutorial.done);
});
check('dev cadence sample uses 300 placeholders, bounded mounted lite views', () => {
  const r = boot(save(), true); preview(r); select(r, r.C.inventory.entries.findIndex(e => e.owned));
  const button = r.C.inventory.el.querySelectorAll('button').find(b => b.textContent === 'Measure 5 s FPS'); button.fire('click'); r.advance(5100);
  const sample = r.C.inventory.lastProfile; assert(sample.valid); assert.equal(sample.tiles, 300); assert(sample.mounted <= 13); assert.equal(sample.fullCards, 0); assert(sample.fps > 59 && sample.fps < 61);
  console.log('SIMULATED frame-cadence sample: ' + JSON.stringify(clone(sample)));
});
check('dev sampling cancels on sheet close and can retry in the real collection', () => {
  const r = boot(save(), true); preview(r); select(r, r.C.inventory.entries.findIndex(e => e.owned));
  const button = r.C.inventory.el.querySelectorAll('button').find(b => b.textContent === 'Measure 5 s FPS'); button.fire('click'); r.advance(100);
  r.C.events.emit('inventory:request', false); r.advance(1500); assert.equal(r.C.inventory.lastProfile.valid, false); assert(button.textContent.includes('cancelled'));
  r.C.events.emit('inventory:preview', false); open(r); assert.equal(r.C.inventory.entries.length, r.C.data.cards.length); assert(!r.C.inventory.preview);
  select(r, r.C.inventory.entries.findIndex(e => e.owned)); button.fire('click'); r.advance(5100); assert(r.C.inventory.lastProfile.valid);
});
check('settled shelf chrome does no per-frame work and lite shelf cards do no per-frame work', () => {
  const r = boot(save(1, 4)); open(r); select(r, r.C.inventory.entries.findIndex(e => e.owned)); r.advance(3500);
  const updates = r.C.inventory.stats.updates, cardUpdates = current(r).view.stats.updates;
  r.advance(1000); assert.equal(r.C.inventory.stats.updates, updates); assert.equal(current(r).view.stats.updates, cardUpdates);
  detail(r); r.advance(1000); assert.equal(r.C.detail.phase, 'detail');
});
check('no extra animation loops, no application errors, and styles preserve static tile geometry', () => {
  const r = boot(save(), true); preview(r); select(r, 160); detail(r); r.C.detail.closeButton.fire('click'); r.advance(1400);
  assert(!r.logs.some(line => line.level === 'error' || line.text.includes('FAIL')));
  for (const file of ['inventory.js', 'detail.js']) { const source = fs.readFileSync(path.join(__dirname, '../src/ui/', file), 'utf8'); assert(!source.includes('requestAnimationFrame')); assert(!source.includes('setInterval')); }
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/inventory.css'), 'utf8'); assert(!css.includes('scroll-snap-type: x mandatory')); assert(css.includes('.inventory-track')); assert(!css.includes('@keyframes')); assert(css.includes('width: var(--inventory-tile-width)'));
});
console.log('\n' + passed + ' Stage 7 behavior groups passed. Browser appearance, screenshots, paint cost and measured FPS remain unverified.');
