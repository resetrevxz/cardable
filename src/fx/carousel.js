(function (C) {
  'use strict';
  // One displayed position, one target. The inventory's shared-loop subscriber drives it.
  C.carousel = {
    create: function () {
      var cfg = C.config.carousel, spring = C.springs.create(0, cfg), maximum = 0, pitch = 1;
      var snapping = false, lower = 0, upper = 0, reducedGoal = null, reducedFrom = 0, reducedAge = 0;
      function clamp(value) { return Math.max(0, Math.min(maximum, value)); }
      return {
        get position() { return spring.value; }, get target() { return spring.target; }, get velocity() { return spring.velocity; },
        bounds: function (max, step) { maximum = Math.max(0, max); pitch = Math.max(1, step); spring.target = clamp(spring.target); },
        reset: function (value) { spring.reset(clamp(value)); snapping = false; reducedGoal = null; },
        move: function (value) { spring.target = clamp(value); snapping = false; },
        snap: function (value, velocity) {
          spring.target = clamp(value); snapping = true;
          if (velocity != null) spring.velocity = velocity;
          lower = Math.min(spring.value, spring.target) - pitch * cfg.snapOvershoot;
          upper = Math.max(spring.value, spring.target) + pitch * cfg.snapOvershoot;
        },
        settled: function () { return spring.settled(); },
        step: function (dt, reduced) {
          if (reduced) {
            if (reducedGoal !== spring.target) { reducedGoal = spring.target; reducedFrom = spring.value; reducedAge = 0; }
            reducedAge += dt;
            var p = Math.min(1, reducedAge / cfg.reducedSlideMs);
            spring.value = reducedFrom + (reducedGoal - reducedFrom) * p; spring.velocity = 0;
          }
          else {
            reducedGoal = null;
            spring.step(dt, spring.target, snapping ? cfg.snapDamping : cfg.damping);
            var bounded = clamp(snapping ? Math.max(lower, Math.min(upper, spring.value)) : spring.value);
            if (bounded !== spring.value) { spring.value = bounded; spring.velocity = 0; }
          }
          return spring.value;
        }
      };
    }
  };
})(window.Cardable);
