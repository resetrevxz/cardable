/* Cardable Market — the moment a trade settles.
 * When a card comes to you (a purchase, a won auction, a swap) it lifts off where you pressed (or out of the island, if it
 * happened while you were looking elsewhere), takes a moment in its own rarity light, and flies into Portfolio. When a card
 * sells, Credits fly from the same place into your wallet. The better the card, the more light: rarity is read from the
 * card's own opening colour, and Legendary and above add a ring of rays. It listens to the one settlement event, so every
 * way of trading gets it, and it makes at most a handful of elements, animates only transform and opacity, and removes
 * all of it when it ends. Reduced motion, Very Low quality and a hidden window skip it; the toast and the wallet still tell you. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, doc = root.document;
  var press = null, playing = 0;
  var EASE = 'cubic-bezier(.22,1,.36,1)';

  doc.addEventListener('pointerdown', function (e) {
    var host = ui.shell && ui.shell.el;
    if (host && host.contains(e.target)) press = { x: e.clientX, y: e.clientY, at: Date.now() };
  }, true);

  function host() { return ui.shell && ui.shell.el; }
  function visible(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function centre(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  // Where it starts: the thing you just pressed, else the island (a trade that finished by itself), else the middle.
  function origin() {
    if (press && Date.now() - press.at < 6000) return { x: press.x, y: press.y };
    var pill = ui.island && ui.island.visibleEl;
    if (visible(pill)) return centre(pill);
    var r = host().getBoundingClientRect();
    return { x: r.width / 2, y: r.height / 2 };
  }
  function portfolioTarget() {
    var el = host().querySelector('.mk-tab[data-tab="portfolio"]');
    if (!visible(el)) el = host().querySelector('.mk-bottom-item[data-tab="portfolio"]');
    return visible(el) ? el : null;
  }
  function done(list) { list.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); playing = Math.max(0, playing - 1); }
  function arc(a, b, lift) { return { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.18, y: Math.min(a.y, b.y) - lift }; }
  function place(x, y, scale, rot) { return 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,-50%) scale(' + scale + ') rotate(' + (rot || 0) + 'deg)'; }

  // ---- a card arrives ----
  function arrive(item) {
    var data = C.market.api.data(), card = data.cardById[item.cardId], target = portfolioTarget();
    if (!card || !target) return;
    var rgb = ui.rarityRgb(card.rarity), tier = ui.rarityTier(card.rarity), from = origin(), to = centre(target), mid = arc(from, to, 64 + tier * 6);
    var made = [], view = null;
    var ghost = h('div.mk-settle', { 'aria-hidden': 'true', style: { '--mk-rgb': rgb, '--mk-lvl': (tier / 11).toFixed(2) } });
    var glow = h('i.mk-settle-glow'), ring = h('i.mk-settle-ring'), art = h('div.mk-settle-art');
    try { view = C.cardView.create(card, item, { thumbnail: true, owned: true, presentation: 'art-only' }); art.appendChild(view.el); } catch (error) { art.classList.add('is-plain'); }
    ghost.append(glow, art, ring);
    var layer = host(); layer.appendChild(ghost); made.push(ghost);
    playing++;
    var big = tier >= 7, lift = big ? 1.22 : 1.1, hold = big ? 520 : 300, fly = 620, total = 220 + hold + fly;
    var a = ghost.animate([
      { transform: place(from.x, from.y, .4, -6), opacity: 0, offset: 0 },
      { transform: place(from.x, from.y - 18, lift, 0), opacity: 1, offset: 220 / total, easing: EASE },
      { transform: place(from.x, from.y - 18, lift * 1.02, 0), opacity: 1, offset: (220 + hold) / total, easing: 'cubic-bezier(.5,0,.8,.4)' },
      { transform: place(mid.x, mid.y, .62, 8), opacity: 1, offset: (220 + hold + fly * .55) / total, easing: 'cubic-bezier(.2,.6,.3,1)' },
      { transform: place(to.x, to.y, .16, 14), opacity: .1, offset: 1 }
    ], { duration: total, fill: 'both' });
    glow.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: .35 + tier * .05, transform: 'scale(1.1)', offset: .25 }, { opacity: 0, transform: 'scale(1.5)' }], { duration: 220 + hold + 200, easing: 'ease-out', fill: 'both' });
    ring.animate([{ opacity: .9, transform: 'scale(.9)' }, { opacity: 0, transform: 'scale(1.7)' }], { duration: 640, delay: 140, easing: EASE, fill: 'both' });
    // Legendary and above: a ring of rays leaves the card while it holds.
    if (big) {
      var rays = tier >= 10 ? 14 : 10, spokes = h('div.mk-settle-rays');
      ghost.appendChild(spokes);
      for (var i = 0; i < rays; i++) {
        var ray = h('i'); ray.style.transform = 'rotate(' + Math.round((360 / rays) * i) + 'deg)';
        var inner = h('b'); ray.appendChild(inner); spokes.appendChild(ray);
        inner.animate([{ transform: 'translateY(20px) scaleY(.1)', opacity: 0 }, { transform: 'translateY(46px) scaleY(1)', opacity: .9, offset: .3 }, { transform: 'translateY(96px) scaleY(.2)', opacity: 0 }], { duration: 760, delay: 160 + (i % 3) * 40, easing: EASE, fill: 'both' });
      }
    }
    var finish = function () {
      done(made);
      if (view) { try { view.destroy(); } catch (e) { /* already gone */ } }
      ui.motion.pulse(target);
      target.classList.remove('is-received'); void target.offsetWidth; target.classList.add('is-received');
      root.setTimeout(function () { target.classList.remove('is-received'); }, 700);
      ui.motion.burst(target);
    };
    a.onfinish = finish; a.oncancel = function () { done(made); if (view) { try { view.destroy(); } catch (e) { /* gone */ } } };
  }

  // ---- Credits arrive ----
  function earn(delta) {
    var wallet = host().querySelector('.mk-wallet');
    if (!visible(wallet)) return;
    var from = origin(), to = centre(wallet), n = Math.max(3, Math.min(8, Math.round(Math.log(delta + 1) * 1.2))), made = [];
    playing++;
    var finished = 0;
    for (var i = 0; i < n; i++) {
      var coin = h('span.mk-coinfly', { 'aria-hidden': 'true' }, icon('coin'));
      host().appendChild(coin); made.push(coin);
      var spread = { x: from.x + (i - (n - 1) / 2) * 16, y: from.y - 14 - (i % 3) * 10 }, mid = arc(spread, to, 40 + (i % 3) * 18);
      var a = coin.animate([
        { transform: place(from.x, from.y, .4, 0), opacity: 0, offset: 0 },
        { transform: place(spread.x, spread.y, 1, 0), opacity: 1, offset: .24, easing: EASE },
        { transform: place(mid.x, mid.y, .9, 120), opacity: 1, offset: .62, easing: 'cubic-bezier(.3,.6,.3,1)' },
        { transform: place(to.x, to.y, .45, 260), opacity: .2, offset: 1 }
      ], { duration: 760, delay: i * 55, fill: 'both' });
      a.onfinish = function () { finished++; if (finished === n) { done(made); ui.motion.pulse(wallet); } };
    }
  }

  function play(effect) {
    if (!effect || !host() || ui.motion.still() || playing >= 3) return;
    var added = effect.add || [], removed = effect.remove || [];
    if (added.length) arrive(added[0]);
    else if (removed.length && effect.delta > 0) earn(effect.delta);
  }
  C.events.on('market:settled', function (event) { if (ui.shell && ui.shell.isOpen && event) play(event.effect); });

  ui.settle = { play: play, get busy() { return playing > 0; } };
})(window.Cardable = window.Cardable || {}, window);
