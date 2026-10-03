(function (C) {
  'use strict';
  var data = C.data.journal, writing = false, revision = 0;
  function now() { return C.clock ? C.clock.now() : Date.now(); }
  function day(at) {
    if (at == null) return 'before';
    var d = new Date(at);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function date(key) { var p = key.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).getTime(); }
  function hash(value) { var h = 2166136261; for (var i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function empty() { return { entries: [], seen: { cards: {}, variants: {}, tiers: {}, combos: {}, packs: {}, instances: {}, achievements: {}, photos: {}, milestones: {} }, counts: { pulls: 0, packs: 0, unique: 0, variants: 0 }, days: {}, sequence: 0, lastDay: null, streak: 0, templates: {} }; }
  function variants(instance) {
    var ids = Array.isArray(instance.variants) ? instance.variants.map(function (v) { return typeof v === 'string' ? v : v && (v.id || v.variantId); }) : [];
    if (instance.variantId) ids.push(instance.variantId);
    return Array.from(new Set(ids.filter(function (id) { return id && id !== 'normal'; })));
  }
  function add(j, type, fields) {
    var e = Object.assign({ id: 'journal-' + (++j.sequence), at: now(), type: type }, fields);
    var choices = data.types[type].templates, index = hash(e.id) % choices.length;
    if (j.templates[type] === index) index = (index + 1) % choices.length;
    j.templates[type] = index; e.extra = Object.assign({}, e.extra, { template: index });
    j.entries.push(e); return e;
  }
  function milestone(j, key, fields) {
    if (j.seen.milestones[key]) return;
    j.seen.milestones[key] = true;
    add(j, 'milestone', Object.assign({}, fields, { extra: Object.assign({}, fields.extra, { milestoneKey: key }) }));
  }
  function activeDay(j, at, retro) {
    if (at == null) return;
    var key = day(at);
    if (!j.days[key]) j.days[key] = { pulls: 0, packs: 0, unique: 0, best: null };
    if (j.lastDay === key || j.lastDay && key < j.lastDay) return;
    var previous = j.lastDay && new Date(date(j.lastDay));
    if (previous) previous.setDate(previous.getDate() + 1);
    j.streak = previous && day(previous.getTime()) === key ? j.streak + 1 : 1;
    j.lastDay = key;
    if (j.streak > 1) add(j, 'streak', { at: at, n: j.streak, retro: !!retro });
  }
  function rank(e) { var card = C.card(e.cardId), rarity = card && C.rarity(card.rarity); return rarity ? rarity.tier : -1; }
  function pack(j, packId, at, retro, count) {
    if (packId && !j.seen.packs[packId]) { j.seen.packs[packId] = true; add(j, 'packType', { at: at, packId: packId, retro: !!retro }); }
    if (!count) return;
    activeDay(j, at, retro); j.counts.packs += count;
    if (at != null) j.days[day(at)].packs += count;
    data.packMilestones.forEach(function (n) { if (j.counts.packs >= n) milestone(j, 'packs-' + n, { at: at, n: n, retro: !!retro, extra: { kind: 'packs' } }); });
  }
  function completion(j, card, fields) {
    if (!card) return;
    ['generation', 'brand'].forEach(function (kind) {
      var group = card[kind]; if (!group) return;
      var catalog = C.data.cards.filter(function (c) { return c[kind] === group && !c.retired; });
      var owned = catalog.filter(function (c) { return j.seen.cards[c.id]; }).length;
      if (owned === catalog.length && catalog.length) milestone(j, kind + '-' + group, Object.assign({}, fields, { n: owned, extra: { kind: kind, group: group, pct: 100 } }));
    });
  }
  function keep(j, instance, at, retro) {
    if (!instance || !instance.cardId || j.seen.instances[instance.instanceId || instance.serial]) return;
    j.seen.instances[instance.instanceId || instance.serial] = true;
    var card = C.card(instance.cardId), ids = variants(instance), tier = card && card.rarity;
    var first = !j.seen.cards[instance.cardId], firstTier = tier && !j.seen.tiers[tier], newVariants = ids.filter(function (id) { return !j.seen.variants[id]; });
    var fields = { at: at, cardId: instance.cardId, instanceId: instance.instanceId, packId: instance.packId, variantKey: ids.join('+') || null, comboId: instance.comboId || null, tier: tier, retro: !!retro, firstPull: first, firstVariant: !!newVariants.length, firstTier: !!firstTier,
      extra: { serial: instance.serial || '', variants: ids } };
    activeDay(j, at, retro); j.counts.pulls++;
    var pull = add(j, 'pull', fields);
    if (first) { j.seen.cards[instance.cardId] = true; j.counts.unique++; add(j, 'firstPull', fields); }
    newVariants.forEach(function (id) { j.seen.variants[id] = true; j.counts.variants++; add(j, 'variantFirst', Object.assign({}, fields, { variantKey: id })); });
    if (firstTier) { j.seen.tiers[tier] = true; add(j, 'rarityFirst', fields); }
    if (instance.comboId && !j.seen.combos[instance.comboId]) { j.seen.combos[instance.comboId] = true; add(j, 'comboFirst', fields); }
    if (at != null) {
      var d = j.days[day(at)]; d.pulls++; if (first) d.unique++;
      if (!d.best || rank(pull) > rank(d.best)) d.best = { cardId: pull.cardId, instanceId: pull.instanceId, variantKey: pull.variantKey, tier: pull.tier, packId: pull.packId };
    }
    data.uniqueMilestones.forEach(function (n) { if (j.counts.unique >= n) milestone(j, 'unique-' + n, Object.assign({}, fields, { n: n, extra: { kind: 'unique', group: card && (card.generation || card.brand), pct: card ? Math.round(100 * C.data.cards.filter(function (c) { return c.generation === card.generation && j.seen.cards[c.id]; }).length / Math.max(1, C.data.cards.filter(function (c) { return c.generation === card.generation && !c.retired; }).length)) : 0 } })); });
    if (first) completion(j, card, fields);
  }
  function sort(j) { j.entries.sort(function (a, b) { return (a.at == null ? -1 : a.at) - (b.at == null ? -1 : b.at) || Number(a.id.split('-').pop()) - Number(b.id.split('-').pop()); }); }
  function backfill(save) {
    var j = empty(), inventory = save.inventory || [], known = inventory.map(function (i, index) { return { at: Number(i.pulledAt), index: index }; }).filter(function (x) { return Number.isFinite(x.at) && x.at > 0; });
    var ordered = inventory.map(function (i, index) {
      var at = Number(i.pulledAt); if (!Number.isFinite(at) || at <= 0) { var nearest = known.reduce(function (best, item) { return !best || Math.abs(item.index - index) < Math.abs(best.index - index) ? item : best; }, null); at = nearest ? nearest.at : null; }
      return { instance: i, at: at, index: index };
    }).sort(function (a, b) { return (a.at == null ? -1 : a.at) - (b.at == null ? -1 : b.at) || a.index - b.index; });
    ordered.forEach(function (item) { pack(j, item.instance.packId, item.at, true, 0); keep(j, item.instance, item.at, true); });
    // Inventory proves provenance, not how many discarded packs were opened.
    var count = Math.max(Number(save.stats && save.stats.packsOpened) || 0, Number(save.packs && save.packs.openedCount) || 0);
    pack(j, null, null, true, count); sort(j); compact(j); return j;
  }
  function normalize(value, save) {
    if (!value || !Array.isArray(value.entries) || !value.seen || !value.counts) return backfill(save);
    var defaults = empty(), j = Object.assign(defaults, value);
    j.seen = Object.assign(empty().seen, value.seen); j.templates = Object.assign({}, value.templates);
    j.entries = j.entries.filter(function (e) { return e && typeof e.id === 'string' && data.types[e.type] && (e.at == null || Number.isFinite(e.at)); });
    j.counts = Object.assign(empty().counts, value.counts); j.days = value.days || {};
    sort(j); compact(j); return j;
  }
  function compact(j, cap) {
    cap = cap || data.cap;
    if (j.entries.length <= cap) return j;
    var summaries = new Map(), removed = new Set(), needed = j.entries.length - cap;
    j.entries.forEach(function (e) { if (e.type === 'daySummary') summaries.set(e.extra && e.extra.day || day(e.at), e); });
    for (var i = 0; i < j.entries.length && needed > 0; i++) {
      var e = j.entries[i]; if (e.type !== 'pull') continue;
      var key = day(e.at), summary = summaries.get(key);
      if (!summary) {
        summary = { id: 'summary-' + (++j.sequence), at: e.at, type: 'daySummary', n: 0, retro: !!e.retro, extra: { day: key, template: hash(key) % 5, cards: {} } };
        summaries.set(key, summary); j.entries.push(summary); needed++;
      }
      summary.n += 1; summary.extra.cards[e.cardId] = (summary.extra.cards[e.cardId] || 0) + 1;
      if (!summary.cardId || rank(e) > rank(summary)) { summary.cardId = e.cardId; summary.tier = e.tier; summary.variantKey = e.variantKey; summary.extra.best = { cardId: e.cardId, instanceId: e.instanceId, packId: e.packId, variantKey: e.variantKey, serial: e.extra && e.extra.serial }; }
      removed.add(e.id); needed--;
    }
    j.entries = j.entries.filter(function (e) { return !removed.has(e.id); });
    // A very long journal can have more individual days than the entry budget.
    // Coalesce their summaries, retaining each day's counts and best pull.
    while (j.entries.length > cap) {
      var days = j.entries.filter(function (e) { return e.type === 'daySummary'; });
      if (days.length < 2) break; // Never discard a protected first or milestone.
      var a = days[0], b = days[1];
      a.extra.days = (a.extra.days || [{ day: a.extra.day, n: a.n, best: a.extra.best, cards: a.extra.cards }]).concat(b.extra.days || [{ day: b.extra.day, n: b.n, best: b.extra.best, cards: b.extra.cards }]);
      Object.keys(b.extra.cards || {}).forEach(function (id) { a.extra.cards[id] = (a.extra.cards[id] || 0) + b.extra.cards[id]; });
      a.n += b.n; if (rank(b) > rank(a)) { a.cardId = b.cardId; a.tier = b.tier; a.extra.best = b.extra.best; }
      j.entries.splice(j.entries.indexOf(b), 1);
    }
    sort(j); return j;
  }
  function ensure(save) { if (!save.journal) save.journal = backfill(save); return save.journal; }
  function changed() { revision++; C.events.emit('journal:changed', { revision: revision }); }
  function persist() { compact(ensure(C.state.current)); writing = true; try { C.state.save(); } finally { writing = false; } changed(); }
  function slots(e) {
    var card = C.card(e.cardId), packInfo = C.pack(e.packId), variant = C.variant(e.variantKey), rarity = C.rarity(e.tier), extra = e.extra || {}, ids = extra.variants || [];
    var generation = (C.data.generations || []).find(function (g) { return g.id === extra.group; });
    var combo = (C.data.combos || []).find(function (c) { return c.id === e.comboId; });
    var label = generation ? generation.name : extra.group || 'The collection';
    return { card: card ? card.name : e.cardId || 'your collection', pack: packInfo ? packInfo.name : 'an earlier pack', tagline: packInfo && packInfo.copy && packInfo.copy.tagline || '',
      variant: variant ? variant.name : e.variantKey || 'Normal', variants: ids.length ? ids.map(function (id) { return C.variant(id) ? C.variant(id).name : id; }).join(' + ') : 'a normal finish',
      variantA: ids[0] && C.variant(ids[0]) ? C.variant(ids[0]).name : ids[0] || '', variantB: ids[1] && C.variant(ids[1]) ? C.variant(ids[1]).name : ids[1] || '',
      combo: combo ? combo.name : extra.comboName || e.comboId || '', tier: rarity ? rarity.name : e.tier || '', name: extra.name || e.achievementId || '', n: e.n || 0,
      serial: extra.serial || '', generationOrBrand: label, pct: extra.pct || 0,
      milestone: extra.kind === 'packs' ? e.n + ' packs opened' : extra.kind === 'unique' ? e.n + ' unique cards' : label + ' complete',
      progress: extra.group ? label + ' is ' + (extra.pct || 0) + '% complete.' : '' };
  }
  function format(template, values) { return template.replace(/\{(\w+)\}/g, function (_, key) { return values[key] == null ? '' : values[key]; }).replace(/\s+/g, ' ').trim(); }
  C.journal = {
    backfill: backfill, normalize: normalize, compact: compact, ensure: ensure, keep: keep, day: day, date: date, variants: variants, format: format,
    get revision() { return revision; }, get current() { return ensure(C.state.current); },
    text: function (entry) { var templates = data.types[entry.type].templates; return format(templates[(entry.extra && entry.extra.template != null ? entry.extra.template : hash(entry.id)) % templates.length], slots(entry)); },
    highlight: function (entry) { return !!data.types[entry.type].highlight; },
    streak: function (j, at) { var today = day(at == null ? now() : at), d = new Date(date(today)); d.setDate(d.getDate() - 1); return j.lastDay === today || j.lastDay === day(d.getTime()) ? j.streak : 0; },
    searchText: function (e) { var s = slots(e); return Object.keys(s).map(function (k) { return s[k]; }).join(' ').toLowerCase(); }
  };
  C.events.on('save:written', function (save) { if (writing) return; if (!save.journal) { ensure(save); persist(); } });
  C.events.on('save:replaced', changed);
  C.events.on('card:kept', function (instance) { var j = ensure(C.state.current); if (j.seen.instances[instance.instanceId]) return; keep(j, instance, now(), false); sort(j); persist(); });
  C.events.on('pack:opened', function (event) {
    var save = C.state.current, j = ensure(save), pending = save.pendingReveal;
    var total = Math.max(save.stats.packsOpened || 0, save.packs.openedCount || 0), delta = Math.max(0, total - j.counts.packs);
    pack(j, event && event.packId || pending && pending.packId, pending && pending.committedAt || now(), false, delta); sort(j); persist();
  });
  // The bus has no event-declaration API. Inert subscriptions work whether or
  // not another update ever emits these optional events; no producer APIs used.
  C.events.on('achievement:unlocked', function (event) {
    if (!event || !C.state.current) return;
    var id = event.achievementId || event.id || event.achievement && event.achievement.id; if (!id) return;
    var j = ensure(C.state.current); if (j.seen.achievements[id]) return; j.seen.achievements[id] = true;
    add(j, 'achievement', { at: Number.isFinite(event.at) ? event.at : now(), achievementId: id, cardId: event.cardId, instanceId: event.instanceId, extra: { name: event.name || event.achievement && event.achievement.name || id } }); sort(j); persist();
  });
  C.events.on('studio:photo', function (event) {
    if (!event || !C.state.current) return;
    var j = ensure(C.state.current), id = event.photoId || event.id;
    if (id && j.seen.photos[id]) return; if (id) j.seen.photos[id] = true;
    add(j, 'photo', { at: Number.isFinite(event.at) ? event.at : now(), cardId: event.cardId || event.instance && event.instance.cardId, instanceId: event.instanceId || event.instance && event.instance.instanceId, extra: { photoId: id } }); sort(j); persist();
  });
})(window.Cardable);
