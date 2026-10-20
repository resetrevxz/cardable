/* One collection and wallet. Every offline effect travels with its gameplay save;
 * retries resend durable batches, never reroll a pack or reapply a receipt. */
(function (C, root) {
  'use strict';
  C.market = C.market || {};
  var running = null, applying = false, action = false, timer = 0, status = 'offline', lastError = null, listeners = new Set();
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function current() { return C.state && C.state.current; }
  function value() { return current() && current().unified; }
  function id(prefix) { return C.randomId(prefix); }
  function checkpoint(s) { return { balance: s.currency, ids: s.inventory.map(function (i) { return i.instanceId; }) }; }
  function normalize(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
    var out = clone(v);
    out.pending = Array.isArray(v.pending) ? clone(v.pending) : [];
    out.sequence = Number.isSafeInteger(v.sequence) && v.sequence >= 0 ? v.sequence : 0;
    out.held = Number.isSafeInteger(v.held) && v.held >= 0 ? v.held : 0;
    out.locks = v.locks && typeof v.locks === 'object' ? clone(v.locks) : {};
    out.linked = v.linked === true;
    return out;
  }
  function changed() { if (C.events) C.events.notify('market:sync', api.state); if (C.market.store) C.market.store.emit('online'); listeners.forEach(function (listener) { try { listener(api.state); } catch (error) { if (root.console) root.console.error(error); } }); }
  function fail(code, message) { return Object.assign(new Error(message), { code: code }); }
  function prepareCommit(s) {
    var u = s.unified;
    if (applying || !u || u.recoveryRequest || !(u.linked || u.linkRequest)) return;
    var cp = u.checkpoint;
    if (!cp) { u.checkpoint = checkpoint(s); return; }
    var old = new Set(cp.ids), now = new Set(s.inventory.map(function (i) { return i.instanceId; }));
    var op = { id: id('sync'), delta: s.currency - cp.balance, add: s.inventory.filter(function (i) { return !old.has(i.instanceId); }).map(clone), remove: cp.ids.filter(function (i) { return !now.has(i); }) };
    if (op.delta || op.add.length || op.remove.length) {
      u.pending.push(op); status = 'pending';
    }
    u.checkpoint = checkpoint(s);
  }
  function persist(s) {
    applying = true;
    try { if (!C.state.commit(s)) throw fail('save-failed', 'Save your collection successfully before linking your account.'); }
    finally { applying = false; }
  }
  function mapId(mapping, x) { return Object.prototype.hasOwnProperty.call(mapping, x) ? mapping[x] : x; }
  function applySnapshot(d, acknowledged, actionKey, restoring) {
    var s = clone(current()), u = s.unified, mapping = d.mapping || {}, previous = {};
    if (restoring) {
      var backup = clone(s); delete backup.unified.recoveryRequest;
      s.unified = u = { deviceId: u.deviceId, pending: [], locks: {}, held: 0, localBackup: backup };
      s.inventory = []; delete s.pendingReveal;
      if (s.shop) delete s.shop.entitlement;
    }
    s.inventory.forEach(function (i) { previous[mapId(mapping, i.instanceId)] = i; });
    var ack = new Set(acknowledged || []);
    u.pending = u.pending.filter(function (op) { return !ack.has(op.id); }).map(function (op) {
      op.remove = op.remove.map(function (x) { return mapId(mapping, x); }).filter(Boolean);
      op.add.forEach(function (i) { i.instanceId = mapId(mapping, i.instanceId) || i.instanceId; });
      return op;
    });
    var items = {};
    (d.items || d.inventory || []).forEach(function (i) {
      var key = i.instanceId || i.id, old = previous[key] || {};
      // Keep local presentation progress and all original pack/Shop/picker provenance.
      items[key] = Object.assign({}, old, i, { instanceId: key, seen: old.seen === undefined ? !!i.seen : old.seen });
      delete items[key].state; delete items[key].lockRef;
    });
    var balance = d.balance === undefined ? d.credits : d.balance;
    u.pending.forEach(function (op) {
      balance += op.delta;
      op.remove.forEach(function (key) { delete items[key]; });
      op.add.forEach(function (i) { items[i.instanceId] = clone(i); });
    });
    if (!Number.isSafeInteger(balance) || balance < 0) throw fail('sync-conflict', 'Market could not merge the saved Credits. Your pending progress is preserved.');
    if (C.currency && C.currency.applyInto && balance !== s.currency) C.currency.applyInto(s, balance - s.currency, balance > s.currency ? 'market sale' : 'market purchase');
    else s.currency = balance;
    s.inventory = Object.keys(items).map(function (key) { return items[key]; });
    // References are data, so preserve ordering/favourites across a canonical-id migration.
    function remapRefs(v) { if (Array.isArray(v)) return v.map(function (x) { return typeof x === 'string' ? mapId(mapping, x) || x : remapRefs(x); }); if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { v[k] = typeof v[k] === 'string' && /instanceId$/.test(k) ? mapId(mapping, v[k]) || v[k] : remapRefs(v[k]); }); } return v; }
    if (s.inventoryUi) remapRefs(s.inventoryUi);
    if (u.pendingListings) {
      // An older imported copy may already have sold. Keep its migration record,
      // but do not retry publishing a listing for a card this account no longer owns.
      u.pendingListings = u.pendingListings.filter(function (entry) {
        var missing = entry.spec.instanceIds.some(function (key) { var mapped = mapId(mapping, key); return !mapped || !items[mapped]; });
        if (!missing) return true;
        u.cancelledListings = (u.cancelledListings || []).concat([{ originalId: entry.originalId, requestId: entry.requestId, reason: 'This card was already sold or is no longer owned. Its older listing was cancelled.' }]).slice(-200);
        return false;
      });
      remapRefs(u.pendingListings);
    }
    u.linked = true; u.accountId = d.accountId; u.activeDeviceId = d.deviceId; u.sequence = d.sequence;
    u.revision = d.revision; u.held = d.held === undefined ? d.heldCredits || 0 : d.held; u.locks = d.locks || {};
    (d.items || d.inventory || []).forEach(function (i) { if (i.state && i.state !== 'owned' && i.state !== 'available') u.locks[i.instanceId || i.id] = i.lockRef || i.state; });
    if (d.deviceId && d.deviceId !== u.deviceId) throw fail('device-mismatch', 'Another device is active for this account. Finish syncing there and transfer play before using this save.');
    u.receipt = d.receipt || u.receipt; u.batch = null; delete u.linkRequest;
    if (actionKey && u.actionRequest && u.actionRequest.key === actionKey) delete u.actionRequest;
    u.checkpoint = checkpoint(s);
    if (C.state.validate) C.state.validate(s, false);
    if (d.originId && /^[A-Z2-9]{4}$/.test(d.originId)) s.playerCode = d.originId;
    s.serialCounter = Math.max(s.serialCounter || 0, d.serialCounter || 0);
    var before = current().currency;
    persist(s);
    if (C.collection) C.collection.revision += 1;
    if (C.currency && C.currency.notify) C.currency.notify(before, 'market sale');
    if (C.market.online.applyWallet) C.market.online.applyWallet({ balance: s.currency, held: u.held, available: s.currency - u.held });
    C.market.online.applyInventory(s.inventory.length);
    status = u.pending.length ? 'pending' : 'ready'; lastError = null; changed();
    return d;
  }
  function hook(name) { return Promise.resolve(api[name] ? api[name]() : null); }
  function run(work) {
    if (running) return running;
    status = 'syncing'; lastError = null; changed();
    running = Promise.resolve().then(work).then(function (d) { return (action || value() && value().actionRequest ? Promise.resolve() : hook('afterSync')).then(function () { return d; }); }).catch(function (e) {
      status = e.code === 'device-mismatch' || e.code === 'device-conflict' || e.code === 'active-device' ? 'device-mismatch' : 'offline'; lastError = { code: e.code || 'offline', message: e.message }; changed(); throw e;
    }).finally(function () { running = null; if (!lastError && value() && value().pending.length) schedule(); });
    return running;
  }
  function link() {
    if (value() && value().recoveryRequest) return sync();
    if (value() && value().linked) return sync();
    return run(function () { return hook('beforeSync').then(function () {
      var s = clone(current());
      if (!s) throw fail('no-save', 'Create a collection before connecting.');
      var u = s.unified || { deviceId: id('device'), linked: false, sequence: 0, pending: [], locks: {}, held: 0 };
      if (!u.migrationBackup) { var backup = clone(s); delete backup.unified; u.migrationBackup = backup; }
      if (!u.linkRequest) u.linkRequest = { deviceId: u.deviceId, originId: s.playerCode, balance: s.currency, items: clone(s.inventory), operationId: id('link'), serialCounter: s.serialCounter || 0 };
      u.checkpoint = u.checkpoint || checkpoint(s); s.unified = u; persist(s);
      return C.market.online.authed('POST', '/v1/game/link', u.linkRequest, { idempotencyKey: u.linkRequest.operationId, timeoutMs: 45000 }).then(function (d) { return applySnapshot(d, []); });
    }); });
  }
  function definitive(error) {
    var statusCode = error && error.detail && error.detail.status;
    return !!(error && error.code && !/^http-/.test(error.code)) && statusCode >= 400 && statusCode < 500 && statusCode !== 401 &&
      (statusCode !== 403 || error.code === 'own' || error.code === 'not-yours') &&
      ['signed-out', 'session-ended', 'bad-token', 'device-mismatch', 'device-conflict', 'active-device', 'sync-required', 'sequence-conflict', 'idempotency-conflict'].indexOf(error.code) < 0;
  }
  function replayAction() {
    var request = clone(value().actionRequest);
    return Promise.resolve().then(function () {
      return C.market.online.authed(request.method, request.path, request.body, { idempotencyKey: request.key, timeoutMs: 20000 });
    }).catch(function (error) { if (!definitive(error)) throw error; }).then(function () {
      return C.market.online.authed('GET', '/v1/game/state');
    }).then(function (d) { return applySnapshot(d, [], request.key); });
  }
  function sync() {
    if (value() && value().recoveryRequest) return run(resumeRecovery);
    if (!value() || !value().linked) return link();
    if (action) return Promise.reject(fail('busy', 'Wait for the current player trade to finish.'));
    return run(function () {
      // An uncertain trade must use its original game sequence before journal upload.
      if (value().actionRequest) return replayAction();
      return hook('beforeSync').then(function () {
      var s = clone(current()); prepareCommit(s);
      var u = s.unified;
      if (u.activeDeviceId && u.activeDeviceId !== u.deviceId) throw fail('device-mismatch', 'Transfer play from the active device before syncing this collection.');
      if (!u.batch && u.pending.length) u.batch = { sequence: u.sequence + 1, operations: clone(u.pending.slice(0, 100)), serialCounter: s.serialCounter || 0 };
      persist(s);
      if (!u.batch) return C.market.online.authed('GET', '/v1/game/state').then(function (d) { return applySnapshot(d, []); });
      var batch = clone(u.batch);
      return C.market.online.authed('POST', '/v1/game/sync', { deviceId: u.deviceId, sequence: batch.sequence, operations: batch.operations, serialCounter: batch.serialCounter || 0 }, { idempotencyKey: 'batch-' + u.deviceId + '-' + batch.sequence, timeoutMs: 45000 }).then(function (d) { return applySnapshot(d, batch.operations.map(function (op) { return op.id; })); });
    }); });
  }
  function flush() {
    return sync().then(function () { if (value().actionRequest || value().pending.length) return flush(); if (!api.ready()) throw fail('sync-required', 'Sync this collection before trading with players.'); return api.state; });
  }
  function schedule() {
    if (applying || action || !value() || value().recoveryRequest || !value().linked || !C.market.online.state || C.market.online.state.status !== 'online') return;
    root.clearTimeout(timer); timer = root.setTimeout(function () { timer = 0; if (!running) sync().catch(function () {}); }, 600);
  }
  function deviceId() {
    var s = clone(current());
    if (!s.unified) { s.unified = { deviceId: id('device'), linked: false, sequence: 0, pending: [], held: 0, locks: {} }; persist(s); }
    return s.unified.deviceId;
  }
  function recover() {
    if (value() && value().recoveryRequest) return run(resumeRecovery);
    var own = deviceId();
    return C.market.online.authed('GET', '/v1/game/state').then(function (d) {
      if (!d.linked) return link();
      if (d.deviceId !== own) throw fail('device-mismatch', 'This account is active on another device. Sync there and transfer play to this device first.');
      if (value().linked) return flush();
      var s = clone(current()), backup = clone(s); delete backup.unified;
      s.unified.localBackup = backup; s.unified.checkpoint = checkpoint(s);
      persist(s); return applySnapshot(d, []);
    });
  }
  function resumeRecovery() {
    var request = clone(value().recoveryRequest), own = value().deviceId;
    return C.market.online.authed('GET', '/v1/game/state').then(function (d) {
      if (d.accountId !== request.accountId) throw fail('recovery-account', 'Reconnect the account whose restore is pending before retrying.');
      if (d.deviceId === own) return d;
      return C.market.online.authed('POST', '/v1/game/transfer', request.body, { idempotencyKey: request.key, timeoutMs: 20000 }).then(function () { return C.market.online.authed('GET', '/v1/game/state'); });
    }).then(function (d) {
      if (d.accountId !== request.accountId) throw fail('recovery-account', 'Reconnect the account whose restore is pending before retrying.');
      return applySnapshot(d, [], null, true);
    });
  }
  // Only the separate, explicitly confirmed recovery action may move an unavailable device.
  function restoreLastSynced() {
    if (action || running) return Promise.reject(fail('busy', 'Wait for the current account request to finish.'));
    var own = deviceId();
    return run(function () {
      if (value().recoveryRequest) return resumeRecovery();
      return C.market.online.authed('GET', '/v1/game/state').then(function (d) {
        if (!d.linked) throw fail('not-linked', 'This account has no synchronized collection to restore.');
        var s = clone(current());
        s.unified.recoveryRequest = { key: id('restore'), accountId: d.accountId, body: { deviceId: d.deviceId, newDeviceId: own, sequence: d.sequence, serialCounter: d.serialCounter || 0 } };
        persist(s);
        return resumeRecovery();
      });
    });
  }
  var api = C.market.sync = {
    subscribe: function (listener) { listeners.add(listener); return function () { listeners.delete(listener); }; },
    acceptSnapshot: function (d) { return applySnapshot(d, []); },
    deviceId: deviceId, recover: recover, restoreLastSynced: restoreLastSynced, normalize: normalize, prepareCommit: prepareCommit, link: link, sync: sync, flush: flush,
    ready: function () { var u = value(); return !!(u && u.linked && status === 'ready' && !action && !u.recoveryRequest && !u.actionRequest && !u.pending.length && !u.batch && C.market.online.state.status === 'online' && (!u.activeDeviceId || u.activeDeviceId === u.deviceId)); },
    isLinked: function () { return !!(value() && value().linked); },
    beginAction: function (request) { if (action || running || value() && (value().actionRequest || value().recoveryRequest)) throw fail('busy', 'Wait for the current player trade to finish.'); if (!request || !request.key || !request.method || !request.path) throw fail('request-required', 'Save the trade request before sending it.'); var s = clone(current()); prepareCommit(s); s.unified.actionRequest = clone(request); persist(s); action = true; changed(); },
    endAction: function () { action = false; changed(); },
    heldCredits: function () { return (action || value() && (value().actionRequest || value().recoveryRequest)) && current() ? current().currency : value() && value().held || 0; },
    lockOf: function (key) { if ((action || value() && (value().actionRequest || value().recoveryRequest)) && current().inventory.some(function (i) { return i.instanceId === key; })) return 'players-request'; var u = value(); if (u && (u.pendingListings || []).some(function (draft) { return ((draft.spec || draft).instanceIds || []).indexOf(key) >= 0; })) return 'pending-listing'; return u && u.locks && u.locks[key] || null; },
    headers: function () { var u = value(); return u && u.linked ? { 'x-game-device': u.deviceId, 'x-game-sequence': String(u.sequence) } : {}; },
    transfer: function (newDeviceId) { if (current().pendingReveal || current().shop && current().shop.entitlement) return Promise.reject(fail('pending-pack', 'Finish opening and keeping your reserved pack before transferring play.')); return flush().then(function () { var u = value(); if (!newDeviceId || newDeviceId === u.deviceId) throw fail('device', 'Choose the receiving device.'); return C.market.online.authed('POST', '/v1/game/transfer', { deviceId: u.deviceId, newDeviceId: newDeviceId, sequence: u.sequence, serialCounter: current().serialCounter || 0 }, { idempotencyKey: id('transfer') }); }).then(function (d) { var s = clone(current()); s.unified.activeDeviceId = newDeviceId; persist(s); status = 'device-mismatch'; changed(); return d; }); },
    get state() { var u = value(); return { linked: !!(u && u.linked), linking: !!(u && (u.linkRequest || u.recoveryRequest)), status: status, error: lastError, pending: u && u.pending ? u.pending.length : 0, busy: action || !!running || !!(u && (u.actionRequest || u.recoveryRequest)), deviceId: u && u.deviceId, sequence: u && u.sequence || 0, activeDeviceId: u && u.activeDeviceId, held: u && u.held || 0 }; }
  };
  C.events.on('save:written', schedule);
  C.events.on('app:ready', function () { if (value()) status = 'offline'; root.addEventListener('online', function () { if (api.isLinked()) sync().catch(function () {}); }); });
})(window.Cardable = window.Cardable || {}, window);

