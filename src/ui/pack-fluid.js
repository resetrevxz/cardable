(function (C) {
  'use strict';
  function clamp(n, cap) { return Math.max(-cap, Math.min(cap, n)); }
  C.packFluid = {
    create: function (item) {
      var cfg = C.config.packObject, angle = C.springs.create(0, cfg.fluidSpring), wave = C.springs.create(0, cfg.fluidSpring);
      var previousV = 0, time = 0;
      return {
        state: { angle: 0, wave: 0, fill: 0 },
        update: function (dt, fill, pose, reduced) {
          time += dt;
          var velocity = pose.vx || 0, acceleration = (velocity - previousV) / Math.max(dt, 1); previousV = velocity;
          var edge = Math.sin(Math.PI * fill), a = 0, w = 0;
          if (reduced) { angle.reset(); wave.reset(); }
          else {
            a = clamp(angle.step(dt, clamp(-(pose.rz || 0) - (pose.ry || 0) * 0.18 + velocity * 0.008, cfg.fluidAngleCap)), cfg.fluidAngleCap);
            w = clamp(wave.step(dt, clamp(acceleration * 0.18 + Math.sin(time / 1400) * 0.35, cfg.fluidWaveCapPx)), cfg.fluidWaveCapPx) * edge;
          }
          this.state.angle = a; this.state.wave = w; this.state.fill = fill;
          item.fluid.style.transform = 'translateY(' + (1 - fill) * 100 + '%)';
          item.el.style.setProperty('--fluid-angle', a.toFixed(3) + 'deg');
          item.el.style.setProperty('--meniscus-wave', reduced ? '0px' : w.toFixed(3) + 'px');
          item.el.style.setProperty('--fluid-top', (1 - fill) * 100 + '%');
          item.el.style.setProperty('--fluid-depth', (0.12 + fill * 0.22).toFixed(3));
          return !angle.settled() || !wave.settled();
        }
      };
    }
  };
})(window.Cardable);
