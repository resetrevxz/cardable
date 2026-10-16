/* Cardable Market — Home (Simulation).
 * One calm page that answers three questions: what is worth doing now, what is happening, and how am I doing.
 * Everything comes from the simulator's own world through C.market.sim.provider.home(); the suggestions are the coach's
 * (src/market/sim/advisor.js) and every one of them says what it costs, what it should bring back after the fee and why.
 * A suggestion is a guide, never a promise, and the page says so. Each button opens the same review the rest of the
 * Market uses; nothing is bought or sold without it. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, K = function () { return C.market.core; };
  var DAY = 86400000;

  function sim() { return C.market.sim && C.market.sim.provider; }
  function fx(n) { return ui.fmt.exact(Math.round(n)); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // ---- the numbers at the top ----
  function chartOf(values, width, height) {
    var NS = 'http://www.w3.org/2000/svg', svg = root.document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('mk-desk-line');
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values), span = max - min || 1, pts = K().downsample(values, 48), line = '', area = '';
    pts.forEach(function (v, i) {
      var x = (i / (pts.length - 1)) * width, y = height - 6 - ((v - min) / span) * (height - 14);
      line += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    });
    area = line + 'L' + width + ' ' + height + 'L0 ' + height + 'Z';
    var fill = root.document.createElementNS(NS, 'path'); fill.setAttribute('d', area); fill.setAttribute('class', 'area');
    var stroke = root.document.createElementNS(NS, 'path'); stroke.setAttribute('d', line); stroke.setAttribute('class', 'line'); stroke.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(fill, stroke);
    svg.dataset.dir = values[values.length - 1] >= values[0] ? 'up' : 'down';
    return svg;
  }

  function desk(data) {
    var nw = data.netWorth, p = data.progress;
    var box = h('section.mk-desk', { 'aria-labelledby': 'mk-desk-title' });
    var main = h('div.mk-desk-main');
    main.appendChild(h('h2.mk-desk-title', { id: 'mk-desk-title' }, ui.eyebrow('Your net worth')));
    var value = h('div.mk-desk-value', { role: 'text', 'aria-label': fx(nw.now) + ' Credits of net worth' }, icon('coin', 'mk-coin'));
    var num = h('span.mk-num.mk-desk-num', { 'aria-hidden': 'true' });
    value.appendChild(num); main.appendChild(value);
    var changePct = nw.change, steady = Math.abs(changePct) < 0.0005;
    main.appendChild(h('p.mk-desk-delta', steady ? h('span.mk-muted', { text: 'Your starting point. Every Credit above it is yours to earn.' }) : ui.delta(changePct, { label: 'since you started' })));
    var facts = h('dl.mk-desk-facts');
    [['Credits', fx(nw.credits)], ['Cards worth', fx(nw.cards)], ['Cards you own', String(data.state.cards)]].forEach(function (f) {
      facts.appendChild(h('div', h('dt', { text: f[0] }), h('dd.mk-num', { text: f[1] })));
    });
    main.appendChild(facts);
    box.appendChild(main);

    var side = h('div.mk-desk-side');
    var hist = nw.history.map(function (x) { return x[1]; });
    var chart = h('div.mk-desk-chart', { role: 'img', 'aria-label': hist.length >= 3 ? 'Net worth over time, from ' + fx(hist[0]) + ' to ' + fx(hist[hist.length - 1]) + ' Credits' : 'Net worth over time. It appears after a few simulated hours.' });
    if (hist.length >= 3) chart.appendChild(chartOf(hist, 320, 96));
    else chart.appendChild(h('p.mk-muted', { text: 'Your line appears after a few simulated hours.' }));
    side.appendChild(chart);
    if (hist.length >= 3) side.appendChild(h('p.mk-desk-caption', { text: 'Net worth since you started' }));
    var level = h('div.mk-level');
    level.appendChild(h('span.mk-level-badge', { data: { level: String(p.level.id) } }, icon('star'), h('span', { text: p.level.name })));
    if (p.next) {
      level.appendChild(h('div.mk-level-bar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(p.fraction * 100)), 'aria-label': 'Progress to ' + p.next.name }, h('span', { style: { transform: 'scaleX(' + p.fraction.toFixed(3) + ')' } })));
      level.appendChild(h('span.mk-level-note', { text: Math.max(0, p.next.at - p.xp) + ' more to reach ' + p.next.name }));
    } else level.appendChild(h('span.mk-level-note', { text: 'You have reached the top.' }));
    side.appendChild(level);
    box.appendChild(side);
    box.__num = num;
    return box;
  }

  // ---- one suggestion ----
  var TAG_TONE = { 'Fire sale': 'hot', 'Closing soon': 'time', 'In the news': 'news', 'Set a trap': 'calm', 'Buyer waiting': 'good', 'In demand': 'good', 'Sell before it slips': 'warn', 'Your plan': 'plan', Deal: 'good', 'Sell for more': 'calm' };
  var VERB = { buy: 'Buy', bid: 'Bid', order: 'Set the trap', sell: 'List' };
  function moveCard(m, ctx, env, onDone) {
    var idn = ui.identity(m.card, !!(env.owned && env.owned[m.cardId])), variant = m.variantId ? env.variants[m.variantId] : null;
    var card = h('article.mk-move', { data: { type: m.type, tone: TAG_TONE[m.tag] || 'calm' }, style: { '--mk-i': 0 } });
    var top = h('div.mk-move-top', h('span.mk-move-tag', { text: m.tag }));
    if (m.expiresMin != null && (m.type === 'buy' || m.type === 'bid')) top.appendChild(h('span.mk-move-time', icon('clock'), h('span', { text: ui.fmt.duration(m.expiresMin) + ' left' })));
    card.appendChild(top);
    var body = h('div.mk-move-body');
    var art = h('div.mk-move-art');
    art.appendChild(ctx.thumbs.mount(m.card, { instanceId: 'home-' + m.itemId, cardId: m.cardId, serial: m.serial || 'CBL-0000-000000', variantId: m.variantId, cardSkinId: null, seen: true }, { owned: !!(env.owned && env.owned[m.cardId]) }));
    var text = h('div.mk-move-text');
    text.appendChild(h('h3', { text: idn.name }));
    text.appendChild(h('p.mk-move-sub', { text: idn.rarityName + ' · ' + (variant ? variant.name : 'Normal finish') }));
    text.appendChild(h('p.mk-move-why', { text: m.why }));
    body.append(art, text); card.appendChild(body);

    var nums = h('div.mk-move-nums');
    if (m.type === 'sell') {
      nums.appendChild(h('div', h('span.mk-muted', { text: 'Quick Sell' }), h('span.mk-num', { text: fx(m.quick) })));
      nums.appendChild(icon('forward', 'mk-move-arrow'));
      nums.appendChild(h('div', h('span.mk-muted', { text: m.instant ? 'A trader pays' : 'List at' }), h('span.mk-num', { text: fx(m.price) })));
    } else {
      nums.appendChild(h('div', h('span.mk-muted', { text: m.type === 'bid' ? 'Likely cost' : 'You pay' }), h('span.mk-num', { text: fx(m.cost) })));
      nums.appendChild(icon('forward', 'mk-move-arrow'));
      nums.appendChild(h('div', h('span.mk-muted', { text: 'Sell for about' }), h('span.mk-num', { text: fx(m.resell) })));
    }
    var gain = h('div.mk-move-gain', { role: 'text', 'aria-label': (m.type === 'sell' ? 'About ' + fx(m.gain) + ' Credits more than Quick Sell' : 'About ' + fx(m.gain) + ' Credits profit after the fee') }, icon('up'),
      h('span.mk-num', { text: '+' + fx(m.gain) }), h('span.mk-muted', { text: m.type === 'sell' ? 'over Quick Sell' : 'after the fee' }));
    nums.appendChild(gain);
    card.appendChild(nums);

    var actions = h('div.mk-move-actions');
    var label = m.type === 'buy' ? 'Buy for ' + fx(m.cost) : m.type === 'bid' ? 'Bid up to ' + fx(m.max) : m.type === 'order' ? 'Set the trap at ' + fx(m.cost) : (m.instant ? 'Sell for ' : 'List at ') + fx(m.price);
    var primary = ui.button(label, { variant: 'primary', icon: m.type === 'bid' ? 'gavel' : m.type === 'order' ? 'target' : m.type === 'sell' ? 'tag' : 'tag', onClick: function () { act(m, ctx, env, primary, onDone); } });
    actions.appendChild(primary);
    var more = ui.button(m.type === 'sell' ? 'Choose another price' : 'See details', { variant: 'ghost', onClick: function () {
      if (m.type === 'sell') ui.go('compose', { instanceId: m.itemId }); else if (m.listingId) ui.go('listing', { id: m.listingId }, { focusKey: m.listingId }); else ui.go('card', { id: m.cardId, variant: '' });
    } });
    actions.appendChild(more);
    // Cash right now is always possible: Quick Sell pays at once, for less. Offered where waiting for a trader is the choice.
    if (m.type === 'sell' && !m.instant && !m.planned && m.quick > 0) actions.appendChild(ui.button('Quick Sell for ' + fx(m.quick), { variant: 'ghost', onClick: function () { quickSell(m, ctx, env, primary, onDone); } }));
    card.appendChild(actions);
    card.appendChild(h('p.mk-move-how', { text: m.how }));
    return card;
  }

  function rows(m, idn) {
    var common = [{ label: 'Card', value: idn.name }];
    if (m.serial) common.push({ label: 'Serial', node: h('span.mk-mono', { text: m.serial }) });
    return common;
  }
  function balanceRows(cost, wallet) {
    var avail = wallet.available != null ? wallet.available : wallet.balance;
    return [{ label: 'Your Credits now', value: fx(wallet.balance) + (wallet.held ? ' (' + fx(wallet.held) + ' held)' : '') },
      { label: 'Available after', value: avail - cost >= 0 ? fx(avail - cost) : 'Short by ' + fx(cost - avail), strong: true }];
  }
  function walletEl() { return ui.shell && ui.shell.el ? ui.shell.el.querySelector('.mk-wallet') : null; }
  // Runs the move through the shared review dialog, so the player sees exactly what will happen before it does.
  function act(m, ctx, env, anchor, onDone) {
    var realm = ctx.realm, api = ctx.api, idn = ui.identity(m.card, !!(env.owned && env.owned[m.cardId])), wallet = api.walletSync(realm), fee = K().feeFor;
    var cardLine = h('div.mk-review-card', h('strong', { text: idn.name }), h('span', { text: idn.rarityName + ' · ' + (m.variantId ? (env.variants[m.variantId] || {}).name : 'Normal finish') }));
    var after = function (text, floatText, tone) { return function () { C.ui.toast(text); var w = walletEl(); if (floatText) ui.motion.floatBadge(w || anchor, floatText, tone); ui.motion.pulse(w); onDone(); }; };
    if (m.type === 'buy') {
      ui.sim.confirm({ title: 'Confirm purchase', eyebrow: 'Best move', card: cardLine, anchor: anchor,
        rows: rows(m, idn).concat([{ label: 'Price', node: ui.credits(m.cost) }, { label: 'Seller', value: m.listing.seller.alias }], balanceRows(m.cost, wallet)),
        note: 'The card joins your collection straight away. After that the plan is to list it at about ' + fx(m.resell) + ', which would leave about ' + fx(m.resell - fee(m.resell)) + ' after the 2% fee. Prices can move, so this is a guide, not a promise.',
        confirmLabel: 'Buy for ' + fx(m.cost), icon: 'tag',
        run: function (req) { return ctx.api.purchase(realm, m.listingId, req, m.cost); },
        success: function () { sim().notePlan(m.itemId, m.resell); after('Bought ' + idn.name + '. Next: list it at about ' + fx(m.resell) + '.', '−' + fx(m.cost), 'down')(); }, failure: onDone });
    } else if (m.type === 'bid') {
      ui.sim.confirm({ title: 'Confirm bid', eyebrow: 'Best move', card: cardLine, anchor: anchor,
        rows: [{ label: 'Your maximum', node: ui.credits(m.max) }, { label: 'It will probably close near', node: ui.credits(m.cost) }, { label: 'Closes in', value: ui.fmt.duration(m.expiresMin) }].concat(balanceRows(m.max, wallet)),
        note: 'Your maximum is held until the auction ends. You pay only what is needed to beat the next bidder, never more than your maximum, and you get the hold back if you lose.',
        confirmLabel: 'Bid up to ' + fx(m.max), icon: 'gavel',
        run: function (req) { return ctx.api.placeBid(realm, m.listingId, m.max, req); },
        success: function (res) { sim().notePlan(m.itemId, m.resell); after(res && res.leading ? 'You are leading at ' + fx(res.price) + ' Credits' : 'Bid placed. Another bid is higher for now.', null)(); }, failure: onDone });
    } else if (m.type === 'order') {
      ui.sim.confirm({ title: 'Set a buy order', eyebrow: 'Best move', card: cardLine, anchor: anchor,
        rows: [{ label: 'Highest price you will pay', node: ui.credits(m.cost) }, { label: 'Average Value', value: fx(m.fair) }, { label: 'Waits', value: '2 days, or until you cancel' }].concat(balanceRows(m.cost, wallet)),
        note: 'Your Credits are held while it waits. If a seller lists this card at or under your price, it is yours at once, at their price. If nobody does, you get the hold back when it ends. It can also be cancelled in Activity.',
        confirmLabel: 'Place the order', icon: 'target',
        run: function (req) { return ctx.api.placeOrder(realm, { c: m.cardId, v: null, maxPrice: m.cost, durationMs: 2 * DAY, requestId: req }); },
        success: after('Order placed. It waits for a seller in a hurry.', null), failure: onDone });
    } else {
      var net = m.price - fee(m.price);
      ui.sim.confirm({ title: m.instant ? 'Sell to a waiting trader' : 'List your card', eyebrow: 'Best move', card: cardLine, anchor: anchor,
        rows: rows(m, idn).concat([{ label: 'Price', node: ui.credits(m.price) }, { label: 'You keep after the 2% fee', node: ui.credits(net), strong: true }, { label: 'Quick Sell would pay', value: fx(m.quick) }]),
        note: m.instant ? 'A trader has a standing order at this price, so listing it here sells it immediately.' : 'The card stays yours until someone buys it and is locked while it is listed. You can withdraw it or change the price at any time.',
        confirmLabel: m.instant ? 'Sell for ' + fx(m.price) : 'List at ' + fx(m.price), icon: 'tag',
        run: function (req) { return ctx.api.publishListing(realm, { kind: 'fixed', instanceIds: [m.itemId], ask: m.price, durationMs: 3 * DAY, requestId: req }); },
        success: function (res) {
          var sold = res && res.listing && res.listing.status === 'sold';
          after(sold ? 'Sold ' + idn.name + ' for ' + fx(m.price) + ' Credits.' : 'Listed ' + idn.name + ' at ' + fx(m.price) + '.', sold ? '+' + fx(net) : null, 'up')();
        }, failure: onDone });
    }
  }

  // Quick Sell from a suggestion: the system's fixed bid, paid at once, with the receipt and Undo the rest of the Market gives it.
  function quickSell(m, ctx, env, anchor, onDone) {
    var idn = ui.identity(m.card, !!(env.owned && env.owned[m.cardId])), wallet = ctx.api.walletSync(ctx.realm);
    ui.sim.confirm({ title: 'Quick Sell', eyebrow: 'Cash now', anchor: anchor,
      card: h('div.mk-review-card', h('strong', { text: idn.name }), h('span', { text: idn.rarityName + ' · ' + (m.variantId ? (env.variants[m.variantId] || {}).name : 'Normal finish') })),
      rows: [{ label: 'You get now', node: ui.credits(m.quick), strong: true }, { label: 'A trader would pay about', value: fx(m.fair) }, { label: 'Your Credits after', value: fx(wallet.balance + m.quick) }],
      note: 'The system pays this at once, and it is always less than what another trader pays. You get a receipt and a few seconds to undo it.',
      confirmLabel: 'Quick Sell for ' + fx(m.quick), icon: 'tag',
      run: function () { return ctx.api.quickSell(ctx.realm, { instanceIds: [m.itemId], expectTotal: m.quick }); },
      success: function () { C.ui.toast('Quick Sold ' + idn.name + ' for ' + fx(m.quick) + ' Credits.'); ui.motion.floatBadge(walletEl() || anchor, '+' + fx(m.quick), 'up'); ui.motion.pulse(walletEl()); onDone(); }, failure: onDone });
  }

  // ---- news ----
  function newsCard(n, ctx, env) {
    var card = h('article.mk-news', { data: { dir: n.up ? 'up' : 'down', phase: n.phase } });
    card.appendChild(h('div.mk-news-top', h('span.mk-news-mark', icon(n.up ? 'up' : 'down')), h('span.mk-news-when', { text: n.when })));
    card.appendChild(h('h3', { text: n.headline }));
    card.appendChild(h('p.mk-news-detail', { text: n.detail }));
    var foot = h('div.mk-news-foot');
    foot.appendChild(ui.chip(n.mine ? 'You own ' + n.mine + (n.mine === 1 ? ' of them' : ' of them') : 'You own none of them', { tone: n.mine ? 'soft' : 'neutral' }));
    foot.appendChild(ui.button('Find these cards', { variant: 'ghost', size: 'sm', onClick: function () { findCards(n, env); } }));
    card.appendChild(foot);
    return card;
  }
  function findCards(n, env) {
    var world = C.marketSim.runtime.world, ev = world && (world.events || []).find(function (e) { return e.id === n.id; });
    var f = K().emptyFilters(), s = store.session;
    if (ev && ev.scope.card) { ui.go('card', { id: ev.scope.card, variant: '' }); return; }
    if (ev && ev.scope.brand) f.brands = [ev.scope.brand];
    else if (ev && ev.scope.gen) f.generations = [ev.scope.gen];
    else if (ev && ev.scope.tierLo != null) f.rarityTierMin = ev.scope.tierLo;
    s.pages = s.pages || {};
    s.pages.discover = Object.assign({ tab: 'for-you', sort: 'recommended', pages: 1, saved: null }, s.pages.discover || {}, { filters: f, pages: 1 });
    ui.shell.goTab('discover');
  }

  // ---- goals ----
  function goals(data) {
    var p = data.progress, box = h('section.mk-goals', { 'aria-labelledby': 'mk-goals-title' });
    box.appendChild(h('div.mk-section-head', h('h2', { id: 'mk-goals-title', text: 'Your goals' }), h('span.mk-muted', { text: p.questsDone + ' of ' + p.quests.length + ' done' })));
    var list = h('ul.mk-goal-list');
    p.quests.forEach(function (q) {
      list.appendChild(h('li.mk-goal', { data: { done: String(q.done), id: q.id } }, h('span.mk-goal-mark', q.done ? icon('check') : null),
        h('span.mk-goal-text', h('strong', { text: q.label }), h('span.mk-muted', { text: q.done ? 'Done' : q.hint }))));
    });
    box.appendChild(list);
    if (p.wins.length) {
      box.appendChild(h('h3.mk-wins-title', { text: 'Recent profits' }));
      var wins = h('ul.mk-wins');
      p.wins.slice(0, 4).forEach(function (w) {
        wins.appendChild(h('li', h('span', { text: (env0().cards[w.c] ? env0().cards[w.c].name : w.c) }), h('span.mk-num.mk-win', { text: (w.gain >= 0 ? '+' : '−') + fx(Math.abs(w.gain)) })));
      });
      box.appendChild(wins);
    }
    return box;
  }
  var envRef = null; function env0() { return envRef; }

  function learn(open) {
    var d = h('details.mk-learn', { open: open ? 'open' : undefined });
    d.appendChild(h('summary', h('span', { text: 'New here? How to make money in 3 steps' }), icon('chevron')));
    var steps = h('ol.mk-steps');
    [['Know what a card is worth', 'Average Value is what traders recently paid for it. Quick Sell always pays less, because it is the system buying in a hurry.'],
      ['Buy under it, sell near it', 'Fire sales, closing auctions and news make cards cheap for a while. Each sale costs a 2% fee, so look for gains bigger than that.'],
      ['Read the news', 'When a brand or a rarity is in the news, traders pay more or less for it. Buy before it starts and sell while it lasts. The coach above tells you when.']].forEach(function (s) {
      steps.appendChild(h('li', h('strong', { text: s[0] }), h('span', { text: s[1] })));
    });
    d.appendChild(h('div.mk-learn-body', steps, h('p.mk-hint', icon('info'), h('span', { text: 'Suggestions use today’s prices and news. Other traders act too, so a suggestion can fail, and you can lose Credits. Opening packs pays nothing; Credits come only from selling and trading.' }))));
    return d;
  }

  // ---- the page ----
  function mount(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, scope = ctx.scope, provider = sim();
    envRef = env;
    host.appendChild(h('div.mk-pagehead', h('div.mk-pagehead-copy', ui.eyebrow('Local market'), h('h1', { text: 'Today' }), h('p.mk-home-sub', { id: 'mk-home-clock', text: 'Loading the market…' }))));
    var root0 = h('div.mk-home'); host.appendChild(root0);
    if (realm !== 'simulation' || !provider || !provider.home) {
      root0.appendChild(ui.emptyState({ icon: 'layers', title: 'Home is for the Simulation', body: 'Switch to the Simulation to see today’s best moves, the news and your goals. Global Market has Discover and Portfolio.',
        actions: [{ label: 'Open the Simulation', variant: 'primary', run: function () { store.setRealm('simulation'); } }, { label: 'Browse Global', variant: 'ghost', run: function () { ui.shell.goTab('discover'); } }] }));
      ctx.restoreScroll();
      return;
    }
    var deskHost = h('div.mk-slot.mk-slot-desk'), movesHost = h('div.mk-slot'), newsHost = h('div.mk-slot'), goalsHost = h('div.mk-slot'), learnHost = h('div.mk-slot');
    root0.append(deskHost, movesHost, newsHost, goalsHost, learnHost);
    var last = { desk: '', moves: '', news: '', quests: '', level: null, value: null, questIds: null };
    var pending = 0, torn = false;

    function paintMoves(data) {
      ui.releaseArt(movesHost, ctx.thumbs); ui.clear(movesHost);
      var sec = h('section.mk-moves', { 'aria-labelledby': 'mk-moves-title' });
      sec.appendChild(h('div.mk-section-head', h('div', h('h2', { id: 'mk-moves-title', text: 'Best moves right now' }), h('p.mk-section-lead', { text: 'Suggestions from today’s prices and news. Prices move, so none of this is guaranteed.' })),
        data.moves.length ? h('span.mk-muted', { role: 'status', 'aria-live': 'polite', text: plural(data.moves.length, 'move', 'moves') }) : null));
      if (!data.moves.length) {
        var none = data.state.cards === 0 && data.state.credits < 5;
        sec.appendChild(ui.emptyState({ icon: none ? 'cards' : 'search', title: none ? 'Nothing to trade yet' : 'No clear moves right now',
          body: none ? 'You have no cards and no Credits. Open a pack from the main menu, then come back to sell and trade. Opening packs pays no Credits, but the cards are yours to sell.'
            : 'The market is quiet. Check Browse, or set a buy order a little under a card’s Average Value and let it wait for a seller in a hurry.',
          actions: [{ label: 'Browse listings', variant: 'secondary', run: function () { ui.shell.goTab('discover'); } }] }));
      } else {
        var grid = h('div.mk-move-grid');
        data.moves.forEach(function (m, i) { var c = moveCard(m, ctx, env, function () { refresh(true); ui.shell.refresh(); }); c.style.setProperty('--mk-i', Math.min(i, 5)); grid.appendChild(c); });
        sec.appendChild(grid);
      }
      movesHost.appendChild(sec);
    }
    function paintNews(data) {
      ui.clear(newsHost);
      if (!data.news.length) return;
      var sec = h('section.mk-newsbox', { 'aria-labelledby': 'mk-news-title' });
      sec.appendChild(h('div.mk-section-head', h('div', h('h2', { id: 'mk-news-title', text: 'In the news' }), h('p.mk-section-lead', { text: 'Traders react to this. Prices follow after they trade, so you can be early.' }))));
      var grid = h('div.mk-news-grid');
      data.news.slice(0, 3).forEach(function (n) { grid.appendChild(newsCard(n, ctx, env)); });
      sec.appendChild(grid); newsHost.appendChild(sec);
    }
    function paintGoals(data) { ui.clear(goalsHost); goalsHost.appendChild(goals(data)); ui.clear(learnHost); learnHost.appendChild(learn(!data.quests.sell)); }
    function celebrate(data) {
      var p = data.progress;
      if (last.level != null && p.level.id > last.level) {
        C.ui.toast('You are now a ' + p.level.name + '.');
        var badge = host.querySelector('.mk-level-badge'); ui.motion.burst(badge); ui.motion.pulse(badge);
      }
      var ids = p.quests.filter(function (q) { return q.done; }).map(function (q) { return q.id; });
      if (last.questIds) ids.filter(function (id) { return last.questIds.indexOf(id) < 0; }).forEach(function (id) {
        var q = p.quests.find(function (x) { return x.id === id; }); C.ui.toast('Goal reached: ' + q.label);
        var mark = host.querySelector('.mk-goal[data-id="' + id + '"] .mk-goal-mark'); ui.motion.burst(mark || host);
      });
      last.level = p.level.id; last.questIds = ids;
    }
    function refresh(force) {
      if (torn) return;
      var data; try { data = provider.home(); } catch (error) { console.error(error); return; }
      var clock = host.querySelector('#mk-home-clock'); if (clock) clock.textContent = data.clock + ' · the market moves while the game is open';
      // The desk's number counts to its new value every time; the sections below repaint only when their content changed.
      var dsig = [data.netWorth.now, data.netWorth.history.length, data.progress.level.id, Math.round(data.progress.fraction * 100), data.state.cards, data.state.credits].join(':');
      if (force || dsig !== last.desk || !deskHost.firstChild) {
        var wasDesk = deskHost.firstChild, oldNum = wasDesk && wasDesk.__num, prev = oldNum ? oldNum._mkValue : null;
        var d = desk(data);
        ui.clear(deskHost); deskHost.appendChild(d);
        if (prev != null) { d.__num._mkValue = prev; d.__num.textContent = ui.fmt.exact(prev); }
        ui.motion.countUp(d.__num, data.netWorth.now, { format: function (n) { return ui.fmt.exact(n); } });
        if (prev != null && data.netWorth.now !== prev) ui.motion.flash(d.querySelector('.mk-desk-value'), data.netWorth.now > prev ? 'up' : 'down');
        last.desk = dsig;
      }
      var sig = data.moves.map(function (m) { return m.type + m.itemId + m.cost + (m.price || '') + (m.max || ''); }).join('|');
      if (force || sig !== last.moves || !movesHost.firstChild) { last.moves = sig; paintMoves(data); }
      var nsig = data.news.map(function (n) { return n.id + n.phase + n.mine; }).join('|');
      if (force || nsig !== last.news || (!newsHost.firstChild && data.news.length)) { last.news = nsig; paintNews(data); }
      var qsig = data.progress.quests.map(function (q) { return q.done ? 1 : 0; }).join('') + data.progress.level.id + ':' + data.progress.wins.length + ':' + data.state.cards;
      if (force || qsig !== last.quests || !goalsHost.firstChild) { last.quests = qsig; paintGoals(data); }
      celebrate(data);
    }
    refresh(true);
    // New data at most every few seconds: the simulator ticks about once a second, and a page that rebuilt that often would not be readable.
    scope.add(store.subscribe(function (what) {
      if (what !== 'sim' || pending) return;
      pending = root.setTimeout(function () { pending = 0; refresh(false); }, 3500);
    }));
    scope.add(function () { torn = true; if (pending) root.clearTimeout(pending); ui.releaseArt(movesHost, ctx.thumbs); });
    ctx.restoreScroll();
  }
  ui.pages.register('home', { nav: function () { return 'home'; }, title: function () { return 'Today'; }, mount: mount });
})(window.Cardable = window.Cardable || {}, window);
