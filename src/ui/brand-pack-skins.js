(function(C) {
  'use strict';
  var node = C.packMarkup.node;
  function render(el, pack) {
    el.dataset.skin = pack.skin;
    el.dataset.brandPack = 'true';
    el.querySelectorAll('.pack-wrapper').forEach(function(wrapper) {
      if (wrapper.querySelector('.pack-brand-relief')) return;
      node('div', 'pack-skin-layer pack-brand-relief', wrapper);
      node('div', 'pack-skin-layer pack-brand-softbox', wrapper);
      node('div', 'pack-skin-layer pack-brand-sheen', wrapper);
    });
  }
  function quality(el, pose, time, reduced, state) {
    var rank = Math.min(C.settingsSchema.tiers.indexOf(C.settings.get('finishQuality')), C.settings.policy.reflection);
    el.dataset.packQuality = C.settingsSchema.tiers[rank];
    if (state.appeared == null || time < state.appeared) state.appeared = time;
    var age = time - state.appeared, moving = !reduced && C.settings.policy.ambient;
    var active = moving && (rank === 3 || rank === 2 && age < 1200);
    var p = Math.min(1, (rank === 3 ? age % 6000 : age) / 1200);
    el.style.setProperty('--brand-sheen-x', (active ? -140 + p * 280 : 140) + '%');
    el.style.setProperty('--brand-sheen-opacity', active ? Math.sin(p * Math.PI).toFixed(3) : 0);
    el.style.setProperty('--brand-light-x', rank === 3 ? (45 + (pose.ry || 0) * 1.5) + '%' : '45%');
    return active;
  }
  // Skin definitions own materials; pool and probability rules stay in data/core.
  var materials = {
    nvidia: { fluid: ['#BEE879','#76B900'], leak: '#E7FFD0' },
    amd: { fluid: ['#FFA7A7','#ED1C24'], leak: '#FFE6E6' },
    snapdragon: { fluid: ['#F8E6BF','#DAB777'], leak: '#FFF4DA' },
    apple: { fluid: ['#F9FAFF','#B5BCCB'], leak: '#FFFFFF' }
  };
  Object.keys(materials).forEach(function(id) {
    var material = materials[id];
    C.packSkins.register(id, {
      renderIdle: render, renderWaiting: render, renderWrapper: render,
      fluidTint: material.fluid, leakTint: material.leak, cutGlow: material.leak,
      quality: quality,
      counterThumb: function(host, pack) {
        var thumb = node('span', 'pack-counter-thumb pack-counter-thumb--brand', host);
        node('i', 'pack-counter-thumb__seal', thumb);
        node('span', 'pack-counter-thumb__brand', thumb, 'c');
        node('span', 'pack-counter-glyph', host, pack.counterStyle.glyph);
      }
    });
  });
})(window.Cardable);
