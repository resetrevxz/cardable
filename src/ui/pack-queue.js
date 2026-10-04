(function(C, root) {
  'use strict';
  var node = C.packMarkup.node;
  C.events.on('app:ready', function() {
    var view = C.packView, stock = view.el && view.el.querySelector('.pack-stock');
    if (!stock) return;
    stock.setAttribute('role', 'group');
    var markers = new Map(), retiring = [], currentCount = C.state.current.packs.openedCount;
    var beyond = node('span', 'pack-queue-beyond', stock), toast = node('aside', 'pack-intro-toast glass', root.document.body);
    toast.setAttribute('role', 'status'); toast.hidden = true;
    var toastStart = null, blocked = new Set(), pendingIntro = null;
    function intro() {
      var next = C.packs.upcoming(1)[0];
      pendingIntro = next.introText && !C.state.current.packs.introSeen[next.id] ? next : null;
      C.fx.wake();
    }
    function queue(event) {
      event = event || { openedCount: C.state.current.packs.openedCount, reason: 'initial' };
      var types = C.packs.upcoming(view.vials.length), wanted = new Set(), now = root.performance.now();
      types.forEach(function(pack, i) {
        var vial = view.vials[i].el;
        vial.removeAttribute('aria-hidden'); vial.setAttribute('role', 'img');
        vial.setAttribute('aria-label', 'Pack ' + (i + 1) + ': ' + pack.name);
        vial.dataset.queuePack = pack.id; vial.dataset.queueMarked = pack.counterStyle.accent ? 'true' : 'false';
        vial.style.setProperty('--queue-accent', pack.counterStyle.accent || 'var(--hairline)');
        var key = (event.openedCount + i + 1) + ':' + pack.id;
        if (!pack.counterStyle.accent) return;
        wanted.add(key);
        var marker = markers.get(key);
        if (!marker || event.reason === 'replace') {
          if (marker) { markers.delete(key); marker.exit = now; retiring.push(marker); }
          var el = node('span', 'pack-queue-marker', stock);
          el.setAttribute('aria-hidden', 'true'); el.dataset.skin = pack.skin;
          el.style.setProperty('--queue-accent', pack.counterStyle.accent);
          node('i', 'pack-queue-ring', el); C.packSkins.get(pack).counterThumb(el, pack);
          marker = { el: el, spring: C.springs.create(vial.offsetLeft, { stiffness: 420, damping: 34, mass: 1 }), born: now, ordinal: event.openedCount + i + 1 };
          markers.set(key, marker);
        }
        marker.target = vial.offsetLeft; marker.index = i;
        marker.el.style.width = vial.offsetWidth + 'px'; marker.el.style.height = vial.offsetHeight + 'px';
        marker.el.classList.toggle('is-next', i === 0);
        marker.el.classList.toggle('is-stored', i < C.state.current.packs.ready);
      });
      markers.forEach(function(marker, key) {
        if (wanted.has(key)) return;
        markers.delete(key); marker.exit = now;
        marker.burst = event.reason === 'advance' && marker.ordinal === event.openedCount;
        retiring.push(marker);
      });
      currentCount = event.openedCount;
      var limit = C.data.packs.reduce(function(n,p) { return p.enabled && p.counterStyle.accent && p.cadence ? Math.max(n,p.cadence.every) : n; }, 0);
      var next = C.packs.upcoming(Math.max(view.vials.length, limit)).findIndex(function(p) { return !!p.counterStyle.accent; });
      beyond.textContent = next >= view.vials.length ? C.packs.upcoming(next + 1)[next].counterStyle.glyph + ' in ' + (next + 1) : '';
      beyond.hidden = !beyond.textContent;
      beyond.style.left = (view.vials[view.vials.length - 1].el.offsetLeft + view.vials[view.vials.length - 1].el.offsetWidth + 8) + 'px';
      intro(); C.fx.wake();
    }
    C.events.on('packs:queueChanged', queue);
    C.events.on('save:written', function() {
      markers.forEach(function(m) { m.el.classList.toggle('is-stored', m.index < C.state.current.packs.ready); });
      intro();
    });
    ['opening:context','preferences:context','inventory:context','tutorial:context'].forEach(function(name) {
      C.events.on(name, function(event) { if (event.active) blocked.add(name); else blocked.delete(name); C.fx.wake(); });
    });
    C.events.on('contextmenu:close', function() { C.fx.wake(); });
    C.events.on('save:willReplace', function() { toast.hidden = true; toastStart = null; C.menu.holdVisible('pack-intro', false); });
    root.addEventListener('resize', function() { queue({ openedCount: currentCount, reason: 'layout' }); });
    C.fx.subscribe(function(now, dt) {
      var reduced = C.motion.reduced || C.settings.policy.animation < 2, quiet = root.document.hidden || C.menu.afk || C.menu.idle || blocked.size;
      var active = false;
      markers.forEach(function(m) {
        var x = reduced || quiet ? m.target : m.spring.step(dt, m.target);
        if (reduced || quiet) m.spring.reset(x);
        m.el.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
        m.el.style.opacity = Math.min(1, (now - m.born) / 250);
        m.el.style.setProperty('--queue-pulse', reduced || quiet ? 0 : (1 + Math.sin(now / 2000 * Math.PI * 2)) * .12);
        active = !m.spring.settled() || now - m.born < 250 || !reduced && !quiet || active;
      });
      retiring = retiring.filter(function(m) {
        var p = Math.min(1, (now - m.exit) / 250);
        m.el.style.opacity = 1 - p;
        if (m.burst && !reduced) { m.el.classList.add('is-burst'); m.el.querySelector('.pack-queue-ring').style.transform = 'scale(' + (1 + p * .55) + ')'; }
        if (p === 1) { m.el.remove(); return false; }
        active = true; return true;
      });
      if (pendingIntro && !blocked.size && !C.preferences.open && !C.contextMenu.open && !C.inventory.active && C.state.current.tutorial.done && C.opening.phase === 'idle' && !root.document.hidden && !C.menu.afk && toastStart === null) {
        var candidate = JSON.parse(JSON.stringify(C.state.current)), next = pendingIntro;
        candidate.packs.introSeen[next.id] = true;
        pendingIntro = null;
        if (C.state.commit(candidate)) { toast.textContent = next.introText; toast.hidden = false; toastStart = now; C.menu.holdVisible('pack-intro', true); }
      }
      if (toastStart !== null) {
        var age = now - toastStart;
        toast.style.opacity = Math.min(1, age / 250, Math.max(0, (5000 - age) / 250));
        if (age >= 5000) { toast.hidden = true; toastStart = null; C.menu.holdVisible('pack-intro', false); }
        else active = true;
      }
      return active;
    }, 'pack-queue');
    queue();
  });
})(window.Cardable, window);
