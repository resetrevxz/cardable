/* Cardable Market — the Global Market provider (online beta).
 * Presents the online realm in the shapes the Market interface already uses, from the client's last known state.
 * Reads are synchronous (the interface renders from them) and are refreshed in the background; nothing is invented:
 * an online realm with no players trading is empty and says so, and no price comes from a bot, a fixture or the
 * offline Simulation. Trading arrives with the next beta stage: its writes answer "not available". */
(function (C) {
  'use strict';
  var online = function () { return C.market.online; };
  var core = function () { return C.market.core; };

  var STATES = {
    unconfigured: { label: 'Not available', tone: 'offline', message: 'Global Market is not available in this build. The Simulation works fully offline.' },
    'signed-out': { label: 'Not connected', tone: 'offline', message: 'Global Market has real players only, under anonymous names, and starts empty. Connect a private account to look around. Your offline game is never touched.' },
    offline: { label: 'Offline', tone: 'offline', message: 'Global Market could not be reached. Keep playing: the Simulation and your collection are unaffected.' },
    error: { label: 'Unavailable', tone: 'offline', message: 'Global Market answered with an error. Nothing was changed. Try again shortly.' },
    online: { label: 'Beta · online', tone: 'online', message: 'Global Market beta: real players only, anonymous names, its own Credits. It may be empty.' }
  };
  function now() { var s = online().state; return STATES[s.status] || STATES.error; }
  function emptyReason() {
    var s = online().state.status;
    return s === 'online' ? 'no-listings' : s === 'signed-out' ? 'signed-out' : s === 'unconfigured' ? 'not-connected' : 'offline';
  }
  function unavailable(name) {
    return function () {
      return Promise.reject(Object.assign(new Error('Trading opens in a later beta stage. Nothing was changed.'), { code: 'not-available', method: name }));
    };
  }

  var provider = {
    status: function (realm) {
      var s = online().state, st = now();
      return { realm: realm, state: st.tone, label: st.label, connected: s.status === 'online', live: s.status === 'online', message: st.message, alias: s.alias, imported: s.imported, status: s.status, error: s.error };
    },
    wallet: function (realm) {
      var s = online().state;
      if (s.status !== 'online') return { realm: realm, balance: null, label: 'Not connected', note: now().message };
      return { realm: realm, balance: s.balance, held: s.held, available: s.available, label: 'Credits', note: 'Your Global Market Credits. They are separate from your offline Credits.' };
    },
    listings: function (realm) {
      return { realm: realm, items: [], nextCursor: null, total: 0, universe: 0, facets: null, asOf: 'Players only', source: 'players', emptyReason: emptyReason() };
    },
    listing: function () { return null; },
    cardMarket: function (realm, cardId, variantId) {
      var card = C.market.api.data().cardById[cardId];
      if (!card) return null;
      var v = C.valuation.baselineOnly({ cardId: cardId, variantId: variantId || null, cardSkinId: null });
      if (!v) return null;
      return { card: card, valuation: Object.assign({}, v, { source: 'baseline' }), listings: [], trades: [], variants: [], owned: C.market.api.playerState().owned[cardId] || 0,
        depth: { asks: [], bids: [] }, myOrders: [] };
    },
    trades: function (realm) { return { realm: realm, items: [], nextCursor: null, total: 0, volume: 0 }; },
    stocks: function (realm, query) {
      query = query || {};
      return { realm: realm, empty: false, noData: true, scope: query.scope || 'index', id: query.id || '', window: query.window || '7d', title: 'Global Market', members: 0, candles: [], closes: [], unit: 'Credits',
        source: 'players', leaders: { active: [], gainers: [], losers: [], values: [] }, now: Date.now() };
    },
    portfolio: function (realm) {
      var s = online().state;
      return { realm: realm, demo: false, holdings: [], total: 0, count: s.inventoryTotal || 0, byRarity: {}, wallet: provider.wallet(realm), realized: null, unrealized: null,
        realizedCount: 0, unrealizedCount: 0, feesPaid: 0, quickSellValue: 0, sampleMine: [], sampleBids: [], listings: [], bids: [], orders: [], online: true };
    },
    activity: function (realm) { return { realm: realm, notifications: [], mine: [], bids: [], orders: [], offers: [], feed: [], sample: false }; },
    inventory: function () { return { items: [], demo: false, online: true }; },
    valuation: function (realm, spec) { return C.valuation.baselineOnly(spec); },
    suggest: function (realm, text) {
      var q = String(text || '').trim().toLowerCase();
      if (!q) return { cards: [], listings: [], sellers: [] };
      var cards = C.data.cards.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 5);
      return { cards: cards, listings: [], sellers: [] };
    }
  };
  ['purchase', 'placeBid', 'buyout', 'publishListing', 'cancelListing', 'placeOrder', 'cancelOrder', 'makeOffer', 'respondToOffer', 'withdrawOffer', 'quickSell'].forEach(function (n) { provider[n] = unavailable(n); });

  C.market.onlineProvider = provider;
  C.events.on('app:ready', function () {
    if (C.market.api) C.market.api.registerProvider('global', provider);
    // The interface redraws its header and an open Global page when the connection state changes.
    online().subscribe(function () { if (C.market.store) C.market.store.emit('online'); });
  });
})(window.Cardable = window.Cardable || {});
