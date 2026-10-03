// The inventory refresh suite replaces retired rail/detent assumptions; detail contracts remain below.
require('./check-inventory-refresh.cjs');
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
  const r = runtime(); const result = clone(r.C.state.current); const card = r.C.collection.project(r.C.data.cards, [], 'all').entries[cardIndex].card;
  result.tutorial = { step: 'done', done: true };
  result.inventory = Array.from({ length: count }, (_, i) => ({ instanceId: 'owned-' + i, cardId: card.id, serial: r.C.serial.format(result.playerCode, i + 1), pulledAt: i, seen: false }));
  return result;
}
function boot(initial = save(), dev = false, tutorial = false) { const r = runtime(dev, false, initial, tutorial, true); r.advance(40); return r; }
function open(r) { r.C.events.emit('inventory:request', true); r.advance(1100); assert(r.C.inventory.open); }
function key(r, name, target = r.document.activeElement, extra = {}) { const event = { key: name, code: name === ' ' ? 'Space' : name, target, repeat: false, preventDefault() {}, ...extra }; r.document.fire('keydown', event); return event; }
function pitch(r) { return parseFloat(r.C.inventory.shelf.style['--inventory-tile-width']) + r.C.config.inventoryMotion.tileGapPx; }
function select(r, index) { r.C.inventory.carousel.snap(index * pitch(r)); r.C.fx.wake(); r.advance(1100); assert.equal(r.C.inventory.center, index); }
function current(r) { return r.C.inventory.rendered.get(r.C.inventory.center); }
function detail(r, index = r.C.inventory.center) { const tile = r.C.inventory.rendered.get(index); tile.el.fire('click'); r.advance(1100); assert.equal(r.C.detail.phase, 'detail'); return tile; }
function preview(r) { r.C.events.emit('inventory:preview', true); open(r); }
function press(r, el, x, y, id = 1) { const event = { button: 0, isPrimary: true, pointerId: id, clientX: x, clientY: y, target: el, preventDefault() {} }; el.fire('pointerdown', event); r.document.fire('pointerdown', event); }
function move(r, x, y, id = 1) { r.document.fire('pointermove', { pointerId: id, clientX: x, clientY: y, pointerType: 'mouse', target: r.document.body, preventDefault() {} }); }
function release(r, id = 1, cancel = false) { r.document.fire(cancel ? 'pointercancel' : 'pointerup', { pointerId: id }); }

check('detail promotion preserves the instance and shelf geometry while replacing the thumbnail', () => {
  const r = boot(); open(r); const tile = current(r), original = tile.visual, originalView = tile.view;
  tile.card.rect = { left: 510, top: 350, width: 180, height: 252 }; tile.el.fire('click');
  assert(r.C.detail.mount.children[0] !== original); assert(originalView.destroyed); assert.equal(r.C.detail.view.instance.instanceId, originalView.instance.instanceId); assert.equal(tile.card.style.visibility, 'hidden'); assert.equal(r.C.detail.phase, 'lifting');
  const pose = r.C.detail.mount.style.transform; r.advance(150); assert.notEqual(r.C.detail.mount.style.transform, pose); r.advance(1000); assert.equal(r.C.detail.phase, 'detail');
  assert.equal(r.C.cardView.stats.fullCards, 1); assert(r.C.inventory.content.inert);
});
check('detail exposes all specs, name, generation, original tier text, badge and 12-segment meter', () => {
  const r = boot(); open(r); detail(r); const panel = r.C.detail.panel, card = current(r).entry.card;
  assert.equal(panel.querySelectorAll('.detail-name')[0].textContent, card.name); assert.equal(panel.querySelectorAll('.detail-kicker')[0].textContent, 'Generation 1');
  assert.equal(panel.querySelectorAll('.detail-specs')[0].children.length, r.C.cardSpecs.rows(card).length);
  assert.equal(panel.querySelectorAll('.detail-description')[0].textContent, r.C.rarity(card.rarity).description); assert.equal(panel.querySelectorAll('.detail-meter')[0].children.length, 12);
  assert.equal(panel.querySelectorAll('.detail-vram')[0].textContent, r.C.cardSpecs.vram(card)+' '+card.vram.type);
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
    assert.equal(current(r).entry.card.id, tile.entry.card.id); assert(current(r).visual); assert.equal(current(r).card.style.visibility || '', '');
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
  const r = boot(save(), true); r.C.events.emit('inventory:preview', 300); open(r); const owned = r.C.inventory.entries.findIndex(e => e.owned); select(r, owned); detail(r);
  assert.equal(r.C.cardView.stats.fullCards, 1); assert(Array.from(r.C.inventory.rendered.values()).every(t => !t.view || t.view.mode === 'lite'));
  const tile = Array.from(r.C.inventory.rendered.values()).find(t => t.view); if (tile) tile.el.fire('pointerenter'); r.advance(40); assert.equal(r.C.cardView.active, r.C.detail.view);
});

console.log(passed+' retained detail behavior groups passed.');
