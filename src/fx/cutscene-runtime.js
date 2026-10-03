(function (C, root) {
  'use strict';
  var entries = Object.create(null), active = null;
  var math = C.cutsceneMath;
  function sections(spec) {
    var offset = 0, result = Object.create(null);
    spec.sections.forEach(function (part) { result[part.id] = { start: offset, ms: part.ms }; offset += part.ms; });
    return { sections: result, total: offset };
  }
  function quality() { return ['very-low', 'low', 'medium', 'high'].indexOf(C.settings.get('quality')); }
  C.cutscenes = {
    registry: entries, timeline: sections,
    register: function (kind, factory) { entries[kind] = factory; },
    create: function (kind) { return entries[kind] ? entries[kind]() : null; },
    warmup: function (rarity, serial) {
      if (rarity && rarity.reveal.cutscene === 'ascendant') C.ascendantIntro.warmup(rarity.openingIntro, String(serial));
    },
    get active() { return active; },
    createRuntime: function (parent) {
      var spec, painter, clock = 0, previous = 0, rate = 1, hint, film, skipping = null;
      var level = 2, beats = Object.create(null), adaptive = { samples: 0, sum: 0, dropped: false }, current = false;
      function emit(id, time, key) {
        key = key || id;
        if (beats[key]) return;
        beats[key] = true;
        C.events.emit('cutscene:beat', { cutscene: spec.cutscene || spec.kind, id: id, timeMs: time });
      }
      function ensureHint() {
        if (hint) return;
        hint = root.document.createElement('button'); hint.type = 'button'; hint.className = 'cutscene-skip';
        hint.textContent = 'Esc to skip'; hint.hidden = true; hint.setAttribute('aria-label', 'Skip cinematic');
        parent.appendChild(hint); hint.addEventListener('click', skip);
      }
      function skip() {
        if (!current || previous < 2000 || skipping) return false;
        var endpoint = film.sections.explosion || film.sections.release;
        skipping = { from: clock, to: Math.max(clock, endpoint ? endpoint.start : film.total), age: 0 };
        C.fx.wake(); return true;
      }
      root.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && current && previous >= 2000) {
          event.preventDefault(); event.stopImmediatePropagation(); skip();
        }
      }, true);
      function stop() {
        current = false; skipping = null; if (hint) hint.hidden = true;
        root.document.body.classList.remove('cutscene-cursor-available');
        if (active === api) active = null;
      }
      var api = {
        start: function (next, renderer) {
          ensureHint(); spec = next; painter = renderer; film = sections(spec); clock = previous = 0; skipping = null;
          level = quality(); rate = 1; current = true; beats = Object.create(null);
          adaptive = { samples: 0, sum: 0, dropped: false }; active = api;
          hint.hidden = true; if (painter && painter.setQuality) painter.setQuality(level);
        },
        update: function (elapsed, duration, staticPolicy) {
          var dt = Math.max(0, elapsed - previous); previous = elapsed;
          if (skipping) {
            skipping.age += dt; clock = math.mix(skipping.from, skipping.to, math.smooth(skipping.age / 500));
            if (skipping.age >= 500) { clock = skipping.to; skipping = null; }
          } else clock += dt * rate * film.total / duration;
          clock = Math.min(film.total, clock);
          hint.hidden = elapsed < 2000 || staticPolicy;
          root.document.body.classList.toggle('cutscene-cursor-available', !hint.hidden);
          (spec.beats || []).forEach(function (beat) { if (clock >= beat.ms) emit(beat.id, beat.ms, beat.key); });
          // Live adaptation is part of the presentation, not a separate profiling loop.
          // Programs and targets were warmed during cutting; ignore the first ten visible frames.
          if (spec.kind === 'prismatic' && !staticPolicy && clock >= 1000 && clock < 10000 && dt > 0 && !adaptive.dropped) {
            adaptive.samples += 1; if (adaptive.samples > 10) adaptive.sum += dt;
            var count = adaptive.samples - 10;
            if (count >= 60 && adaptive.sum / count > 24 && level >= 2) {
              level -= 1; adaptive.dropped = true; if (painter.setQuality) painter.setQuality(level);
              C.events.emit('cutscene:quality', { level: level, reason: 'adaptive' });
            }
          }
          return clock / film.total * duration;
        },
        letterbox: function (g, w, h, ms) {
          var amount = math.smooth(ms / 800);
          if (film.sections.explosion) amount *= 1 - math.smooth((ms - film.sections.explosion.start) / 500);
          var height = Math.max(0, (h - w / 2.39) * .5) * amount;
          g.fillStyle = '#05060a'; g.fillRect(0, 0, w, height); g.fillRect(0, h - height, w, height);
        },
        skip: skip, stop: stop,
        seek: function (ms) { if (current) { clock = Math.max(0, Math.min(film.total - 1, ms)); skipping = null; C.fx.wake(); } },
        jump: function (id) { if (film.sections[id]) api.seek(film.sections[id].start); },
        setRate: function (value) { rate = Math.max(.1, Math.min(4, Number(value) || 1)); },
        setQuality: function (value) { level = Math.max(1, Math.min(3, value)); adaptive.dropped = true; if (painter.setQuality) painter.setQuality(level); },
        get timeMs() { return clock; }, get totalMs() { return film ? film.total : 0; },
        get rate() { return rate; }, get level() { return level; }, get sections() { return film ? film.sections : {}; }
      };
      return api;
    }
  };
})(window.Cardable, window);
