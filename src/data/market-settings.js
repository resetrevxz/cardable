/* Cardable Market — saved preferences. DATA ONLY.
 * These keys flow through the shared settings schema, so they persist, export and reset like every other
 * setting, appear in the Settings workspace under Market and in the command palette. The market itself
 * reads them live; each one changes something that exists in this build. */
(function (C) {
  'use strict';
  var s = C.settingsSchema.entries;
  function add(key, label, helper, value, choices, control, extra) {
    s[key] = Object.assign({ key: key, label: label, helper: helper, group: 'Market', defaultValue: value, choices: choices || null,
      control: control || (typeof value === 'boolean' ? 'switch' : 'segments'), aliases: ['market', 'trade'].concat(label.toLowerCase().split(' ')),
      apply: function (next, api) { api.attribute(this.key, next); } }, extra || {});
    return s[key];
  }
  function fmt(map) { return function (value) { return map[value] || String(value); }; }

  add('marketMode', 'Market detail', 'Simple keeps filters and listings light. Advanced adds fair-value, serial, finish and auction controls.', 'simple', ['simple', 'advanced']);
  add('marketRealm', 'Starting realm', 'Which realm the Market opens in. Global Market only has listings once it is connected.', 'simulation', ['simulation', 'global']).format = fmt({ simulation: 'Simulation', global: 'Global Market' });
  add('marketView', 'Discover layout', 'A visual feed of cards, or a denser terminal table for scanning prices.', 'feed', ['feed', 'terminal']).format = fmt({ feed: 'Feed', terminal: 'Terminal' });
  add('marketDensity', 'Density', 'Comfortable gives cards room. Compact fits more listings on screen.', 'comfortable', ['comfortable', 'compact']);
  add('marketChartType', 'Chart style', 'How Stocks draws a price window.', 'line', ['line', 'candles']).format = fmt({ line: 'Line', candles: 'Candles' });
  add('marketWindow', 'Default time window', 'The window Stocks and card charts open with.', '7d', ['24h', '7d', '30d', '90d', 'all']).format = fmt({ '24h': '24 h', '7d': '7 d', '30d': '30 d', '90d': '90 d', all: 'All' });
  add('marketReducedData', 'Reduced data', 'Smaller pages, no sparklines or leader tables, and card art only where you scroll. Helps older machines.', false);
  add('marketCompactNumbers', 'Compact Credits', 'Show 12,500 as 12.5K in dense places. Exact values stay in tooltips and receipts.', false);
  add('marketConfirm', 'Confirm before trades', 'Always shows the review step. Large trades only skips it for small amounts.', 'always', ['always', 'large']).format = fmt({ always: 'Always', large: 'Large trades only' });
  add('marketListingDuration', 'Default auction length', 'The preset the listing composer starts with. Custom lengths are in Advanced.', '24h', ['6h', '24h', '3d']).format = fmt({ '6h': '6 hours', '24h': '24 hours', '3d': '3 days' });
  add('marketSimSpeed', 'Simulation speed', 'How fast simulated time runs while the game is open. It never runs while the game is closed, hidden or paused.', 'standard', ['calm', 'standard', 'fast']).format = fmt({ calm: 'Calm', standard: 'Standard', fast: 'Fast' });
  add('marketNotifyBids', 'Bid and auction notices', 'Outbid, leading and ending-soon notices in Activity.', true);
  add('marketNotifyTrades', 'Sale and offer notices', 'Sold, won, expired and offer notices in Activity.', true);
  add('marketNotifyWatch', 'Watchlist and price notices', 'Watchlist and price-alert notices in Activity.', true);

  ['marketSimSpeed', 'marketMode', 'marketRealm', 'marketView', 'marketDensity', 'marketChartType', 'marketWindow', 'marketReducedData', 'marketCompactNumbers',
    'marketConfirm', 'marketListingDuration', 'marketNotifyBids', 'marketNotifyTrades', 'marketNotifyWatch'].forEach(function (key) {
    // Defaults for new keys must also pass the shared validator.
    s[key].key = key;
  });
  ['marketRealm', 'marketConfirm', 'marketListingDuration', 'marketCompactNumbers'].forEach(function (key) { s[key].advanced = true; });
})(window.Cardable);
