/* Retire an offline listing before publishing its one shared replacement.
 * Only this online adapter touches the service; the simulator owns preparation. */
(function (C) {
  'use strict';
  var shared = C.market.sync;
  shared.beforeSync = function () { if (C.marketSim) return C.marketSim.prepareSync(); };
  shared.afterSync = function () {
    var u = C.state.current.unified;
    if (!u || u.pending.length || !u.pendingListings || !u.pendingListings.length) return;
    var queue = u.pendingListings.slice();
    return queue.reduce(function (chain, entry) {
      return chain.then(function () {
        var spec = Object.assign({}, entry.spec);
        if (spec.kind === 'swap' && spec.wants) { var w = spec.wants; spec.wants = { cardIds: w.cardId ? [w.cardId] : [], minValuePct: w.minFrac ? Math.round(w.minFrac * 100) : undefined }; }
        return C.market.online.authed('POST', '/v1/listings', spec, { idempotencyKey: entry.requestId }).then(function (result) {
          var s = JSON.parse(C.state.encode(C.state.current));
          s.unified.pendingListings = s.unified.pendingListings.filter(function (q) { return q.requestId !== entry.requestId; });
          s.unified.publishedListings = (s.unified.publishedListings || []).concat([{ originalId: entry.originalId, listingId: result.listingId }]).slice(-200);
          if (!C.state.commit(s)) throw new Error('Your listing was published. Reconnect to finish saving its receipt.');
        });
      });
    }, Promise.resolve()).then(function () {
      return C.market.online.authed('GET', '/v1/game/state').then(function (snapshot) { return shared.acceptSnapshot(snapshot); });
    });
  };
})(window.Cardable);
