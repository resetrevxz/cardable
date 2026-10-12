/* Cardable — Bulk Sell and sale receipts.
 * Bulk Sell is a review workspace, not a button: rules choose which exact copies are offered (never favorites, locked
 * or listed cards, nothing above Rare, finishes or collection members by default), every copy and its price is visible
 * and individually removable, and the sale is one commit confirmed with a hold. The list is virtualized, so thousands
 * of copies stay usable. Receipts are the record of what left the collection and what it paid. */
(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, doc = root.document, ROW = 42;
  var KINDS = { quick: 'Quick Sell', bulk: 'Bulk Sell', reveal: 'Sold at the reveal' };
  var active = null;
  var fmt = function (n) { return Number(n).toLocaleString(); };
  function cardName(id) { var c = C.card(id); return c ? c.name : id; }
  function finishName(id) { var v = id && C.variant(id); return v ? v.name : 'Normal'; }
  function whenText(at) { try { return new Date(at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch (_) { return ''; } }

  // ---- receipts -----------------------------------------------------------------------------------------------------
  function receiptsShow(anchor) {
    var surface = node('section', 'sale-dialog glass', null);
    surface.setAttribute('role', 'dialog'); surface.setAttribute('aria-modal', 'true'); surface.setAttribute('aria-label', 'Sale receipts');
    node('h2', '', surface, 'Sale receipts');
    var audit = C.currency.audit(C.state.current, 'local');
    node('p', 'sale-note', surface, audit.ok ? 'Your Credits ledger is consistent' + (audit.checked ? ' across ' + audit.checked + ' recorded steps.' : '.') : 'The ledger has ' + audit.problems.length + ' item' + (audit.problems.length === 1 ? '' : 's') + ' to check. Nothing was changed.');
    var list = node('div', 'sale-receipts', surface), receipts = C.sales.receipts();
    if (!receipts.length) node('p', 'sale-empty', list, 'No sales yet. Cards you sell appear here with exactly what was paid.');
    receipts.forEach(function (r) {
      var d = node('details', 'sale-receipt', list), s = node('summary', '', d);
      node('strong', '', s, KINDS[r.kind] + ' · ' + fmt(r.total) + ' Credits'); node('span', 'sale-muted', s, r.count + (r.count === 1 ? ' card' : ' cards') + ' · ' + whenText(r.at) + (r.undone ? ' · Undone' : ''));
      var ul = node('ul', 'sale-items', d);
      r.items.forEach(function (i) { var li = node('li', '', ul); node('span', '', li, cardName(i.c) + ' · ' + finishName(i.v)); node('span', 'sale-mono', li, i.s); node('span', 'sale-mono', li, fmt(i.p)); });
      if (r.more) node('li', 'sale-muted', ul, '… and ' + r.more + ' more');
      node('p', 'sale-muted', d, 'Receipt ' + r.id + '. Average Value at the time ' + fmt(r.fair) + ' Credits; Quick Sell paid ' + (r.fair ? Math.round(r.total / r.fair * 100) : 0) + '% of it.');
    });
    var actions = node('div', 'sale-actions', surface), handle;
    var close = C.ui.create('button', { label: 'Close', onClick: function () { handle.close(); } });
    actions.appendChild(close);
    handle = C.ui.present(surface, { anchor: anchor || doc.activeElement });
    return handle;
  }

  // ---- Bulk Sell ------------------------------------------------------------------------------------------------------
  function bulkShow(anchor) {
    if (active) return active.handle;
    var cfg = C.data.market.bulkSell, q = C.data.market.quickSell;
    var state = { preset: cfg.presets[0].id, keep: cfg.defaultKeep, maxTier: cfg.defaultMaxTier, finishes: false, skins: false, keepCollections: true, minValue: '', maxValue: '', order: 'cheapest', onlyStacks: null, off: new Set() };
    var plan = null, planAt = 0, selected = [], scrollRaf = 0, confirm = null, stopFx = null, handle = null;
    var surface = node('section', 'sale-dialog sale-bulk glass', null);
    surface.setAttribute('role', 'dialog'); surface.setAttribute('aria-modal', 'true'); surface.setAttribute('aria-label', 'Bulk Sell');
    var head = node('header', 'sale-head', surface);
    node('h2', '', head, 'Bulk Sell');
    node('p', 'sale-note', head, 'Choose the rules, then check every copy. Quick Sell pays ' + Math.round(q.factor * 100) + '% of Average Value, less than another trader would. Nothing is sold until you hold to confirm.');

    // Everything between the header and the confirmation scrolls; the confirmation never leaves the screen.
    var scrollBox = node('div', 'sale-scroll', surface);
    // presets
    var presets = node('div', 'sale-presets', scrollBox); presets.setAttribute('role', 'group'); presets.setAttribute('aria-label', 'Presets');
    cfg.presets.forEach(function (p) {
      var b = node('button', 'sale-pill', presets, p.label); b.type = 'button'; b.dataset.preset = p.id; b.title = p.note;
      b.addEventListener('click', function () { state.preset = p.id; state.keep = p.keep; state.maxTier = p.maxTier; state.finishes = !!p.finishes; state.off.clear(); syncControls(); refresh(); });
    });
    // controls
    var grid = node('div', 'sale-controls', scrollBox);
    function field(label) { var l = node('label', 'sale-field', grid); node('span', '', l, label); return l; }
    var keepSel = node('select', '', field('Keep of each card')); [0, 1, 2, 3, 4, 5].forEach(function (n) { var o = node('option', '', keepSel, String(n)); o.value = String(n); });
    var tierSel = node('select', '', field('Sell up to'));
    C.data.rarities.filter(function (r) { return r.tier <= 11; }).slice().sort(function (a, b) { return a.tier - b.tier; }).forEach(function (r) { var o = node('option', '', tierSel, r.name); o.value = String(r.tier); });
    var minIn = node('input', '', field('Average Value from')); minIn.type = 'number'; minIn.min = '0'; minIn.placeholder = 'Any';
    var maxIn = node('input', '', field('Average Value up to')); maxIn.type = 'number'; maxIn.min = '0'; maxIn.placeholder = 'Any';
    var orderSel = node('select', '', field('Order')); [['cheapest', 'Lowest price first'], ['newest', 'Newest first'], ['oldest', 'Oldest first']].forEach(function (p) { var o = node('option', '', orderSel, p[1]); o.value = p[0]; });
    var checks = node('div', 'sale-checks', scrollBox);
    function check(label, key, hint) { var l = node('label', 'sale-check', checks), i = node('input', '', l); i.type = 'checkbox'; node('span', '', l, label); if (hint) l.title = hint; i.addEventListener('change', function () { state[key] = i.checked; state.off.clear(); refresh(); }); return i; }
    var finishCheck = check('Include cards with finishes', 'finishes', 'Finishes are kept unless this is on');
    var skinCheck = check('Include cards with skins', 'skins');
    var collCheck = check('Keep cards in my collections and wishlists', 'keepCollections');
    // Optionally limit the offer to what the inventory is showing right now (its search, filters and active collection).
    var shown = C.inventory && C.inventory.entries ? C.inventory.entries.filter(function (e) { return e.owned; }) : [];
    var shownKeys = new Set(shown.map(function (e) { return e.sourceStackKey || e.stackKey; }));
    var shownCheck = shownKeys.size ? (function () {
      var l = node('label', 'sale-check', checks), i = node('input', '', l); i.type = 'checkbox';
      node('span', '', l, 'Only the ' + shownKeys.size + ' cards my inventory is showing');
      i.addEventListener('change', function () { state.onlyStacks = i.checked ? shownKeys : null; state.off.clear(); refresh(); });
      return i;
    })() : null;
    function syncControls() {
      keepSel.value = String(state.keep); tierSel.value = String(state.maxTier); minIn.value = state.minValue; maxIn.value = state.maxValue; orderSel.value = state.order;
      finishCheck.checked = state.finishes; skinCheck.checked = state.skins; collCheck.checked = state.keepCollections;
      presets.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.preset === state.preset)); });
    }
    keepSel.addEventListener('change', function () { state.keep = Number(keepSel.value); state.preset = ''; state.off.clear(); syncControls(); refresh(); });
    tierSel.addEventListener('change', function () { state.maxTier = Number(tierSel.value); state.preset = ''; state.off.clear(); syncControls(); refresh(); });
    orderSel.addEventListener('change', function () { state.order = orderSel.value; refresh(); });
    var valueTimer = 0;
    [minIn, maxIn].forEach(function (i) { i.addEventListener('input', function () { root.clearTimeout(valueTimer); valueTimer = root.setTimeout(function () { state.minValue = minIn.value; state.maxValue = maxIn.value; state.preset = ''; state.off.clear(); syncControls(); refresh(); }, 250); }); });

    // summary + list
    var summary = node('p', 'sale-summary', scrollBox); summary.setAttribute('role', 'status'); summary.setAttribute('aria-live', 'polite');
    var excl = node('p', 'sale-note sale-excluded', scrollBox);
    var list = node('div', 'sale-list', scrollBox); list.tabIndex = 0; list.setAttribute('role', 'list'); list.setAttribute('aria-label', 'Copies offered for sale');
    var inner = node('div', 'sale-list-inner', list), slice = node('div', 'sale-list-slice', inner);
    var tools = node('div', 'sale-tools', scrollBox);
    function tool(label, fn) { var b = C.ui.create('button', { label: label, variant: 'ghost', onClick: fn }); tools.appendChild(b); return b; }
    tool('Select all', function () { state.off.clear(); draw(); });
    tool('Select none', function () { plan.rows.forEach(function (r) { state.off.add(r.instance.instanceId); }); draw(); });
    tool('Reset to preset', function () { var p = cfg.presets.find(function (x) { return x.id === state.preset; }) || cfg.presets[0]; state.preset = p.id; state.keep = p.keep; state.maxTier = p.maxTier; state.finishes = !!p.finishes; state.skins = false; state.keepCollections = true; state.minValue = ''; state.maxValue = ''; state.off.clear(); syncControls(); refresh(); });
    tool('Refresh quotes', function () { C.valuation.invalidate(); refresh(); });
    var message = node('p', 'sale-message', surface); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite'); message.hidden = true;
    var actions = node('div', 'sale-actions', surface);
    var closeBtn = C.ui.create('button', { label: 'Close', onClick: function () { handle.close(); } });
    var hold = node('button', 'sale-hold', null, 'Sell'); hold.type = 'button';
    actions.append(closeBtn, hold);

    function refresh() {
      plan = C.sales.plan(state); planAt = root.performance.now();
      var ids = new Set(plan.rows.map(function (r) { return r.instance.instanceId; }));
      state.off.forEach(function (id) { if (!ids.has(id)) state.off.delete(id); });
      draw();
    }
    function draw() {
      selected = plan.rows.filter(function (r) { return !state.off.has(r.instance.instanceId); });
      var capped = selected.length > cfg.maxPerSale; if (capped) selected = selected.slice(0, cfg.maxPerSale);
      var total = selected.reduce(function (n, r) { return n + r.quote.quote; }, 0), fair = selected.reduce(function (n, r) { return n + r.quote.fair; }, 0);
      summary.textContent = selected.length
        ? selected.length.toLocaleString() + (selected.length === 1 ? ' copy' : ' copies') + ' · pays ' + fmt(total) + ' Credits · Average Value ' + fmt(fair) + (capped ? ' · the first ' + cfg.maxPerSale + ' only; sell again for the rest' : '')
        : 'No copies match these rules.';
      var e = plan.excluded, bits = [];
      if (e.kept) bits.push(e.kept + ' kept back by the keep rule');
      if (e.favorite) bits.push(e.favorite + ' favorite');
      if (e.locked) bits.push(e.locked + ' locked');
      if (e.listed) bits.push(e.listed + ' listed on the Market');
      if (e.collection) bits.push(e.collection + ' in collections');
      if (e.finish) bits.push(e.finish + ' with finishes');
      if (e.skin) bits.push(e.skin + ' with skins');
      if (e.tier) bits.push(e.tier + ' above the rarity limit');
      if (e.hidden) bits.push(e.hidden + ' outside the inventory view');
      if (e.value) bits.push(e.value + ' outside the value range');
      excl.textContent = bits.length ? 'Not offered: ' + bits.join(', ') + '.' : '';
      if (confirm) confirm.cancel();
      hold.disabled = !selected.length;
      var label = selected.length ? 'Hold ' + (holdMs() / 1000) + ' s to sell ' + selected.length + (selected.length === 1 ? ' copy' : ' copies') + ' for ' + fmt(total) : 'Nothing to sell';
      if (confirm) confirm.setLabel(label); else hold.textContent = label;
      hold.dataset.total = String(total);
      list.setAttribute('aria-rowcount', String(plan.rows.length));
      inner.style.height = plan.rows.length * ROW + 'px';
      drawRows();
    }
    function holdMs() { return 2000; }
    function drawRows() {
      var top = list.scrollTop, height = list.clientHeight || 300;
      var first = Math.max(0, Math.floor(top / ROW) - 4), last = Math.min(plan.rows.length, Math.ceil((top + height) / ROW) + 4);
      slice.replaceChildren(); slice.style.transform = 'translateY(' + first * ROW + 'px)';
      for (var i = first; i < last; i++) {
        var row = plan.rows[i], inst = row.instance, off = state.off.has(inst.instanceId);
        var el = node('div', 'sale-row' + (off ? ' is-off' : ''), slice); el.setAttribute('role', 'listitem');
        var box = node('input', '', el); box.type = 'checkbox'; box.checked = !off; box.setAttribute('aria-label', 'Sell ' + cardName(inst.cardId) + ', ' + inst.serial + ', for ' + fmt(row.quote.quote) + ' Credits');
        (function (id, b) { b.addEventListener('change', function () { if (b.checked) state.off.delete(id); else state.off.add(id); draw(); }); })(inst.instanceId, box);
        var name = node('span', 'sale-name', el); node('strong', '', name, cardName(inst.cardId)); node('small', '', name, C.rarity(C.card(inst.cardId).rarity).name + ' · ' + finishName(inst.variantId));
        node('span', 'sale-mono sale-serial', el, inst.serial);
        node('span', 'sale-mono sale-price', el, fmt(row.quote.quote));
      }
    }
    list.addEventListener('scroll', function () { if (scrollRaf) return; scrollRaf = root.requestAnimationFrame(function () { scrollRaf = 0; if (plan) drawRows(); }); });

    // one clear confirmation: hold, then a single commit
    confirm = C.uiKit.confirmation(hold, function () { sell(); }, { mode: 'hold', holdMs: holdMs(), holdLabel: 'Keep holding to sell', announce: function (t) { message.hidden = false; message.textContent = t; } });
    stopFx = C.fx.subscribe(function (now, dt) { return confirm.update(now, dt); }, 'bulk-sell');
    function sell() {
      var ids = selected.map(function (r) { return r.instance.instanceId; }), total = Number(hold.dataset.total);
      var result = C.sales.sell(ids, { kind: 'bulk', expectTotal: total, expiresAt: planAt + q.quoteTtlMs * 3 });
      if (!result.ok) {
        if (result.error === 'quote-changed' || result.error === 'quote-expired') { C.valuation.invalidate(); refresh(); say('Prices moved, so nothing was sold. Review the new total and hold again.'); }
        else say((result.message || 'Could not sell.') + ' Nothing was sold.');
        return;
      }
      showResult(result);
    }
    function say(text) { message.hidden = false; message.textContent = text; }
    function showResult(result) {
      surface.replaceChildren();
      node('h2', '', surface, result.count === 1 ? 'Sold 1 card' : 'Sold ' + result.count + ' cards');
      node('p', 'sale-summary', surface, fmt(result.total) + ' Credits added. Your balance is ' + fmt(result.balance) + '.');
      if (result.skipped && result.skipped.length) {
        node('p', 'sale-note', surface, result.skipped.length + ' copies were skipped because they changed after you reviewed: ' + result.skipped.slice(0, 5).map(function (s) { return (s.serial || s.id) + ' (' + s.reason + ')'; }).join(', ') + (result.skipped.length > 5 ? ', …' : '') + '.');
      }
      node('p', 'sale-note', surface, 'Receipt ' + result.receipt.id + ' is kept under Sale receipts.');
      var out = node('div', 'sale-actions', surface), noteEl = node('p', 'sale-message', surface); noteEl.setAttribute('role', 'status');
      if (C.sales.canUndo()) out.appendChild(C.ui.create('button', { label: 'Undo for 10 s', variant: 'ghost', onClick: function () { var r = C.sales.undo(); noteEl.textContent = r.ok ? r.count + ' copies restored.' : r.message; } }));
      out.appendChild(C.ui.create('button', { label: 'Receipts', variant: 'ghost', onClick: function () { handle.close(); receiptsShow(); } }));
      out.appendChild(C.ui.create('button', { label: 'Done', onClick: function () { handle.close(); } }));
    }

    syncControls(); refresh();
    handle = C.ui.present(surface, { anchor: anchor || doc.activeElement, onClose: function () { root.clearTimeout(valueTimer); if (stopFx) stopFx(); if (confirm) confirm.destroy(); active = null; } });
    active = { handle: handle };
    return handle;
  }

  C.receiptsView = { show: receiptsShow };
  C.bulkSellView = { show: bulkShow, get active() { return !!active; } };
  C.events.on('app:ready', function () {
    if (!C.commands) return;
    C.commands.register({ id: 'sell:bulk', label: 'Sell cards (Bulk Sell)', group: 'Cards', run: function () { bulkShow(); } });
    C.commands.register({ id: 'sell:receipts', label: 'Sale receipts', group: 'Cards', run: function () { receiptsShow(); } });
  });
  C.events.on('save:willReplace', function () { if (active) active.handle.close(); });
})(window.Cardable = window.Cardable || {}, window);
