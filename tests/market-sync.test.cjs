'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const copy = x => JSON.parse(JSON.stringify(x));
function harness(saved) {
  const listeners = {}, storage = new Map(); let seq = 0, failStorage = false;
  const C = { market: {}, data: {}, config: { storage: { key: 'save', schemaVersion: 1 }, packs: { startingPacks: 1, maxStored: 5 } },
    randomId: prefix => prefix + '-' + (++seq).toString().padStart(8, '0'),
    settingsSchema: { normalize: x => x || {} }, inventoryModel: { normalize: x => x || {}, defaults: () => ({}) },
    currency: { normalize: x => x || {}, notify() {} }, cutsceneUnlocks: { normalize: x => x || {} },
    events: { on: (k, fn) => (listeners[k] ||= []).push(fn), notify: (k, d) => (listeners[k] || []).forEach(fn => fn(d)), emit() {} } };
  const root = { Cardable: C, console: { error() {}, info() {} }, Set, Promise,
    localStorage: { getItem: k => storage.get(k), setItem(k, v) { if (failStorage) throw new Error('storage failed'); storage.set(k, v); } },
    addEventListener() {}, setTimeout: () => 1, clearTimeout() {} };
  root.window = root; vm.createContext(root);
  for (const file of ['src/core/state.js', 'src/market/online/sync.js']) vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), root, { filename: file });
  C.state.current = saved ? copy(saved) : { playerCode: 'TEST', createdAt: 1, currency: 100, inventory: [item('local')], settings: {}, inventoryUi: { favorites: ['local'] } };
  C.state.validate = s => { assert.ok(s.currency >= 0); assert.equal(new Set(s.inventory.map(i => i.instanceId)).size, s.inventory.length); };
  const calls = [];
  C.market.online = { state: { status: 'online' }, applyWallet() {}, applyInventory() {}, authed(method, route, body, options) { calls.push({ method, route, body: copy(body || null), options: copy(options || {}), headers: copy(C.market.sync.headers()) }); return Promise.resolve().then(() => server(body, method, route, options)); } };
  let server = body => snapshot(C, body);
  return { C, calls, storage, setServer: fn => server = fn, fail: x => failStorage = x, loadProvider() { C.market.onlineData = { used() {}, invalidate: () => Promise.resolve(), state: {} }; C.market.ui = { sim: { newRequestId: () => 'request-12345678' } }; vm.runInContext(fs.readFileSync(path.join(base, 'src/market/online/provider.js'), 'utf8'), root); }, stored: () => JSON.parse(storage.get('save')) };
}
function item(id) { return { instanceId: id, cardId: 'gpu', serial: id + '-serial', packId: 'standard', pulledAt: 1, seen: true, source: 'shop-pack', shopEntitlementId: 'original', pickerChoice: { index: 1, count: 3 } }; }
function snapshot(C, body, extras = {}) { const u = C.state.current.unified; return { accountId: 'acct', deviceId: u.deviceId, sequence: body && body.sequence || 0, balance: 100, held: 0, items: [Object.assign(item('canonical'), { serial: 'local-serial' })], mapping: { local: 'canonical' }, ...extras }; }
function change(G, fn) { const s = copy(G.C.state.current); fn(s); assert.equal(G.C.state.commit(s), true); }

test('old saves stay untouched, link migrates actual identities and provenance once', async () => {
  const G = harness(); change(G, s => { s.currency += 5; });
  assert.equal(G.C.state.current.unified, undefined);
  await G.C.market.sync.link();
  assert.equal(G.calls[0].route, '/v1/game/link');
  assert.equal(G.calls[0].body.balance, 105); assert.equal(G.calls[0].body.items[0].shopEntitlementId, 'original');
  assert.equal(G.C.state.current.inventory[0].instanceId, 'canonical');
  assert.equal(G.C.state.current.inventoryUi.favorites[0], 'canonical');
  assert.equal(G.C.state.current.inventory[0].pickerChoice.index, 1);
  assert.equal(G.C.market.sync.ready(), true);
});

test('commit and in-place save persist wallet deltas and rolled additions with the same write', async () => {
  const G = harness(); await G.C.market.sync.link();
  change(G, s => { s.currency -= 20; s.inventory.push(item('rolled-once')); });
  let pending = G.stored().unified.pending;
  assert.equal(pending.length, 1); assert.equal(pending[0].delta, -20); assert.equal(pending[0].add[0].serial, 'rolled-once-serial');
  G.C.state.current.currency += 7; G.C.state.save();
  pending = G.stored().unified.pending;
  assert.equal(pending.length, 2); assert.equal(pending[1].delta, 7);
  G.C.state.save(); assert.equal(G.stored().unified.pending.length, 2);
  const reloaded = harness(G.stored()); assert.equal(reloaded.C.market.sync.state.pending, 2);
});

test('migration cancels stale queued listings without blocking owned cards or future sync', async () => {
  const G = harness();
  G.C.state.current.inventory.push(item('kept'));
  G.C.state.current.unified = { deviceId: 'device-stale', pending: [], pendingListings: [
    { originalId: 'old-sold', requestId: 'publish-sold', spec: { instanceIds: ['local'] } },
    { originalId: 'old-kept', requestId: 'publish-kept', spec: { instanceIds: ['kept'] } }
  ] };
  G.setServer(body => snapshot(G.C, body, { items: [item('canonical-kept')], mapping: { local: null, kept: 'canonical-kept' } }));
  await G.C.market.sync.link();
  const u = G.stored().unified;
  assert.equal(u.pendingListings.length, 1);
  assert.deepEqual(u.pendingListings[0].spec.instanceIds, ['canonical-kept']);
  assert.equal(u.cancelledListings[0].originalId, 'old-sold');
  assert.equal(u.migrationBackup.inventory.length, 2);
  await G.C.market.sync.sync();
  assert.equal(G.C.market.sync.ready(), true);
  assert.equal(G.stored().unified.cancelledListings.length, 1);
});

test('uncertain delivery retries the identical durable batch, then applies a server receipt exactly once', async () => {
  const G = harness(); await G.C.market.sync.link(); change(G, s => { s.currency += 30; });
  G.setServer(() => { throw Object.assign(new Error('offline'), { code: 'offline' }); });
  await assert.rejects(G.C.market.sync.sync(), /offline/);
  const request = copy(G.calls.at(-1).body); const saved = G.stored();
  const H = harness(saved);
  H.setServer(body => snapshot(H.C, body, { balance: 130 }));
  await H.C.market.sync.sync();
  assert.deepEqual(H.calls[0].body, request); assert.equal(H.C.state.current.currency, 130); assert.equal(H.C.market.sync.state.pending, 0);
  await H.C.market.sync.sync(); assert.equal(H.C.state.current.currency, 130); assert.equal(H.C.market.sync.state.pending, 0);
});

test('progress committed during a request merges over the incoming snapshot and stays pending', async () => {
  const G = harness(); await G.C.market.sync.link(); change(G, s => { s.currency += 10; });
  let answer; G.setServer(() => new Promise(resolve => { answer = resolve; }));
  const p = G.C.market.sync.sync();
  while (!answer) await Promise.resolve();
  change(G, s => { s.currency += 9; s.inventory.push(item('new-pull')); });
  answer(snapshot(G.C, { sequence: 1 }, { balance: 110, held: 30, locks: { canonical: 'listing' } })); await p;
  assert.equal(G.C.state.current.currency, 119); assert.equal(G.C.market.sync.state.pending, 1);
  assert.equal(G.C.state.current.inventory.find(i => i.instanceId === 'new-pull').serial, 'new-pull-serial');
  assert.equal(G.C.market.sync.heldCredits(), 30); assert.equal(G.C.market.sync.lockOf('canonical'), 'listing');
  assert.equal(G.C.market.sync.ready(), false);
});

test('device conflict and failed writes preserve the local journal and never force takeover', async () => {
  const G = harness(); await G.C.market.sync.link(); change(G, s => { s.currency += 10; });
  G.setServer(body => snapshot(G.C, body, { deviceId: 'another-device', balance: 999 }));
  await assert.rejects(G.C.market.sync.sync(), /Another device/);
  assert.equal(G.C.state.current.currency, 110); assert.equal(G.C.market.sync.state.pending, 1);
  assert.equal(G.C.market.sync.state.status, 'device-mismatch');
  G.fail(true); await assert.rejects(G.C.market.sync.sync(), /Save your collection/);
  assert.equal(G.C.state.current.currency, 110); assert.equal(G.C.market.sync.state.pending, 1);
  assert.ok(G.calls.every(c => !c.route.includes('transfer')));
});

test('fresh-profile recovery requires a separate restore and backs up its collection before adoption', async () => {
  const G = harness(); const original = copy(G.C.state.current); let active = 'lost-device';
  G.setServer((body, method, route, options) => {
    if (route === '/v1/game/transfer') {
      assert.equal(G.stored().unified.recoveryRequest.key, options.idempotencyKey);
      assert.equal(body.deviceId, 'lost-device'); assert.equal(body.sequence, 7);
      active = body.newDeviceId;
    }
    return snapshot(G.C, null, { linked: true, deviceId: active, sequence: 7, balance: 420, items: [item('restored')] });
  });
  await assert.rejects(G.C.market.sync.recover(), { code: 'device-mismatch' });
  assert.equal(G.calls.filter(c => c.route.includes('transfer')).length, 0);
  assert.equal(G.C.state.current.currency, original.currency);
  await G.C.market.sync.restoreLastSynced();
  assert.equal(G.C.state.current.currency, 420);
  assert.deepEqual(copy(G.C.state.current.inventory), [item('restored')]);
  assert.deepEqual(G.stored().unified.localBackup.inventory, original.inventory);
  assert.equal(G.stored().unified.localBackup.currency, 100);
  assert.equal(G.stored().unified.recoveryRequest, undefined);
  assert.equal(G.C.market.sync.ready(), true);
});

test('explicit restore isolates a stale linked journal, pending trade and reserved pack in the full backup', async () => {
  const G = harness(); await G.C.market.sync.link();
  change(G, s => { s.currency += 55; s.inventory.push(item('stale-pull')); s.pendingReveal = { options: ['reserved'] }; s.shop = { entitlement: { id: 'reserved' }, history: ['keep'] }; s.unified.actionRequest = { key: 'stale-sale', method: 'POST', path: '/v1/sell', body: {} }; });
  const prior = copy(G.C.state.current); let active = 'lost-device'; G.calls.length = 0;
  G.setServer((body, method, route) => {
    assert.ok(route === '/v1/game/state' || route === '/v1/game/transfer');
    if (route.endsWith('/transfer')) active = body.newDeviceId;
    return snapshot(G.C, null, { linked: true, deviceId: active, sequence: 12, balance: 70, items: [item('last-synced')] });
  });
  await G.C.market.sync.restoreLastSynced(); await G.C.market.sync.sync();
  assert.equal(G.C.state.current.currency, 70);
  assert.deepEqual(G.stored().unified.localBackup, prior);
  assert.equal(G.stored().unified.pending.length, 0);
  assert.equal(G.stored().unified.actionRequest, undefined);
  assert.equal(G.stored().pendingReveal, undefined); assert.equal(G.stored().shop.entitlement, undefined);
  assert.deepEqual(G.stored().shop.history, ['keep']);
});

test('lost restore response and failed adoption survive reload without uploading the old journal', async () => {
  const G = harness(); await G.C.market.sync.link(); change(G, s => { s.currency += 33; });
  let active = 'lost-device', first = true, key;
  const server = game => (body, method, route, options) => {
    assert.ok(route === '/v1/game/state' || route === '/v1/game/transfer');
    if (route.endsWith('/transfer')) {
      key = options.idempotencyKey; active = body.newDeviceId;
      assert.equal(game.stored().unified.recoveryRequest.key, key);
      if (first) { first = false; throw Object.assign(new Error('lost transfer reply'), { code: 'offline' }); }
    }
    return snapshot(game.C, null, { linked: true, deviceId: active, sequence: 9, balance: 250 });
  };
  G.setServer(server(G));
  await assert.rejects(G.C.market.sync.restoreLastSynced(), /lost transfer reply/);
  const durable = G.stored(); assert.equal(durable.unified.recoveryRequest.key, key);
  const H = harness(durable); H.setServer(server(H)); H.fail(true);
  await assert.rejects(H.C.market.sync.recover(), { code: 'save-failed' });
  assert.equal(H.C.state.current.currency, 133); assert.equal(H.C.state.current.unified.recoveryRequest.key, key);
  H.fail(false); await H.C.market.sync.sync();
  assert.equal(H.C.state.current.currency, 250); assert.equal(H.stored().unified.localBackup.currency, 133);
  assert.equal(H.stored().unified.localBackup.unified.pending.length, 1);
  assert.equal(H.calls.filter(c => c.route.endsWith('/transfer')).length, 0);
});

test('unreceived restore retries the durable transfer key and failed intent persistence sends nothing', async () => {
  const G = harness(); let reject = true; const keys = [];
  G.setServer((body, method, route, options) => {
    if (route.endsWith('/transfer')) {
      keys.push(options.idempotencyKey);
      if (reject) throw Object.assign(new Error('offline before transfer'), { code: 'offline' });
      return snapshot(G.C, null, { linked: true });
    }
    return snapshot(G.C, null, { linked: true, deviceId: keys.length > 1 ? G.C.state.current.unified.deviceId : 'lost-device', sequence: 3 });
  });
  G.C.market.sync.deviceId(); G.fail(true);
  await assert.rejects(G.C.market.sync.restoreLastSynced(), { code: 'save-failed' }); assert.equal(keys.length, 0);
  G.fail(false); await assert.rejects(G.C.market.sync.restoreLastSynced(), /offline before transfer/);
  reject = false; await G.C.market.sync.link();
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
});

test('pending restore cannot send its transfer under a different recovered account', async () => {
  const G = harness(); G.C.market.sync.deviceId();
  G.C.state.current.unified.recoveryRequest = { key: 'restore-old', accountId: 'original-account', body: { deviceId: 'lost-device', newDeviceId: G.C.market.sync.deviceId(), sequence: 1 } };
  G.setServer(body => snapshot(G.C, body, { linked: true, accountId: 'different-account', deviceId: 'lost-device' }));
  await assert.rejects(G.C.market.sync.sync(), { code: 'recovery-account' });
  assert.equal(G.calls.length, 1); assert.equal(G.C.state.current.unified.recoveryRequest.key, 'restore-old');
});


test('lost trade reply survives offline reload, replays original key before earned gameplay and releases once', async () => {
  const G = harness(); await G.C.market.sync.link(); G.loadProvider();
  let sales = 0, receipt = false;
  G.setServer((body, method, route, options) => {
    if (route === '/v1/sell') {
      assert.equal(G.stored().unified.actionRequest.key, options.idempotencyKey);
      sales++; receipt = true;
      throw Object.assign(new Error('lost reply'), { code: 'offline' });
    }
    return snapshot(G.C, body);
  });
  const result = await G.C.market.onlineProvider.quickSell('global', { instanceIds: ['canonical'], expectTotal: 20, requestId: 'sell-request-1234' });
  assert.equal(result.ok, false); assert.equal(receipt, true); assert.equal(sales, 1);
  const savedRequest = copy(G.stored().unified.actionRequest);
  const H = harness(G.stored()); H.C.market.online.state.status = 'offline';
  assert.equal(H.C.market.sync.heldCredits(), 100); assert.equal(H.C.market.sync.lockOf('canonical'), 'players-request');
  assert.equal(H.C.market.sync.ready(), false);
  change(H, s => { s.currency += 7; s.inventory.push(item('earned-pack')); });
  assert.equal(H.C.market.sync.heldCredits(), 107);
  H.setServer(() => { throw Object.assign(new Error('offline'), { code: 'offline' }); });
  await assert.rejects(H.C.market.sync.flush(), /offline/);
  assert.deepEqual(H.stored().unified.actionRequest, savedRequest);
  H.C.market.online.state.status = 'online';
  H.calls.length = 0;
  H.setServer((body, method, route, options) => {
    if (route === '/v1/sell') {
      assert.equal(options.idempotencyKey, savedRequest.key);
      assert.deepEqual(copy(body), savedRequest.body);
      assert.equal(H.C.market.sync.headers()['x-game-sequence'], '0');
      return { receiptId: 'already-sold' }; // server idempotency cache: no second sale
    }
    if (route === '/v1/game/sync') {
      assert.equal(H.C.state.current.unified.actionRequest, undefined);
      assert.equal(body.operations.length, 1); assert.equal(body.operations[0].delta, 7);
      return snapshot(H.C, body, { balance: 127, items: [item('earned-pack')], mapping: {} });
    }
    return snapshot(H.C, null, { balance: 120, items: [], mapping: {} });
  });
  await H.C.market.sync.flush();
  assert.deepEqual(H.calls.map(c => c.route), ['/v1/sell', '/v1/game/state', '/v1/game/sync']);
  assert.equal(H.C.state.current.currency, 127); assert.equal(H.C.state.current.inventory.length, 1);
  assert.equal(H.C.state.current.inventory[0].instanceId, 'earned-pack');
  assert.equal(H.C.market.sync.heldCredits(), 0); assert.equal(H.C.market.sync.lockOf('earned-pack'), null);
  assert.equal(H.C.market.sync.ready(), true); assert.equal(H.stored().unified.actionRequest, undefined);
  assert.equal(sales, 1);
});

test('trade intent save must succeed before sending and receipt save failure preserves intent and holds', async () => {
  const G = harness(); await G.C.market.sync.link();
  const request = { method: 'POST', path: '/v1/sell', body: { instanceIds: ['canonical'] }, key: 'sale-save-test' };
  G.fail(true); assert.throws(() => G.C.market.sync.beginAction(request), /Save your collection/);
  assert.equal(G.calls.length, 1); assert.equal(G.C.state.current.unified.actionRequest, undefined);
  G.fail(false); G.C.market.sync.beginAction(request); G.C.market.sync.endAction();
  G.setServer((body, method, route) => {
    if (route === '/v1/sell') return { receiptId: 'sale' };
    G.fail(true); return snapshot(G.C, body, { balance: 120, items: [] });
  });
  await assert.rejects(G.C.market.sync.sync(), /Save your collection/);
  assert.deepEqual(G.stored().unified.actionRequest, request);
  assert.equal(G.C.state.current.currency, 100); assert.equal(G.C.market.sync.heldCredits(), 100);
  assert.equal(G.C.market.sync.lockOf('canonical'), 'players-request');
});

test('typed no-effect reply reconciles snapshot while network, auth and server errors preserve request', async () => {
  for (const [code, status] of [['offline', 0], ['bad-token', 401], ['internal', 500], ['forbidden', 403], ['http-409', 409], ['sequence-conflict', 409]]) {
    const G = harness(); await G.C.market.sync.link();
    G.C.market.sync.beginAction({ method: 'POST', path: '/v1/sell', body: {}, key: 'failed-' + code }); G.C.market.sync.endAction();
    G.setServer(() => { throw Object.assign(new Error(code), { code, detail: { status } }); });
    await assert.rejects(G.C.market.sync.flush(), new RegExp(code));
    assert.ok(G.stored().unified.actionRequest); assert.equal(G.C.market.sync.heldCredits(), 100);
  }
  const G = harness(); await G.C.market.sync.link();
  G.C.market.sync.beginAction({ method: 'POST', path: '/v1/sell', body: {}, key: 'not-owned-123' }); G.C.market.sync.endAction();
  G.setServer((body, method, route) => {
    if (route === '/v1/sell') throw Object.assign(new Error('not-owned'), { code: 'not-owned', detail: { status: 409 } });
    return snapshot(G.C, body, { held: 25, locks: { canonical: 'listing' } });
  });
  await G.C.market.sync.flush();
  assert.equal(G.stored().unified.actionRequest, undefined); assert.equal(G.C.market.sync.heldCredits(), 25);
  assert.equal(G.C.market.sync.lockOf('canonical'), 'listing');
});
