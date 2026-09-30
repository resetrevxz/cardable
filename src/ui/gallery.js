(function (C, root) {
  'use strict';
  var selected = null, allLite = false, cards = [];
  function el(tag, className, text) {
    var element = root.document.createElement(tag); element.className = className || '';
    if (text) element.textContent = text; return element;
  }
  function button(text, callback) { var control = el('button', '', text); control.addEventListener('click', callback); return control; }
  C.gallery = {
    initialized: false, views: cards,
    init: function () {
      var params = new URLSearchParams(root.location.search);
      if (params.get(C.config.dev.queryFlag) !== '1' || params.get('gallery') !== '1' || C.gallery.initialized) return;
      C.gallery.initialized = true;
      root.document.body.classList.add('gallery-page');
      C.menu.holdVisible('gallery', true);
      var gallery = el('main', 'card-gallery'); gallery.setAttribute('aria-label', 'Stage 2 card material gallery');
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
      tools.appendChild(modeButton); heading.appendChild(tools);
      var statusText = el('p', 'gallery-status'); statusText.setAttribute('aria-live', 'polite'); heading.appendChild(statusText); gallery.appendChild(heading);
      function status() { statusText.textContent = selected ? C.rarity(selected.card.rarity).name + ' / ' + selected.el.dataset.colorMode + ' / ' + (allLite ? 'lite' : 'full') + ' / ' + selected.side : 'Select a card'; }
      function select(view) { selected = view; if (!allLite) view.setMode('full'); cards.forEach(function (card) { card.el.classList.toggle('is-selected', card === view); }); status(); }
      var tiers = C.data.rarities.filter(function (tier) { return tier.tier <= 3 && C.finishes.registry[tier.finish]; });
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
          var instance = { instanceId: 'gallery-' + tier.id, cardId: record.id, serial: C.serial.format(C.state.current.playerCode, index + 1), pulledAt: 0, seen: true };
          var view = C.cardView.create(record, instance, { colorMode: colorMode, autoFocus: false });
          var figure = el('figure', 'gallery-item'); figure.appendChild(view.el);
          figure.appendChild(el('figcaption', '', tier.name + (preview ? ' · gallery-only preview' : '')));
          row.appendChild(figure); cards.push(view);
          view.el.addEventListener('pointerenter', function () { select(view); });
          view.el.addEventListener('focus', function () { select(view); });
        });
        section.appendChild(row); gallery.appendChild(section);
      });
      var note = el('p', 'gallery-note', 'Preview serials do not consume packs or advance your saved counter. Uncommon uses a temporary study because its catalog tier is empty.');
      gallery.appendChild(note); root.document.body.appendChild(gallery);
      C.events.on('card:face', function (event) { if (event.view === selected) status(); });
      select(cards.find(function (view) { return view.card.rarity === tiers[tiers.length - 1].id; }));
    }
  };
})(window.Cardable, window);
