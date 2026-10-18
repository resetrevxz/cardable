'use strict';
// The notch's feed (src/market/notch.js) is pure: a snapshot of the player's market life and their settings in, an ordered list of
// what to say out. These pin the promises the interface relies on: priority follows the player's order, a quiet notch stays quiet,
// what needs you comes first and stays, pins and snoozes work, quick bid options never exceed what the player can afford, and the
// same input always gives the same answer.
//   node --test tests/market-notch.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { console }; sandbox.window = sandbox; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'market', 'notch.js'), 'utf8'), sandbox, { filename: 'notch.js' });
const N = sandbox.Cardable.market.notch;
// objects made inside the sandbox have another realm's prototypes, so compare by value
const same = (a, b, message) => assert.equal(JSON.stringify(a), JSON.stringify(b), message);

const names = { c1: 'GeForce GTX 760', c2: 'Radeon RX 5600 XT', c3: 'GeForce RTX 4090', c4: 'Apple M1 Pro GPU', c5: 'Radeon 7500' };
const tiers = { c1: 0, c2: 3, c3: 8, c4: 1, c5: 2 };
const base = () => ({ name: (id) => names[id] || id, rarity: (id) => ({ id: 'r' + tiers[id], tier: tiers[id], name: 'Tier ' + tiers[id] }), now: 1000, mode: 'busy', order: N.DEFAULT_ORDER.slice() });
const card = (cardId) => ({ cardId, variantId: null, serial: 'CBL-TEST-000001' });
const auction = (id, cardId, o) => Object.assign({ id, listingId: id, status: 'active', format: 'auction', card: card(cardId), endsMin: 300, auction: { current: 100, minNext: 105, myMax: 100, youLead: false, bids: 3 } }, o || {}, { auction: Object.assign({ current: 100, minNext: 105, myMax: 100, youLead: false, bids: 3 }, (o && o.auction) || {}) });
const snap = (extra) => Object.assign({ realm: 'simulation', live: true, clock: 'Day 2 · 06:00', clockState: 'running', clockWord: 'Running', wallet: { balance: 1000, held: 200, available: 800 },
  worth: { now: 5000, credits: 1000, cards: 4000, start: 4500, dayChange: 120 }, bids: [], mine: [], orders: [], offers: [], notices: [], moves: [], news: [], sales: [], movers: [], matches: [], rare: [] }, extra || {});
const cats = (r) => r.items.map((i) => i.cat);

test('the player\'s order is the priority: moving a category up moves its items up', () => {
  const s = snap({ sales: [{ id: 't1', cardId: 'c3', price: 4200, average: 3000, minutesAgo: 20 }], movers: [{ cardId: 'c2', change24h: -0.2, owned: 2 }] });
  const a = N.build(s, Object.assign(base(), { order: N.normalizeOrder('') }));
  assert.ok(cats(a).indexOf('sales') < cats(a).indexOf('fell'), 'by default big sales come before price falls');
  const b = N.build(s, Object.assign(base(), { order: N.normalizeOrder('fell,sales') }));
  assert.ok(cats(b).indexOf('fell') < cats(b).indexOf('sales'), 'after the player moves "fell" first it leads');
  same(N.normalizeOrder('fell,nonsense,fell,sales').slice(0, 2), ['fell', 'sales'], 'unknown and repeated ids are ignored');
  assert.equal(N.normalizeOrder('fell').length, N.DEFAULT_ORDER.length, 'every category is always present');
});

test('what needs you is loud, comes first and replaces the quiet things on the pill', () => {
  const s = snap({ bids: [auction('L1', 'c1')], sales: [{ id: 't1', cardId: 'c3', price: 4200, average: 3000, minutesAgo: 20 }] });
  const r = N.build(s, base());
  assert.equal(r.items[0].cat, 'outbid'); assert.equal(r.items[0].loud, true);
  same(r.spotlight.map((i) => i.cat), ['outbid'], 'only the loud item is on the pill');
  assert.equal(N.build(snap(), base()).loud.length, 0);
});

test('quiet speaks only about what needs you; calm adds what is going on; busy adds the background', () => {
  const s = snap({ bids: [auction('L1', 'c1', { auction: { youLead: true, myMax: 120, current: 110 } })], news: [{ id: 'n1', up: true, headline: 'GeForce demand is rising', when: 'Starts in 2 h' }], sales: [{ id: 't1', cardId: 'c3', price: 4200, average: 3000, minutesAgo: 20 }] });
  const quiet = N.build(s, Object.assign(base(), { mode: 'quiet' })), calm = N.build(s, Object.assign(base(), { mode: 'calm' })), busy = N.build(s, Object.assign(base(), { mode: 'busy' }));
  assert.ok(!cats(quiet).some((c) => ['bids', 'sales', 'news'].indexOf(c) >= 0), 'quiet: none of the background');
  assert.ok(cats(calm).includes('bids') && cats(calm).includes('sales') && !cats(calm).includes('news'), 'calm: what is going on, no news');
  assert.ok(cats(busy).includes('news'), 'busy: the news too');
  assert.ok(quiet.items.some((i) => i.cat === 'worth'), 'the ambient items are always available when nothing else is');
});

test('a hidden category never appears, and hiding everything still leaves the clock', () => {
  const s = snap({ bids: [auction('L1', 'c1')] });
  assert.ok(!cats(N.build(s, Object.assign(base(), { hidden: { outbid: true } }))).includes('outbid'));
  const all = {}; N.CATS.forEach((c) => { if (c.id !== 'clock') all[c.id] = true; });
  const r = N.build(s, Object.assign(base(), { hidden: all }));
  same(r.spotlight.map((i) => i.cat), ['clock'], 'the clock keeps the pill from going blank');
  same(N.normalizeHidden('outbid, nonsense,deals'), { outbid: true, deals: true });
});

test('pins come first, and a snoozed item is gone until its time is up', () => {
  const s = snap({ bids: [auction('L1', 'c1'), auction('L2', 'c2', { endsMin: 20 })], mine: [{ id: 'L9', status: 'active', format: 'fixed', card: card('c4'), ask: 40 }] });
  const plain = N.build(s, base());
  assert.equal(plain.items[0].id, 'bid:L2', 'the auction ending sooner is first inside the category');
  const pinned = N.build(s, Object.assign(base(), { pins: { 'mine:L9': true } }));
  assert.equal(pinned.items[0].id, 'mine:L9', 'a pinned listing leads');
  const snoozed = N.build(s, Object.assign(base(), { snooze: { 'bid:L2': 5000 } }));
  assert.ok(!snoozed.items.some((i) => i.id === 'bid:L2'), 'snoozed');
  const later = N.build(s, Object.assign(base(), { snooze: { 'bid:L2': 900 }, now: 1000 }));
  assert.ok(later.items.some((i) => i.id === 'bid:L2'), 'back after its time');
});

test('quick bid options lead the auction, never go below the minimum, never exceed what can be afforded, and are distinct', () => {
  const b = auction('L1', 'c1', { auction: { current: 100, minNext: 105, myMax: 100, youLead: false } });
  const rich = N.raiseOptions(b, { available: 5000 });
  assert.ok(rich.length >= 2 && rich.length <= 3);
  rich.forEach((o) => { assert.ok(o.max >= 105, 'at least the minimum next bid'); assert.ok(o.max <= 100 + 5000, 'within the maximum already held plus what is free'); });
  assert.equal(new Set(rich.map((o) => o.max)).size, rich.length, 'distinct');
  same(rich.map((o) => o.max), rich.map((o) => o.max).sort((x, y) => x - y), 'ascending');
  assert.equal(rich[0].label, 'Lead'); assert.equal(rich[0].max, 105);
  const poor = N.raiseOptions(b, { available: 3 });
  assert.equal(poor.length, 0, 'with 3 free Credits (103 in all) nothing reaches the 105 minimum');
  const tight = N.raiseOptions(b, { available: 12 });
  assert.ok(tight.every((o) => o.max <= 112), 'capped by the wallet: ' + JSON.stringify(tight));
  const lead = N.raiseOptions(auction('L2', 'c1', { auction: { current: 100, minNext: 105, myMax: 140, youLead: true } }), { available: 500 });
  assert.ok(lead.every((o) => o.max > 140), 'when leading, raising means a bigger maximum than the one already held');
  same(N.raiseOptions({ card: card('c1') }, { available: 100 }), [], 'a fixed-price listing has none');
});

test('an outbid item carries its quick actions as data, one per option', () => {
  const r = N.build(snap({ bids: [auction('L1', 'c1')] }), base());
  const it = r.items.find((i) => i.cat === 'outbid');
  assert.ok(it.actions.length >= 2);
  it.actions.forEach((a) => { assert.equal(a.kind, 'raise'); assert.equal(a.listingId, 'L1'); assert.ok(a.max >= 105); assert.ok(a.id.indexOf('raise:L1:') === 0); });
  same(it.go, { name: 'listing', params: { id: 'L1' } });
});

test('good deals, a rare find and a wishlist match say what and what to do', () => {
  const move = { type: 'buy', tag: 'Fire sale', listingId: 'L5', itemId: 'i5', cardId: 'c5', cost: 25, resell: 31, gain: 5, expiresMin: 100, card: { id: 'c5' } };
  const r = N.build(snap({ moves: [move], rare: [{ id: 'L6', status: 'active', format: 'fixed', ask: 4200, fire: true, card: card('c3') }], matches: [{ kind: 'wishlist', note: 'Wishlist', listing: { id: 'L7', format: 'fixed', ask: 90, card: card('c2'), status: 'active' } }] }), base());
  const deal = r.items.find((i) => i.cat === 'deals'), rare = r.items.find((i) => i.cat === 'rare'), want = r.items.find((i) => i.cat === 'watch');
  assert.equal(deal.label, 'Fire sale'); assert.equal(deal.actions[0].kind, 'move'); assert.equal(deal.actions[0].label, 'Buy 25'); assert.equal(deal.move, move);
  assert.ok(/listed/.test(rare.label) && rare.tier === 8 && rare.line.indexOf('Fire sale') === 0, JSON.stringify(rare));
  assert.equal(want.label, 'On your wishlist'); assert.ok(/90/.test(want.line));
});

test('price movers speak only past the threshold, and falls and rises are separate categories', () => {
  const s = snap({ movers: [{ cardId: 'c1', change24h: -0.03, owned: 1 }, { cardId: 'c2', change24h: -0.18, owned: 2 }, { cardId: 'c5', change24h: 0.12, owned: 1 }] });
  const calm = N.build(s, Object.assign(base(), { mode: 'calm' }));
  same(calm.items.filter((i) => i.cat === 'fell').map((i) => i.cardId), ['c2']);
  same(calm.items.filter((i) => i.cat === 'rose').map((i) => i.cardId), ['c5']);
  const busy = N.build(snap({ movers: [{ cardId: 'c1', change24h: -0.07, owned: 1 }] }), Object.assign(base(), { mode: 'busy' }));
  assert.equal(busy.items.filter((i) => i.cat === 'fell').length, 1, 'busy hears smaller moves');
});

test('the value of your cards and the Credits to spend are shown with their change, and Global without a world shows no spend', () => {
  const r = N.build(snap(), base()), w = r.items.find((i) => i.cat === 'worth'), p = r.items.find((i) => i.cat === 'spend');
  assert.equal(w.label, '5,000'); assert.ok(/▲ 120 today/.test(w.title), w.title);
  assert.equal(p.label, '800'); assert.ok(/200 held/.test(p.title), p.title);
  const g = N.build(snap({ realm: 'global', live: false, worth: null }), base());
  assert.ok(!g.items.some((i) => i.cat === 'spend' || i.cat === 'worth'));
  assert.equal(g.spotlight[0].cat, 'clock');
});

test('fresh sales come from unread notices only, newest first, and quote what happened without repeating the label', () => {
  const s = snap({ notices: [{ id: 'a', kind: 'sold', kindLabel: 'Sold', text: 'Sold GeForce GTX 760 for 120 Credits', minutesAgo: 5, read: false, listingId: 'L1' }, { id: 'b', kind: 'sold', kindLabel: 'Sold', text: 'Sold Radeon 7500', minutesAgo: 9, read: true }, { id: 'c', kind: 'bought', kindLabel: 'Bought', text: 'Bought X', minutesAgo: 600, read: false }, { id: 'd', kind: 'outbid', kindLabel: 'Outbid', text: 'x', minutesAgo: 1, read: false }] });
  const sold = N.build(s, base()).items.filter((i) => i.cat === 'sold');
  assert.equal(sold.length, 1); assert.equal(sold[0].title, 'GeForce GTX 760 for 120 Credits'); assert.equal(sold[0].label, 'Sold');
});

test('it is deterministic and never mutates what it is given', () => {
  const s = snap({ bids: [auction('L1', 'c1')], moves: [{ type: 'buy', tag: 'Deal', listingId: 'L5', itemId: 'i5', cardId: 'c5', cost: 25, resell: 31, gain: 5, card: { id: 'c5' } }] });
  const before = JSON.stringify(s), cfg = base();
  const a = JSON.stringify(N.build(s, cfg).items.map((i) => [i.id, i.cat])), b = JSON.stringify(N.build(s, cfg).items.map((i) => [i.id, i.cat]));
  assert.equal(a, b); assert.equal(JSON.stringify(s), before);
});

test('every category has a label, an icon, a bucket and a hint the customise sheet can show', () => {
  N.CATS.forEach((c) => { assert.ok(c.label && c.icon && c.bucket && c.hint, c.id); assert.ok(N.BUCKETS.some((b) => b.id === c.bucket), c.id + ' bucket'); });
  assert.equal(new Set(N.CATS.map((c) => c.id)).size, N.CATS.length);
});

test('the settings default for the order is the feed\'s own default order, so a reset and a fresh profile agree', () => {
  const text = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'data', 'market-settings.js'), 'utf8');
  const literal = /var ORDER = '([^']+)'/.exec(text)[1];
  assert.equal(literal, N.DEFAULT_ORDER.join(','));
});
