/* Cardable — selling cards for Credits.
 * Quick Sell is the system's standing bid for a card: a fixed share of its Average Value, always below what another
 * trader would pay, available at once, offline. It is not a trade. It is never counted as sale volume, a last sale or
 * part of Average Value, and it never makes a price.
 *
 * Every sale, single, bulk or at the reveal, is ONE commit of the player's save that removes the exact instances,
 * credits the Credits once with a ledger entry that names the receipt, and stores the receipt. Nothing is shown as
 * sold until that commit has succeeded. A failed or interrupted commit changes nothing. */
(function (C, root) {
  'use strict';
  var undoRecord = null, counter = 0;
  var cfg = function () { return C.data.market.quickSell; };
  var bulk = function () { return C.data.market.bulkSell; };
  var now = function () { return root.performance.now(); };

  function fail(code, message, extra) { return Object.assign({ ok: false, error: code, message: message || 'That sale could not be completed.' }, extra || {}); }
  function thrown(code, message, extra) { return Object.assign(new Error(message), { code: code, detail: extra || {} }); }
  var MESSAGES = {
    missing: 'That copy is no longer in your collection.', locked: 'Locked copies cannot be sold. Unlock it first.',
    favorite: 'Favorite cards are protected. Remove the favorite first.', listed: 'This copy is listed on the Market. Withdraw the listing first.',
    collection: 'This card is in one of your collections, which Bulk Sell keeps by default.', unpriced: 'This card has no value yet.',
    'quote-changed': 'The quote changed. Review the new total.', 'quote-expired': 'The quote expired. Review a fresh one.',
    'save-failed': 'Could not save. Nothing was sold.', busy: 'Finish the current step first.', empty: 'Choose at least one card.', 'too-many': 'That is more than one sale can hold.'
  };

  function factorFor(instance) {
    var card = C.card(instance.cardId), q = cfg();
    var f = card && q.tierFactor && q.tierFactor[card.rarity];
    return f != null ? f : q.factor;
  }
  function tierOf(instance) { var card = C.card(instance.cardId), r = card && C.rarity(card.rarity); return r ? r.tier : 0; }

  // The quote for one exact instance. Pure: the same valuation always gives the same number.
  function quote(instance) {
    var v = C.valuation.ofInstance(instance);
    if (!v) return null;
    var q = cfg(), base = v.baselineExact;
    // A thin or lopsided market can move the value a quote starts from, but only inside a band around the baseline.
    var start = Math.min(Math.max(v.average, Math.ceil(base * q.floorUnderBaseline)), Math.floor(base * q.ceilingOverBaseline));
    var price = Math.max(q.minPrice, Math.floor(start * factorFor(instance)));
    return { instanceId: instance.instanceId, cardId: instance.cardId, variantId: instance.variantId || null, cardSkinId: instance.cardSkinId || null, serial: instance.serial,
      tier: tierOf(instance), fair: v.average, baseline: v.baselineExact, basis: v.basis, confidence: v.confidence, samples: v.samples, factor: factorFor(instance), quote: price };
  }
  // Why an instance may not be sold, or null. Stack-level favorites protect every copy.
  function blockedReason(save, instance) {
    if (!instance) return 'missing';
    var rule = C.cardDeletion.rules(save, instance);
    if (rule.locked) return 'locked';
    if (rule.favorite) return 'favorite';
    if (rule.listed) return 'listed';
    return rule.blocked ? 'locked' : null;
  }

  // ---- the commit core: mutates a candidate save, so any flow can do it inside its own durable write ------------
  function nextId(at) { counter += 1; return 'S-' + Math.floor(at).toString(36) + '-' + counter.toString(36); }
  function normalizeMarket(candidate) {
    var m = candidate.market && typeof candidate.market === 'object' ? candidate.market : {};
    candidate.market = Object.assign({}, m, { receipts: Array.isArray(m.receipts) ? m.receipts : [], sales: Array.isArray(m.sales) ? m.sales : [] });
    return candidate.market;
  }
  // instances: objects to sell. opts: { kind: 'quick'|'bulk'|'reveal', at, remove (default true), expectTotal, quotes }
  function settleInto(candidate, instances, opts) {
    opts = opts || {};
    var at = opts.at == null ? C.clock.now() : opts.at, kind = opts.kind || 'quick';
    var removing = opts.remove !== false, byId = Object.create(null), items = [], total = 0, fairTotal = 0, seen = Object.create(null);
    candidate.inventory.forEach(function (i) { byId[i.instanceId] = i; });
    instances.forEach(function (given) {
      var inst = removing ? byId[given.instanceId] : given;
      if (!inst) throw thrown('missing', MESSAGES.missing, { instanceId: given.instanceId });
      if (seen[inst.instanceId]) throw thrown('duplicate', 'The same copy was chosen twice.');
      seen[inst.instanceId] = true;
      var why = removing ? blockedReason(candidate, inst) : (C.cardDeletion.rules(candidate, inst).favorite ? 'favorite' : null);
      if (why) throw thrown(why, MESSAGES[why], { instanceId: inst.instanceId });
      var qt = quote(inst);
      if (!qt) throw thrown('unpriced', MESSAGES.unpriced, { instanceId: inst.instanceId });
      items.push({ i: inst.instanceId, c: inst.cardId, v: inst.variantId || null, k: inst.cardSkinId || null, s: inst.serial, p: qt.quote, f: qt.fair });
      total += qt.quote; fairTotal += qt.fair;
    });
    if (!items.length) throw thrown('empty', MESSAGES.empty);
    if (opts.expectTotal != null && opts.expectTotal !== total) throw thrown('quote-changed', MESSAGES['quote-changed'], { total: total });
    if (removing) candidate.inventory = candidate.inventory.filter(function (i) { return !seen[i.instanceId]; });
    var id = nextId(at), reason = kind === 'bulk' ? 'bulk sell' : 'quick sell';
    C.currency.applyInto(candidate, total, reason, at, id);
    var market = normalizeMarket(candidate), keep = cfg().receiptItemsKept;
    var receipt = { id: id, at: at, kind: kind, realm: 'local', count: items.length, total: total, fair: fairTotal, items: items.slice(0, keep), more: Math.max(0, items.length - keep) };
    market.sales.unshift(receipt);
    market.sales.length = Math.min(market.sales.length, cfg().receiptsKept);
    return { receipt: receipt, items: items, total: total };
  }

  // ---- public: sell exact instances from the collection --------------------------------------------------------
  function sell(ids, opts) {
    opts = opts || {};
    var current = C.state.current;
    if (!current || C.bootFailure || C.state.recovery && C.state.recovery.pending) return fail('busy', MESSAGES.busy);
    var unique = Array.from(new Set(ids || []));
    if (!unique.length) return fail('empty', MESSAGES.empty);
    if (unique.length > bulk().maxPerSale) return fail('too-many', MESSAGES['too-many']);
    var candidate = JSON.parse(C.state.encode(current)), byId = Object.create(null), eligible = [], skipped = [];
    candidate.inventory.forEach(function (i) { byId[i.instanceId] = i; });
    unique.forEach(function (id) {
      var inst = byId[id], why = inst ? blockedReason(candidate, inst) : 'missing';
      if (why) skipped.push({ id: id, serial: inst && inst.serial, reason: why, message: MESSAGES[why] }); else eligible.push(inst);
    });
    if (opts.strict && skipped.length) return fail(skipped[0].reason, skipped[0].message, { skipped: skipped });
    if (!eligible.length) return fail('empty', skipped.length ? skipped[0].message : MESSAGES.empty, { skipped: skipped });
    var before = current.currency, snapshots, result;
    try {
      snapshots = eligible.map(function (inst) { return { instance: JSON.parse(JSON.stringify(inst)), index: candidate.inventory.indexOf(inst) }; });
      if (opts.expiresAt != null && now() > opts.expiresAt) throw thrown('quote-expired', MESSAGES['quote-expired']);
      result = settleInto(candidate, eligible, { kind: opts.kind || (eligible.length > 1 ? 'bulk' : 'quick'), expectTotal: opts.expectTotal });
      C.state.validate(JSON.parse(JSON.stringify(candidate)), false);
    } catch (error) {
      return fail(error.code || 'failed', error.message, Object.assign({ skipped: skipped }, error.detail || {}));
    }
    if (!C.state.commit(candidate)) return fail('save-failed', MESSAGES['save-failed']);
    undoRecord = { receiptId: result.receipt.id, until: now() + cfg().undoMs, identity: current.playerCode + ':' + current.createdAt, snapshots: snapshots, total: result.total, kind: result.receipt.kind };
    C.collection.revision += 1;
    C.currency.notify(before, result.receipt.kind === 'bulk' ? 'bulk sell' : 'quick sell');
    C.events.emit('card:deleted', { instance: snapshots[0].instance, cardId: snapshots[0].instance.cardId, instanceId: snapshots[0].instance.instanceId, source: 'sale', count: snapshots.length });
    C.events.emit('card:sold', { receipt: result.receipt, count: snapshots.length, total: result.total });
    return { ok: true, receipt: result.receipt, total: result.total, count: snapshots.length, skipped: skipped, balance: C.state.current.currency, undoable: true };
  }

  function canUndo() {
    var r = undoRecord, c = C.state.current;
    return !!(r && now() <= r.until && c && r.identity === c.playerCode + ':' + c.createdAt && C.currency.canAfford(r.total));
  }
  function undo() {
    var r = undoRecord, current = C.state.current;
    if (!r || now() > r.until || !current || r.identity !== current.playerCode + ':' + current.createdAt) return fail('expired', 'Undo has expired.');
    var have = new Set(current.inventory.map(function (i) { return i.instanceId; }));
    if (r.snapshots.some(function (s) { return have.has(s.instance.instanceId); })) return fail('conflict', 'Those copies are already back.');
    if (!C.currency.canAfford(r.total)) return fail('spent', 'The Credits from that sale have been spent, so it cannot be undone.');
    var candidate = JSON.parse(C.state.encode(current)), before = current.currency;
    r.snapshots.slice().sort(function (a, b) { return a.index - b.index; }).forEach(function (s) { candidate.inventory.splice(Math.min(s.index, candidate.inventory.length), 0, JSON.parse(JSON.stringify(s.instance))); });
    try {
      C.currency.applyInto(candidate, -r.total, 'sale undo', undefined, r.receiptId);
      var market = normalizeMarket(candidate), rec = market.sales.find(function (x) { return x.id === r.receiptId; });
      if (rec) rec.undone = true;
      C.state.validate(JSON.parse(JSON.stringify(candidate)), false);
    } catch (error) { return fail('failed', error.message); }
    if (!C.state.commit(candidate)) return fail('save-failed', MESSAGES['save-failed']);
    undoRecord = null;
    C.collection.revision += 1;
    C.currency.notify(before, 'sale undo');
    C.events.emit('card:restored', { instance: r.snapshots[0].instance, cardId: r.snapshots[0].instance.cardId, instanceId: r.snapshots[0].instance.instanceId, count: r.snapshots.length });
    return { ok: true, count: r.snapshots.length, total: r.total };
  }
  function receipts() { var m = C.state.current && C.state.current.market; return m && Array.isArray(m.sales) ? m.sales.slice() : []; }

  // ---- Bulk Sell planning: which exact copies would a set of rules offer? ------------------------------------
  function stackKey(i) { return i.cardId + '|' + (i.variantId || '') + '|' + (i.cardSkinId || ''); }
  function plan(options) {
    var o = Object.assign({ keep: bulk().defaultKeep, maxTier: bulk().defaultMaxTier, minTier: 0, finishes: false, skins: false, keepCollections: true,
      minValue: null, maxValue: null, order: 'cheapest' }, options || {});
    var save = C.state.current, inv = save.inventory, ui = save.inventoryUi;
    var asNumber = function (x) { return x === '' || x == null || !Number.isFinite(Number(x)) ? null : Number(x); };
    var minV = asNumber(o.minValue), maxV = asNumber(o.maxValue);
    var favorite = new Set((ui.favorites || []).map(function (k) { return k; }));
    var inCollection = new Set();
    if (o.keepCollections) (ui.collections || []).forEach(function (c) { (c.stackKeys || []).forEach(function (k) { inCollection.add(k); }); if (c.kind === 'wishlist') (c.cardIds || []).forEach(function (id) { inCollection.add('card:' + id); }); });
    var groups = Object.create(null), excluded = { favorite: 0, locked: 0, listed: 0, finish: 0, skin: 0, collection: 0, tier: 0, value: 0, kept: 0, hidden: 0 };
    inv.forEach(function (inst) {
      var key = stackKey(inst);
      (groups[key] = groups[key] || []).push(inst);
    });
    var rows = [], stacks = 0;
    Object.keys(groups).forEach(function (key) {
      var list = groups[key], head = list[0];
      stacks++;
      var card = C.card(head.cardId), rarity = card && C.rarity(card.rarity), tier = rarity ? rarity.tier : 0, sk = C.stacks.of(head);
      if (o.onlyStacks && !o.onlyStacks.has(sk)) { excluded.hidden++; return; }
      if (favorite.has(sk)) { excluded.favorite += list.length; return; }
      if (o.keepCollections && (inCollection.has(sk) || inCollection.has('card:' + head.cardId))) { excluded.collection += list.length; return; }
      if (head.variantId && !o.finishes) { excluded.finish += list.length; return; }
      if (head.cardSkinId && !o.skins) { excluded.skin += list.length; return; }
      if (tier > o.maxTier || tier < o.minTier) { excluded.tier += list.length; return; }
      // Keep the copies most worth keeping: the lowest serial first (it carries the bonus), then the oldest.
      var ordered = list.slice().sort(function (a, b) {
        var va = C.valuation.average(a), vb = C.valuation.average(b);
        return vb - va || (a.pulledAt - b.pulledAt) || (a.serial < b.serial ? -1 : 1);
      });
      var offered = ordered.slice(Math.max(0, o.keep));
      excluded.kept += ordered.length - offered.length;
      offered.forEach(function (inst) {
        var why = blockedReason(save, inst);
        if (why) { excluded[why] = (excluded[why] || 0) + 1; return; }
        var qt = quote(inst);
        if (!qt) return;
        if (minV != null && qt.fair < minV || maxV != null && qt.fair > maxV) { excluded.value++; return; }
        rows.push({ instance: inst, quote: qt });
      });
    });
    rows.sort(function (a, b) {
      return o.order === 'newest' ? b.instance.pulledAt - a.instance.pulledAt : o.order === 'oldest' ? a.instance.pulledAt - b.instance.pulledAt
        : a.quote.quote - b.quote.quote || (a.instance.serial < b.instance.serial ? -1 : 1);
    });
    var total = rows.reduce(function (n, r) { return n + r.quote.quote; }, 0), fair = rows.reduce(function (n, r) { return n + r.quote.fair; }, 0);
    return { rows: rows, total: total, fair: fair, count: rows.length, stacks: stacks, excluded: excluded, options: o };
  }

  C.sales = { quote: quote, blockedReason: blockedReason, settleInto: settleInto, sell: sell, undo: undo, canUndo: canUndo, receipts: receipts, plan: plan, messages: MESSAGES,
    // Total of the quotes for a list of instances (display only; a sale recomputes).
    quoteMany: function (instances) {
      var items = instances.map(quote).filter(Boolean), at = now();
      return { items: items, total: items.reduce(function (n, q) { return n + q.quote; }, 0), expiresAt: at + cfg().quoteTtlMs };
    }
  };
})(window.Cardable = window.Cardable || {}, window);
