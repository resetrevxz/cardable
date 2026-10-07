(function(root) {
  'use strict';
  var C = root.Cardable, D = document, ids = root.CARDABLE_CATALOG.map(c => c.id);
  var clamp = x => Math.max(0, Math.min(1, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  function instance(id) {
    return { serial: 'CBL-WEB2-' + String(ids.indexOf(id) + 1).padStart(6, '0') };
  }

  function createWorld(id) {
    C.cutscenes.chooseProfile('safe');
    var spec = C.rarity(id).openingIntro;
    var painter = id === 'legendary' ? C.gildedIntro.create() :
                  id === 'mythical' ? C.mythicalIntro.create() :
                  id === 'exotic' ? C.exoticIntro.create() :
                  C.ascendantIntro.create();
    var cardId = ids.find(function(key) { return C.card(key).rarity === id; });
    var seed = instance(cardId).serial;
    if (id === 'ascendant') C.ascendantBackground.begin(seed, 0);
    painter.start(spec, seed);
    if (painter.setProfile) painter.setProfile('safe');
    if (painter.setPresentationFactor) painter.setPresentationFactor(1);
    if (spec.ritual && painter.setPulseFactor) {
      var factor = Math.min(1, 1.8 / spec.ritual.pulseHzEnd);
      painter.setPulseFactor(factor, C.cutscenes.pulses(spec, factor));
    }
    var limiter = C.cutscenes.createLimiter(D.body);
    limiter.reset('safe');
    return {
      painter: painter,
      spec: spec,
      id: id,
      handoffDone: false,
      timeline: C.cutscenes.timeline(spec),
      limiter: limiter,
      prelude: id === 'exotic' ? C.webPrelude.create() : null,
      stop: function() {
        if (painter.stop) painter.stop();
        if (this.prelude) this.prelude.stop();
        limiter.hide();
      }
    };
  }

  function paintWorld(w, canvas, p, age, filmAge, pointer) {
    var width = canvas.clientWidth || 1440,
        height = canvas.clientHeight || 900,
        dpr = Math.min(1.25, root.devicePixelRatio || 1, Math.sqrt(1100000 / (width * height))),
        rw = Math.round(width * dpr),
        rh = Math.round(height * dpr);
    if (canvas.width !== rw || canvas.height !== rh) {
      canvas.width = rw;
      canvas.height = rh;
    }
    var g = canvas.getContext('2d');
    if (!g) throw Error('Canvas unavailable');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    var section = w.id === 'legendary' ? { id: 'aura', p: 0.72 + clamp(p) * 0.1 } :
                  w.id === 'mythical' ? { id: 'clock', p: 0.3 + clamp(p) * 0.12 } :
                  w.id === 'exotic' ? { id: 'galaxy', p: 0.3 + clamp(p) * 0.16 } :
                  { id: 'cave', p: 0.32 + clamp(p) * 0.16 };
    if (age) section.p += Math.sin(age / 7000) * 0.024;
    if (Number.isFinite(filmAge)) {
      var at = Math.min(filmAge, w.timeline.total),
          part = w.spec.sections[w.spec.sections.length - 1];
      for (var i = 0; i < w.spec.sections.length; i++) {
        var candidate = w.spec.sections[i],
            range = w.timeline.sections[candidate.id];
        if (at < range.start + range.ms) {
          part = candidate;
          break;
        }
      }
      var currentRange = w.timeline.sections[part.id];
      section = { id: part.id, p: clamp((at - currentRange.start) / currentRange.ms) };
    }
    var handoffAt = w.timeline.sections.card ? w.timeline.sections.card.start : w.timeline.total;
    if (Number.isFinite(filmAge) && filmAge >= handoffAt) {
      if (!w.handoffDone) {
        if (w.painter.handoff) w.painter.handoff(false);
        else if (w.painter.releaseScene) w.painter.releaseScene();
        w.handoffDone = true;
      }
      if (w.painter.cardFrame) w.cardFrame = w.painter.cardFrame(filmAge - handoffAt, false);
    }
    w.painter.paint(g, width, height, section, null, null);
    if (w.prelude && section.id === 'prelude') {
      w.prelude.paint(g, width, height, section.p * w.spec.sections[0].ms);
    }
    if (w.id === 'ascendant' && Number.isFinite(filmAge)) {
      var bars = smooth(filmAge / 800) * (1 - smooth((filmAge - w.timeline.sections.explosion.start) / 500)),
          barHeight = Math.max(0, (height - width / 2.39) * 0.5) * bars;
      g.fillStyle = '#05060a';
      g.fillRect(0, 0, width, barHeight);
      g.fillRect(0, height - barHeight, width, barHeight);
    }
    if (Number.isFinite(filmAge) && filmAge >= w.timeline.total && w.id !== 'ascendant' && w.painter.backplate) {
      w.painter.backplate(g, width, height, 0);
    }
    if (Number.isFinite(filmAge)) w.limiter.apply(canvas, root.performance.now());
  }

  root.CardableFilms = {
    create: createWorld,
    paint: paintWorld
  };
})(window);
