/* Cardable Market — the listing composer.
 * Picks exact card instances, previews the listing as a feed tile, shows the 2% fee and net proceeds and keeps a
 * saved draft. Publishing always passes through a review; online pictures use the existing upload client. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store, K = function () { return C.market.core; };
  var cfg = function () { return C.data.market; };
  var RATIOS = [{ id: 'card', label: 'Card 5:7', css: '5 / 7' }, { id: '4:5', label: '4:5', css: '4 / 5' }, { id: '1:1', label: '1:1', css: '1 / 1' }, { id: '16:9', label: '16:9', css: '16 / 9' }];

  function stackKey(i) { return (i.cardId || '') + '|' + (i.variantId || '') + '|' + (i.cardSkinId || ''); }

  function mount(ctx) {
    var host = ctx.host, scope = ctx.scope, realm = ctx.realm, env = ctx.env();
    var advanced = C.settings.get('marketMode') === 'advanced';
    var live = ui.sim.live(realm), DAY = 86400000;
    var inv = ctx.api.inventorySync(realm);
    var byId = {}; inv.items.forEach(function (i) { byId[i.instanceId] = i; });
    var draftKey = 'compose:' + realm;
    var draft = {
      format: C.settings.get('marketBiddingDefault') === false ? 'buy-now' : 'auction', items: [], price: '', startBid: '', reserve: '', buyout: '', preset: C.settings.get('marketListingDuration') || cfg().auction.defaultPreset,
      durationMode: 'preset', customHours: 48, fixedDays: 7, wanted: [{ type: 'card', cardId: '', rarity: '', variant: '', minValuePct: '' }], creditTopUp: '', topUpDirection: 'asks',
      minRelativePct: '', wantLowSerial: false, title: '', description: '', cover: { kind: 'card', ratio: 'card', name: '', alt: '', zoom: 1, x: 50, y: 50 }, touchedPrice: false
    };
    var saved = C.settings.get('marketRememberSelling') === false ? null : store.getDraft(draftKey), resumed = false, dirty = false, status = 'idle';
    var setup = C.settings.get('marketRememberSelling') === false ? null : store.getDraft('selling-setup');
    if (setup && setup.draft) {
      var last = setup.draft;
      draft.format = last.format === 'buy-now' ? 'buy-now' : last.format === 'swap' && advanced ? 'swap' : 'auction';
      draft.preset = last.preset || draft.preset; draft.fixedDays = last.fixedDays || draft.fixedDays;
      if (advanced) { draft.durationMode = last.durationMode || 'preset'; draft.customHours = last.customHours || draft.customHours; }
    }
    var carry = store.session.composeCarry;
    store.session.composeCarry = null;
    var coverUrl = null;
    scope.add(function () { if (coverUrl) { try { root.URL.revokeObjectURL(coverUrl); } catch (_) { /* gone */ } coverUrl = null; } });

    // preselect from route
    var wantCard = ctx.params.cardId, wantInstance = ctx.params.instanceId;
    var first = inv.items.find(function (i) { return wantInstance ? i.instanceId === wantInstance : wantCard ? i.cardId === wantCard : false; });
    if (first) draft.items = [first.instanceId];
    if (ctx.params.relist && ctx.params.relist.id) {
      var src = ctx.api.listingSync(realm, ctx.params.relist.id);
      if (src) { draft.format = src.listing.format; draft.title = src.listing.title || ''; }
    }

    function valuationOf(instance) {
      if (live) return ctx.api.valuationSync(realm, { cardId: instance.cardId, variantId: instance.variantId || null, cardSkinId: instance.cardSkinId || null, serial: instance.serial });
      return env.data.valuation({ cardId: instance.cardId, variantId: instance.variantId || null, cardSkinId: instance.cardSkinId || null });
    }
    function selected() { return draft.items.map(function (id) { return byId[id]; }).filter(Boolean); }
    function bundleValuation() {
      var sel = selected();
      if (!sel.length) return null;
      var vs = sel.map(valuationOf).filter(Boolean);
      if (!vs.length) return null;
      var sum = function (k) { return vs.reduce(function (n, v) { return n + (v[k] || 0); }, 0); };
      var worst = vs.reduce(function (a, v) { var order = { none: 0, low: 1, medium: 2, high: 3 }; return order[v.confidence] < order[a] ? v.confidence : a; }, 'high');
      return { average: sum('average'), targetBuy: sum('targetBuy'), targetSell: sum('targetSell'), bestBid: sum('bestBid'), lowestAsk: sum('lowestAsk'),
        spread: vs[0].spread, liquidity: Math.min.apply(null, vs.map(function (v) { return v.liquidity; })), volatility: Math.max.apply(null, vs.map(function (v) { return v.volatility || 0; })),
        confidence: worst, samples: Math.min.apply(null, vs.map(function (v) { return v.samples; })), basis: vs.every(function (v) { return v.basis === 'sales'; }) ? 'sales' : 'baseline',
        volume24h: 0, volume7d: 0, windowHours: Math.max.apply(null, vs.map(function (v) { return v.windowHours || 0; })) };
    }
    function hours() { return K().durationHours({ durationMode: draft.durationMode, customHours: draft.customHours, preset: draft.preset }); }
    function toDraft() {
      return { mode: advanced ? 'advanced' : 'simple', format: draft.format, items: selected().map(function (i) { return { instanceId: i.instanceId }; }),
        price: draft.price, startBid: draft.startBid, reserve: advanced ? draft.reserve : '', buyout: draft.buyout, preset: draft.preset,
        durationMode: advanced ? draft.durationMode : 'preset', customHours: draft.customHours, fixedDays: draft.fixedDays,
        wanted: draft.wanted.map(function (w) { return { cardId: w.type === 'card' ? w.cardId : '', rarity: w.type === 'rarity' ? w.rarity : '', variant: w.type === 'finish' ? w.variant : '', minValuePct: w.minValuePct }; }),
        creditTopUp: advanced ? draft.creditTopUp : '', minRelativePct: advanced ? draft.minRelativePct : '', wantLowSerial: advanced && draft.wantLowSerial,
        title: draft.title, description: draft.description,
        pictures: (draft.pictures || []).map(function (p) { return { uploadId: p.uploadId, alt: p.alt || '', layout: p.layout || 'banner', crop: p.crop || null }; }), treatment: draft.treatment || 'none' };
    }

    // ---- layout ----
    var back = ui.button('Back', { icon: 'back', variant: 'ghost', onClick: function () { ui.shell.back(); } });
    host.appendChild(h('div.mk-pagehead.is-detail', back));
    host.appendChild(h('div.mk-pagehead', h('div.mk-pagehead-copy', h('h1', h('span.mk-h1-icon', icon('tag')), h('span', { text: 'Sell a card' })), h('p', { text: live
      ? 'Pick the card, set terms, see what you keep. Locked while listed.'
      : 'Pick the card, set terms, see what you would keep. Nothing is published.' }))));
    var banner = h('div.mk-banner-host');
    host.appendChild(banner);
    var layout = h('div.mk-composer');
    var form = h('div.mk-composer-form'), side = h('aside.mk-composer-side', { 'aria-label': 'Listing preview' });
    layout.append(form, side);
    host.appendChild(layout);
    if (ui.online && ui.online.settingsPanel) host.appendChild(ui.online.settingsPanel(ctx));

    function resumeBanner() {
      ui.clear(banner);
      if (!saved || resumed) return;
      var d = saved.draft;
      var age = Math.max(1, Math.round((Date.now() - saved.savedAt) / 60000));
      var box = h('div.mk-banner', { role: 'status', data: { tone: 'info' } }, icon('save'), h('span', { text: 'You have a draft from ' + (age < 60 ? age + ' min' : Math.round(age / 60) + ' h') + ' ago.' }),
        ui.button('Resume draft', { variant: 'secondary', size: 'sm', onClick: function () { applyDraft(d); resumed = true; resumeBanner(); renderAll(); } }),
        ui.button('Discard', { variant: 'ghost', size: 'sm', onClick: function () { store.clearDraft(draftKey); saved = null; resumeBanner(); } }));
      banner.appendChild(box);
    }
    function applyDraft(d) {
      if (!d) return;
      var ids = (d.items || []).map(function (i) { return i.instanceId; }).filter(function (id) { return byId[id]; });
      draft.items = advanced ? ids : ids.slice(0, 1); draft.format = !advanced && d.format === 'swap' ? 'auction' : d.format || draft.format; draft.price = d.price || ''; draft.startBid = d.startBid || ''; draft.reserve = d.reserve || ''; draft.buyout = d.buyout || '';
      draft.preset = d.preset || draft.preset; draft.durationMode = d.durationMode || 'preset'; draft.customHours = d.customHours || 48;
      draft.creditTopUp = d.creditTopUp || ''; draft.minRelativePct = d.minRelativePct || ''; draft.wantLowSerial = !!d.wantLowSerial; draft.title = d.title || ''; draft.description = d.description || '';
      draft.pictures = Array.isArray(d.pictures) ? d.pictures.filter(function (p) { return p && /^upl_/.test(p.uploadId); }).slice(0, 3) : [];
      draft.treatment = d.treatment || 'none';
      if (Array.isArray(d.wanted) && d.wanted.length) draft.wanted = d.wanted.map(function (w) { return { type: w.cardId ? 'card' : w.rarity ? 'rarity' : w.variant ? 'finish' : 'card', cardId: w.cardId || '', rarity: w.rarity || '', variant: w.variant || '', minValuePct: w.minValuePct || '' }; });
    }

    // ---- autosave ----
    var saveTimer = 0, statusEl = h('span.mk-draft-status', { role: 'status', 'aria-live': 'polite' });
    function setStatus(s) {
      status = s;
      var text = { idle: '', dirty: 'Unsaved changes', saved: store.persistent ? 'Draft saved on this device' : 'Draft kept for this session only', error: 'This draft cannot be kept. Browser storage is unavailable.' }[s] || '';
      statusEl.textContent = text; statusEl.dataset.state = s;
    }
    function touch() {
      dirty = true; setStatus('dirty');
      root.clearTimeout(saveTimer);
      saveTimer = root.setTimeout(function () {
        if (scope.dead) return;
        if (!draft.items.length && !draft.title && !draft.price && !draft.startBid) { store.clearDraft(draftKey); setStatus('idle'); return; }
        if (C.settings.get('marketRememberSelling') !== false) store.saveDraft(draftKey, toDraft());
        setStatus(store.persistent ? 'saved' : 'error');
      }, 500);
    }
    scope.add(function () {
      root.clearTimeout(saveTimer);
      // Leaving the page keeps the draft: flush it, and hand it straight to a remount (a settings change).
      if (C.settings.get('marketRememberSelling') !== false && dirty && (draft.items.length || draft.title || draft.price || draft.startBid)) {
        if (C.settings.get('marketRememberSelling') !== false) store.saveDraft(draftKey, toDraft());
        store.session.composeCarry = { key: draftKey, draft: toDraft(), at: Date.now() };
      }
    });

    // ---- 1. choose the card ----
    var pickerHost = h('section.mk-step', { 'aria-label': 'Choose a card' });
    function buildPicker() {
      ui.releaseArt(pickerHost, ctx.thumbs);
      ui.clear(pickerHost);
      pickerHost.appendChild(h('div.mk-step-head', h('span.mk-step-no', { text: '1' }), h('div', h('h2', { text: 'Choose a card' }),
        h('p', { text: advanced ? 'Pick one card, or build a bundle of up to ' + cfg().listing.maxBundle + '. Each copy is chosen by its serial, never the whole stack.' : 'Choose the card you want to sell.' }))));
      if (inv.demo && !live) pickerHost.appendChild(h('div.mk-banner', { data: { tone: 'info' } }, icon('info'), h('span', { text: 'You have no cards yet, so these are sample cards. Open a pack and your own collection appears here.' })));
      var search = h('input.mk-input', { type: 'search', placeholder: 'Search your cards', 'aria-label': 'Search your cards' });
      pickerHost.appendChild(h('div.mk-picker-bar', search, h('span.mk-muted', { text: inv.items.length + ' cards' })));
      var listEl = h('div.mk-picker', { role: 'group', 'aria-label': 'Your cards' });
      pickerHost.appendChild(listEl);
      var groups = {};
      inv.items.forEach(function (i) { (groups[stackKey(i)] = groups[stackKey(i)] || []).push(i); });
      var stacks = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) {
        var ta = (env.data.index[a[0].cardId] || { tier: 0 }).tier, tb = (env.data.index[b[0].cardId] || { tier: 0 }).tier;
        return tb - ta || (a[0].cardId < b[0].cardId ? -1 : 1);
      });
      function paint() {
        var q = search.value.trim().toLowerCase();
        ui.releaseArt(listEl, ctx.thumbs);
        ui.clear(listEl);
        var shown = 0;
        stacks.forEach(function (stack) {
          var head = stack[0], card = env.cards[head.cardId]; if (!card) return;
          var idn = ui.identity(card, true);
          if (q && (idn.name + ' ' + idn.rarityName).toLowerCase().indexOf(q) < 0) return;
          shown++;
          var row = h('div.mk-pick', { data: { stack: stackKey(head) } });
          var art = h('div.mk-pick-art'); art.appendChild(ctx.thumbs.mount(card, { instanceId: 'mk-pick-' + head.instanceId, cardId: card.id, serial: head.serial, variantId: head.variantId, cardSkinId: head.cardSkinId, seen: true }, { owned: true }));
          var v = valuationOf(head);
          var copy = h('div.mk-pick-copy', h('strong', { text: idn.name }),
            h('span', { text: idn.rarityName + ' · ' + (head.variantId ? (env.variants[head.variantId] || {}).name : 'Normal finish') + (stack.length > 1 ? ' · ' + stack.length + ' copies' : '') }),
            h('span.mk-muted', { text: 'Average Value ' + ui.fmt.exact(v.average) + ' Credits' + (live && v.basis === 'baseline' ? ' · baseline' : '') }));
          var chips = h('div.mk-pick-chips', { role: advanced ? 'group' : 'radiogroup', 'aria-label': 'Copies of ' + idn.name });
          if (stack.length === 1) {
            var single = stack[0], chosen = draft.items.indexOf(single.instanceId) >= 0;
            var selectCard = ui.button(chosen ? 'Selected' : 'Select', { variant: chosen ? 'primary' : 'secondary', icon: chosen ? 'check' : 'plus', disabled: !!(single._listed || single.locked), reason: single._listed ? 'Already listed' : single.locked ? 'Unlock this card first' : '', onClick: function () { choose(single.instanceId); } });
            chips.appendChild(selectCard);
            art.addEventListener('click', function () { choose(single.instanceId); });
          }
          (stack.length > 1 ? stack : []).forEach(function (i) {
            var on = draft.items.indexOf(i.instanceId) >= 0;
            var blocked = live ? (i._listed ? 'Already in a listing or offer' : i.locked ? 'Locked cards cannot be listed. Unlock it first.' : '') : '';
            var b = h('button.mk-pill.is-serial', { type: 'button', role: advanced ? 'checkbox' : 'radio', 'aria-checked': String(on), 'aria-pressed': advanced ? String(on) : null, data: { instance: i.instanceId }, disabled: !!blocked, title: blocked },
              icon(blocked ? 'lock' : on ? 'check' : 'plus'), h('span.mk-mono', { text: i.serial.replace('CBL-', '') }));
            b.addEventListener('click', function () { choose(i.instanceId); });
            chips.appendChild(b);
          });
          row.append(art, copy, chips); listEl.appendChild(row);
        });
        if (!shown) listEl.appendChild(h('p.mk-hint', { text: 'No card matches that search.' }));
      }
      search.addEventListener('input', paint);
      paint();
    }
    function choose(id) {
      if (live && byId[id] && (byId[id]._listed || byId[id].locked)) return;
      var at = draft.items.indexOf(id);
      if (advanced) { if (at >= 0) draft.items.splice(at, 1); else if (draft.items.length < cfg().listing.maxBundle) draft.items.push(id); else C.ui.toast('A listing holds at most ' + cfg().listing.maxBundle + ' cards.'); }
      else draft.items = at >= 0 ? [] : [id];
      draft.touchedPrice = false;
      suggestIfBlank();
      touch(); buildPicker(); buildTerms(); renderSide();
    }
    function suggestIfBlank() {
      var v = bundleValuation(); if (!v) return;
      if (draft.format === 'buy-now' && (!draft.price || !draft.touchedPrice)) draft.price = String(K().suggestedAsk(v, 'balanced').price);
      if (draft.format === 'auction' && (!draft.startBid || !draft.touchedPrice)) draft.startBid = String(K().suggestedStart(v));
    }

    // ---- 2 + 3. type and terms ----
    var termsHost = h('section.mk-step', { 'aria-label': 'Listing type and terms' });
    var errorEls = {};
    function field(label, input, options) {
      options = options || {};
      var id = 'mk-f-' + Math.floor(Math.random() * 1e9).toString(36);
      input.id = id;
      var err = h('small.mk-field-error', { id: id + '-err', role: 'alert', hidden: true });
      input.setAttribute('aria-describedby', id + '-err' + (options.hint ? ' ' + id + '-hint' : ''));
      if (options.name) errorEls[options.name] = { input: input, err: err };
      var wrap = h('div.mk-field', h('label.mk-field-label', { for: id }, options.help ? ui.labelWithHelp(label, options.help) : label), input,
        options.hint ? h('small.mk-hint', { id: id + '-hint', text: options.hint }) : null, err);
      return wrap;
    }
    function numberInput(value, onInput, attrs) {
      var el = h('input.mk-input', Object.assign({ type: 'number', min: '0', step: '1', inputmode: 'numeric', value: value == null ? '' : String(value) }, attrs || {}));
      el.addEventListener('input', function () { onInput(el.value); touch(); renderSide(); });
      return el;
    }
    function buildTerms() {
      ui.clear(termsHost); errorEls = {};
      var v = bundleValuation();
      termsHost.appendChild(h('div.mk-step-head', h('span.mk-step-no', { text: '2' }), h('div', h('h2', { text: 'Set price' }), h('p', { text: 'Choose a starting bid or a Buy price.' }))));
      var bids = h('input', { type: 'checkbox', role: 'switch', props: { checked: draft.format === 'auction' } });
      bids.addEventListener('change', function () { draft.format = bids.checked ? 'auction' : 'buy-now'; suggestIfBlank(); touch(); buildTerms(); renderSide(); });
      termsHost.appendChild(h('label.mk-toggle', bids, h('span.mk-toggle-track', { 'aria-hidden': 'true' }, h('i')), h('span.mk-toggle-copy', h('span', { text: 'Allow bids' }))));
      if (advanced) {
        var typeSwitch = ui.segmented({ label: 'Listing type', value: draft.format, onChange: function (f) { draft.format = f; draft.touchedPrice = false; suggestIfBlank(); touch(); buildTerms(); renderSide(); }, options: cfg().formats.map(function (f) { return { value: f.id, label: f.label, icon: f.icon }; }) });
        termsHost.appendChild(typeSwitch);
      }
      var body = h('div.mk-terms');
      if (advanced && v && live && selected().length === 1) body.appendChild(analysis(selected()[0]));
      if (advanced && v) body.appendChild(h('p.mk-guidance', icon('trend'), h('span', { text: 'Average Value ' + ui.fmt.exact(v.average) + ' Credits' + (v.basis === 'baseline' ? ' (baseline estimate, no sales yet)' : ' from ' + v.samples + ' recent trades') + ' · Target Sell ' + ui.fmt.exact(v.targetSell) + (live ? '' : ' · about ' + v.windowHours + ' h to sell near it.') })));
      if (draft.format === 'buy-now') {
        var price = numberInput(draft.price, function (val) { draft.price = val; draft.touchedPrice = true; }, { min: '1' });
        body.appendChild(field('Buy price (Credits)', price, { name: 'price', help: 'average-value', hint: 'Buyers pay exactly this. You receive it minus the ' + cfg().fee.label.toLowerCase() + '.' }));
        if (advanced && v) {
          // three ready prices as cards: what it asks, what you keep after the fee, and how long it tends to take
          var g = selected().length === 1 && C.valuation.guidance ? (function () { var inst = selected()[0]; try { return C.valuation.guidance({ cardId: inst.cardId, variantId: inst.variantId || null, cardSkinId: inst.cardSkinId || null, serial: inst.serial }); } catch (_) { return null; } })() : null;
          var quick = h('div.mk-price-choices', { role: 'group', 'aria-label': 'Suggested prices' }), cards = [];
          [['fast', 'Sell fast', 'zap', 'quick'], ['balanced', 'Fair price', 'check', 'fair'], ['patient', 'Patient', 'clock', 'patient']].forEach(function (u) {
            var s = K().suggestedAsk(v, u[0]), m = g && g.modes.find(function (x) { return x.id === u[3]; });
            var keep = s.price - K().feeFor(s.price, cfg().fee), eta = m && m.etaHours ? (m.etaHours < 24 ? '~' + m.etaHours + ' h' : '~' + Math.round(m.etaHours / 24) + ' d') : null;
            var b = h('button.mk-price-choice', { type: 'button', data: { urgency: u[0] }, 'aria-pressed': String(String(s.price) === String(draft.price)) },
              h('span.mk-price-choice-top', icon(u[2]), h('span', { text: u[1] })),
              h('strong.mk-num', { text: ui.fmt.exact(s.price) }),
              h('span.mk-price-choice-sub', { text: 'You keep ' + ui.fmt.exact(keep) + (eta ? ' · ' + eta : '') }));
            b.addEventListener('click', function () {
              draft.price = String(s.price); draft.touchedPrice = true; price.value = draft.price;
              cards.forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
              if (ui.motion) ui.motion.pulse(b);
              touch(); renderSide();
            });
            cards.push(b); quick.appendChild(b);
          });
          price.addEventListener('input', function () { cards.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); });
          body.appendChild(quick);
        }
        if (live) {
          var days = ui.segmented({ label: 'How long it stays up', value: String(draft.fixedDays), onChange: function (d) { draft.fixedDays = Number(d); touch(); renderSide(); },
            options: [{ value: '1', label: '1 day' }, { value: '3', label: '3 days' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }] });
          body.appendChild(h('div.mk-field', h('span.mk-field-label', { text: 'Stays up for' }), days, h('small.mk-hint', { text: 'If nobody buys it in that time, it comes back to you unlocked. No fee is charged.' })));
        } else if (advanced) {
          var rel = numberInput(draft.minRelativePct, function (val) { draft.minRelativePct = val; }, { min: String(cfg().relativeValue.min), max: String(cfg().relativeValue.max), step: String(cfg().relativeValue.step), placeholder: 'e.g. ' + cfg().relativeValue.default });
          body.appendChild(field('Accept offers down to (% of Average Value)', rel, { name: 'minRelativePct', hint: 'Offers below this are declined for you. Leave empty to see every offer.' }));
        }
      } else if (draft.format === 'auction') {
        var start = numberInput(draft.startBid, function (val) { draft.startBid = val; draft.touchedPrice = true; }, { min: '1' });
        body.appendChild(field('Starting bid (Credits)', start, { name: 'startBid', hint: 'Bidders go up in steps of at least 5% or 1 Credit.' }));
        var presets = h('div.mk-presets-inline', { role: 'radiogroup', 'aria-label': 'Auction length' });
        cfg().auction.presets.forEach(function (p) {
          var on = draft.durationMode === 'preset' && draft.preset === p.id;
          var b = h('button.mk-pill', { type: 'button', role: 'radio', 'aria-checked': String(on), data: { preset: p.id } }, h('span', { text: p.label }));
          b.addEventListener('click', function () { draft.preset = p.id; draft.durationMode = 'preset'; touch(); buildTerms(); renderSide(); });
          presets.appendChild(b);
        });
        if (advanced) {
          var custom = h('button.mk-pill', { type: 'button', role: 'radio', 'aria-checked': String(draft.durationMode === 'custom') }, h('span', { text: 'Custom' }));
          custom.addEventListener('click', function () { draft.durationMode = 'custom'; touch(); buildTerms(); renderSide(); });
          presets.appendChild(custom);
        }
        body.appendChild(h('div.mk-field', h('span.mk-field-label', { text: 'Length' }), presets));
        if (advanced && draft.durationMode === 'custom') {
          var dur = numberInput(draft.customHours, function (val) { draft.customHours = val; }, { min: String(cfg().auction.customMinHours), max: String(cfg().auction.customMaxHours) });
          body.appendChild(field('Custom length (hours)', dur, { name: 'duration', hint: 'Between 1 hour and 14 days. Only available in Advanced.' }));
        }
        if (advanced) {
          var reserve = numberInput(draft.reserve, function (val) { draft.reserve = val; }, { min: '0', placeholder: 'None' });
          body.appendChild(field('Reserve (Credits)', reserve, { name: 'reserve', help: 'reserve', hint: 'The auction only sells if the winning bid reaches this. Bidders see whether it has been met, not the amount.' }));
        }
        {
          var buyout = numberInput(draft.buyout, function (val) { draft.buyout = val; }, { min: '0', placeholder: 'None' });
          body.appendChild(field('Buy now price (optional)', buyout, { name: 'buyout', hint: 'Lets a buyer end the auction at once at this price.' }));
        }
      } else {
        body.appendChild(buildWanted(v));
        if (live) body.appendChild(h('p.mk-hint', { text: 'Traders offer cards worth at least the share of this card’s value you set. Accept, decline or let it lapse.' }));
        if (advanced && !live) {
          var top = numberInput(draft.creditTopUp, function (val) { draft.creditTopUp = val; }, { min: '0', placeholder: 'None' });
          body.appendChild(field('Credits top-up', top, { name: 'creditTopUp', hint: 'Credits to even a trade of unequal value. The ' + cfg().fee.label.toLowerCase() + ' applies to this part only.' }));
          var dir = ui.segmented({ label: 'Top-up direction', value: draft.topUpDirection, onChange: function (d) { draft.topUpDirection = d; touch(); renderSide(); }, options: [{ value: 'asks', label: 'I ask for Credits' }, { value: 'adds', label: 'I add Credits' }] });
          body.appendChild(dir);
          var rel2 = numberInput(draft.minRelativePct, function (val) { draft.minRelativePct = val; }, { min: String(cfg().relativeValue.min), max: String(cfg().relativeValue.max), step: String(cfg().relativeValue.step), placeholder: 'e.g. ' + cfg().relativeValue.default });
          body.appendChild(field('Minimum value of what I receive (% of my card)', rel2, { name: 'minRelativePct', hint: 'Offers worth less than this share of your card’s Average Value are declined for you.' }));
          var low = h('input', { type: 'checkbox', props: { checked: !!draft.wantLowSerial } });
          low.addEventListener('change', function () { draft.wantLowSerial = low.checked; touch(); renderSide(); });
          body.appendChild(h('label.mk-toggle', low, h('span.mk-toggle-track', { 'aria-hidden': 'true' }, h('i')), h('span.mk-toggle-copy', h('span', { text: 'Only serials ' + cfg().serial.lowCounter + ' or lower' }), h('small', { text: 'Offered cards must have a low serial in their owner’s sequence.' }))));
        }
      }
      termsHost.appendChild(body);
      applyErrors();
    }
    // Price analysis for the chosen card: three ways to list with what each leaves after the fee, a realistic range to
    // buy in, and the plain reasons for the figures. Only the first card of a bundle is analysed.
    function analysis(inst) {
      var g = C.valuation.guidance({ cardId: inst.cardId, variantId: inst.variantId || null, cardSkinId: inst.cardSkinId || null, serial: inst.serial });
      var box = h('details.mk-analysis');
      box.appendChild(h('summary', h('span', { text: 'Price analysis' }), icon('chevron')));
      if (!g) return box;
      var v = g.value, rows = h('div.mk-analysis-rows');
      g.modes.forEach(function (m) {
        rows.appendChild(h('div.mk-analysis-row', h('strong', { text: m.label }), h('span.mk-num', { text: ui.fmt.exact(m.ask) + ' Credits' }),
          h('span', { text: 'You receive ' + ui.fmt.exact(m.net) + (m.vsAverage != null ? ' · ' + ui.fmt.pct(m.vsAverage, true) + ' vs Average Value' : '') }),
          h('span.mk-muted', { text: m.etaHours ? 'Typically sells in about ' + (m.etaHours >= 48 ? Math.round(m.etaHours / 24) + ' days' : m.etaHours + ' hours') : 'Time to sell: insufficient sales' })));
      });
      box.appendChild(rows);
      box.appendChild(ui.statGrid([
        { label: 'Average Value', value: ui.fmt.exact(v.average), note: v.basis === 'baseline' ? 'Baseline estimate, no trades yet' : v.samples + ' recent trades', help: 'average-value' },
        { label: 'Confidence', value: { high: 'High', medium: 'Medium', low: 'Low', none: 'Not enough data' }[v.confidence], help: 'confidence' },
        { label: 'Worth buying at', value: ui.fmt.exact(g.buyRange.low) + ' to ' + ui.fmt.exact(g.buyRange.high), note: 'Target Buy range', help: 'target-buy' },
        { label: 'Resale after the fee', value: (g.resaleMargin.net >= 0 ? '+' : '−') + ui.fmt.exact(Math.abs(g.resaleMargin.net)), note: 'Buying at ' + ui.fmt.exact(g.resaleMargin.buyAt) + ' and selling at Target Sell ' + ui.fmt.exact(g.resaleMargin.sellAt) },
        { label: 'Spread', value: ui.fmt.pct(g.spread, false, 1), note: g.spreadReal ? 'From an open order and listing' : 'Estimated for this rarity', help: 'spread' },
        { label: 'Liquidity', value: v.liquidity == null ? 'No trades yet' : Math.round(v.liquidity * 100) + ' of 100', help: 'liquidity' }
      ], { cols: 2 }));
      box.appendChild(h('p.mk-hint', { text: g.liquidityNote + ' ' + g.timeNote + ' ' + g.confidenceNote }));
      return box;
    }
    function buildWanted(v) {
      var wrap = h('div.mk-wanted');
      wrap.appendChild(h('span.mk-field-label', { text: 'What would you accept?' }));
      (live ? draft.wanted.slice(0, 1) : draft.wanted).forEach(function (w, idx) {
        var row = h('div.mk-wanted-row');
        var type = h('select.mk-select', { 'aria-label': 'Rule ' + (idx + 1) + ' type' },
          h('option', { value: 'card', text: 'A specific card', props: { selected: w.type === 'card' } }), h('option', { value: 'rarity', text: 'A rarity or better', props: { selected: w.type === 'rarity' } }),
          live ? null : h('option', { value: 'finish', text: 'A particular finish', props: { selected: w.type === 'finish' } }));
        type.addEventListener('change', function () { w.type = type.value; touch(); buildTerms(); renderSide(); });
        var value;
        if (w.type === 'card') {
          value = h('select.mk-select', { 'aria-label': 'Wanted card' }, h('option', { value: '', text: 'Choose a card…' }));
          C.data.rarities.slice().sort(function (a, b) { return a.tier - b.tier; }).forEach(function (r) {
            var cards = env.data.cards.filter(function (c) { return c.rarity === r.id; }); if (!cards.length) return;
            var og = h('optgroup', { label: r.name });
            cards.forEach(function (c) { og.appendChild(h('option', { value: c.id, text: ui.identity(c, false).name === 'Unfound Secret' ? 'Unfound Secret' : c.name, props: { selected: w.cardId === c.id } })); });
            value.appendChild(og);
          });
          value.addEventListener('change', function () { w.cardId = value.value; touch(); renderSide(); applyErrors(); });
        } else if (w.type === 'rarity') {
          value = h('select.mk-select', { 'aria-label': 'Wanted rarity' }, h('option', { value: '', text: 'Choose a rarity…' }));
          C.data.rarities.slice().sort(function (a, b) { return a.tier - b.tier; }).forEach(function (r) { value.appendChild(h('option', { value: r.id, text: r.name + ' or better', props: { selected: w.rarity === r.id } })); });
          value.addEventListener('change', function () { w.rarity = value.value; touch(); renderSide(); applyErrors(); });
        } else {
          value = h('select.mk-select', { 'aria-label': 'Wanted finish' }, h('option', { value: '', text: 'Choose a finish…' }));
          C.data.variants.filter(function (x) { return x.kind !== 'frame'; }).forEach(function (x) { value.appendChild(h('option', { value: x.id, text: x.name, props: { selected: w.variant === x.id } })); });
          value.addEventListener('change', function () { w.variant = value.value; touch(); renderSide(); applyErrors(); });
        }
        row.append(type, value);
        if (advanced || live) {
          var pct = h('input.mk-input.is-narrow', { type: 'number', min: '0', placeholder: 'Min %', 'aria-label': 'Minimum value percent', value: w.minValuePct || '' });
          pct.addEventListener('input', function () { w.minValuePct = pct.value; touch(); renderSide(); });
          row.appendChild(pct);
          if (draft.wanted.length > 1 && !live) row.appendChild(ui.iconButton('trash', 'Remove this rule', function () { draft.wanted.splice(idx, 1); touch(); buildTerms(); renderSide(); }));
        }
        wrap.appendChild(row);
      });
      if (advanced && !live && draft.wanted.length < 3) wrap.appendChild(ui.button('Add another acceptable card', { icon: 'plus', variant: 'ghost', size: 'sm', onClick: function () { draft.wanted.push({ type: 'card', cardId: '', rarity: '', variant: '', minValuePct: '' }); touch(); buildTerms(); } }));
      var errSlot = h('small.mk-field-error', { role: 'alert', hidden: true }); errorEls.wanted = { input: wrap, err: errSlot };
      wrap.appendChild(errSlot);
      return wrap;
    }

    // ---- 4. presentation ----
    var presentHost = h('details.mk-step.mk-present', { 'aria-label': 'Title, note and cover image' });
    presentHost.open = advanced || !!(draft.title || draft.description);
    var coverFrame, coverImg, coverEmpty;
    function buildPresent() {
      ui.clear(presentHost);
      presentHost.appendChild(h('summary', h('span.mk-step-no', { text: '3' }), h('div', h('h2', { text: 'Title, note and cover' }), h('p', { text: 'Optional. Your card art always leads in the feed.' })), icon('chevron')));
      var body = h('div.mk-present-body');
      var title = h('input.mk-input', { type: 'text', maxlength: String(cfg().listing.titleMax), placeholder: 'A short headline (optional)', value: draft.title });
      title.addEventListener('input', function () { draft.title = title.value; touch(); renderSide(); counter.textContent = title.value.length + '/' + cfg().listing.titleMax; });
      var counter = h('small.mk-hint', { text: draft.title.length + '/' + cfg().listing.titleMax });
      body.appendChild(field('Title', title, { name: 'title', hint: 'Shown above the card name. It never changes what the card is.' }));
      body.lastChild.appendChild(counter);
      var note = h('textarea.mk-input', { rows: '3', maxlength: String(cfg().listing.descriptionMax), placeholder: 'Anything a buyer should know (optional)' }); note.value = draft.description;
      note.addEventListener('input', function () { draft.description = note.value; touch(); });
      body.appendChild(field('Note', note, { name: 'description' }));

      if (live && ui.sim.isGlobal(realm) && C.market.media && C.market.online && C.market.online.state.status === 'online') {
        body.appendChild(picturesSection());
        presentHost.appendChild(body);
        return;
      }
      if (live) {
        body.appendChild(h('p.mk-hint', icon('image'), h('span', { text: 'The card’s own art is always shown on the listing.' })));
        presentHost.appendChild(body);
        return;
      }
      // cover uploader (local only)
      var cover = h('div.mk-cover');
      cover.appendChild(h('span.mk-field-label', { text: 'Cover image' }));
      var chooser = h('div.mk-cover-actions');
      var fileInput = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, 'aria-label': 'Choose a cover image' });
      var choose = ui.button('Choose an image', { icon: 'upload', variant: 'secondary', onClick: function () { fileInput.click(); } });
      var album = ui.button('From Director album', { icon: 'image', variant: 'secondary', onClick: function () { openAlbum(album); } });
      var remove = ui.button('Remove', { icon: 'trash', variant: 'ghost', disabled: draft.cover.kind === 'card', onClick: function () { setCover(null); } });
      chooser.append(choose, album, remove, fileInput);
      cover.appendChild(chooser);
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0]; if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { showCoverError('Use a PNG, JPEG or WebP image.'); return; }
        if (file.size > 6 * 1024 * 1024) { showCoverError('That image is over 6 MB. Choose a smaller one.'); return; }
        setCover({ url: root.URL.createObjectURL(file), name: file.name, kind: 'file' });
        fileInput.value = '';
      });
      var coverError = h('small.mk-field-error', { role: 'alert', hidden: true });
      function showCoverError(msg) { coverError.textContent = msg; coverError.hidden = false; }
      cover.appendChild(coverError);
      var ratioSwitch = ui.segmented({ label: 'Cover shape', value: draft.cover.ratio, onChange: function (r) { draft.cover.ratio = r; touch(); paintCover(); },
        options: RATIOS.map(function (r) { return { value: r.id, label: r.label }; }) });
      cover.appendChild(ratioSwitch);
      coverFrame = h('div.mk-cover-frame', { data: { ratio: draft.cover.ratio } });
      coverImg = h('img.mk-cover-img', { alt: '', draggable: 'false', hidden: true });
      coverEmpty = h('div.mk-cover-empty', icon('image'), h('span', { text: 'No cover image. The standard card cover is used.' }));
      coverFrame.append(coverImg, coverEmpty);
      cover.appendChild(coverFrame);
      var alt = h('input.mk-input', { type: 'text', maxlength: '120', placeholder: 'Describe the image for people using a screen reader', value: draft.cover.alt || '' });
      alt.addEventListener('input', function () { draft.cover.alt = alt.value; touch(); });
      cover.appendChild(field('Image description', alt, { hint: 'Used as alternative text. Required when you add an image.' }));
      cover.appendChild(h('p.mk-hint', icon('shield'), h('span', { text: 'A cover is decoration. It never hides the card’s rarity, finish or serial. Nothing is uploaded.' })));
      body.appendChild(cover);
      presentHost.appendChild(body);
      // drag to reposition
      var drag = null;
      coverFrame.addEventListener('pointerdown', function (e) { if (coverImg.hidden) return; drag = { x: e.clientX, y: e.clientY, ox: draft.cover.x, oy: draft.cover.y }; coverFrame.setPointerCapture(e.pointerId); });
      coverFrame.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var r = coverFrame.getBoundingClientRect();
        draft.cover.x = Math.max(0, Math.min(100, drag.ox - (e.clientX - drag.x) / r.width * 100));
        draft.cover.y = Math.max(0, Math.min(100, drag.oy - (e.clientY - drag.y) / r.height * 100));
        coverImg.style.objectPosition = draft.cover.x + '% ' + draft.cover.y + '%';
      });
      coverFrame.addEventListener('pointerup', function () { if (drag) { drag = null; touch(); } });
      paintCover();
    }
    // ---- Global Market pictures: chosen, cropped and uploaded on purpose, then attached to the listing ----
    var MAXPIC = 3;
    function pictures() { return draft.pictures || (draft.pictures = []); }
    function picturesSection() {
      var sec = h('div.mk-pictures-edit', { 'aria-label': 'Pictures' });
      sec.appendChild(h('span.mk-field-label', { text: 'Pictures from you' }));
      sec.appendChild(h('p.mk-hint', icon('shield'), h('span', { text: 'Optional. It sits beside the card and never replaces it. Nothing is uploaded until you crop and confirm.' })));
      var list = h('ul.mk-pictures', { role: 'list' });
      pictures().forEach(function (p, n) {
        var li = h('li.mk-picture');
        var thumb = h('div.mk-picture-thumb'); thumb.appendChild(ui.social.photoImg({ id: p.uploadId, alt: p.alt }, 'thumb', p.alt || 'Picture ' + (n + 1)));
        var alt = h('input.mk-input', { type: 'text', maxlength: '140', value: p.alt || '', placeholder: 'Describe the picture (optional)', 'aria-label': 'Description of picture ' + (n + 1) });
        alt.addEventListener('input', function () { p.alt = alt.value; touch(); });
        var acts = h('div.mk-picture-actions');
        if (n > 0) acts.appendChild(ui.button('Make cover', { variant: 'ghost', size: 'sm', onClick: function () { pictures().splice(n, 1); pictures().unshift(p); touch(); buildPresent(); renderSide(); } }));
        acts.appendChild(ui.button('Remove', { variant: 'ghost', size: 'sm', icon: 'trash', onClick: function () { pictures().splice(n, 1); touch(); buildPresent(); renderSide(); } }));
        li.append(thumb, h('div.mk-picture-copy', h('strong', { text: n === 0 ? 'Cover' : 'Picture ' + (n + 1) }), alt), acts);
        list.appendChild(li);
      });
      sec.appendChild(list);
      if (pictures().length < MAXPIC) {
        var fileInput = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, 'aria-label': 'Choose a picture' });
        var choose = ui.button('Choose a picture', { icon: 'upload', variant: 'secondary', onClick: function () { fileInput.click(); } });
        var album = ui.button('From Director album', { icon: 'image', variant: 'secondary', onClick: function () { openAlbum(album, true); } });
        sec.append(h('div.mk-cover-actions', choose, album, fileInput));
        fileInput.addEventListener('change', function () { var file = fileInput.files && fileInput.files[0]; fileInput.value = ''; if (file) pictureDialog(file, 'file', choose); });
        var drop = h('div.mk-dropzone', { tabindex: '0', role: 'button', 'aria-label': 'Drop a picture here, or press Enter to choose one' }, icon('upload'), h('span', { text: 'Drop a picture here, or paste one from your clipboard' }));
        drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
        ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
        ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
        drop.addEventListener('drop', function (e) { var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (file) pictureDialog(file, 'file', drop); });
        sec.appendChild(drop);
        // paste: only while this step is open and the focus is in it
        sec.addEventListener('paste', function (e) {
          var items = e.clipboardData && e.clipboardData.items;
          for (var i = 0; items && i < items.length; i++) if (items[i].kind === 'file') { var file = items[i].getAsFile(); if (file) { e.preventDefault(); pictureDialog(file, 'file', drop); return; } }
        });
        drop.setAttribute('data-paste', 'true');
      } else sec.appendChild(h('p.mk-hint', { text: 'A listing can show up to ' + MAXPIC + ' pictures.' }));
      var look = ui.segmented({ label: 'Look', value: draft.treatment || 'none', onChange: function (v) { draft.treatment = v; touch(); renderSide(); },
        options: [{ value: 'none', label: 'Plain' }, { value: 'frame', label: 'Framed' }, { value: 'spotlight', label: 'Spotlight' }] });
      sec.appendChild(h('div.mk-field', h('span.mk-field-label', { text: 'How the pictures look' }), look,
        h('small.mk-hint', { text: 'A thin frame or a soft light. It never changes the card or the terms.' })));
      return sec;
    }
    // Crop, describe, confirm, upload with real progress. The original file is only read.
    function pictureDialog(blob, source, anchor) {
      var surface = h('section.mk-modal.mk-crop', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Add a picture' });
      var state = { img: null, crop: { layout: 'banner', zoom: 1, x: 50, y: 50 }, job: null, busy: false };
      var canvas = h('canvas.mk-crop-canvas', { width: 480, height: 270, role: 'img', 'aria-label': 'Preview of the part of the picture that will be shown', tabindex: '0' });
      var status = h('p.mk-hint', { role: 'status', text: 'Reading the picture…' });
      var err = h('p.mk-field-error', { role: 'alert', hidden: true });
      var bar = h('progress.mk-progress', { max: '100', value: '0', hidden: true, 'aria-label': 'Upload progress' });
      var layoutSwitch = ui.segmented({ label: 'Shape', value: state.crop.layout, onChange: function (v) { state.crop.layout = v; fit(); draw(); },
        options: Object.keys(C.market.media.LAYOUTS).map(function (k) { return { value: k, label: C.market.media.LAYOUTS[k].label }; }) });
      var zoomIn = h('input', { type: 'range', min: '1', max: '4', step: '0.05', value: '1', 'aria-label': 'Zoom' });
      var alt = h('input.mk-input', { type: 'text', maxlength: '140', placeholder: 'Describe the picture for someone who cannot see it (optional)', 'aria-label': 'Picture description' });
      var agree = h('input', { type: 'checkbox', 'aria-label': 'I understand this picture is uploaded and shown to other players' });
      var send = ui.button('Upload picture', { variant: 'primary', icon: 'upload', disabled: true });
      var cancel = ui.button('Cancel', { variant: 'ghost' });
      function fit() { var a = C.market.media.LAYOUTS[state.crop.layout].ratio; canvas.height = Math.round(canvas.width / a); }
      function draw() {
        if (!state.img) return;
        var r = C.market.media.cropRect(state.img, state.crop), g = canvas.getContext('2d');
        g.fillStyle = '#16181c'; g.fillRect(0, 0, canvas.width, canvas.height);
        g.drawImage(state.img.source, r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);
      }
      function ready() { send.disabled = !(state.img && agree.checked) || state.busy; }
      agree.addEventListener('change', ready);
      zoomIn.addEventListener('input', function () { state.crop.zoom = Number(zoomIn.value); draw(); });
      var drag = null;
      canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, ox: state.crop.x, oy: state.crop.y }; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var b = canvas.getBoundingClientRect();
        state.crop.x = Math.max(0, Math.min(100, drag.ox - (e.clientX - drag.x) / b.width * 100 * Math.max(1, state.crop.zoom)));
        state.crop.y = Math.max(0, Math.min(100, drag.oy - (e.clientY - drag.y) / b.height * 100 * Math.max(1, state.crop.zoom)));
        draw();
      });
      canvas.addEventListener('pointerup', function () { drag = null; });
      canvas.addEventListener('keydown', function (e) {
        var d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
        if (d) { e.preventDefault(); state.crop.x = Math.max(0, Math.min(100, state.crop.x + d[0])); state.crop.y = Math.max(0, Math.min(100, state.crop.y + d[1])); draw(); }
      });
      function close() { if (state.job) state.job.cancel(); if (state.img) state.img.close(); handle.close(); }
      cancel.addEventListener('click', close);
      send.addEventListener('click', function () {
        state.busy = true; send.disabled = true; err.hidden = true; bar.hidden = false; bar.value = 0;
        status.textContent = 'Preparing the picture…';
        C.market.media.prepare(state.img, state.crop).then(function (prepared) {
          status.textContent = 'Uploading ' + Math.max(1, Math.round(prepared.bytes / 1024)) + ' KB…';
          cancel.querySelector('span').textContent = 'Cancel upload';
          state.job = C.market.media.upload(prepared, { source: source === 'album' ? 'director' : 'file', onProgress: function (f) { bar.value = Math.round(f * 100); } });
          return state.job.promise.then(function (res) { return { res: res, prepared: prepared }; });
        }).then(function (done) {
          pictures().push({ uploadId: done.res.uploadId, alt: alt.value.trim(), layout: state.crop.layout, crop: Object.assign({}, state.crop) });
          draft.cover = Object.assign({}, draft.cover, { photoLayout: pictures()[0].layout });
          if (state.img) state.img.close();
          touch(); handle.close(); buildPresent(); renderSide();
          C.ui.toast('Picture uploaded. It is shown only once you list the card.');
          if (C.market.onlineProvider && C.market.onlineProvider.social) C.market.onlineProvider.social.refreshUploads();
        }, function (error) {
          state.busy = false; state.job = null; bar.hidden = true; cancel.querySelector('span').textContent = 'Cancel';
          if (error && error.code === 'cancelled') { status.textContent = 'Upload cancelled. Nothing was kept.'; ready(); return; }
          err.textContent = (error && error.message) || 'The picture could not be uploaded.';
          err.hidden = false; status.textContent = 'You can try again with the same picture.'; ready();
        });
      });
      surface.append(h('header', ui.eyebrow('Market'), h('h2', { text: 'Add a picture' })),
        h('div.mk-crop-stage', canvas), status, bar, layoutSwitch, h('label.mk-field', h('span.mk-field-label', { text: 'Zoom' }), zoomIn),
        h('div.mk-field', h('span.mk-field-label', { text: 'Description' }), alt),
        h('label.mk-check', agree, h('span', { text: 'I understand this picture is uploaded to Market and shown to other players on this listing. Camera and location data are removed.' })),
        err, h('div.mk-modal-actions', cancel, send));
      var handle = C.ui.present(surface, { anchor: anchor, onClose: function () { if (state.job) state.job.cancel(); } });
      fit();
      C.market.media.open(blob).then(function (img) {
        state.img = img; status.textContent = 'Drag the picture, or use the arrow keys, to choose the part that is shown. ' + img.width + ' × ' + img.height + ' pixels.';
        fit(); draw(); ready();
      }, function (error) { status.textContent = ''; err.textContent = (error && error.message) || 'That picture could not be used.'; err.hidden = false; });
    }
    function paintCover() {
      if (!coverFrame) return;
      var r = RATIOS.find(function (x) { return x.id === draft.cover.ratio; }) || RATIOS[0];
      coverFrame.style.aspectRatio = r.css; coverFrame.dataset.ratio = r.id;
      var has = draft.cover.kind !== 'card' && coverUrl;
      coverImg.hidden = !has; coverEmpty.hidden = !!has;
      if (has) { coverImg.src = coverUrl; coverImg.style.objectPosition = draft.cover.x + '% ' + draft.cover.y + '%'; }
      renderSide();
    }
    function setCover(c) {
      if (coverUrl) { try { root.URL.revokeObjectURL(coverUrl); } catch (_) { /* gone */ } coverUrl = null; }
      if (!c) { draft.cover = { kind: 'card', ratio: draft.cover.ratio, name: '', alt: '', zoom: 1, x: 50, y: 50 }; }
      else { coverUrl = c.url; draft.cover.kind = c.kind; draft.cover.name = c.name; draft.cover.x = 50; draft.cover.y = 50; }
      touch(); buildPresent();
    }
    function openAlbum(anchor, forUpload) {
      var surface = h('section.mk-modal.mk-album', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Director album' });
      var grid = h('div.mk-album-grid', { role: 'list' });
      var made = [];
      surface.append(h('h2', { text: 'Director album' }), h('p', { text: forUpload ? 'Photos you made in Inspect and Director. Choosing one lets you crop it and upload a copy. The album itself is never changed.' : 'Photos you made in Inspect and Director. They are only read here, never changed or uploaded.' }), grid,
        h('div.mk-modal-actions', ui.button('Close', { variant: 'primary', onClick: function () { handle.close(); } })));
      var handle = C.ui.present(surface, { anchor: anchor, onClose: function () { made.forEach(function (u) { try { root.URL.revokeObjectURL(u); } catch (_) { /* gone */ } }); } });
      grid.appendChild(h('p.mk-hint', { text: 'Looking through the album…' }));
      // The album's storage code loads on demand (it is part of the Studio); only that part is loaded, and it only reads.
      var ready = C.studioAlbum && C.studioAlbum.list ? Promise.resolve() : (C.studio && C.studio.ensureAlbumData ? C.studio.ensureAlbumData() : Promise.reject(new Error('The album is not available here.')));
      ready.then(function () { return C.studioAlbum.list(); }).then(function (photos) {
        ui.clear(grid);
        if (!photos.length) { grid.appendChild(ui.emptyState({ kind: 'empty', icon: 'image', title: 'No Director photos yet', body: 'Take a photo in Inspect or Director and it appears here.' })); return; }
        photos.slice(0, 24).forEach(function (p) {
          if (!p.thumb) return;
          var url = root.URL.createObjectURL(p.thumb); made.push(url);
          var b = h('button.mk-album-item', { type: 'button', role: 'listitem', 'aria-label': p.name || 'Photo' }, h('img', { src: url, alt: '' }), h('span', { text: p.name || 'Photo' }));
          b.addEventListener('click', function () {
            C.studioAlbum.get(p.id).then(function (full) {
              if (!full || !full.blob) return;
              if (forUpload) { handle.close(); pictureDialog(full.blob, 'album', anchor); return; }
              setCover({ url: root.URL.createObjectURL(full.blob), name: p.name || 'Director photo', kind: 'album' });
              handle.close();
            });
          });
          grid.appendChild(b);
        });
      }, function () { ui.clear(grid); grid.appendChild(ui.emptyState({ kind: 'error', icon: 'warn', role: 'alert', title: 'The album could not be opened', body: 'Your photos are safe. Try again in a moment.' })); });
    }

    // ---- preview side ----
    function syntheticListing(v) {
      var sel = selected()[0];
      if (!sel) return null;
      var base = { id: 'draft', realm: realm, format: draft.format, status: 'active', card: { cardId: sel.cardId, variantId: sel.variantId || null, cardSkinId: sel.cardSkinId || null, serial: sel.serial, count: draft.items.length, packId: sel.packId },
        title: draft.title, description: draft.description, cover: { kind: 'card' },
        images: (draft.pictures || []).map(function (p) { return { id: p.uploadId, alt: p.alt || '' }; }), photoCover: (draft.pictures || []).length ? { layout: draft.pictures[0].layout || 'banner' } : null, treatment: draft.treatment || 'none',
        seller: { alias: 'You', isBot: false, sales: 0, rating: 1, tenureDays: 0 }, valuation: v || valuationOf(sel), listedMin: 0, watchers: 0, source: 'draft', ask: Number(draft.price) || 0 };
      if (draft.format === 'auction') { var s = Number(draft.startBid) || 0; base.ask = s; base.auction = { start: s, current: s, bids: 0, reserve: draft.reserve ? Number(draft.reserve) : null, reserveMet: !draft.reserve, increment: K().minIncrement(s), buyout: draft.buyout ? Number(draft.buyout) : null }; base.endsMin = (hours() || 24) * 60; }
      if (draft.format === 'swap') {
        var rule = draft.wanted[0] || {};
        var label = rule.type === 'card' && rule.cardId ? (env.cards[rule.cardId] || {}).name : rule.type === 'rarity' && rule.rarity ? (env.rarities[rule.rarity] || {}).name + ' or better' : rule.type === 'finish' && rule.variant ? (env.variants[rule.variant] || {}).name + ' finish' : 'Your offers';
        base.swap = { wanted: [{ label: label || 'Your offers' }], topUp: Number(draft.creditTopUp) || 0, direction: draft.topUpDirection, openToCounter: true };
        base.ask = base.valuation.average;
      }
      return base;
    }
    var sideTimer = 0;
    function renderSide() {
      root.clearTimeout(sideTimer);
      sideTimer = root.setTimeout(drawSide, 30);
    }
    scope.add(function () { root.clearTimeout(sideTimer); });
    var sideThumbs = null;
    function drawSide() {
      if (scope.dead) return;
      ui.releaseArt(side, ctx.thumbs);
      ui.clear(side);
      var v = bundleValuation(), result = K().validateDraft(toDraft(), { config: cfg() });
      var listing = syntheticListing(v);
      side.appendChild(h('div.mk-side-head', ui.eyebrow('3 · Review'), statusEl));
      if (listing) {
        var tileEnv = { cards: env.cards, owned: env.owned, variants: env.variants, thumbs: ctx.thumbs, index: 0 };
        var tile = ui.listingTile({ listing: listing, rank: null }, tileEnv);
        tile.classList.add('is-draft');
        tile.querySelectorAll('button').forEach(function (b) { b.disabled = true; b.tabIndex = -1; });
        side.appendChild(h('div.mk-draft-tile', tile));
        if (draft.items.length > 1) side.appendChild(h('p.mk-hint', { text: 'Bundle of ' + draft.items.length + ' cards. The first card leads the tile.' }));
      } else side.appendChild(h('div.mk-draft-tile.is-empty', icon('cards'), h('span', { text: 'Choose a card to see your listing.' })));
      var rows = [];
      if (draft.format === 'swap') rows.push({ label: 'Credits top-up', value: Number(draft.creditTopUp) ? ui.fmt.exact(Number(draft.creditTopUp)) + ' (' + (draft.topUpDirection === 'asks' ? 'you ask' : 'you add') + ')' : 'None' });
      else rows.push({ label: draft.format === 'auction' ? 'Starting bid' : 'Asking price', value: (draft.format === 'auction' ? Number(draft.startBid) : Number(draft.price)) ? ui.fmt.exact(draft.format === 'auction' ? Number(draft.startBid) : Number(draft.price)) + ' Credits' : '—' });
      rows.push({ label: cfg().fee.label, value: result.fee ? '− ' + ui.fmt.exact(result.fee) : (draft.format === 'swap' ? 'None on a pure swap' : '—'), help: 'settlement' });
      rows.push({ label: draft.format === 'auction' ? 'Estimated net at the starting bid' : 'Estimated net proceeds', value: result.net ? ui.fmt.exact(result.net) + ' Credits' : '—', strong: true });
      if (advanced && v && listing && draft.format !== 'swap') {
        var verdict = K().priceVerdict(toDraft(), v);
        if (verdict) rows.push({ label: 'Against Average Value', node: ui.valueTag(draft.format === 'auction' ? Number(draft.startBid) : Number(draft.price), v) });
      }
      if (draft.format === 'auction') rows.push({ label: 'Closes', value: result.hours ? (result.hours >= 48 ? Math.round(result.hours / 24) + ' days' : result.hours + ' hours') + ' after listing' : '—' });
      var dl = h('dl.mk-sumrows');
      rows.forEach(function (r) { dl.appendChild(h('div', { data: { strong: r.strong ? 'true' : '' } }, h('dt', r.help ? ui.labelWithHelp(r.label, r.help) : r.label), h('dd', r.node ? r.node : { text: r.value }))); });
      side.appendChild(dl);
      side.appendChild(h('p.mk-hint', icon('lock'), h('span', { text: live
        ? 'While listed, the exact card stays in your collection but is locked: it cannot be deleted, listed again or offered. Withdraw it any time before a sale' + (draft.format === 'auction' ? ' (an auction with bids cannot be withdrawn).' : '.')
        : 'While listed, the exact card is held in escrow and cannot be traded elsewhere. You could withdraw it at any time before a bid or sale.' })));
      var reason = result.ok ? '' : result.disabledReason;
      var blocked = live && selected().some(function (i) { return i._listed || i.locked; });
      var publish = ui.button(live ? 'Review listing' : 'Preview this listing', { variant: 'primary', icon: 'check', disabled: !result.ok || blocked, reason: blocked ? 'One of these cards is already listed or locked.' : reason, onClick: function () { if (live) publishLive(result); else reviewListing(result, v, listing); } });
      var wrap = h('div.mk-side-actions', publish);
      if (!result.ok && draft.items.length) wrap.appendChild(h('p.mk-field-error.is-inline', { role: 'status', text: reason }));
      else if (!draft.items.length) wrap.appendChild(h('p.mk-hint', { text: 'Choose a card to continue.' }));
      side.appendChild(wrap);
      side.appendChild(h('div.mk-side-foot', ui.button('Discard draft', { variant: 'ghost', size: 'sm', onClick: function () { store.clearDraft(draftKey); saved = null; draft.items = []; draft.price = ''; draft.startBid = ''; draft.title = ''; draft.description = ''; setStatus('idle'); renderAll(); } })));
      applyErrors(result);
    }
    function applyErrors(result) {
      result = result || K().validateDraft(toDraft(), { config: cfg() });
      Object.keys(errorEls).forEach(function (k) {
        var e = errorEls[k], msg = result.errors[k];
        // Only talk about a field once the person has touched the draft.
        var show = !!msg && dirty && (k !== 'items');
        e.err.hidden = !show; e.err.textContent = show ? msg : '';
        if (e.input && e.input.setAttribute) e.input.setAttribute('aria-invalid', String(show));
      });
    }
    function wantsSpec() {
      var rule = draft.wanted[0] || {}, pct = Number(rule.minValuePct);
      var wants = { minFrac: pct > 0 ? Math.min(1.5, pct / 100) : C.data.marketSim.listing.swapMinFrac };
      if (rule.type === 'card' && rule.cardId) wants.cardId = rule.cardId;
      else if (rule.type === 'rarity' && rule.rarity) wants.rarity = rule.rarity;
      return wants;
    }
    function listingSpec(requestId) {
      var ids = selected().map(function (i) { return i.instanceId; });
      var base = { instanceIds: ids, title: draft.title.trim(), note: draft.description.trim(), requestId: requestId };
      if (ui.sim.isGlobal(realm) && (draft.pictures || []).length) {
        base.images = draft.pictures.map(function (p) { return { uploadId: p.uploadId, alt: p.alt || '' }; });
        base.cover = { layout: draft.pictures[0].layout || 'banner', zoom: 1, x: 50, y: 50 };
      }
      if (ui.sim.isGlobal(realm) && draft.treatment && draft.treatment !== 'none') base.treatment = draft.treatment;
      if (draft.format === 'buy-now') return Object.assign(base, { kind: 'fixed', ask: Math.floor(Number(draft.price)), durationMs: draft.fixedDays * DAY });
      if (draft.format === 'auction') {
        return Object.assign(base, { kind: 'auction', start: Math.floor(Number(draft.startBid)), durationMs: (hours() || 24) * 3600000,
          reserve: advanced && draft.reserve !== '' ? Math.floor(Number(draft.reserve)) : null, buyout: draft.buyout !== '' ? Math.floor(Number(draft.buyout)) : null });
      }
      return Object.assign(base, { kind: 'swap', durationMs: 5 * DAY, wants: wantsSpec() });
    }
    function publishLive(result) {
      var sel = selected(), rows = [];
      sel.forEach(function (i) { var c = env.cards[i.cardId]; var idn = ui.identity(c, true); rows.push({ label: idn.name, node: h('span', h('span', { text: idn.rarityName + ' · ' + (i.variantId ? env.variants[i.variantId].name : 'Normal') + ' · ' }), h('span.mk-mono', { text: i.serial })) }); });
      rows.push({ label: 'Type', value: ui.formatDef(draft.format).label });
      if (draft.format === 'buy-now') { rows.push({ label: 'Asking price', node: ui.credits(Number(draft.price)) }); rows.push({ label: 'Stays up for', value: draft.fixedDays + (draft.fixedDays === 1 ? ' day' : ' days') }); }
      if (draft.format === 'auction') {
        rows.push({ label: 'Starting bid', node: ui.credits(Number(draft.startBid)) }); rows.push({ label: 'Length', value: result.hours >= 48 ? Math.round(result.hours / 24) + ' days' : result.hours + ' hours' });
        if (advanced && draft.reserve) rows.push({ label: 'Reserve', value: ui.fmt.exact(Number(draft.reserve)) + ' Credits' });
        if (draft.buyout) rows.push({ label: 'Buyout', value: ui.fmt.exact(Number(draft.buyout)) + ' Credits' });
      }
      if (draft.format === 'swap') {
        var w = wantsSpec();
        rows.push({ label: 'You would accept', value: (w.cardId ? (env.cards[w.cardId] || {}).name : w.rarity ? (env.rarities[w.rarity] || {}).name + ' or better' : 'Cards of similar value') + ', worth at least ' + Math.round(w.minFrac * 100) + '% of yours' });
      } else {
        rows.push({ label: cfg().fee.label, value: '− ' + ui.fmt.exact(result.fee) + ' Credits' });
        rows.push({ label: draft.format === 'auction' ? 'You receive at the starting bid' : 'You receive', value: ui.fmt.exact(result.net) + ' Credits', strong: true });
      }
      if (draft.title) rows.push({ label: 'Title', value: draft.title });
      if (ui.sim.isGlobal(realm) && (draft.pictures || []).length) rows.push({ label: 'Pictures', value: draft.pictures.length + ' shown to other players, next to the card' });
      ui.sim.confirm({
        title: 'List ' + (sel.length === 1 ? 'this card' : sel.length + ' cards'), eyebrow: 'Review', rows: rows, anchor: root.document.activeElement,
        note: 'Locked while listed. A sale pays your Credits once, after the fee, and the card leaves then.',
        confirmLabel: 'List ' + (sel.length === 1 ? 'card' : sel.length + ' cards'), icon: 'check',
        run: function (req) { return ctx.api.publishListing(realm, listingSpec(req)); },
        success: function (res) {
          var id = res.listing && res.listing.id;
          if (C.settings.get('marketRememberSelling') !== false) store.saveDraft('selling-setup', { format: draft.format, preset: draft.preset, fixedDays: draft.fixedDays, durationMode: draft.durationMode, customHours: draft.customHours });
          store.clearDraft(draftKey); dirty = false; saved = null;
          draft.items = []; draft.price = ''; draft.startBid = ''; draft.title = ''; draft.description = ''; draft.pictures = []; draft.treatment = 'none';
          C.ui.toast('Listed. It is now open to the market.');
          if (id) ui.go('listing', { id: id }, { replace: true }); else ui.go('my-listings', {}, { replace: true });
        }
      });
    }
    function reviewListing(result, v, listing) {
      var sel = selected();
      var rows = [];
      sel.forEach(function (i) { var c = env.cards[i.cardId]; var idn = ui.identity(c, true); rows.push({ label: idn.name, node: h('span', h('span', { text: idn.rarityName + ' · ' + (i.variantId ? env.variants[i.variantId].name : 'Normal') + ' · ' }), h('span.mk-mono', { text: i.serial })) }); });
      rows.push({ label: 'Type', value: ui.formatDef(draft.format).label });
      if (draft.format === 'buy-now') rows.push({ label: 'Asking price', node: ui.credits(Number(draft.price)) });
      if (draft.format === 'auction') { rows.push({ label: 'Starting bid', node: ui.credits(Number(draft.startBid)) }); rows.push({ label: 'Length', value: result.hours + ' hours' }); if (draft.reserve) rows.push({ label: 'Reserve', value: ui.fmt.exact(Number(draft.reserve)) + ' Credits' }); if (draft.buyout) rows.push({ label: 'Buyout', value: ui.fmt.exact(Number(draft.buyout)) + ' Credits' }); }
      if (draft.format === 'swap' && draft.wantLowSerial && advanced) rows.push({ label: 'Serial', value: cfg().serial.lowCounter + ' or lower' });
      if (draft.format === 'swap') rows.push({ label: 'You would accept', value: draft.wanted.map(function (w) { return w.type === 'card' ? (env.cards[w.cardId] || {}).name : w.type === 'rarity' ? (env.rarities[w.rarity] || {}).name + ' or better' : (env.variants[w.variant] || {}).name; }).filter(Boolean).join(', ') });
      rows.push({ label: cfg().fee.label, value: result.fee ? '− ' + ui.fmt.exact(result.fee) + ' Credits' : 'None' });
      rows.push({ label: 'Estimated net proceeds', value: ui.fmt.exact(result.net) + ' Credits', strong: true });
      rows.push({ label: 'Realm', value: ui.realmDef(realm).label + (ui.sim.isGlobal(realm) ? (C.market.online && C.market.online.state.status === 'online' ? ' (beta, trading opens later)' : ' (not connected)') : ' (preview)') });
      rows.push({ label: 'Held in escrow', value: sel.length === 1 ? '1 card' : sel.length + ' cards' });
      if (draft.title) rows.push({ label: 'Title', value: draft.title });
      if (draft.cover.kind !== 'card') rows.push({ label: 'Cover', value: draft.cover.name || 'Image' });
      ui.review({ title: 'Review listing', rows: rows, note: ui.sim.isGlobal(realm) ? (C.market.online && C.market.online.state.status === 'online' ? 'Market is connected, but players cannot list yet: trading opens in a later beta stage. Nothing was sent, held or changed. Your draft stays on this device.' : 'Market is not connected, so this listing could not be published. Nothing was sent or saved to your collection.') : 'Nothing was listed and no card was locked. Publishing opens with the simulator in a later update. Your draft stays on this device.' });
    }

    // ---- assemble ----
    function renderAll() { buildPicker(); buildTerms(); buildPresent(); renderSide(); }
    form.append(pickerHost, termsHost); if (advanced) form.appendChild(presentHost);
    if (C.settings.get('marketRememberSelling') !== false && carry && carry.key === draftKey && Date.now() - carry.at < 4000) { applyDraft(carry.draft); resumed = true; dirty = true; }
    resumeBanner();
    suggestIfBlank();
    renderAll();
    setStatus('idle');
    ctx.restoreScroll();
  }

  ui.pages.register('compose', { nav: function () { return 'portfolio'; }, title: function () { return 'List a card'; }, mount: mount });
})(window.Cardable = window.Cardable || {}, window);
