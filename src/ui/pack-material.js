(function (C, root) {
  'use strict';
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  // Same lamp, specular speed and pointer/normal relationship as the card renderer.
  // Cached once per object; no frame-time style queries or layout measurements.
  C.packMaterial = {
    create: function (el, pack) {
      var lamp = root.getComputedStyle(root.document.documentElement), cfg = C.config.cardView;
      var lx = parseFloat(lamp.getPropertyValue('--lamp-x')) || 0.6;
      var ly = parseFloat(lamp.getPropertyValue('--lamp-y')) || 0.8;
      var design = pack.design || {}, painted = {}, lastTime = -100, lastRx = null, lastRy = null;
      var shine = el.querySelectorAll('.pack-shine')[0];
      var skin = C.packSkins.get(pack), skinState = {};
      function set(key, value) { if (painted[key] !== value) { painted[key] = value; el.style.setProperty(key, value); } }
      set('--foil-strength', design.foilStrength == null ? 0.55 : design.foilStrength);
      set('--foil-roughness', design.roughness == null ? 0.5 : design.roughness);
      set('--foil-refraction', design.refraction == null ? 0.25 : design.refraction);
      set('--foil-emboss', design.emboss == null ? 0.6 : design.emboss);
      if ((pack.skin || 'standard') !== 'standard') { skin.quality(el, {rx:0,ry:0}, 0, true, skinState); skinState.appeared = null; }
      return {
        update: function (pose, time, reduced) {
          var skinMoving = skin.quality(el, pose, time, reduced, skinState);
          var hz = C.settings.policy.glareHz;
          if ((pack.skin || 'standard') !== 'standard' && el.dataset.packQuality !== 'high') return skinMoving;
          if (!hz) return;
          var rx = pose.rx || 0, ry = pose.ry || 0;
          // Idle glint is almost imperceptible; avoid repainting its optical layers
          // at display rate when the normal has not changed. Gestures stay full-rate.
          if (rx === lastRx && ry === lastRy && (reduced || time - lastTime < Math.max(50, 1000 / hz))) return;
          if (time - lastTime + 0.01 < 1000 / hz) return;
          lastRx = rx; lastRy = ry; lastTime = time;
          var x = clamp(0.5 + ry / 32, 0, 1), y = clamp(0.5 - rx / 32, 0, 1);
          var drift = reduced ? 0 : Math.sin(time / C.config.packObject.idleMaterialMs * Math.PI * 2) * 0.04;
          var light = clamp(0.32 + (ly * rx - lx * ry) / 30, 0.14, 0.82);
          if (shine) shine.style.opacity = (light * 0.6 * (0.96 + drift)).toFixed(3);
          var angle = Math.atan2(ly + rx / cfg.tiltCap * 0.35, lx - ry / cfg.tiltCap * 0.35) * 180 / Math.PI;
          set('--lamp-angle', angle.toFixed(2) + 'deg');
          set('--shine-x', (clamp(x - lx * cfg.lampInfluence, 0, 1) * 100).toFixed(2) + '%');
          set('--shine-y', (clamp(y - ly * cfg.lampInfluence, 0, 1) * 100).toFixed(2) + '%');
          set('--foil-core', (clamp(0.5 + (x - 0.5) * cfg.specularSpeed - lx * cfg.lampInfluence, 0, 1) * 100).toFixed(2) + '%');
          set('--foil-light', light.toFixed(3));
          set('--film-x', (reduced ? 0 : ry * (design.refraction || 0) * 0.3).toFixed(2) + 'px');
          set('--film-y', (reduced ? 0 : -rx * (design.refraction || 0) * 0.3).toFixed(2) + 'px');
          set('--emboss-x', (-lx + ry * 0.045).toFixed(2) + 'px');
          set('--emboss-y', (-ly - rx * 0.045).toFixed(2) + 'px');
        }
      };
    }
  };
})(window.Cardable, window);
