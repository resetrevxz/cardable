/* Cardable Market — UI foundations: element builder, icons, live thumbnails, popovers.
 * Classic script, no framework. Pages receive a `scope` whose cleanup stack runs when the page leaves. */
(function (C, root) {
  'use strict';
  C.market = C.market || {};
  var doc = root.document;
  var ui = C.market.ui = C.market.ui || {};

  // ---- icons (24 px grid, 1.5 px strokes, registered into the shared sprite) ----
  var ICONS = {
    market: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9c0 1.5 1.1 2.5 2.7 2.5S9.3 10.5 9.3 9c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.2 2.5 2.7 2.5S20 10.5 20 9M9.5 20v-5h5v5',
    tag: 'M3 12V4h8l10 10-8 8zM7.5 8h.01', gavel: 'M13 5l6 6M9 9l6 6M4 14l5-5 6 6-5 5zM3 21h9', swap: 'M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4',
    trend: 'M3 17l6-6 4 4 8-9M15 6h6v6', wallet: 'M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1zM4 7l12-3v3M16 13h.01',
    bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4', bookmark: 'M7 3h10v18l-5-4-5 4z', filter: 'M3 5h18l-7 8v6l-4 2v-8z',
    sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M7 14v6', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M4 6h16M4 12h16M4 18h16',
    candle: 'M7 4v3M7 17v3M5 7h4v10H5zM17 3v4M17 15v5M15 7h4v8h-4z', line: 'M3 18l5-7 4 3 5-8 4 5',
    back: 'M19 12H5M11 6l-6 6 6 6', forward: 'M5 12h14M13 6l6 6-6 6', up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6',
    coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M15.5 9.2c-.8-.9-1.9-1.4-3.5-1.4-2.4 0-4 2.1-4 4.2s1.6 4.2 4 4.2c1.6 0 2.7-.5 3.5-1.4',
    activity: 'M3 12h4l3-8 4 16 3-8h4', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0', lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9h.01', upload: 'M12 16V5M7 9l5-5 5 5M5 20h14', trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
    flip: 'M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5', sort: 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4',
    chevron: 'm6 9 6 6 6-6', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', save: 'M5 3h12l2 2v16H5zM8 3v6h8V3M8 21v-7h8v7',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v5M12 8h.01', check: 'm4 12 5 5L20 6', close: 'm6 6 12 12M18 6 6 18', plus: 'M12 4v16M4 12h16',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l4 2', warn: 'm12 3 10 18H2zM12 9v5M12 17h.01', star: 'm12 3 3 6 6 1-4.5 4.5 1 6L12 18l-5.5 2.5 1-6L3 10l6-1z',
    layers: 'm12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5', copy: 'M8 8h13v13H8zM3 16V3h13', book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
    cards: 'M7 3h13v17H7zM4 7H2v14h13', pause: 'M7 4v16M17 4v16', play: 'm8 4 12 8-12 8z'
  };
  Object.keys(ICONS).forEach(function (name) { C.icons.register('mk-' + name, ICONS[name]); });
  function icon(name, cls) {
    var svg = C.icons.create('mk-' + name);
    svg.classList.add('mk-icon');
    if (cls) svg.classList.add.apply(svg.classList, cls.split(' '));
    return svg;
  }

  // ---- element builder ----
  function append(parent, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(parent, c); }); return; }
    parent.appendChild(child && child.nodeType ? child : doc.createTextNode(String(child)));
  }
  // h('div.cls', { attr..., on:{click}, data:{}, aria:{}, style:{}, text:'' }, ...children)
  function h(spec, props, children) {
    var parts = String(spec).split('.'), tag = parts.shift() || 'div', el = doc.createElement(tag);
    if (parts.length) el.className = parts.join(' ');
    var rest = Array.prototype.slice.call(arguments, 2);
    if (props && (props.nodeType || typeof props === 'string' || Array.isArray(props))) { rest.unshift(props); props = null; }
    if (props) {
      Object.keys(props).forEach(function (key) {
        var v = props[key];
        if (v == null || v === false) return;
        if (key === 'text') el.textContent = v;
        else if (key === 'class') el.classList.add.apply(el.classList, String(v).split(' ').filter(Boolean));
        else if (key === 'on') Object.keys(v).forEach(function (n) { el.addEventListener(n, v[n]); });
        else if (key === 'data') Object.keys(v).forEach(function (n) { if (v[n] != null) el.dataset[n] = v[n]; });
        else if (key === 'aria') Object.keys(v).forEach(function (n) { if (v[n] != null) el.setAttribute('aria-' + n, v[n]); });
        else if (key === 'style') { if (typeof v === 'string') el.style.cssText = v; else Object.keys(v).forEach(function (n) { if (n.charAt(0) === '-') el.style.setProperty(n, v[n]); else el.style[n] = v[n]; }); }
        else if (key === 'props') Object.keys(v).forEach(function (n) { el[n] = v[n]; });
        else if (v === true) el.setAttribute(key, '');
        else el.setAttribute(key, v);
      });
    }
    rest.forEach(function (c) { append(el, c); });
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  // ---- scopes: a page's cleanup stack ----
  function createScope() {
    var stack = [], dead = false;
    return {
      get dead() { return dead; },
      add: function (fn) { if (dead) { try { fn(); } catch (_) { /* already gone */ } return fn; } stack.push(fn); return fn; },
      on: function (target, type, fn, options) { target.addEventListener(type, fn, options); return this.add(function () { target.removeEventListener(type, fn, options); }); },
      destroy: function () { if (dead) return; dead = true; while (stack.length) { try { stack.pop()(); } catch (e) { console.error(e); } } }
    };
  }

  // ---- identity: a card never reveals more than its collection state allows ----
  function identity(card, owned) {
    var rarity = C.rarity(card.rarity);
    var info = { name: card.name, rarityName: rarity ? rarity.name : card.rarity, rarityId: card.rarity, concealed: false, tier: rarity ? rarity.tier : 0 };
    try {
      var presentation = C.finishes.describe(rarity.finish, card, { owned: !!owned });
      if (presentation && presentation.concealed) { info.concealed = true; info.name = 'Unfound Secret'; info.rarityName = 'Secret'; }
    } catch (_) { /* a missing finish never blocks a listing */ }
    return info;
  }

  // ---- live thumbnails: static art-only views created near the viewport and released when far away ----
  function thumbs(scroller, scope) {
    var records = new Map(), observer = null, reduced = !!(C.settings && C.settings.get('marketReducedData'));
    function make(record) {
      if (record.view || scope.dead) return;
      try {
        record.view = C.cardView.create(record.card, record.instance, { thumbnail: true, owned: !!record.owned, presentation: 'art-only' });
        record.host.appendChild(record.view.el);
        record.host.classList.add('is-live');
      } catch (error) { record.host.classList.add('is-failed'); }
    }
    function release(record) {
      if (!record.view) return;
      try { record.view.destroy(); } catch (_) { /* detached */ }
      record.view = null; record.host.classList.remove('is-live');
    }
    function ensure() {
      if (observer || !root.IntersectionObserver) return;
      observer = new root.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var record = records.get(entry.target); if (!record) return;
          if (entry.isIntersecting) make(record); else release(record);
        });
      }, { root: scroller || null, rootMargin: reduced ? '0px' : '480px 0px 720px 0px' });
    }
    scope.add(function () { if (observer) observer.disconnect(); records.forEach(release); records.clear(); });
    return {
      // Returns the placeholder; the real card mounts into it when it is near the viewport.
      mount: function (card, instance, options) {
        options = options || {};
        var host = h('div.mk-art', { 'aria-hidden': 'true' }, h('span.mk-art-silhouette'));
        var record = { host: host, card: card, instance: instance, owned: options.owned, view: null };
        if (!root.IntersectionObserver) { records.set(host, record); make(record); return host; }
        ensure(); records.set(host, record); observer.observe(host);
        return host;
      },
      forget: function (host) { var record = records.get(host); if (!record) return; if (observer) observer.unobserve(host); release(record); records.delete(host); },
      get live() { var n = 0; records.forEach(function (r) { if (r.view) n++; }); return n; },
      get count() { return records.size; }
    };
  }

  // ---- popovers anchored inside the shell ----
  var stack = [];
  function popover(anchor, build, options) {
    options = options || {};
    var host = options.host || ui.shell && ui.shell.el || doc.body;
    var pop = h('div.mk-pop', { role: options.role || 'dialog', 'aria-label': options.label || 'Options' });
    var content = build(function close() { api.close(); });
    append(pop, content);
    host.appendChild(pop);
    var closed = false, offs = [];
    function place() {
      var a = anchor.getBoundingClientRect(), hostRect = host.getBoundingClientRect(), w = pop.offsetWidth, hgt = pop.offsetHeight;
      var left = options.align === 'end' ? a.right - hostRect.left - w : a.left - hostRect.left;
      left = Math.max(8, Math.min(hostRect.width - w - 8, left));
      var top = a.bottom - hostRect.top + 8;
      if (top + hgt > hostRect.height - 8) top = Math.max(8, a.top - hostRect.top - hgt - 8);
      pop.style.left = left + 'px'; pop.style.top = top + 'px';
      if (options.matchWidth) pop.style.minWidth = a.width + 'px';
    }
    place();
    var api = {
      el: pop,
      close: function (restore) {
        if (closed) return; closed = true;
        var at = stack.indexOf(api); if (at >= 0) stack.splice(at, 1);
        offs.forEach(function (fn) { fn(); });
        pop.remove();
        anchor.setAttribute('aria-expanded', 'false');
        if (restore !== false && anchor.isConnected) anchor.focus({ preventScroll: true });
        if (options.onClose) options.onClose();
      }
    };
    anchor.setAttribute('aria-expanded', 'true');
    stack.push(api);
    function away(e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) api.close(false); }
    function esc(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.close(); } }
    doc.addEventListener('pointerdown', away, true);
    pop.addEventListener('keydown', esc);
    anchor.addEventListener('keydown', esc);
    offs.push(function () { doc.removeEventListener('pointerdown', away, true); pop.removeEventListener('keydown', esc); anchor.removeEventListener('keydown', esc); });
    root.requestAnimationFrame(function () { if (closed) return; place(); var f = pop.querySelector('[autofocus],button,input,[tabindex="0"]'); if (f && options.focus !== false) f.focus({ preventScroll: true }); });
    return api;
  }

  // ---- settings, read live ----
  function setting(key) { return C.settings ? C.settings.get(key) : undefined; }
  function calm() { return !!(C.motion && C.motion.reduced) || !!(C.settings && C.settings.policy && C.settings.policy.animation < 2); }

  ui.closeTopPopover = function () { var top = stack[stack.length - 1]; if (!top) return false; top.close(); return true; };
  ui.hasPopover = function () { return stack.length > 0; };
  ui.h = h; ui.icon = icon; ui.clear = clear; ui.createScope = createScope; ui.identity = identity; ui.thumbs = thumbs; ui.popover = popover;
  ui.setting = setting; ui.calm = calm; ui.icons = ICONS;
})(window.Cardable = window.Cardable || {}, window);
