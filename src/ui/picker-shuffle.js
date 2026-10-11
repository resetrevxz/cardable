/* Picker presentation, milestone D: the three offered cards are shown, turned over, shuffled the way a
 * magician would (gather, overhand packets dropped one onto another, a riffle, a cut, a deal, two
 * monte swaps) and then picked from their backs. The shuffle is presentation only: each card
 * element belongs to one reserved option, positions are tracked through the script, and the choice
 * goes through the unchanged C.picker.choose(optionIndex). Nothing is minted until that call.
 * The pack opens with the shared hold and cut; this strategy owns what follows the tear. */
(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, modal = false, activeRelease = null;
  C.events.on('preferences:context', function (e) { modal = e.active; if (modal && activeRelease) activeRelease(); });
  C.events.on('fx:visibility', function () { if (activeRelease) activeRelease(); });
  C.events.on('menu:afk', function (value) { if (value && activeRelease) activeRelease(); });
  function moving() { return !C.motion.reduced && C.settings.policy.animation >= 2; }
  function clamp(n, a, b) { return Math.max(a == null ? 0 : a, Math.min(b == null ? 1 : b, n)); }
  function io(t) { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function out(t) { t = clamp(t); return 1 - Math.pow(1 - t, 3); }
  function mix(a, b, t) { return a + (b - a) * t; }

  C.packOpenings.register('shuffleThree', { bind: function (host, foil, pack) {
    var cfg = pack.motion, context = null, stage = null, table = null, cards = [], vfx = null, vctx = null, prompt = null, hint = null;
    var views = [], hold = null, state = 'closed', T = 0, selected = -1, focusPos = 0, armedAt = -Infinity, hovered = -1, choice = -1, chosenAt = 0;
    var tracks = [], events = [], end = 0, slotOption = [0, 1, 2], lift = [0, 0, 0], W = 160, H = 224, metaFade = 1, lastWake = 0, tilt = 0;
    var recovered = false, phases = null;

    function allowed() { return !!context && !modal && !root.document.hidden && !(C.contextMenu && C.contextMenu.open) && !(C.menu && C.menu.afk) && C.opening.phase === 'vaultOpening'; }
    function secret(option) { return C.rarity(C.card(option.cardId).rarity).tier === 11; }
    function descriptor(option) { return Object.assign({ serial: '', pulledAt: C.state.current.pendingReveal.committedAt, seen: true, cardSkinId: null }, option); }
    function release(event) {
      if (!event || hold && event.pointerId === hold.id) {
        hold = null; if (stage) stage.style.setProperty('--shuffle-confirm', 0);
      }
    }
    function destroyViews() { views.forEach(function (v) { if (v) v.destroy(); }); views = []; }
    function clear() {
      release(); destroyViews();
      if (stage) stage.remove();
      stage = table = vfx = vctx = prompt = hint = null; cards = []; tracks = []; events = [];
      context = null; state = 'closed'; T = 0; selected = -1; hovered = -1; choice = -1; hold = null; lift = [0, 0, 0];
      C.keys.remove(root.document, 'keydown', key, true); root.removeEventListener('blur', release);
      if (activeRelease === release) activeRelease = null;
    }

    // ---- previews -------------------------------------------------------------------------
    function preview(index, full) {
      var pending = C.state.current.pendingReveal, option = pending.options[index], slot = cards[index].querySelector('.shuffle-preview');
      if (!slot || secret(option)) return;
      if (views[index]) views[index].destroy();
      var card = C.card(option.cardId);
      var view = C.cardView.create(card, descriptor(option), full ? { owned: true, autoFocus: false, autoStamp: false, keyboardFlip: false } : { owned: true, thumbnail: true });
      slot.appendChild(view.el);
      if (full) { view.el.inert = true; view.el.setAttribute('aria-hidden', 'true'); view.setPresentation('art-only'); view.setFace('front'); view.setMode('full'); }
      views[index] = view;
    }

    // ---- the script: poses in card units, deterministic from the reservation ----------------
    function seededRandom() {
      var seed = K().seedOf(String(C.state.current.pendingReveal.committedAt) + ':' + pack.id), r = K().rng(seed);
      return r;
    }
    function K() { return C.packFaces.kit; }
    function build(random, scale) {
      var n = cards.length, tr = [], ev = [], cursor = 0, pile = [];
      var rest = { x: 0, y: 1.05, z: -120, r: 0, f: 0, s: .5, o: 0 };
      var cur = cards.map(function () { return Object.assign({}, rest); });
      for (var i = 0; i < n; i++) tr[i] = [];
      function seg(i, t0, dur, to, arc, ease) {
        var from = cur[i], target = Object.assign({}, from, to);
        tr[i].push({ t0: t0, t1: t0 + dur, from: from, to: target, arc: arc || null, ease: ease || io });
        cur[i] = target; return t0 + dur;
      }
      function mark(t, x, y, kind) { ev.push({ t: t, x: x, y: y, kind: kind }); }
      function stack(base, j, count) { return { x: base.x, y: base.y - (count - 1 - j) * .012, z: (count - 1 - j) * 5, f: 1 }; }
      var span = function (ms) { return ms * scale; };
      var posX = function (p) { return (p - 1) * 1.22; };

      // 1. The three cards come out of the pack face-up and are shown.
      var enter = span(cfg.showEnterMs || 700);
      for (var p = 0; p < n; p++) {
        var done = seg(p, cursor + p * span(130), enter, { x: posX(p), y: 0, z: 0, r: (p - 1) * .035, f: 0, s: 1, o: 1 }, { y: -.22, z: 40 }, out);
        mark(done - span(120), posX(p), 0, 'land');
      }
      cursor += enter + span(130) * (n - 1) + span(cfg.showHoldMs || 1700);
      var showEnd = cursor;
      // 2. They are turned face-down, one after another.
      var turn = span(cfg.turnMs || 520);
      for (var q = 0; q < n; q++) { seg(q, cursor + q * span(120), turn, { f: 1, r: (q - 1) * .02 }, { z: 70, y: -.04 }); mark(cursor + q * span(120) + turn * .5, posX(q), 0, 'flip'); }
      cursor += turn + span(120) * (n - 1) + span(420);
      var turnEnd = cursor;
      // 3. Gathered into one pile, bottom card first, squared with a tap.
      pile = [0, 1, 2].slice(0, n);
      var gather = span(cfg.gatherMs || 520), order = pile.slice().reverse();
      order.forEach(function (card, k) {
        var j = pile.indexOf(card); seg(card, cursor + k * span(130), gather, Object.assign(stack({ x: 0, y: 0 }, j, n), { r: 0 }), { y: -.1, z: 30 });
      });
      cursor += gather + span(130) * (n - 1);
      mark(cursor, 0, 0, 'slap');
      pile.forEach(function (card) { seg(card, cursor, span(110), { y: cur[card].y - .035 }); seg(card, cursor + span(110), span(130), { y: cur[card].y }); });
      cursor += span(300);

      // 4. The shuffle. Each operation edits `pile` (top to bottom) and animates it.
      function settlePile(base, t) {
        pile.forEach(function (card, j) { seg(card, t, span(200), Object.assign(stack(base, j, pile.length), { r: 0 })); });
      }
      function overhand(sizes) {
        var left = { x: -.34, y: .02 }, src = pile.slice(), dst = [], hand = span(cfg.opMs || 1000) / 1000;
        // Lift the pile into the hand.
        pile.forEach(function (card, j) { seg(card, cursor, span(240), Object.assign(stack(left, j, n), { r: -.05 }), { y: -.06, z: 20 }); });
        cursor += span(260);
        sizes.forEach(function (size) {
          var packet = src.splice(0, size), total = dst.length + packet.length;
          dst = packet.concat(dst);
          packet.forEach(function (card, k) {
            var index = dst.indexOf(card);
            var up = seg(card, cursor + k * span(40), span(190), { x: left.x + .18, y: -.62, z: 90, r: .38, f: 1 }, null, out);
            seg(card, up, span(190), Object.assign(stack({ x: .5, y: .08 }, index, n), { r: .04 }), { y: .1, z: 0 }, io);
          });
          cursor += span(190) * 2 + span(40) * packet.length + span(30);
          mark(cursor - span(60), .5, .08, 'drop');
          // The rest of the pile adjusts under the thumb.
          src.forEach(function (card, j) { seg(card, cursor - span(100), span(120), stack(left, j + dst.length, n)); });
        });
        pile = dst;
        // The new pile returns to the middle.
        pile.forEach(function (card, j) { seg(card, cursor, span(300), Object.assign(stack({ x: 0, y: 0 }, j, n), { r: 0 }), { y: -.05 }); });
        cursor += span(320);
      }
      function riffle() {
        var split = Math.max(1, Math.floor(n / 2)), L = pile.slice(0, split), R = pile.slice(split), apart = span(260);
        L.forEach(function (card, j) { seg(card, cursor, apart, { x: -.52, y: -.04 - j * .01, z: 20 + j * 4, r: -.06 }, { y: -.08 }); });
        R.forEach(function (card, j) { seg(card, cursor, apart, { x: .52, y: -.04 - j * .01, z: 20 + j * 4, r: .06 }, { y: -.08 }); });
        cursor += apart + span(120);
        var result = [], a = 0, b = 0, firstRight = random() > .5;
        while (a < L.length || b < R.length) {
          var takeRight = (result.length % 2 === 0) === firstRight;
          if (takeRight && b < R.length) result.push(R[b++]); else if (a < L.length) result.push(L[a++]); else result.push(R[b++]);
        }
        pile = result;
        result.slice().reverse().forEach(function (card, k) {
          var j = result.indexOf(card);
          var t = cursor + k * span(110), land = seg(card, t, span(240), Object.assign(stack({ x: 0, y: 0 }, j, n), { r: 0 }), { y: -.16, z: 60 }, out);
          seg(card, land, span(60), { x: (k % 2 ? -.012 : .012) }); seg(card, land + span(60), span(60), { x: 0 });
          mark(land, 0, -.01, 'riffle');
        });
        cursor += span(110) * n + span(380);
      }
      function cut() {
        var top = pile[0], rest2 = pile.slice(1);
        var lift2 = seg(top, cursor, span(260), { x: .62, y: -.34, z: 90, r: .22 }, null, out);
        rest2.forEach(function (card, j) { seg(card, lift2, span(200), stack({ x: 0, y: 0 }, j, n)); });
        var under = seg(top, lift2 + span(100), span(300), { x: 0, y: .03, z: -2, r: 0 }, { y: -.06 });
        pile = rest2.concat([top]);
        settlePile({ x: 0, y: 0 }, under);
        mark(under, 0, .03, 'drop');
        cursor = under + span(260);
      }
      var passes = (cfg.shuffleOps || ['overhand', 'overhand', 'riffle', 'cut', 'overhand']);
      passes.forEach(function (op) {
        if (op === 'overhand') overhand(random() > .5 ? [1, n - 1] : [n - 1, 1]);
        else if (op === 'riffle') riffle();
        else cut();
      });
      var shuffleEnd = cursor;
      // 5. Dealt back out in a row, with a flick.
      var deal = span(cfg.dealMs || 540);
      pile.forEach(function (card, k) {
        var t = cursor + k * span(170);
        var landed = seg(card, t, deal, { x: posX(k), y: 0, z: 0, r: (k - 1) * .018, f: 1 }, { y: -.3, z: 70, r: (k % 2 ? -1 : 1) * .25 }, out);
        mark(landed, posX(k), 0, 'land');
      });
      cursor += deal + span(170) * (n - 1) + span(240);
      var slots = pile.slice();
      // 6. A magician's finish: two quick swaps.
      var swaps = n > 2 ? [[0, 1], [1, 2]] : [[0, 1]];
      if (random() > .5) swaps.reverse();
      swaps.forEach(function (pair) {
        var a = pair[0], b = pair[1], ca = slots[a], cb = slots[b], dur = span(cfg.monteMs || 620);
        seg(ca, cursor, dur, { x: posX(b), z: 0 }, { y: -.42, z: 90, r: .2 }, io);
        seg(cb, cursor, dur, { x: posX(a), z: 0 }, { y: .34, z: 0, r: -.2 }, io);
        slots[a] = cb; slots[b] = ca; mark(cursor + dur, 0, 0, 'swap');
        cursor += dur + span(160);
      });
      cursor += span(200);
      return { tracks: tr, events: ev, end: cursor, slots: slots, show: showEnd, turn: turnEnd, shuffle: shuffleEnd };
    }
    function poseAt(i, t) {
      var list = tracks[i], first = list[0];
      if (!first || t <= first.t0) return Object.assign({}, first ? first.from : { x: 0, y: 0, z: 0, r: 0, f: 0, s: 1, o: 1 });
      for (var k = 0; k < list.length; k++) {
        var s = list[k];
        if (t < s.t0) return Object.assign({}, list[k - 1].to);
        if (t <= s.t1) {
          var p = (t - s.t0) / Math.max(1, s.t1 - s.t0), e = s.ease(p), bump = Math.sin(clamp(p) * Math.PI);
          var pose = {};
          ['x', 'y', 'z', 'r', 'f', 's', 'o'].forEach(function (key) { pose[key] = mix(s.from[key], s.to[key], e); });
          if (s.arc) { pose.y += (s.arc.y || 0) * bump; pose.z += (s.arc.z || 0) * bump; pose.r += (s.arc.r || 0) * bump; }
          return pose;
        }
      }
      return Object.assign({}, list[list.length - 1].to);
    }

    // ---- painting ----------------------------------------------------------------------------
    function measure() {
      if (!stage) return;
      var rect = stage.getBoundingClientRect(), vh = rect.height || C.viewport.height;
      H = clamp(vh * .4, 180, 380); W = H * 5 / 7;
      table.style.setProperty('--shuffle-h', H + 'px'); table.style.setProperty('--shuffle-w', W + 'px');
      if (vfx) { vfx.width = Math.round(rect.width || C.viewport.width); vfx.height = Math.round(vh); }
    }
    function place(i, pose, extra) {
      var el = cards[i], lifted = (lift[i] || 0) * -H * .09;
      var x = pose.x * W * 1.0, y = pose.y * H + lifted, z = pose.z + (lift[i] || 0) * 30;
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotate(' + pose.r.toFixed(3) + 'rad) scale(' + pose.s.toFixed(3) + ')';
      el.style.opacity = pose.o == null ? 1 : pose.o;
      el.firstChild.style.transform = 'rotateY(' + (pose.f * 180).toFixed(1) + 'deg)';
      el.style.zIndex = String(Math.round(100 + pose.z + (extra || 0)));
    }
    function paintVfx(t) {
      if (!vctx) return;
      var w = vfx.width, h = vfx.height, cx = w / 2, cy = h * .5, particles = C.settings.policy.particles;
      vctx.clearRect(0, 0, w, h);
      if (!moving() || particles <= 0) return;
      events.forEach(function (ev) {
        var age = t - ev.t; if (age < 0 || age > 520) return;
        var q = age / 520, x = cx + ev.x * W, y = cy + ev.y * H;
        if (ev.kind === 'slap' || ev.kind === 'drop' || ev.kind === 'land' || ev.kind === 'swap') {
          vctx.strokeStyle = 'rgba(45,226,184,' + ((1 - q) * .5).toFixed(3) + ')'; vctx.lineWidth = 1.6;
          vctx.beginPath(); vctx.ellipse(x, y + H * .45, W * (.2 + q * .55), W * (.05 + q * .12), 0, 0, Math.PI * 2); vctx.stroke();
        }
        var count = Math.round(7 * particles) + (ev.kind === 'slap' ? 4 : 0);
        for (var k = 0; k < count; k++) {
          var a = k * 2.399 + ev.t, d = (8 + (k % 5) * 6) + q * (34 + (k % 4) * 14);
          vctx.fillStyle = 'rgba(' + (k % 3 ? '45,226,184' : '230,255,248') + ',' + ((1 - q) * .85).toFixed(3) + ')';
          var s = 1.4 + (k % 3) * .6; vctx.fillRect(x + Math.cos(a) * d - s / 2, y + Math.sin(a) * d * .6 - q * 26 - s / 2, s, s);
        }
      });
      // Streaks behind fast-moving cards.
      for (var i = 0; i < cards.length; i++) {
        var a = poseAt(i, t), b = poseAt(i, t - 70), dx = (a.x - b.x) * W, dy = (a.y - b.y) * H, speed = Math.hypot(dx, dy);
        if (speed < 14) continue;
        var px = cx + a.x * W, py = cy + a.y * H;
        var g = vctx.createLinearGradient(px, py, px - dx * 1.6, py - dy * 1.6);
        g.addColorStop(0, 'rgba(160,255,238,.55)'); g.addColorStop(1, 'rgba(45,226,184,0)');
        vctx.strokeStyle = g; vctx.lineWidth = Math.max(2, W * .08); vctx.lineCap = 'round';
        vctx.beginPath(); vctx.moveTo(px, py); vctx.lineTo(px - dx * 1.6, py - dy * 1.6); vctx.stroke();
      }
    }
    function layout(t, pickable) {
      for (var i = 0; i < cards.length; i++) place(i, poseAt(i, t), pickable && slotOption.indexOf(i) === selected ? 40 : 0);
      var p = clamp((t - phases.turn) / 500), shuffling = t > phases.turn && t < phases.shuffle + 400;
      tilt = mix(tilt, shuffling && moving() ? 24 : 0, .08);
      table.style.setProperty('--shuffle-tilt', tilt.toFixed(2) + 'deg');
      var metaTarget = t < phases.show + 200 ? 1 : 0; metaFade = mix(metaFade, metaTarget, .18);
      stage.style.setProperty('--shuffle-meta', metaFade.toFixed(3));
      paintVfx(t);
    }

    // ---- interaction -------------------------------------------------------------------------
    function posOf(option) { return slotOption.indexOf(option); }
    function select(position, confirm) {
      if (!allowed() || state !== 'pick') return;
      var now = root.performance.now(), option = slotOption[position];
      if (confirm && selected === position && now - armedAt < 1600) { choose(position); return; }
      selected = position; focusPos = position; armedAt = now;
      cards.forEach(function (el, i) { var on = posOf(i) === position; el.classList.toggle('is-selected', on); el.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      prompt.textContent = 'Confirm your choice · click again, hold, or press Enter';
      context.announce('Card ' + (position + 1) + ' selected. Confirm with Enter, a second click, or a short hold.');
      C.fx.wake();
    }
    function choose(position) {
      if (!allowed() || state !== 'pick') return;
      var option = slotOption[position], result;
      try { result = C.picker.choose(option); } catch (_) { result = null; }
      if (!result) { hold = null; context.announce('Could not save your choice. The same options are still reserved.'); prompt.textContent = 'Could not save · choose again'; return; }
      choice = option; selected = position; state = 'chosen'; chosenAt = T; release();
      cards.forEach(function (el, i) { el.classList.add('is-locked'); el.tabIndex = -1; el.classList.toggle('is-chosen', i === option); el.classList.toggle('is-unpicked', i !== option); });
      // Everything flips up; the chosen card is promoted to a full live card for the reveal handoff.
      destroyViews();
      cards.forEach(function (_, i) { preview(i, i === option); });
      prompt.textContent = 'Choice saved'; context.announce('Choice saved. Revealing your card.');
      C.fx.wake();
    }
    function key(e) {
      if (!allowed() || state !== 'pick' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      var index = /^[123]$/.test(e.key) ? Number(e.key) - 1 : null;
      if (index !== null && index < cards.length) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) { select(index, false); cards[slotOption[index]].focus({ preventScroll: true }); } return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) { focusPos = (focusPos + (e.key === 'ArrowRight' ? 1 : cards.length - 1)) % cards.length; select(focusPos, false); cards[slotOption[focusPos]].focus({ preventScroll: true }); } return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) select(focusPos, true); }
    }
    function describe(index) {
      var option = C.state.current.pendingReveal.options[index], card = C.card(option.cardId), rarity = C.rarity(card.rarity);
      return secret(option) ? 'a hidden card' : card.name + ', ' + rarity.name;
    }
    function offer(recover) {
      var pending = C.state.current.pendingReveal;
      stage = node('section', 'shuffle-stage', host.closest('.opening-stage')); stage.setAttribute('role', 'group'); stage.setAttribute('aria-label', pack.tagline);
      stage.dataset.state = 'show'; stage.dataset.reduced = String(!moving());
      node('div', 'shuffle-light', stage).setAttribute('aria-hidden', 'true');
      vfx = node('canvas', 'shuffle-vfx', stage); vfx.setAttribute('aria-hidden', 'true'); vctx = vfx.getContext('2d');
      table = node('div', 'shuffle-table', stage);
      cards = pending.options.map(function (option, index) {
        var card = C.card(option.cardId), rarity = C.rarity(card.rarity), hidden = secret(option);
        var button = node('button', 'shuffle-card', table); button.type = 'button'; button.dataset.index = index; button.classList.add('is-locked'); button.tabIndex = -1;
        button.setAttribute('aria-pressed', 'false');
        var turn = node('div', 'shuffle-turn', button), back = node('div', 'shuffle-back', turn);
        back.setAttribute('aria-hidden', 'true'); if (C.packFaces.cardBack) { /* canvas back drawn below */ }
        var art = node('canvas', 'shuffle-back-art', back); art.width = 200; art.height = 280;
        var g = art.getContext('2d'); g.translate(100, 140); C.packFaces.cardBack(g, 188, 268, 1);
        var front = node('div', 'shuffle-front', turn); node('div', 'shuffle-preview', front);
        if (hidden) { button.classList.add('is-secret-option'); node('div', 'shuffle-secret', front, '???'); }
        var meta = node('div', 'shuffle-meta', button); node('strong', '', meta, hidden ? '???' : card.name);
        if (!hidden) { node('span', '', meta, rarity.name); var variant = C.variant(option.variantId); if (variant) node('span', 'shuffle-variant', meta, '◇ ' + variant.name); }
        node('i', 'shuffle-ring', button).setAttribute('aria-hidden', 'true');
        button.addEventListener('pointerenter', function () { if (state === 'pick') { hovered = posOf(index); C.fx.wake(); } });
        button.addEventListener('pointerleave', function () { if (hovered === posOf(index)) hovered = -1; C.fx.wake(); });
        button.addEventListener('focus', function () { if (state === 'pick') { focusPos = posOf(index); } });
        var fresh = false;
        button.addEventListener('pointerdown', function (e) {
          if (e.button !== 0 || !allowed() || state !== 'pick') return;
          var pos = posOf(index);
          fresh = selected !== pos || root.performance.now() - armedAt >= 1600; if (fresh) select(pos, false);
          hold = { id: e.pointerId, position: pos, at: root.performance.now() }; button.setPointerCapture(e.pointerId); C.fx.wake();
        });
        button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
        button.addEventListener('click', function () { if (fresh) { fresh = false; return; } select(posOf(index), true); });
        return button;
      });
      pending.options.forEach(function (_, i) { preview(i, false); });
      prompt = node('p', 'shuffle-prompt', stage, 'Your three cards');
      hint = node('small', 'shuffle-hint', stage, '1 · 2 · 3 to select / Enter to confirm');
      C.keys.listen(root.document, 'keydown', 'src.ui.picker-shuffle.js.1', key, true); root.addEventListener('blur', release);
      activeRelease = release;
      measure();
      var random = seededRandom(), still = !moving();
      var script = build(random, still ? .001 : recover ? .7 : 1);
      tracks = script.tracks; events = script.events; end = script.end; slotOption = script.slots.slice(); phases = script;
      if (still) {
        // Reduced motion: the cards appear, turn over, then trade places with a short fade.
        tracks = []; for (var i = 0; i < cards.length; i++) tracks.push([{ t0: 0, t1: 1, from: { x: (i - 1) * 1.22, y: 0, z: 0, r: 0, f: 0, s: 1, o: 1 }, to: { x: (i - 1) * 1.22, y: 0, z: 0, r: 0, f: 0, s: 1, o: 1 }, arc: null, ease: io }]);
        end = 1; phases = { show: 1800, turn: 2200, shuffle: 2200, end: 2400 };
      }
      T = 0; state = 'run'; cards.forEach(function (el) { el.style.transition = 'none'; });
      var names = pending.options.map(function (o, i) { return 'card ' + (i + 1) + ': ' + describe(i); }).join('; ');
      context.announce('Your three cards: ' + names + '. They will be shuffled; then pick one.');
      C.fx.wake();
    }
    function begin(ctx) { clear(); context = ctx; }
    function resume(ctx) { clear(); context = ctx; recovered = true; offer(true); }

    return {
      usesSharedCut: true, begin: begin, resume: resume, release: release, reset: clear, clearReveal: function () {},
      dissolve: function () {}, tear: function () {},
      update: function (dt) {
        if (!context || modal || root.document.hidden || C.menu.afk) { release(); return false; }
        if (!stage) return false;
        T += dt;
        var still = !moving();
        if (state === 'run') {
          if (still) {
            // Fades in, flips at 1.8 s, swaps at 2.2 s.
            var shown = clamp(T / 500), flipped = T > phases.show, swapped = T > phases.turn;
            cards.forEach(function (el, i) {
              var pos = swapped ? slotOption.indexOf(i) : i;
              el.style.transform = 'translate3d(' + ((pos - 1) * 1.22 * W) + 'px,0,0)';
              el.style.opacity = swapped ? clamp((T - phases.turn) / 220) : shown; el.firstChild.style.transform = 'rotateY(' + (flipped ? 180 : 0) + 'deg)';
              el.style.zIndex = String(100 + i);
            });
            stage.style.setProperty('--shuffle-meta', flipped ? 0 : 1);
            if (swapped && T >= phases.end) { state = 'pick'; }
          } else {
            layout(T, false);
            var prog = T < phases.show ? 'Your three cards' : T < phases.turn ? 'Watch closely' : T < phases.shuffle + 300 ? 'Shuffling' : 'Where did it go?';
            if (prompt.textContent !== prog && state === 'run') prompt.textContent = prog;
            if (T >= end) state = 'pick';
          }
          if (state === 'pick') {
            stage.dataset.state = 'pick'; prompt.textContent = 'Pick 1 of ' + cards.length;
            cards.forEach(function (el) { el.classList.remove('is-locked'); el.tabIndex = 0; });
            cards[slotOption[0]].focus({ preventScroll: true }); focusPos = 0;
            context.announce('Pick one of ' + cards.length + '. Press 1, 2 or 3, then Enter to confirm.');
          }
          return true;
        }
        if (state === 'pick') {
          if (!still) {
            for (var i = 0; i < cards.length; i++) {
              var pos = slotOption.indexOf(i), target = (pos === selected ? 1 : 0) + (pos === hovered ? .6 : 0);
              lift[i] = mix(lift[i] || 0, Math.min(1, target), .22);
              place(i, poseAt(i, end + 1), pos === selected ? 40 : 0);
            }
            paintVfx(end + 9999);
          }
          if (hold) {
            var p = clamp((root.performance.now() - hold.at) / cfg.confirmMs); stage.style.setProperty('--shuffle-confirm', p);
            if (p === 1) { var position = hold.position; hold = null; choose(position); }
            return true;
          }
          if (selected >= 0 && root.performance.now() - armedAt >= 1600) { armedAt = -Infinity; prompt.textContent = 'Pick 1 of ' + cards.length + ' · confirm with a short hold'; }
          return true;
        }
        if (state === 'chosen') {
          var q = clamp((T - chosenAt) / (still ? 240 : cfg.choiceMs + 450)), flip = out(clamp(q / .55)), leave = io(clamp((q - .4) / .6));
          cards.forEach(function (el, i) {
            var chosen = i === choice, base = poseAt(i, end + 1);
            var pose = Object.assign({}, base);
            pose.f = mix(1, 0, flip);
            if (chosen) { pose.s = 1 + .16 * out(q); pose.y = base.y - .06 * out(q); pose.z = base.z + 50 * out(q); }
            else { pose.o = 1 - leave; pose.y = base.y + .22 * leave; pose.s = 1 - .12 * leave; pose.r = base.r + (slotOption.indexOf(i) - 1) * .12 * leave; }
            if (still) { pose.f = 0; pose.o = chosen ? 1 : 1 - leave; }
            place(i, pose, chosen ? 60 : 0);
          });
          stage.style.setProperty('--shuffle-meta', clamp(q * 2));
          if (q >= 1) { var reveal = context.reveal; clear(); reveal(); }
          return true;
        }
        return false;
      },
      get active() { return !!hold; }
    };
  } });
})(window.Cardable, window);
