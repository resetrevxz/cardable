(function (C, root) {
  'use strict';
  function node(tag, className, parent, text) {
    var el = root.document.createElement(tag); el.className = className;
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  function texture(parent) {
    var wrapper = node('div', 'pack-wrapper', parent);
    node('div', 'pack-crimp pack-crimp--top', wrapper); node('div', 'pack-crimp pack-crimp--bottom', wrapper);
    node('div', 'pack-wrapper__grain', wrapper); node('div', 'pack-shine', wrapper);
    return wrapper;
  }
  function print(parent, pack) {
    node('div', 'pack-brand', parent, C.config.gameName.toLowerCase()); node('div', 'pack-label', parent, pack.name);
  }
  function unit(parent, back, pack) {
    var el = node('div', 'pack-unit' + (back ? ' pack-unit--back' : ''), parent);
    el.setAttribute('aria-hidden', 'true'); el.dataset.material = pack.design.material; el.dataset.wrapper = pack.design.wrapper;
    var pose = node('div', 'pack-pose', el), glass = node('div', 'pack-body glass', pose);
    var fluid = node('div', 'pack-fluid', glass); node('div', 'pack-fluid__body', fluid); node('div', 'pack-meniscus', fluid);
    var specks = [], random = C.art.random(C.config.menuMotion.speckCount);
    for (var i = 0; i < C.config.menuMotion.speckCount; i++) {
      var speck = node('i', 'pack-speck', fluid), inset = C.config.menuMotion.speckInsetPercent;
      speck.style.left = (inset + random() * (100 - inset * 2)) + '%'; speck.style.top = (inset + random() * (100 - inset * 2)) + '%';
      specks.push({ el: speck, phase: random() * Math.PI * 2 });
    }
    var wrapper = texture(glass); print(glass, pack); node('div', 'pack-arrival-sweep', glass);
    return { el: el, pose: pose, glass: glass, wrapper: wrapper, fluid: fluid, specks: specks };
  }
  C.packMarkup = {
    node: node, unit: unit,
    foil: function (parent, pack) {
      var el = node('div', 'opening-foil', parent);
      el.dataset.material = pack.design.material; el.dataset.wrapper = pack.design.wrapper;
      texture(el); node('div', 'opening-silhouette', el); print(el, pack);
      return el;
    }
  };
})(window.Cardable, window);
