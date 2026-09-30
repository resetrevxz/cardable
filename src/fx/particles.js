(function (C, root) {
  'use strict';
  // A bounded pool advanced by its owner on the shared scheduler, never its own rAF.
  C.particles = {
    create: function (parent, capacity) {
      var pool = [], cfg = C.config.openingMotion;
      for (var i = 0; i < capacity; i++) {
        var el = root.document.createElement('i'); el.className = 'opening-particle'; el.setAttribute('aria-hidden', 'true');
        el.style.opacity = 0; parent.appendChild(el); pool.push({ el: el, life: 0, age: 0 });
      }
      return {
        count: 0,
        clear: function () { pool.forEach(function (p) { p.life = 0; p.el.style.opacity = 0; }); this.count = 0; },
        emit: function (kind, points, width, height, normal) {
          this.clear(); if (C.motion.reduced) return;
          var random = Math.random, count = Math.min(capacity, kind === 'dissolve' ? cfg.dissolveCount : cfg.fleckCount);
          for (var j = 0; j < count; j++) {
            var p = pool[j], position = points ? points[Math.floor(random() * points.length)] : { x: random(), y: random() };
            p.x = position.x * width; p.y = position.y * height; p.age = 0;
            p.life = cfg.particleMinMs + random() * (cfg.particleMaxMs - cfg.particleMinMs);
            p.vx = (random() - 0.5) * cfg.particleSpreadPx;
            p.vy = -cfg.particleRisePx * (0.5 + random() * 0.5); p.gravity = 0;
            if (kind === 'tear') {
              var side = j % 2 ? 1 : -1, speed = cfg.fleckSpeedPx * (0.5 + random() * 0.5);
              p.vx += normal.x * side * speed; p.vy = normal.y * side * speed - speed * 0.5; p.gravity = cfg.gravityPx;
            }
            p.rotation = (random() - 0.5) * cfg.particleRotationDegrees;
            p.el.style.width = (cfg.fleckMinPx + random() * (cfg.fleckMaxPx - cfg.fleckMinPx)) + 'px';
            p.el.style.height = cfg.fleckMinPx + 'px';
          }
          this.count = count;
        },
        update: function (dt) {
          var active = 0;
          pool.forEach(function (p) {
            if (!p.life) return;
            p.age += dt;
            if (p.age >= p.life) { p.life = 0; p.el.style.opacity = 0; return; }
            var seconds = p.age / 1000, progress = p.age / p.life;
            p.el.style.transform = 'translate3d(' + (p.x + p.vx * seconds) + 'px,' + (p.y + p.vy * seconds + p.gravity * seconds * seconds * 0.5) + 'px,0) rotate(' + p.rotation * progress + 'deg)';
            p.el.style.opacity = Math.sin(progress * Math.PI) * cfg.particleOpacity; active += 1;
          });
          this.count = active; return active > 0;
        }
      };
    }
  };
})(window.Cardable, window);
