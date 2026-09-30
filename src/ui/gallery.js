(function (C, root) {
  'use strict';
  var selected = null, allLite = false, cards = [];
  function el(tag, className, text) {
    var element = root.document.createElement(tag); element.className = className || '';
    if (text) element.textContent = text; return element;
  }
  function button(text, callback) { var control = el('button', '', text); control.addEventListener('click', callback); return control; }
  C.gallery = {
    initialized: false, views: cards, lastProfile: null,
    init: function () {
      var params = new URLSearchParams(root.location.search);
      if (params.get(C.config.dev.queryFlag) !== '1' || params.get('gallery') !== '1' || C.gallery.initialized) return;
      C.gallery.initialized = true;
      root.document.body.classList.add('gallery-page');
      C.menu.holdVisible('gallery', true);
      var gallery = el('main', 'card-gallery'); gallery.setAttribute('aria-label', 'Card finish gallery');
      var heading = el('header', 'gallery-heading');
      heading.appendChild(el('p', 'gallery-kicker', 'CARDABLE / MATERIAL STUDY'));
      heading.appendChild(el('h1', '', 'Machined to catch the light.'));
      heading.appendChild(el('p', 'gallery-description', 'Hover or focus a card. One full render; the rest stay static. Both color modes are shown.'));
      var tools = el('div', 'gallery-tools');
      tools.appendChild(button('Turn focused card', function () { if (selected) selected.setFace(selected.side === 'front' ? 'back' : 'front'); }));
      tools.appendChild(button('Replay serial stamp', function () { if (selected) { selected.setFace('front'); selected.stamp(); } }));
      var modeButton = button('Use lite on all cards', function () {
        allLite = !allLite; modeButton.textContent = allLite ? 'Restore focused full render' : 'Use lite on all cards';
        cards.forEach(function (view) { view.setMode('lite'); });
        if (!allLite && selected) selected.setMode('full'); status();
      });
      tools.appendChild(modeButton);
      heading.appendChild(tools);
      var statusText = el('p', 'gallery-status'); statusText.setAttribute('aria-live', 'polite'); heading.appendChild(statusText); gallery.appendChild(heading);
      var profilePanel = el('aside', 'gallery-profile glass'); profilePanel.setAttribute('aria-label', 'Gallery performance sample');
      profilePanel.appendChild(button('Measure 5 s FPS', function () { C.gallery.measure(); }));
      var profileText = el('p', 'gallery-status', 'FPS sample: select a visible full card, then measure.');
      profileText.setAttribute('aria-live', 'polite'); profilePanel.appendChild(profileText);
      function status() { statusText.textContent = selected ? C.rarity(selected.card.rarity).name + (selected.finishState ? ' ' + selected.finishState : '') + ' / ' + selected.el.dataset.colorMode + ' / ' + (allLite ? 'lite' : 'full') + ' / ' + selected.side : 'Select a card'; }
      function select(view) { selected = view; if (!allLite) view.setMode('full'); cards.forEach(function (card) { card.el.classList.toggle('is-selected', card === view); }); status(); }
      var tiers = C.data.rarities.filter(function (tier) { return C.finishes.registry[tier.finish]; });
      ['color', 'mono'].forEach(function (colorMode) {
        var section = el('section', 'gallery-section');
        section.appendChild(el('h2', 'gallery-section-title', colorMode === 'color' ? 'Color finishes' : 'Monochrome finishes'));
        var row = el('div', 'gallery-cards');
        tiers.forEach(function (tier, index) {
          var record = C.data.cards.find(function (card) { return card.rarity === tier.id; });
          var preview = false;
          if (!record) {
            var template = C.data.cards.find(function (card) { return card.art && card.art.kind === 'procedural'; });
            record = Object.assign({}, template, { id: 'gallery-preview-' + tier.id, name: tier.name + ' GPU study', rarity: tier.id,
              art: Object.assign({}, template.art, { seed: template.art.seed + tier.tier }) });
            preview = true;
          }
          C.finishes.previewStates(tier.finish).forEach(function (finishState) {
            var instance = { instanceId: 'gallery-' + tier.id + '-' + (finishState || 'default'), cardId: record.id, serial: C.serial.format(C.state.current.playerCode, index + 1), pulledAt: 0, seen: true };
            var view = C.cardView.create(record, instance, { colorMode: colorMode, finishState: finishState, autoFocus: false });
            var figure = el('figure', 'gallery-item'); figure.appendChild(view.el);
            figure.appendChild(el('figcaption', '', tier.name + (finishState ? ' · ' + finishState : '') + (preview ? ' · gallery-only preview' : '')));
            if (view.description) figure.appendChild(el('p', 'gallery-finish-description', view.description));
            row.appendChild(figure); cards.push(view);
            view.el.addEventListener('pointerenter', function () { select(view); });
            view.el.addEventListener('focus', function () { select(view); });
          });
        });
        section.appendChild(row); gallery.appendChild(section);
      });
      var note = el('p', 'gallery-note', 'Preview serials do not consume packs or advance your saved counter. Empty catalog tiers use labeled temporary studies.');
      gallery.appendChild(note); root.document.body.appendChild(gallery); root.document.body.appendChild(profilePanel);
      C.events.on('card:face', function (event) { if (event.view === selected) status(); });
      select(cards[0]);
      var profile = null;
      C.gallery.measure = function () {
        if (profile) return;
        if (allLite || !selected || !selected.visible || selected.side !== 'front' || root.document.hidden || C.motion.reduced) {
          profileText.textContent = 'FPS sample needs a visible full front card with motion enabled.'; return;
        }
        profile = { view: selected, start: root.performance.now(), stamps: [], invalid: false };
        C.gallery.lastProfile = null;
        profileText.textContent = 'Sampling one full card and ' + (cards.length - 1) + ' lite cards for 5 seconds. Keep this card visible.';
        C.fx.wake();
        root.setTimeout(function () {
          var sample = profile; profile = null;
          if (sample.invalid || sample.stamps.length < 2) {
            C.gallery.lastProfile = { valid: false }; profileText.textContent = 'Sample cancelled: keep the same full front card visible, with motion enabled.'; return;
          }
          var gaps = sample.stamps.slice(1).map(function (stamp, i) { return stamp - sample.stamps[i]; });
          var sorted = gaps.slice().sort(function (a, b) { return a - b; });
          var fps = sample.stamps.length * 1000 / (root.performance.now() - sample.start);
          C.gallery.lastProfile = { valid: true, fps: fps, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
            maxMs: sorted[sorted.length - 1], frames: sample.stamps.length, liteCards: cards.length - 1, fullCards: 1 };
          profileText.textContent = 'Frame cadence: ' + fps.toFixed(1) + ' FPS · p95 ' + C.gallery.lastProfile.p95Ms.toFixed(1) + ' ms · max ' + C.gallery.lastProfile.maxMs.toFixed(1) + ' ms · 1 full + ' + (cards.length - 1) + ' lite. Confirm paint cost in browser performance tools.';
          root.console.info('[Cardable gallery FPS]', C.gallery.lastProfile);
        }, C.config.finishMotion.profileMs);
      };
      function invalidateProfile() { if (profile) profile.invalid = true; }
      C.events.on('card:focused', function (view) { if (profile && view !== profile.view) invalidateProfile(); });
      C.events.on('card:face', invalidateProfile);
      C.events.on('motion:changed', invalidateProfile);
      C.events.on('fx:visibility', invalidateProfile);
      C.events.on('fx:frame', function (event) {
        if (!profile) return;
        if (C.cardView.active !== profile.view || !profile.view.visible || profile.view.mode !== 'full') { profile.invalid = true; return; }
        profile.stamps.push(event.now);
      });
    }
  };
})(window.Cardable, window);
