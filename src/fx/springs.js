(function (C) {
  'use strict';
  C.springs = {
    create: function (value, options) {
      var cfg = Object.assign({}, C.config.cardView.spring, options || {});
      return {
        value: value || 0, velocity: 0, target: value || 0,
        step: function (dt, target, damping) {
          this.target = target;
          var remaining = Math.max(0, Math.min(dt*(C.settings?C.settings.get('uiAnimationSpeed')||1:1), C.config.shell.maxFrameDeltaMs)) / 1000;
          while (remaining > 0) {
            var step = Math.min(remaining, cfg.stepMs / (C.quality&&C.quality.profile.rank===4?2000:1000));
            var acceleration = (cfg.stiffness * (this.target - this.value) - (damping || cfg.damping) * this.velocity) / cfg.mass;
            this.velocity += acceleration * step;
            this.value += this.velocity * step;
            remaining -= step;
          }
          if (Math.abs(this.target - this.value) < cfg.epsilon && Math.abs(this.velocity) < cfg.epsilon) { this.value = this.target; this.velocity = 0; }
          return this.value;
        },
        configure: function (options) { Object.assign(cfg, options); },
        settled: function () { return Math.abs(this.target - this.value) < cfg.epsilon && Math.abs(this.velocity) < cfg.epsilon; },
        reset: function (next) { this.value = next || 0; this.velocity = 0; this.target = next || 0; }
      };
    }
  };
})(window.Cardable);
