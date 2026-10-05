(function(C, root) {
  'use strict';
  var registry = Object.create(null);
  function standard(el) { el.dataset.skin = 'standard'; }
  function rare(el) {
    el.dataset.skin = 'rare';
    el.querySelectorAll('.pack-wrapper').forEach(function(wrapper) {
      if (wrapper.querySelector('.pack-facets')) return;
      C.packMarkup.node('div', 'pack-facets', wrapper);
      C.packMarkup.node('div', 'pack-clearcoat', wrapper);
      C.packMarkup.node('div', 'pack-gloss-sweep', wrapper);
    });
    el.querySelectorAll('.pack-print').forEach(function(print) {
      if (!print.querySelector('.pack-r-plus')) C.packMarkup.node('span', 'pack-r-plus', print, 'R+');
    });
  }
  C.packSkins = {
    registry: registry,
    register: function(id, skin) {
      if (!id || !skin || ['renderIdle','renderWaiting','renderWrapper','quality','counterThumb'].some(function(key) { return typeof skin[key] !== 'function'; })) throw new Error('Invalid pack skin');
      registry[id] = skin;
    },
    get: function(pack) { return registry[pack.skin || 'standard'] || registry.standard; },
    apply: function(el, pack, mode) {
      var skin = C.packSkins.get(pack);
      if (!pack.design.companyLogo) delete el.dataset.brandPack;
      if (skin.fluidTint) {
        el.dataset.packTinted = 'true';
        el.style.setProperty('--pack-fluid-start', skin.fluidTint[0]); el.style.setProperty('--pack-fluid-end', skin.fluidTint[1]);
      } else {
        delete el.dataset.packTinted; el.style.removeProperty('--pack-fluid-start'); el.style.removeProperty('--pack-fluid-end');
      }
      skin[mode === 'wrapper' ? 'renderWrapper' : mode === 'waiting' ? 'renderWaiting' : 'renderIdle'](el, pack);
    }
  };
  C.packSkins.register('standard', {
    renderIdle: standard, renderWaiting: standard, renderWrapper: standard,
    fluidTint: null, leakTint: null, cutGlow: null,
    counterThumb: function(host) { C.packMarkup.node('span', 'pack-counter-glyph', host, 'C'); },
    quality: function() { return false; }
  });
  C.packSkins.register('rare', {
    renderIdle: rare, renderWaiting: rare, renderWrapper: rare,
    fluidTint: ['var(--pack-rare-fluid)', 'var(--pack-rare-blue)'],
    leakTint: 'var(--pack-rare-leak)', cutGlow: 'var(--pack-rare-leak)',
    counterThumb: function(host) {
      var thumb = C.packMarkup.node('span', 'pack-counter-thumb', host);
      C.packMarkup.node('i', 'pack-counter-thumb__seal', thumb);
      C.packMarkup.node('span', 'pack-counter-thumb__brand', thumb, 'c');
      C.packMarkup.node('span', 'pack-counter-glyph', host, 'R+');
    },
    quality: function(el, pose, time, reduced, state) {
      var rank = Math.min(C.settingsSchema.tiers.indexOf(C.settings.get('finishQuality')), C.settings.policy.reflection);
      el.dataset.packQuality = C.settingsSchema.tiers[rank];
      if (state.appeared == null || time < state.appeared) state.appeared = time;
      var moving = !reduced && C.settings.policy.ambient;
      var high = rank === 3, medium = rank === 2;
      var age = time - state.appeared, sweep = high ? age % 6000 : age;
      var p = Math.min(1, sweep / 1200), active = moving && (high || medium && age < 1200);
      el.style.setProperty('--rare-sheen', (active ? -140 + p * 280 : 140) + '%');
      el.style.setProperty('--rare-sheen-opacity', active ? Math.sin(p * Math.PI).toFixed(3) : 0);
      el.style.setProperty('--rare-gloss-x', high ? (42 + (pose.ry || 0) * 1.4) + '%' : '42%');
      el.style.setProperty('--rare-edge', high ? Math.min(.8, .35 + Math.abs(pose.ry || 0) / 40) : .35);
      return active;
    }
  });
})(window.Cardable, window);
