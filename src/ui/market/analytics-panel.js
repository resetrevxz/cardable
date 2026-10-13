/* Cardable Market — the analytics header for one exact card.
 * Everything here is read from a valuation the provider filled from completed player sales (Global) or from the local
 * Simulation's own trades. A figure with no data behind it says so and is never filled in: no sales means "No sales
 * yet", a spread without open orders is labelled an estimate, and a time to sell appears only when it can be inferred. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon;
  var CONF = { high: 'High', medium: 'Medium', low: 'Low', none: 'Not enough data' };

  function ageText(at) { return at ? ui.fmt.age(Math.max(0, (Date.now() - at) / 60000)) : ''; }
  function hoursText(n) { return n == null ? '' : n < 48 ? '~' + n + ' h' : '~' + Math.round(n / 24) + ' d'; }
  function changeNode(v, key, label, note) { return { label: label, node: ui.delta(v[key], { empty: 'No comparison yet' }), note: v[key] == null ? null : note }; }

  function items(v) {
    var live = v.source === 'players' || v.source === 'simulation';
    var sold = function (units, credits) { return units ? units + ' sold · ' + ui.fmt.exact(credits) + ' Credits' : 'No sales'; };
    var rows = [
      { label: 'Average Value', value: v.averageValue != null ? ui.fmt.exact(v.averageValue) : 'No sales yet', help: 'average-value',
        note: v.observed ? (v.mechanic === 'frequent' ? 'Recency-weighted mean of ' : 'Weighted median of ') + v.observed.units + ' sales' : 'What traders paid; nothing to average yet' },
      { label: 'Fair value (model)', value: ui.fmt.exact(v.fairValue != null ? v.fairValue : v.average), note: v.observed ? 'Baseline blended with the sales above' : 'Baseline only: no sales to blend', help: 'fair-value' },
      { label: 'Last sold', value: v.lastSale ? ui.fmt.exact(v.lastSale) : 'No sales yet', note: v.lastAt ? ageText(v.lastAt) : null },
      { label: 'Range, 30 d', value: v.range30 ? ui.fmt.exact(v.range30.low) + ' to ' + ui.fmt.exact(v.range30.high) : 'No sales in 30 days' },
      changeNode(v, 'change24h', '24 h change', 'Against the last sale at least 24 h ago'),
      changeNode(v, 'change7d', '7 d change', 'Against the last sale at least 7 d ago'),
      changeNode(v, 'change30d', '30 d change', 'Against the last sale at least 30 d ago'),
      changeNode(v, 'change90d', '90 d change', 'Against the last sale at least 90 d ago'),
      { label: 'Volume, 24 h', value: sold(v.volume24h, v.credits24h), help: 'volume' },
      { label: 'Volume, 7 d', value: sold(v.volume7d, v.credits7d) },
      { label: 'Volume, 30 d', value: sold(v.volume30d, v.credits30d) },
      { label: 'Listed now', value: String(v.supply != null ? v.supply : v.openAsks || 0) + ' open', note: v.turnover7d != null ? 'Turnover ' + Math.round(v.turnover7d * 100) + '% in 7 d' : null },
      { label: 'Best bid', value: ui.fmt.exact(v.bestBid), note: v.bidReal ? 'Open buy order' : 'Estimate: no buy order' },
      { label: 'Lowest ask', value: ui.fmt.exact(v.lowestAsk), note: v.askReal ? 'Open listing' : 'Estimate: none listed' },
      { label: 'Spread', value: ui.fmt.pct(v.spread, false, 1) + (v.spreadAbs != null ? ' · ' + ui.fmt.exact(v.spreadAbs) + ' Credits' : ''), help: 'spread', note: v.spreadReal ? 'Between the best bid and lowest ask' : 'Estimate: needs an order on each side' },
      { label: 'Volatility', value: v.volatility == null ? 'Not enough trades' : ui.fmt.pct(v.volatility, false, 1) + ' a trade', help: 'volatility' },
      { label: 'Liquidity', value: v.liquidity == null ? 'No trades yet' : Math.round(v.liquidity * 100) + ' of 100', help: 'liquidity' },
      { label: 'Confidence', value: CONF[v.confidence] || '—', help: 'confidence' },
      { label: 'Target buy range', value: v.targetBuyLow != null ? ui.fmt.exact(v.targetBuyLow) + ' to ' + ui.fmt.exact(v.targetBuy) : ui.fmt.exact(v.targetBuy), help: 'target-buy',
        note: v.targetBasis === 'executions' ? 'From what sold, demand and spread' : 'From the baseline: no four sales yet' },
      { label: 'Target sell range', value: v.targetSellHigh != null ? ui.fmt.exact(v.targetSell) + ' to ' + ui.fmt.exact(v.targetSellHigh) : ui.fmt.exact(v.targetSell), help: 'target-sell',
        note: v.targetBasis === 'executions' ? 'From what sold, demand and spread' : 'From the baseline: no four sales yet' },
      v.suggestedAsk != null ? { label: 'Proposed listing ask', value: ui.fmt.exact(v.suggestedAsk), note: 'You would receive ' + ui.fmt.exact(v.expectedProceeds) + ' after the ' + ui.fmt.exact(v.expectedFee) + ' fee' } : null,
      { label: 'Estimated time to sell', value: v.timeToSell ? hoursText(v.timeToSell.lowHours) + ' to ' + hoursText(v.timeToSell.highHours) : 'Not enough sales to say',
        note: v.timeToSell ? 'Usual ' + hoursText(v.timeToSell.medianHours) + ' · ' + v.timeToSell.basis : 'Needs three sales in 30 days', help: 'liquidity' }
    ];
    return rows.filter(Boolean).concat(live ? [] : []);
  }

  function depthRow(label, list) {
    return { label: label, value: list && list.length ? list.map(function (d) { return ui.fmt.exact(d.price) + (d.count > 1 ? ' ×' + d.count : ''); }).join(' · ') : 'None' };
  }

  var EXPLAIN = [
    ['Where the numbers come from', 'Only completed sales of one card between two players (or, in the Simulation, between you and its bots). Quote screens, Quick Sell to the system, swaps, bundles, offers, cancelled orders and invented sample data are never counted.'],
    ['Average Value', 'The price this card has actually been selling for. Cards that trade often (12 or more sales in 30 days) use a recency-weighted mean of the last two weeks; scarcer ones use a weighted median over up to 90 days, which one odd sale cannot move. Each sale is capped to 55% either side of the median and counts for half as much every 3 days (frequent) or 14 days (scarce).'],
    ['Fair value', 'A model estimate, kept apart from the Average Value: the card’s baseline (from its rarity, spec, finish and skin) blended with the sales, with the baseline counting as six sales. With no sales it is the baseline, and the confidence says so.'],
    ['Target buy and sell', 'Ranges from the weighted 15th, 40th, 60th and 85th percentiles of executed prices, moved by the spread (half of it each way), by demand (open buy orders against open listings, at most 3%) and by how long a sale usually takes. Never the lowest ask minus a number. With fewer than four sales they come from the baseline and the card’s rarity volatility, and are marked so.'],
    ['Estimated time to sell', 'Shown only with three or more sales in 30 days: the usual gap between sales, times one plus the number of cheaper listings ahead of yours.'],
    ['What it is not', 'A forecast, advice or a guarantee. Fees (2%, at least 1 Credit) are included in every proceeds figure.']
  ];

  // The full header. options: { compact }
  function panel(v, options) {
    options = options || {};
    var box = h('section.mk-box.mk-analytics', { 'aria-label': 'Card analytics' });
    box.appendChild(h('div.mk-panel-head', h('h3', { text: 'Card analytics' }),
      ui.chip(v.observed ? v.observed.units + ' sales behind it' : 'Baseline estimate', { tone: 'soft', title: v.observed ? 'Window: ' + v.observed.windowDays + ' days' : 'No completed sales yet, so these figures lean on the baseline and say so.' })));
    box.appendChild(ui.statGrid(items(v), { cols: 2 }));
    if (v.depth) box.appendChild(ui.statGrid([depthRow('Lowest asks', v.depth.asks), depthRow('Highest buy orders', v.depth.bids)], { cols: 2 }));
    var more = h('details.mk-explain', h('summary', { text: 'How these numbers are made' }));
    EXPLAIN.forEach(function (e) { more.appendChild(h('h4', { text: e[0] })); more.appendChild(h('p.mk-hint', { text: e[1] })); });
    box.appendChild(more);
    return box;
  }

  ui.analytics = { panel: panel, items: items };
})(window.Cardable = window.Cardable || {}, window);
