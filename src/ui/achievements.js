(function (C, root) {
  'use strict';
  var toast, pending = [], showing = null, until = 0, dismissedAt = 0;
  var paths = {
    pack: 'M5 4h14v16H5zM5 8h14M9 12h6M9 16h6',
    collection: 'M4 7h16v14H4zM7 3h10M7 11h10M7 15h6',
    star: 'm12 3 3 6 6 1-4.5 4.5 1 6L12 18l-5.5 2.5 1-6L3 10l6-1z',
    secret: 'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
    variant: 'm12 3 9 9-9 9-9-9zM8 12l4-4 4 4-4 4z',
    serial: 'M8 3 6 21M16 3l-2 18M3 9h18M3 15h18',
    archive: 'M4 4h16v5H4zM6 9v12h12V9M10 13h4',
    settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6'
  };
  function node(tag, cls, parent, text) { return C.packMarkup.node(tag, cls, parent, text); }
  function glyph(name, parent) {
    var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'achievement-glyph');
    var path = root.document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] || paths.star); svg.appendChild(path); parent.appendChild(svg); return svg;
  }
  function safeMenu() {
    return !root.document.hidden && C.opening.phase === 'idle' && !C.state.current.pendingReveal && !C.inventory.active && !C.preferences.open &&
      !C.menu.afk && !C.tutorial.active && !C.contextMenu.open && !(C.dev && (C.dev.immersive || C.dev.paletteOpen)) && !(C.achievementView && C.achievementView.open);
  }
  function hide() {
    toast.classList.remove('is-visible'); dismissedAt = root.performance.now();
    showing = null; C.events.emit('menu:visibilityHold', { reason: 'achievement-toast', active: false }); C.fx.wake();
  }
  function enqueue(entry) { pending.push(entry); C.fx.wake(); }
  C.achievementView = { glyph: glyph, get open() { return false; }, replayToast: function (id) {
    var p = C.achievements.progress(id); if (p) enqueue({ id: id, tier: p.tier || 1 });
  } };
  C.events.on('achievement:unlocked', function (event) { if (!event.retro) enqueue(event); });
  C.events.on('achievement:backfilled', function (event) { enqueue({ summary: true, count: event.count }); });
  C.events.on('app:ready', function () {
    toast = node('button', 'achievement-toast glass', root.document.body); toast.type = 'button'; toast.hidden = true;
    toast.setAttribute('aria-live', 'polite'); toast.setAttribute('aria-atomic', 'true');
    toast.addEventListener('click', function () { var id = showing && showing[0].id; hide(); C.events.emit('achievements:open', { id: id }); });
    C.fx.subscribe(function (now) {
      if (!C.settings.get('achievementToasts')) { pending = []; if (showing) hide(); }
      if (showing && !safeMenu()) { pending = showing.concat(pending); hide(); toast.hidden = true; }
      if (showing && now >= until) hide();
      if (!showing && !toast.hidden && now - dismissedAt >= 250) toast.hidden = true;
      if (!showing && pending.length && safeMenu() && C.settings.get('achievementToasts')) {
        showing = pending.splice(0); toast.replaceChildren(); var first = showing[0], def = C.achievements.list().find(function (d) { return d.id === first.id; });
        glyph(def ? def.glyph : 'star', toast); var copy = node('span', 'achievement-toast-copy', toast);
        node('span', 'achievement-eyebrow', copy, first.summary ? 'From your collection' : 'Achievement unlocked');
        node('strong', '', copy, first.summary ? first.count + ' achievements unlocked from your collection' : showing.length > 1 ? showing.length + ' achievements unlocked' : def.name + (def.tiers.length > 1 ? ' · Tier ' + first.tier : ''));
        toast.hidden = false; toast.classList.add('is-visible'); until = now + 4000;
        C.events.emit('menu:visibilityHold', { reason: 'achievement-toast', active: true }); C.events.emit('ui:achievement', { beat: 'toast', id: first.id, count: showing.length });
      }
      return !!showing || !toast.hidden;
    }, 'achievements');
    ['opening:context', 'inventory:context', 'preferences:context', 'tutorial:step', 'contextmenu:close', 'fx:visibility', 'menu:afk', 'settings:changed'].forEach(function (event) { C.events.on(event, function () { C.fx.wake(); }); });
    C.events.on('achievement:resetting', function () { pending = []; if (showing) hide(); toast.hidden = true; });
  });
})(window.Cardable, window);
