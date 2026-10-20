/* Cardable Market — online beta client.
 * Everything that touches the network lives here. It never runs unless the player chooses the online realm and
 * connects; with no apiBase configured it makes no request at all. It keeps a private refresh token on this device,
 * never puts a token in a URL, and treats every failure as "offline or unavailable" without touching the offline game.
 * The offline save is read to build an import package and is never modified by this module. */
(function (C, root) {
  'use strict';
  C.market = C.market || {};
  var listeners = new Set();
  var S = { status: 'unconfigured', alias: null, imported: false, balance: null, held: 0, available: null, inventoryTotal: null, error: null,
    mode: 'open', modeMessage: null, checkedAt: 0, token: null, tokenExp: 0, refreshToken: null, receipt: null, server: null, ledger: [] };
  var inflight = null;
  var cfg = function () { return C.data.marketOnline; };

  function localOverride() {
    // A test or developer Worker on this machine only. Anything that is not a local address is ignored.
    var v = root.__CARDABLE_MARKET_API__;
    return typeof v === 'string' && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(v) ? v : '';
  }
  function base() {
    // A local Worker named by a developer or test page (loopback only) wins, so a test can never reach the live beta.
    var b = localOverride() || cfg().apiBase;
    if (!b) return '';
    try {
      var u = new root.URL(b);
      var ok = cfg().allowedHosts.some(function (re) { return re.test(u.hostname); });
      if (!ok || (u.protocol !== 'https:' && !/^(127\.0\.0\.1|localhost)$/.test(u.hostname))) return '';
      return u.origin;
    } catch (_) { return ''; }
  }
  function emit() { listeners.forEach(function (fn) { try { fn(S); } catch (e) { if (root.console) root.console.error(e); } }); }
  function storageGet() { try { return JSON.parse(root.localStorage.getItem(cfg().storageKey) || 'null') || {}; } catch (_) { return {}; } }
  function storageSet(patch) {
    try { var cur = storageGet(); root.localStorage.setItem(cfg().storageKey, JSON.stringify(Object.assign(cur, patch))); } catch (_) { /* session only */ }
  }
  function failure(code, message, extra) { return Object.assign(new Error(message || code), { code: code, detail: extra || null }); }

  // ---- transport ----------------------------------------------------------------------------------------------
  function request(method, path, body, options) {
    options = options || {};
    var b = base();
    if (!b) return Promise.reject(failure('not-configured', 'Player trading is not available in this build.'));
    var controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = controller ? root.setTimeout(function () { controller.abort(); }, options.timeoutMs || cfg().timeoutMs) : 0;
    var headers = { accept: 'application/json' };
    if (body) headers['content-type'] = 'application/json';
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.token) headers.authorization = 'Bearer ' + options.token;
    if (C.market.sync && options.token) Object.assign(headers, C.market.sync.headers());
    return root.fetch(b + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, signal: controller ? controller.signal : undefined,
      mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' })
      .then(function (res) { return res.text().then(function (text) {
        var json = null; try { json = JSON.parse(text); } catch (_) { /* not json */ }
        if (res.ok && json && json.ok) return json.data;
        var err = json && json.error || { code: 'http-' + res.status, message: 'The service answered with an error.' };
        S.lastError = { code: err.code, trace: json && json.trace || null, at: Date.now() };
        throw failure(err.code, err.message, { status: res.status, trace: json && json.trace, detail: err.detail });
      }); }, function (error) {
        throw failure('offline', error && error.name === 'AbortError' ? 'The service did not answer in time.' : 'Could not reach the service.');
      })
      .then(function (data) { root.clearTimeout(timer); return data; }, function (error) { root.clearTimeout(timer); throw error; });
  }
  function ensureToken() {
    if (S.token && S.tokenExp - 30000 > Date.now()) return Promise.resolve(S.token);
    if (!S.refreshToken) return Promise.reject(failure('signed-out', 'Link an account to trade with players.'));
    if (inflight) return inflight;
    inflight = request('POST', '/v1/auth/refresh', { refreshToken: S.refreshToken }).then(function (d) {
      S.token = d.accessToken; S.tokenExp = d.accessExpiresAt; S.refreshToken = d.refreshToken; storageSet({ refreshToken: d.refreshToken });
      return S.token;
    }, function (error) {
      if (error.code === 'bad-token' || error.code === 'session-ended') { S.token = null; S.refreshToken = null; S.status = 'signed-out'; storageSet({ refreshToken: null }); emit(); }
      throw error;
    }).then(function (t) { inflight = null; return t; }, function (e) { inflight = null; throw e; });
    return inflight;
  }
  function authed(method, path, body, options) {
    return ensureToken().then(function (token) {
      return request(method, path, body, Object.assign({}, options, { token: token }));
    }).then(null, function (error) {
      if (error.code === 'token-expired') { S.token = null; return ensureToken().then(function (token) { return request(method, path, body, Object.assign({}, options, { token: token })); }); }
      throw error;
    });
  }

  // ---- state ---------------------------------------------------------------------------------------------------
  function setOffline(error) { S.status = error.code === 'maintenance' ? 'paused' : error.code === 'not-configured' ? 'unconfigured' : error.code === 'signed-out' ? 'signed-out' : error.code === 'offline' ? 'offline' : 'error'; S.error = error.message; emit(); }
  function refresh(force) {
    if (!base()) { S.status = 'unconfigured'; emit(); return Promise.resolve(S); }
    if (!force && S.status === 'online' && Date.now() - S.checkedAt < cfg().statusTtlMs) return Promise.resolve(S);
    return request('GET', '/v1/status').then(function (server) {
      S.server = server; S.mode = server && server.mode || 'open'; S.modeMessage = server && server.message || null;
      if (S.mode === 'maintenance') { S.status = 'paused'; S.error = S.modeMessage; S.checkedAt = Date.now(); emit(); return S; }
      if (!S.refreshToken) { S.status = 'signed-out'; S.error = null; S.checkedAt = Date.now(); emit(); return S; }
      return Promise.all([authed('GET', '/v1/me'), authed('GET', '/v1/wallet'), authed('GET', '/v1/inventory?limit=1')]).then(function (r) {
        S.alias = r[0].alias; S.imported = r[0].imported; S.balance = r[1].balance; S.held = r[1].held; S.available = r[1].available; S.ledger = r[1].ledger;
        S.inventoryTotal = r[2].total; S.status = 'online'; S.error = null; S.checkedAt = Date.now();
        storageSet({ alias: S.alias, imported: S.imported });
        emit(); return S;
      });
    }).then(null, function (error) { setOffline(error); return S; });
  }

  // ---- the player's actions -------------------------------------------------------------------------------------
  function connect(label) {
    if (!S.refreshToken && C.market.sync && C.market.sync.isLinked()) return Promise.reject(failure('recovery-required', 'Use your recovery code to reconnect the account linked to this collection.'));
    if (S.refreshToken) return refresh(true).then(function () { return C.market.sync ? C.market.sync.link() : null; }).then(function () { return { alias: S.alias, alreadyConnected: true }; });
    return request('POST', '/v1/auth/register', { label: label || 'This device' }).then(function (d) {
      S.token = d.accessToken; S.tokenExp = d.accessExpiresAt; S.refreshToken = d.refreshToken; S.alias = d.alias; S.imported = false; S.status = 'online'; S.error = null;
      storageSet({ refreshToken: d.refreshToken, alias: d.alias, imported: false });
      return refresh(true).then(function () { return C.market.sync ? C.market.sync.link() : null; }).then(function () { return { alias: d.alias, recoveryCode: d.recoveryCode }; }, function (error) { return { alias: d.alias, recoveryCode: d.recoveryCode, syncPending: true, syncError: error.message }; });
    });
  }
  function recover(code) {
    if (C.market.sync) C.market.sync.deviceId();
    return request('POST', '/v1/auth/recover', { recoveryCode: code, label: 'This device' }).then(function (d) {
      S.token = d.accessToken; S.tokenExp = d.accessExpiresAt; S.refreshToken = d.refreshToken; S.alias = d.alias;
      storageSet({ refreshToken: d.refreshToken, alias: d.alias });
      return refresh(true).then(function () { return C.market.sync ? C.market.sync.recover() : null; }).then(function () { return { alias: d.alias }; });
    });
  }
  function signOut() {
    var done = S.token ? request('POST', '/v1/auth/logout', {}, { token: S.token }).then(null, function () { /* ending locally is enough */ }) : Promise.resolve();
    return done.then(function () {
      S.token = null; S.refreshToken = null; S.alias = null; S.imported = false; S.balance = null; S.inventoryTotal = null; S.ledger = [];
      S.status = base() ? 'signed-out' : 'unconfigured'; storageSet({ refreshToken: null, alias: null });
      emit();
    });
  }

  // ---- one-time collection conversion -----------------------------------------------------------------------
  // Reads the save; never writes it. The package carries card identity only: no Credits, no settings, no photos.
  function packageFromSave() {
    var s = C.state.current;
    return {
      v: 1, app: 'cardable', gameVersion: C.config.version, originCode: s.playerCode, packsOpened: Number(s.stats && s.stats.packsOpened) || 0, exportedAt: Date.now(),
      items: s.inventory.map(function (i) { return { instanceId: i.instanceId, cardId: i.cardId, variantId: i.variantId || null, cardSkinId: i.cardSkinId || null, serial: i.serial, packId: i.packId || null, pulledAt: i.pulledAt || null }; })
    };
  }
  function previewImport() { return authed('POST', '/v1/import/preview', { package: packageFromSave() }); }
  function commitImport(previewId, key) {
    var idem = key || ('imp-' + Math.floor(Date.now()).toString(36) + '-' + C.randomId('k').replace(/[^A-Za-z0-9]/g, '').slice(0, 14));
    return authed('POST', '/v1/import/commit', { previewId: previewId }, { idempotencyKey: idem, timeoutMs: 45000 }).then(function (d) {
      S.imported = true; storageSet({ imported: true, receipt: d.receipt }); S.receipt = d.receipt;
      return refresh(true).then(function () { return d; });
    });
  }
  function storedReceipt() { return S.receipt || storageGet().receipt || null; }

  function init() {
    var saved = storageGet();
    S.refreshToken = typeof saved.refreshToken === 'string' ? saved.refreshToken : null;
    S.alias = saved.alias || null; S.imported = !!saved.imported; S.receipt = saved.receipt || null;
    S.status = !base() ? 'unconfigured' : S.refreshToken ? 'offline' : 'signed-out';
  }
  C.market.online = {
    init: init, refresh: refresh, connect: connect, recover: recover, signOut: signOut, authed: authed, request: request,
    packageFromSave: packageFromSave, previewImport: previewImport, commitImport: commitImport, receipt: storedReceipt,
    ensureToken: ensureToken,
    applyInventory: function (total) { if (Number.isFinite(total) && total !== S.inventoryTotal) { S.inventoryTotal = total; emit(); } },
    applyWallet: function (w) { if (!w) return; S.balance = w.balance; S.held = w.held; S.available = w.available; emit(); },
    get state() { return S; }, configured: function () { return !!base(); }, base: base,
    subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
  };
  C.events.on('app:ready', function () { init(); if (base() && S.refreshToken && C.market.sync && (C.market.sync.isLinked() || C.market.sync.state.linking)) refresh(false).then(function () { if (S.status === 'online') return C.market.sync.sync(); }).catch(function () {}); });
})(window.Cardable = window.Cardable || {}, window);
