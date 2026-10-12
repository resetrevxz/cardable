/* Cardable Market — shared presentation parts: tiles, price blocks, meters, notices, empty states.
 * Every part states what it shows and why; none of them performs a trade. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, K = function () { return C.market.core; };
  var cfg = function () { return C.data.market; };

  // ---- formatting bound to saved preferences ----
  var fmt = {
    credits: function (n, forceFull) { return K().formatCredits(n, !forceFull && !!ui.setting('marketCompactNumbers')); },
    exact: function (n) { return K().formatCredits(n, false); },
    pct: function (n, signed, digits) { return K().formatPercent(n, signed, digits); },
    duration: function (m) { return K().formatDuration(m); },
    age: function (m) { return K().formatAge(m); }
  };
  ui.fmt = fmt;
  // Thumbnails created inside a container are released before it is rebuilt, so rebuilds never accumulate records.
  ui.releaseArt = function (container, thumbs) {
    if (!container || !thumbs) return;
    container.querySelectorAll('.mk-art').forEach(function (host) { thumbs.forget(host); });
  };

  function realmDef(id) { return cfg().realms.find(function (r) { return r.id === id; }) || cfg().realms[0]; }
  function formatDef(id) { return cfg().formats.find(function (f) { return f.id === id; }) || cfg().formats[0]; }
  ui.realmDef = realmDef; ui.formatDef = formatDef;

  // ---- small atoms ----
  function chip(text, options) {
    options = options || {};
    var el = h('span.mk-chip', { data: { tone: options.tone || 'neutral' } });
    if (options.icon) el.appendChild(icon(options.icon));
    el.appendChild(h('span', { text: text }));
    if (options.title) el.title = options.title;
    return el;
  }
  function mono(text, cls) { return h('span.mk-mono' + (cls ? '.' + cls : ''), { text: text }); }
  function eyebrow(text) { return h('span.mk-eyebrow', { text: text }); }
  function credits(n, options) {
    options = options || {};
    var el = h('span.mk-credits' + (options.big ? '.is-big' : ''), { title: fmt.exact(n) + ' Credits', aria: { label: fmt.exact(n) + ' Credits' } });
    el.appendChild(icon('coin', 'mk-coin'));
    el.appendChild(h('span.mk-num', { text: fmt.credits(n), aria: { hidden: 'true' } }));
    return el;
  }
  // Gain or loss against a reference, always with a word, a direction mark and a sign: never colour alone.
  function delta(fraction, options) {
    options = options || {};
    if (fraction == null || !isFinite(fraction)) return h('span.mk-delta', { data: { dir: 'none' } }, h('span', { text: options.empty || 'No data' }));
    var dir = Math.abs(fraction) < 0.0005 ? 'flat' : fraction > 0 ? 'up' : 'down';
    var text = fmt.pct(fraction, true, options.digits);
    var el = h('span.mk-delta', { data: { dir: dir }, title: options.title || '' });
    if (dir !== 'flat') el.appendChild(icon(dir === 'up' ? 'up' : 'down', 'mk-delta-icon'));
    el.appendChild(h('span.mk-num', { text: text }));
    if (options.label) el.appendChild(h('span.mk-delta-label', { text: options.label }));
    el.setAttribute('aria-label', (options.label ? options.label + ' ' : '') + (dir === 'flat' ? 'unchanged' : (dir === 'up' ? 'up ' : 'down ') + fmt.pct(Math.abs(fraction), false, options.digits)));
    return el;
  }
  // Price against Average Value, described in words.
  function valueTag(price, valuation, compact) {
    var verdict = K().verdictFor(price, valuation);
    var el = h('span.mk-value-tag', { data: { verdict: verdict } });
    if (verdict === 'unrated') {
      el.appendChild(icon('info'));
      el.appendChild(h('span', { text: valuation && valuation.average ? 'Baseline estimate' : 'No Average Value' }));
      return el;
    }
    var diff = (price - valuation.average) / valuation.average;
    var words = compact ? { undervalued: 'below', 'possibly-under': 'below?', fair: 'near', overpriced: 'above' }[verdict]
      : { undervalued: 'below Average Value', 'possibly-under': 'below, low confidence', fair: 'near Average Value', overpriced: 'above Average Value' }[verdict];
    el.appendChild(icon(diff < -0.0005 ? 'down' : diff > 0.0005 ? 'up' : 'line', 'mk-delta-icon'));
    el.appendChild(h('span.mk-num', { text: fmt.pct(Math.abs(diff), false) }));
    el.appendChild(h('span', { text: words }));
    return el;
  }
  function helpTip(id, label) {
    var entry = cfg().glossary.find(function (g) { return g.id === id; });
    var key = 'market-' + id;
    if (entry && C.data.help && !C.data.help[key]) C.data.help[key] = { title: entry.term, body: entry.body };
    var b = h('button.mk-help', { type: 'button', 'aria-label': 'What is ' + (label || (entry && entry.term) || id) + '?', data: { help: key } }, h('span', { text: '?', 'aria-hidden': 'true' }));
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); C.help.show(b, key); });
    return b;
  }
  function labelWithHelp(text, glossaryId) {
    return h('span.mk-label', h('span', { text: text }), glossaryId ? helpTip(glossaryId, text) : null);
  }
  ui.chip = chip; ui.mono = mono; ui.eyebrow = eyebrow; ui.credits = credits; ui.delta = delta; ui.valueTag = valueTag; ui.helpTip = helpTip; ui.labelWithHelp = labelWithHelp;

  // ---- realm and preview honesty ----
  function realmBadge(realmId, options) {
    options = options || {};
    var def = realmDef(realmId), session = C.market.store.session;
    var sample = realmId === 'global' && session.showGlobalSample;
    var label = options.short ? def.shortLabel : def.label;
    var el = h('span.mk-realm-badge', { data: { realm: realmId, state: sample ? 'sample' : def.state } });
    el.appendChild(h('span.mk-realm-dot', { 'aria-hidden': 'true' }));
    el.appendChild(h('span', { text: label }));
    el.appendChild(h('span.mk-realm-state', { text: sample ? 'Sample layout' : def.stateLabel }));
    return el;
  }
  function noticeBar(realmId) {
    var session = C.market.store.session, def = realmDef(realmId);
    var sample = realmId === 'global' && session.showGlobalSample;
    var text = cfg().notices[sample ? 'globalSample' : realmId];
    var bar = h('div.mk-notice', { role: 'note', data: { realm: realmId, state: sample ? 'sample' : def.state } });
    bar.appendChild(realmBadge(realmId, { short: true }));
    bar.appendChild(h('p.mk-notice-long', { text: text }));
    bar.appendChild(h('p.mk-notice-short', { text: cfg().noticesShort[sample ? 'globalSample' : realmId], 'aria-hidden': 'true' }));
    return bar;
  }
  ui.realmBadge = realmBadge; ui.noticeBar = noticeBar;

  // ---- empty / error / loading ----
  function emptyState(options) {
    var el = h('div.mk-empty', { role: options.role || 'status', data: { kind: options.kind || 'empty' } });
    if (options.icon) el.appendChild(h('span.mk-empty-mark', icon(options.icon)));
    el.appendChild(h('h3', { text: options.title }));
    if (options.body) el.appendChild(h('p', { text: options.body }));
    if (options.extra) el.appendChild(options.extra);
    if (options.actions && options.actions.length) {
      var row = h('div.mk-empty-actions');
      options.actions.forEach(function (a) { row.appendChild(button(a.label, { variant: a.variant, icon: a.icon, onClick: a.run })); });
      el.appendChild(row);
    }
    return el;
  }
  function skeletonGrid(count, kind) {
    var wrap = h('div.mk-skeleton-grid', { role: 'status', 'aria-label': 'Loading listings', data: { kind: kind || 'tiles' } });
    for (var i = 0; i < count; i++) wrap.appendChild(h('div.mk-skeleton-tile', { 'aria-hidden': 'true' }, h('i'), h('b'), h('b.is-short')));
    return wrap;
  }
  ui.emptyState = emptyState; ui.skeletonGrid = skeletonGrid;

  // ---- buttons built from the kit's contract, with the market's own geometry ----
  function button(label, options) {
    options = options || {};
    var b = h('button.mk-button', { type: 'button', data: { variant: options.variant || 'secondary', size: options.size || '' } });
    if (options.icon) b.appendChild(icon(options.icon));
    if (label) b.appendChild(h('span', { text: label }));
    if (options.ariaLabel || (!label && options.title)) b.setAttribute('aria-label', options.ariaLabel || options.title);
    if (options.title) b.title = options.title;
    if (options.disabled) { b.disabled = true; if (options.reason) { b.dataset.reason = options.reason; b.title = options.reason; b.setAttribute('aria-describedby', ''); } }
    if (options.onClick) b.addEventListener('click', options.onClick);
    if (options.pressed != null) b.setAttribute('aria-pressed', String(!!options.pressed));
    return b;
  }
  function iconButton(name, label, onClick, options) {
    options = options || {};
    var b = h('button.mk-icon-button', { type: 'button', 'aria-label': label, title: label, data: { variant: options.variant || '' } }, icon(name));
    if (onClick) b.addEventListener('click', onClick);
    if (options.pressed != null) b.setAttribute('aria-pressed', String(!!options.pressed));
    return b;
  }
  ui.button = button; ui.iconButton = iconButton;

  // ---- segmented control (roving radiogroup), self-contained so it can live anywhere ----
  function segmented(options) {
    var group = h('div.mk-segments', { role: options.role || 'radiogroup', 'aria-label': options.label });
    var buttons = [], value = options.value;
    function render() {
      buttons.forEach(function (b) {
        var on = b.dataset.value === value;
        b.setAttribute(options.role === 'tablist' ? 'aria-selected' : 'aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      });
    }
    options.options.forEach(function (opt, i) {
      var b = h('button.mk-segment', { type: 'button', role: options.role === 'tablist' ? 'tab' : 'radio', data: { value: opt.value } });
      if (opt.icon) b.appendChild(icon(opt.icon));
      b.appendChild(h('span', { text: opt.label }));
      if (opt.badge != null) b.appendChild(h('span.mk-segment-badge', { text: String(opt.badge) }));
      if (opt.title) b.title = opt.title;
      b.addEventListener('click', function () { select(opt.value, true); });
      b.addEventListener('keydown', function (e) {
        var step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key], n = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : null;
        if (step == null && n == null) return;
        e.preventDefault();
        if (n == null) n = (i + step + buttons.length) % buttons.length;
        select(options.options[n].value, true); buttons[n].focus();
      });
      buttons.push(b); group.appendChild(b);
    });
    function select(v, user) { if (v === value && user) { return; } value = v; render(); if (user && options.onChange) options.onChange(v); }
    render();
    group.set = function (v) { select(v, false); };
    group.buttons = buttons;
    return group;
  }
  ui.segmented = segmented;

  // ---- value meter: where the asking price sits against bid, targets and Average Value ----
  function valueMeter(valuation, price, options) {
    options = options || {};
    var wrap = h('div.mk-meter', { role: 'img' });
    if (!valuation || !valuation.average) {
      wrap.appendChild(h('p.mk-meter-empty', { text: 'No Average Value yet, so there is nothing to compare this price with.' }));
      wrap.setAttribute('aria-label', 'No Average Value yet');
      return wrap;
    }
    var lo = Math.min(valuation.bestBid, valuation.targetBuy, price) * 0.92, hi = Math.max(valuation.lowestAsk, valuation.targetSell, price) * 1.08;
    function at(v) { return Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); }
    var track = h('div.mk-meter-track');
    track.appendChild(h('i.mk-meter-zone', { style: { left: at(valuation.targetBuy) + '%', width: Math.max(1, at(valuation.targetSell) - at(valuation.targetBuy)) + '%' }, title: 'Between Target Buy and Target Sell' }));
    var marks = [
      { v: valuation.bestBid, k: 'bid', label: 'Best bid' }, { v: valuation.targetBuy, k: 'buy', label: 'Target Buy' }, { v: valuation.average, k: 'avg', label: 'Average Value' },
      { v: valuation.targetSell, k: 'sell', label: 'Target Sell' }, { v: valuation.lowestAsk, k: 'ask', label: 'Lowest ask' }
    ];
    marks.forEach(function (m) { track.appendChild(h('i.mk-meter-mark', { data: { kind: m.k }, style: { left: at(m.v) + '%' }, title: m.label + ': ' + fmt.exact(m.v) })); });
    track.appendChild(h('b.mk-meter-price', { style: { left: at(price) + '%' }, title: (options.priceLabel || 'This price') + ': ' + fmt.exact(price) }));
    wrap.appendChild(track);
    var legend = h('ul.mk-meter-legend');
    marks.forEach(function (m) { legend.appendChild(h('li', { data: { kind: m.k } }, h('i', { 'aria-hidden': 'true' }), h('span', { text: m.label }), h('span.mk-num', { text: fmt.exact(m.v) }))); });
    legend.appendChild(h('li', { data: { kind: 'price' } }, h('i', { 'aria-hidden': 'true' }), h('span', { text: options.priceLabel || 'This price' }), h('span.mk-num', { text: fmt.exact(price) })));
    wrap.appendChild(legend);
    wrap.setAttribute('aria-label', (options.priceLabel || 'Price') + ' ' + fmt.exact(price) + ' against Average Value ' + fmt.exact(valuation.average) + ', Target Buy ' + fmt.exact(valuation.targetBuy) + ' and Target Sell ' + fmt.exact(valuation.targetSell));
    return wrap;
  }
  ui.valueMeter = valueMeter;

  // ---- stat grid ----
  function statGrid(items, options) {
    options = options || {};
    var grid = h('dl.mk-stats', { data: { cols: options.cols || '' } });
    var count = 0;
    items.forEach(function (it) {
      if (!it) return;
      count++;
      var dt = h('dt', it.help ? labelWithHelp(it.label, it.help) : it.label);
      var dd = h('dd');
      if (it.node) dd.appendChild(it.node); else dd.appendChild(h('span.mk-num', { text: it.value }));
      if (it.note) dd.appendChild(h('small', { text: it.note }));
      grid.appendChild(h('div.mk-stat', { data: { tone: it.tone || '' } }, dt, dd));
    });
    var cols = Number(options.cols) || 2;
    while (count % cols) { grid.appendChild(h('div.mk-stat.is-filler', { 'aria-hidden': 'true' })); count++; }
    return grid;
  }
  ui.statGrid = statGrid;

  // ---- inline sparkline: one static path, no chart library ----
  function sparkline(values, options) {
    options = options || {};
    var w = options.width || 96, hgt = options.height || 28;
    if (!values || values.length < 2) return h('span.mk-spark', { 'aria-hidden': 'true' });
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values), span = max - min || 1, d = '';
    var sample = K().downsample(values, 32);
    sample.forEach(function (v, i) { d += (i ? 'L' : 'M') + (i / (sample.length - 1) * w).toFixed(1) + ' ' + (hgt - 3 - (v - min) / span * (hgt - 6)).toFixed(1); });
    var NS = 'http://www.w3.org/2000/svg', svg = root.document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hgt); svg.setAttribute('width', w); svg.setAttribute('height', hgt); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('mk-spark');
    var path = root.document.createElementNS(NS, 'path'); path.setAttribute('d', d); svg.appendChild(path);
    var up = values[values.length - 1] >= values[0];
    svg.dataset.dir = up ? 'up' : 'down';
    return svg;
  }
  ui.sparkline = sparkline;

  // ---- seller ----
  function sellerLine(seller, options) {
    options = options || {};
    var el = h('span.mk-seller');
    el.appendChild(icon(seller.isBot ? 'layers' : 'user'));
    el.appendChild(h('span.mk-seller-alias', { text: seller.alias }));
    if (!options.compact) el.appendChild(h('span.mk-seller-meta', { text: seller.isYou ? 'Your listing' : seller.isBot ? (seller.personaLabel || 'Simulation bot') : seller.sales + ' sales' }));
    return el;
  }
  ui.sellerLine = sellerLine;

  // ---- the listing tile (feed) ----
  function listingTile(entry, env) {
    var l = entry.listing, rank = entry.rank, card = env.cards[l.card.cardId];
    var owned = !!(env.owned && env.owned[l.card.cardId]);
    var id = ui.identity(card, owned), variant = l.card.variantId ? env.variants[l.card.variantId] : null;
    var fmtDef = formatDef(l.format), price = K().currentPrice(l);
    var watching = C.market.store.isWatching(l.id);
    var tile = h('article.mk-tile', { data: { format: l.format, status: l.status, id: l.id, rarity: card.rarity, hover: 'glow-edge' }, style: { '--mk-i': Math.min(env.index || 0, 8) } });
    var art = h('div.mk-tile-art');
    var thumb = env.thumbs.mount(card, { instanceId: 'mk-' + l.id, cardId: card.id, serial: l.card.serial, variantId: l.card.variantId, cardSkinId: l.card.cardSkinId, seen: true }, { owned: owned });
    art.appendChild(thumb);
    var top = h('div.mk-tile-top');
    var f = h('span.mk-format', { data: { format: l.format } }, icon(fmtDef.icon), h('span', { text: fmtDef.short }));
    top.appendChild(f);
    if (l.format === 'auction' && l.endsMin != null) top.appendChild(h('span.mk-time' + (l.endsMin <= 60 ? '.is-urgent' : ''), { title: 'Time left in this auction', data: l.endsAt ? { end: String(l.endsAt) } : {} }, icon('clock'), h('span.mk-num', { text: fmt.duration(l.endsMin) })));
    art.appendChild(top);
    var watch = h('button.mk-watch', { type: 'button', 'aria-pressed': String(watching), 'aria-label': (watching ? 'Remove from watchlist: ' : 'Add to watchlist: ') + id.name, title: watching ? 'Watching' : 'Watch' }, icon('bookmark'));
    watch.addEventListener('click', function (e) {
      e.stopPropagation();
      var on = C.market.store.toggleWatch(l.id);
      watch.setAttribute('aria-pressed', String(on)); watch.title = on ? 'Watching' : 'Watch';
      watch.setAttribute('aria-label', (on ? 'Remove from watchlist: ' : 'Add to watchlist: ') + id.name);
      C.ui.toast(on ? 'Added to your watchlist' : 'Removed from your watchlist');
    });
    art.appendChild(watch);
    tile.appendChild(art);

    var body = h('div.mk-tile-body');
    var open = h('button.mk-tile-open', { type: 'button' });
    open.appendChild(h('span.mk-tile-name', { text: l.title || id.name, title: id.name }));
    open.addEventListener('click', function () { ui.go('listing', { id: l.id }, { focusKey: l.id }); });
    body.appendChild(open);
    var meta = h('div.mk-tile-meta');
    if (l.title) meta.appendChild(h('span.mk-tile-card', { text: id.name }));
    meta.appendChild(h('span.mk-tile-rarity', { data: { rarity: card.rarity }, text: id.rarityName }));
    if (variant) meta.appendChild(h('span.mk-tile-variant', { text: variant.name }));
    if (l.card.cardSkinId) meta.appendChild(h('span.mk-tile-variant', { text: (C.cardSkin && C.cardSkin(l.card.cardSkinId) ? C.cardSkin(l.card.cardSkinId).name : 'Skin') }));
    body.appendChild(meta);

    var priceRow = h('div.mk-tile-price');
    if (l.format === 'swap') {
      priceRow.classList.add('is-swap');
      priceRow.appendChild(h('span.mk-tile-wants', { text: 'Wants ' + l.swap.wanted[0].label }));
      priceRow.appendChild(h('span.mk-tile-topup', { text: !l.swap.topUp ? 'Even swap, no Credits' : l.swap.direction === 'asks' ? 'You add ' + fmt.credits(l.swap.topUp) + ' Credits' : 'You receive ' + fmt.credits(l.swap.topUp) + ' Credits' }));
    } else {
      priceRow.appendChild(credits(price, { big: true }));
      if (l.format === 'auction') priceRow.appendChild(h('span.mk-tile-bids', { text: l.auction.bids === 1 ? '1 bid' : l.auction.bids + ' bids' }));
      else if (l.valuation.change24h != null) priceRow.appendChild(delta(l.valuation.change24h, { label: '24 h', title: 'Change in Average Value over 24 hours' }));
    }
    body.appendChild(priceRow);
    if (l.format !== 'swap') body.appendChild(h('div.mk-tile-value', valueTag(price, l.valuation)));
    // The value tag already says "below Average Value", so lead with the next reason instead of repeating it.
    var reason = rank && rank.reasons.find(function (r) { return r.id !== 'value'; });
    if (reason) body.appendChild(h('p.mk-tile-reason', { data: { reason: reason.id } }, h('span', { text: reason.label })));
    var foot = h('div.mk-tile-foot');
    foot.appendChild(sellerLine(l.seller, { compact: true }));
    foot.appendChild(h('span.mk-mono.mk-serial', { text: l.card.serial.replace('CBL-', ''), title: 'Serial ' + l.card.serial }));
    body.appendChild(foot);
    tile.appendChild(body);
    var name = [l.title || id.name, id.rarityName, variant ? variant.name : 'normal finish', fmtDef.label, l.format === 'swap' ? 'wants ' + l.swap.wanted[0].label : fmt.exact(price) + ' Credits'];
    open.setAttribute('aria-label', name.join(', '));
    return tile;
  }
  ui.listingTile = listingTile;

  // ---- terminal row ----
  function terminalHeader(sortId, onSort) {
    var cols = [['card', 'Card', null], ['finish', 'Finish', 'variant'], ['rarity', 'Rarity', 'rarity'], ['format', 'Type', null], ['price', 'Price', 'price-asc'], ['vs', 'vs Average', 'value'], ['change', '24 h', null],
      ['ends', 'Ends', 'ending'], ['seller', 'Seller', null], ['serial', 'Serial', 'serial'], ['watch', '', null]];
    var row = h('div.mk-trow.mk-trow-head', { role: 'row' });
    cols.forEach(function (c) {
      var cell = h('div.mk-tcell', { role: 'columnheader', data: { col: c[0] } });
      if (c[2]) {
        var b = h('button.mk-thead-sort', { type: 'button', 'aria-label': 'Sort by ' + c[1] }, c[1]);
        if (sortId === c[2]) b.dataset.active = 'true';
        b.addEventListener('click', function () { onSort(c[2]); });
        cell.appendChild(b);
      } else cell.textContent = c[1];
      row.appendChild(cell);
    });
    return row;
  }
  function terminalRow(entry, env) {
    var l = entry.listing, card = env.cards[l.card.cardId], owned = !!(env.owned && env.owned[l.card.cardId]);
    var id = ui.identity(card, owned), variant = l.card.variantId ? env.variants[l.card.variantId] : null, price = K().currentPrice(l);
    var row = h('div.mk-trow', { role: 'row', data: { id: l.id, status: l.status } });
    function cell(col, content) { var c = h('div.mk-tcell', { role: 'cell', data: { col: col } }); if (content != null) c.appendChild(content.nodeType ? content : document.createTextNode(String(content))); row.appendChild(c); return c; }
    var open = h('button.mk-tile-open', { type: 'button' }, h('span.mk-tile-name', { text: l.title || id.name, title: id.name }));
    open.addEventListener('click', function () { ui.go('listing', { id: l.id }, { focusKey: l.id }); });
    open.setAttribute('aria-label', (l.title || id.name) + ', ' + id.rarityName + ', ' + formatDef(l.format).label);
    cell('card', open);
    cell('finish', variant ? variant.name : 'Normal');
    cell('rarity', h('span.mk-tile-rarity', { data: { rarity: card.rarity }, text: id.rarityName }));
    cell('format', h('span.mk-format', { data: { format: l.format } }, icon(formatDef(l.format).icon), h('span', { text: formatDef(l.format).short })));
    cell('price', l.format === 'swap' ? h('span.mk-muted', { text: l.swap.topUp ? '±' + fmt.credits(l.swap.topUp) : 'Even' }) : credits(price));
    cell('vs', l.format === 'swap' ? '—' : valueTag(price, l.valuation, true));
    cell('change', l.format === 'swap' ? '—' : delta(l.valuation.change24h, { empty: '—' }));
    cell('ends', l.format === 'auction' ? h('span.mk-num.mk-countdown', { data: l.endsAt ? { end: String(l.endsAt) } : {}, text: fmt.duration(l.endsMin) }) : '—');
    cell('seller', sellerLine(l.seller, { compact: true }));
    cell('serial', h('span.mk-mono', { text: l.card.serial.replace('CBL-', '') }));
    var watching = C.market.store.isWatching(l.id);
    var watch = h('button.mk-watch.is-inline', { type: 'button', 'aria-pressed': String(watching), 'aria-label': (watching ? 'Remove from watchlist: ' : 'Add to watchlist: ') + id.name }, icon('bookmark'));
    watch.addEventListener('click', function () { var on = C.market.store.toggleWatch(l.id); watch.setAttribute('aria-pressed', String(on)); });
    cell('watch', watch);
    return row;
  }
  ui.terminalHeader = terminalHeader; ui.terminalRow = terminalRow;

  // ---- activity glyphs ----
  ui.activityMeta = {
    outbid: { icon: 'down', label: 'Outbid', group: 'bids' }, ending: { icon: 'clock', label: 'Ending soon', group: 'bids' }, leading: { icon: 'up', label: 'Leading', group: 'bids' },
    bid: { icon: 'gavel', label: 'New bid', group: 'bids' }, lost: { icon: 'clock', label: 'Auction ended', group: 'bids' },
    sold: { icon: 'coin', label: 'Sold', group: 'trades' }, bought: { icon: 'check', label: 'Bought', group: 'trades' }, won: { icon: 'check', label: 'Won', group: 'trades' },
    expired: { icon: 'clock', label: 'Expired', group: 'trades' }, order: { icon: 'tag', label: 'Buy order filled', group: 'trades' }, 'order-expired': { icon: 'clock', label: 'Buy order ended', group: 'trades' },
    swapped: { icon: 'swap', label: 'Swap complete', group: 'trades' }, offer: { icon: 'swap', label: 'Swap offer', group: 'trades' }, counter: { icon: 'swap', label: 'Counter-offer', group: 'trades' },
    declined: { icon: 'close', label: 'Declined', group: 'trades' }, 'offer-expired': { icon: 'clock', label: 'Offer expired', group: 'trades' },
    cancelled: { icon: 'info', label: 'Withdrawn', group: 'trades' }, withdrawn: { icon: 'info', label: 'Listing removed', group: 'trades' }, failed: { icon: 'warn', label: 'Could not complete', group: 'trades' },
    void: { icon: 'warn', label: 'Cancelled', group: 'trades' }, conflict: { icon: 'warn', label: 'Needs a look', group: 'trades' },
    price: { icon: 'bell', label: 'Price alert', group: 'watch' }, watch: { icon: 'bookmark', label: 'Watchlist', group: 'watch' }
  };
})(window.Cardable = window.Cardable || {}, window);
