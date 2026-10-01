(function (C, root) {
  'use strict';
  function node(tag, className, parent, text) {
    var el = root.document.createElement(tag); el.className = className;
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  function svg(className, parent, viewBox, paths) {
    var el = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('class', className); el.setAttribute('viewBox', viewBox); el.setAttribute('aria-hidden', 'true');
    paths.forEach(function (d, index) {
      if (className === 'pack-brand') {
        ['shadow', 'highlight'].forEach(function (side) {
          var relief = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'); relief.setAttribute('d', d);
          relief.setAttribute('class', 'pack-emboss-' + side); if (!index) relief.setAttribute('stroke-width', '4'); el.appendChild(relief);
        });
      }
      var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d);
      if (className === 'pack-brand' && !index) path.setAttribute('stroke-width', '4'); el.appendChild(path);
    });
    if (className.indexOf('pack-crimp') === 0) {
      var ridge = root.document.createElementNS('http://www.w3.org/2000/svg', 'path'); ridge.setAttribute('d', paths[0]); ridge.setAttribute('transform', 'translate(.9 0)'); ridge.setAttribute('stroke', '#98989a'); ridge.setAttribute('opacity', '.65'); el.appendChild(ridge);
    }
    parent.appendChild(el); return el;
  }
  function texture(parent) {
    var wrapper = node('div', 'pack-wrapper', parent);
    node('div', 'pack-metal', wrapper); node('div', 'pack-film', wrapper); node('div', 'pack-folds', wrapper);
    node('div', 'pack-seam pack-seam--left', wrapper); node('div', 'pack-seam pack-seam--right', wrapper);
    ['top', 'bottom'].forEach(function (side) {
      var ridges = '';
      for (var x = 2; x < 180; x += 3) ridges += 'M' + x + ' 1V15';
      svg('pack-crimp pack-crimp--' + side, wrapper, '0 0 180 16', [ridges, 'M0 14H180']);
    });
    svg('pack-traces', wrapper, '0 0 180 266', ['M14 40H38V65H65M166 54H142V79H114M13 211H40V178H57V149M167 224H134V190H116V152M17 72V108H35V132M163 94V128H146V149M62 234V216H81V195M118 238V222H102V196']);
    node('div', 'pack-sweep', wrapper); node('div', 'pack-shine', wrapper);
    return wrapper;
  }
  function print(parent, pack) {
    var design = pack.design || {}, printLayer = node('div', 'pack-print', parent);
    node('div', 'pack-wordmark', printLayer, C.config.gameName);
    node('div', 'pack-edition', printLayer, design.subtitle || 'Collectible graphics series');
    node('div', 'pack-label', printLayer, pack.name);
    var graphic = node('div', 'pack-graphic', printLayer); graphic.dataset.graphic = design.graphic || 'die-ring';
    var motif = C.data.packGraphics[graphic.dataset.graphic];
    if (motif) svg('pack-brand', graphic, motif.viewBox, motif.paths);
    node('div', 'pack-graphic-caption', printLayer, 'GRAPHICS / ARCHIVE');
    var pool = C.data.generations.map(function (g) { return String(g.order); }).join(' / ');
    node('div', 'pack-pool', printLayer, 'GENERATION POOL  ' + pool);
    node('div', 'pack-count', printLayer, pack.cardsPerPack + ' GPU ' + (pack.cardsPerPack === 1 ? 'CARD' : 'CARDS'));
    node('div', 'pack-security', printLayer, design.security || 'CBL / SEALED');
    node('div', 'pack-series', printLayer, 'SERIES ' + (design.series || '01') + '   /   ' + (design.batch || pack.id.toUpperCase()));
    node('div', 'pack-microprint', printLayer, design.microprint || 'Digital sealed pack');
    node('div', 'pack-open-mark', printLayer, '↑  OPEN / SEAL');
    return printLayer;
  }
  function unit(parent, back, pack) {
    var el = node('div', 'pack-unit' + (back ? ' pack-unit--back' : ''), parent);
    el.setAttribute('aria-hidden', 'true'); el.dataset.material = pack.design.material; el.dataset.wrapper = pack.design.wrapper;
    var shadow = node('div', 'pack-ground-shadow', el);
    var pose = node('div', 'pack-pose', el); node('div', 'pack-reflection', pose); node('div', 'pack-thickness', pose);
    var glass = node('div', 'pack-body', pose);
    node('div', 'pack-internal-cards', glass);
    var wrapper = texture(glass);
    var fluid = node('div', 'pack-fluid', glass); node('div', 'pack-fluid__body', fluid); node('div', 'pack-meniscus', fluid);
    var specks = [], random = C.art.random(C.config.menuMotion.speckCount);
    for (var i = 0; i < C.config.menuMotion.speckCount; i++) {
      var speck = node('i', 'pack-speck', fluid), inset = C.config.menuMotion.speckInsetPercent;
      speck.style.left = (inset + random() * (100 - inset * 2)) + '%'; speck.style.top = (inset + random() * (100 - inset * 2)) + '%';
      specks.push({ el: speck, phase: random() * Math.PI * 2 });
    }
    print(glass, pack); node('div', 'pack-arrival-sweep', glass);
    // A faint second transmitted image lives only beneath the liquid boundary.
    // It shifts relative to the etched print, giving the laminate optical depth.
    var transmitted = print(glass, pack); transmitted.classList.add('pack-print--transmitted');
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
