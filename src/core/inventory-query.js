(function (C) {
  'use strict';
  var fields = ['name', 'rarity', 'vram', 'generation', 'brand', 'owned', 'new', 'type', 'memorytype', 'variant', 'finish', 'favorite'];
  function lower(value) { return String(value == null ? '' : value).toLowerCase(); }
  function memory(card) { return card.vram && !card.vram.shared && card.vram.amount != null ? card.vram.amount / (card.vram.unit === 'MB' ? 1024 : 1) : null; }
  function parse(text) {
    var tokens = String(text || '').match(/(?:[^\s"]+|"[^"]*")+/g) || [], terms = [], errors = [];
    if((String(text||'').match(/"/g)||[]).length%2)errors.push('Close the quoted value');
    tokens.forEach(function (token) {
      var colon = token.indexOf(':'), key = colon > -1 ? lower(token.slice(0, colon)) : 'text', value = lower(colon > -1 ? token.slice(colon + 1) : token).replace(/^"|"$/g, '');
      if (key !== 'text' && fields.indexOf(key) < 0) { errors.push('Unknown tag: ' + key); return; }
      if (!value) { errors.push('Add a value after ' + key + ':'); return; }
      if ((key === 'owned' || key === 'new' || key === 'favorite') && ['true', 'false'].indexOf(value) < 0) { errors.push(key + ' needs true or false'); return; }
      if (key === 'vram' && !/^(>=|<=|>|<)?\d+(\.\d+)?(gb|mb)?$|^\d+(\.\d+)?-\d+(\.\d+)?(gb|mb)?$/.test(value)) { errors.push('Use vram:16, vram:>=16 or vram:8-16'); return; }
      terms.push({ key: key, value: value, token: token });
    }); return { terms: terms, errors: errors };
  }
  function numeric(n, value) { if (n == null) return false; var factor=/mb$/.test(value)?1/1024:1;value = value.replace(/gb$|mb$/, ''); var range = value.split('-'); if (range.length === 2) return n >= Number(range[0])*factor && n <= Number(range[1])*factor; var op = (value.match(/^(>=|<=|>|<)/) || [''])[0], target = Number(value.slice(op.length))*factor; return op === '>=' ? n >= target : op === '<=' ? n <= target : op === '>' ? n > target : op === '<' ? n < target : Math.abs(n - target) < 0.000001; }
  function matches(entry, term) {
    var card = entry.card, key = term.key, value = term.value;
    if (!entry.owned && ['name', 'vram', 'memorytype'].indexOf(key) >= 0) return false;
    if (key === 'variant' || key === 'finish') return entry.owned && (value === 'any' ? !!entry.variantId : [entry.variantId || 'normal', entry.variant ? entry.variant.name : 'Normal'].some(function(v){return lower(v).replace(/\s/g,'-') === value.replace(/\s/g,'-');}));
    if (key === 'favorite') return !!entry.isFavorite === (value === 'true');
    if (key === 'vram') return numeric(memory(card), value);
    if (key === 'owned' || key === 'new') return (key === 'owned' ? entry.owned : entry.isNew) === (value === 'true');
    if (key === 'generation') return [card.generation, entry.generation && entry.generation.name, (card.generation.match(/\d+/) || [''])[0]].some(function (v) { return lower(v) === value; });
    if (key === 'rarity') return [entry.rarity.id, entry.rarity.name, entry.rarity.code].some(function (v) { return lower(v).replace(/\s/g, '-') === value.replace(/\s/g, '-'); });
    // Hidden cards cannot leak names/specs through the search result set.
    if (!entry.owned && ['text', 'name', 'vram', 'memorytype'].indexOf(key) >= 0) {
      if (key !== 'text') return false;
      return lower([entry.generation && entry.generation.name, entry.rarity.name, 'unknown card'].join(' ')).includes(value);
    }
    if (key === 'memorytype') return lower(card.vram.type).includes(value);
    if (key !== 'text') return lower(card[key]).includes(value);
    var text = [entry.variant ? entry.variant.name : 'Normal', card.name, card.brand, card.type, card.generation, entry.generation && entry.generation.name, entry.rarity.name, card.vram.type, memory(card) == null ? 'shared' : memory(card) + 'gb', C.cardSpecs?C.cardSpecs.vram(card):'', C.cardSpecs ? C.cardSpecs.rows(card).map(function (row) { return row.label + ' ' + row.value; }).join(' ') : ''].join(' ');
    return lower(text).replace(/\s+(?=gb)/g, '').includes(value.replace(/\s+(?=gb)/g, ''));
  }
  function facets(entries) { var result = { rarity: [], generation: [], brand: [], vram: [], memoryType: [], type: [], variant: [] }; entries.forEach(function (e) { [['variant', e.owned ? e.variantId || 'normal' : null], ['rarity', e.rarity.id], ['generation', e.card.generation], ['brand', e.card.brand], ['vram', memory(e.card)], ['memoryType', e.card.vram.type], ['type', e.card.type]].forEach(function (pair) { if (pair[1] != null && pair[1] !== '' && result[pair[0]].indexOf(pair[1]) < 0) result[pair[0]].push(pair[1]); }); }); result.vram.sort(function (a,b) { return a-b; }); return result; }
  function group(entry, mode) { return mode === 'variant' ? entry.variant ? entry.variant.name : entry.owned ? 'Normal' : 'Undiscovered' : mode === 'rarity' ? entry.rarity.name : mode === 'generation' ? entry.generation.name : mode === 'brand' ? entry.card.brand || 'Other' : mode === 'ownership' ? entry.owned ? 'Owned' : 'Undiscovered' : mode === 'new' ? entry.isNew ? 'New' : 'Viewed' : ''; }
  function run(base, ui, text, filters) {
    var parsed = parse(text), f = filters || {}, collection = ui.collections.find(function (c) { return c.id === ui.activeCollectionId; });
    base.entries.forEach(function(e){e.isFavorite=ui.favorites.indexOf(e.stackKey)>=0;});
    var entries = base.entries.filter(function (e) {
      if (!ui.showUnowned && !e.owned) return false;
      if (ui.activeCollectionId === 'favorites' && (!e.owned || ui.favorites.indexOf(e.stackKey) < 0) || collection && (!e.owned || collection.stackKeys.indexOf(e.stackKey) < 0)) return false;
      if (f.ownership === 'owned' && !e.owned || f.ownership === 'unowned' && e.owned || f.ownership === 'duplicates' && e.instances.length < 2) return false;
      if (f.variantOnly && !e.variantId) return false;
      if ((f.variant || []).length && (!e.owned || f.variant.indexOf(e.variantId || 'normal') < 0)) return false;
      if (f.newOnly && !e.isNew || f.quantity && e.instances.length < Number(f.quantity)) return false;
      if (['rarity', 'generation', 'brand', 'memoryType'].some(function (key) { var values = f[key] || [], value = key === 'memoryType' ? e.card.vram.type : e.card[key]; return values.length && values.indexOf(value) < 0; })) return false;
      var n = memory(e.card); if (f.vramMin !== '' && f.vramMin != null && (n == null || n < Number(f.vramMin)) || f.vramMax !== '' && f.vramMax != null && (n == null || n > Number(f.vramMax))) return false;
      return parsed.terms.every(function (term) { return matches(e, term); });
    });
    var orders = ui.customOrders[ui.activeCollectionId] || [], ranks = new Map(orders.map(function (id, i) { return [id, i]; }));
    function value(e, sort) { var times = e.instances.map(function (i) { return i.pulledAt; }); return sort === 'recent' ? times.length ? -Math.max.apply(null, times) : null : sort === 'oldest' ? times.length ? Math.min.apply(null, times) : null : sort.startsWith('name') ? e.owned ? lower(e.card.name) : null : sort.startsWith('rarity') ? e.rarity.tier * (sort.endsWith('desc') ? -1 : 1) : sort === 'generation' ? e.generation.order : sort.startsWith('vram') ? memory(e.card) == null ? null : memory(e.card) * (sort.endsWith('desc') ? -1 : 1) : sort === 'quantity' ? -e.instances.length : sort === 'serial' ? e.instances.length ? e.instances[0].serial : null : sort === 'custom' ? ranks.has(e.stackKey) ? ranks.get(e.stackKey) : Infinity : e.catalogIndex; }
    entries.sort(function (a, b) { var ga = group(a, ui.groupMode), gb = group(b, ui.groupMode); if (ga !== gb && ui.groupMode !== 'none') { if (ui.groupMode === 'rarity') return a.rarity.tier - b.rarity.tier; if (ui.groupMode === 'generation') return a.generation.order - b.generation.order; return ga.localeCompare(gb); } var va = value(a, ui.sortMode), vb = value(b, ui.sortMode); if (va == null || vb == null) return va == null && vb == null ? a.catalogIndex - b.catalogIndex : va == null ? 1 : -1; var compare = typeof va === 'string' ? va.localeCompare(vb) * (ui.sortMode === 'name-desc' ? -1 : 1) : va === vb ? 0 : va < vb ? -1 : 1; return compare || a.catalogIndex - b.catalogIndex; });
    var groups = []; entries.forEach(function (entry, index) { var label = group(entry, ui.groupMode), last = groups[groups.length - 1]; if (!last || label !== last.label) groups.push({ label: label, start: index, count: 1 }); else last.count++; });
    var counts={all:base.entries.filter(function(e){return e.owned||ui.showUnowned;}).length,favorites:0};ui.collections.forEach(function(c){counts[c.id]=0;});base.entries.forEach(function(e){if(!e.owned)return;if(ui.favorites.indexOf(e.stackKey)>=0)counts.favorites++;ui.collections.forEach(function(c){if(c.stackKeys.indexOf(e.stackKey)>=0)counts[c.id]++;});});
    return { entries: entries, groups: groups, errors: parsed.errors, terms: parsed.terms, facets: facets(base.entries), owned: base.owned, total: base.total, shown: entries.length, collectionCounts:counts, stackCount:base.stackCount, variantCopies:base.variantCopies, newCopies:base.newCopies };
  }
  C.inventoryQuery = { parse: parse, memory: memory, matches: matches, facets: facets, group: group, run: run };
})(window.Cardable);
