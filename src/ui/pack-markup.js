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
    ['top', 'bottom'].forEach(function (side) {
      var seal = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); seal.setAttribute('viewBox', '0 0 180 12'); seal.setAttribute('preserveAspectRatio', 'none'); seal.setAttribute('class', 'pack-crimp pack-crimp--' + side); seal.setAttribute('aria-hidden', 'true');
      var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'), ridges = '';
      for (var x = 3; x < 180; x += 3) ridges += 'M' + x + ' 1V11';
      path.setAttribute('d', ridges); seal.appendChild(path); wrapper.appendChild(seal);
    });
    node('div', 'pack-wrapper__grain', wrapper);
    node('div', 'pack-wrapper__noise', wrapper);
    var traces = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); traces.setAttribute('class', 'pack-traces'); traces.setAttribute('viewBox', '0 0 180 266'); traces.setAttribute('aria-hidden', 'true');
    var circuit = root.document.createElementNS('http://www.w3.org/2000/svg', 'path');
    circuit.setAttribute('d', 'M14 40H38V65H65M166 54H142V79H114M13 211H40V178H57V149M167 224H134V190H116V152M17 72V108H35V132M163 94V128H146V149M62 234V216H81V195M118 238V222H102V196'); traces.appendChild(circuit); wrapper.appendChild(traces);
    node('div', 'pack-sweep', wrapper); node('div', 'pack-shine', wrapper);
    return wrapper;
  }
  function print(parent, pack) {
    var mark = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); mark.setAttribute('class', 'pack-brand'); mark.setAttribute('viewBox', '0 0 64 64'); mark.setAttribute('aria-hidden', 'true');
    var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M44 20C40 16 35 15 31 16C21 18 16 25 16 32C16 42 22 49 32 49C37 49 41 47 44 44'); mark.appendChild(path); parent.appendChild(mark);
    node('div', 'pack-label', parent, pack.name);
  }
  function unit(parent, back, pack) {
    var el = node('div', 'pack-unit' + (back ? ' pack-unit--back' : ''), parent);
    el.setAttribute('aria-hidden', 'true'); el.dataset.material = pack.design.material; el.dataset.wrapper = pack.design.wrapper;
    var shadow = node('div', 'pack-ground-shadow', el);
    var pose = node('div', 'pack-pose', el); node('div', 'pack-reflection', pose);
    var glass = node('div', 'pack-body glass', pose);
    var fluid = node('div', 'pack-fluid', glass); node('div', 'pack-fluid__body', fluid); node('div', 'pack-meniscus', fluid);
    var specks = [], random = C.art.random(C.config.menuMotion.speckCount);
    for (var i = 0; i < C.config.menuMotion.speckCount; i++) {
      var speck = node('i', 'pack-speck', fluid), inset = C.config.menuMotion.speckInsetPercent;
      speck.style.left = (inset + random() * (100 - inset * 2)) + '%'; speck.style.top = (inset + random() * (100 - inset * 2)) + '%';
      specks.push({ el: speck, phase: random() * Math.PI * 2 });
    }
    var wrapper = texture(glass); print(glass, pack); node('div', 'pack-arrival-sweep', glass);
    return { el: el, pose: pose, shadow: shadow, glass: glass, wrapper: wrapper, fluid: fluid, specks: specks };
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
