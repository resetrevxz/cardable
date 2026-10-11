(function (C, root) {
  'use strict';
  function node(tag, className, parent, text) {
    var el = root.document.createElement(tag); el.className = className;
    if (text != null) el.textContent = text;
    if (parent) C.viewport.parent(parent).appendChild(el);
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
  function solid(pack) { return !!(C.packFaces && C.packFaces.has(pack)); }

  // The pack silhouette, in percent of width/height. The same outline cuts the faces
  // (--wrapper-shape in pack.css) and extrudes into the edge strips below.
  var OUTLINE = [[0,0],[100,0],[100,6],[98,9],[96,18],[97,77],[98,90],[100,94],[100,100],[0,100],[0,94],[2,90],[3,77],[4,18],[2,9],[0,6]];
  function edges(parent) {
    var ring = node('div', 'pack-edges', parent);
    OUTLINE.forEach(function (a, i) {
      var b = OUTLINE[(i + 1) % OUTLINE.length], dx = b[0] - a[0], dy = (b[1] - a[1]) * 1.48;
      var length = Math.sqrt(dx * dx + dy * dy); if (length < .01) return;
      var angle = Math.atan2(dy, dx) * 180 / Math.PI, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      // Outward normal against the top-left lamp: left and top edges catch light, right and bottom fall away.
      var nx = dy / length, ny = -dx / length, lit = Math.max(0, Math.min(1, .5 + (-nx * .62 - ny * .78) * .5));
      var strip = node('i', 'pack-edge', ring);
      strip.style.setProperty('--edge-k', lit.toFixed(2));
      strip.style.width = 'calc(var(--u) * ' + length.toFixed(3) + ')';
      strip.style.height = 'calc(var(--pack-depth) * 2)';
      strip.style.left = 'calc(var(--u) * ' + (mx - length / 2).toFixed(3) + ')';
      strip.style.top = 'calc(var(--u) * ' + (my * 1.48).toFixed(3) + ' - var(--pack-depth))';
      strip.style.transform = 'rotateZ(' + angle.toFixed(2) + 'deg) rotateX(90deg)';
    });
    return ring;
  }

  function fillWrapper(wrapper, pack) {
    if (wrapper._packFace) wrapper._packFace.dead = true;
    wrapper.replaceChildren(); wrapper._packFace = null;
    if (solid(pack)) { wrapper.classList.add('pack-face-root'); C.packFaces.build(wrapper, pack, false); return wrapper; }
    wrapper.classList.remove('pack-face-root');
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
  function texture(parent, pack) { return fillWrapper(node('div', 'pack-wrapper', parent), pack); }

  function gloss(layer) {
    var el = node('div', 'pack-gloss', layer); el.setAttribute('aria-hidden', 'true');
    ['env', 'aniso', 'spec', 'edge'].forEach(function (name) { node('i', 'pack-gloss__' + name, el); });
    return el;
  }
  function print(parent, pack, rear) {
    var design = pack.design || {}, printLayer = node('div', 'pack-print', parent);
    if (solid(pack)) {
      printLayer.classList.add('pack-print--face');
      C.packFaces.spec(pack).print(printLayer, pack, !!rear);
      gloss(printLayer);
      return printLayer;
    }
    node('div', 'pack-wordmark', printLayer, C.config.gameName);
    node('div', 'pack-edition', printLayer, design.subtitle || 'Collectible graphics series');
    node('div', 'pack-label', printLayer, pack.name);
    var graphic = node('div', 'pack-graphic', printLayer); graphic.dataset.graphic = design.graphic || 'die-ring';
    var motif = C.data.packGraphics[graphic.dataset.graphic];
    if (design.companyLogo) {
      var logo = node('img', 'pack-company-logo', graphic);
      logo.src = design.companyLogo; logo.alt = design.companyName + ' logo'; logo.draggable = false;
    } else if (motif) svg('pack-brand', graphic, motif.viewBox, motif.paths);
    node('div', 'pack-graphic-caption', printLayer, pack.tagline || 'GRAPHICS / ARCHIVE');
    if (design.showGenerationPool !== false) {
      var pool = C.data.generations.map(function (g) { return String(g.order); }).join(' / ');
      node('div', 'pack-pool', printLayer, 'GENERATION POOL  ' + pool);
    }
    node('div', 'pack-security', printLayer, design.security || 'CBL / SEALED');
    node('div', 'pack-series', printLayer, 'SERIES ' + (design.series || '01') + '   /   ' + (design.batch || pack.id.toUpperCase()));
    if (design.microprint) node('div', 'pack-microprint', printLayer, design.microprint);
    node('div', 'pack-open-mark', printLayer, '↑  OPEN / SEAL');
    return printLayer;
  }

  // The printed back. Designed packs paint their own; every other pack gets a quiet
  // generic back in its own colours until it is given a dedicated one.
  function rearBody(parent, pack) {
    var body = node('div', 'pack-body pack-body--rear', parent);
    var wrapper = node('div', 'pack-wrapper-rear', body);
    if (solid(pack)) {
      wrapper.classList.add('pack-face-root'); C.packFaces.build(wrapper, pack, true);
      print(body, pack, true);
    } else {
      wrapper.classList.add('pack-rear-generic');
      node('div', 'pack-rear-seal', wrapper);
      node('div', 'pack-rear-crimp pack-rear-crimp--top', wrapper); node('div', 'pack-rear-crimp pack-rear-crimp--bottom', wrapper);
      var layer = node('div', 'pack-print pack-print--rear', body);
      node('div', 'pack-rear-wordmark', layer, C.config.gameName);
      node('div', 'pack-rear-name', layer, pack.name);
      var copy = node('div', 'pack-rear-copy', layer);
      node('span', '', copy, pack.tagline || 'One card per pack');
      node('span', '', copy, 'Series ' + ((pack.design && pack.design.series) || '01'));
      node('div', 'pack-rear-bars', layer);
      node('div', 'pack-rear-batch', layer, (pack.design && pack.design.batch) || pack.id.toUpperCase());
      gloss(layer);
    }
    var fluid = node('div', 'pack-fluid pack-fluid--rear', body); node('div', 'pack-fluid__body', fluid); node('div', 'pack-meniscus', fluid);
    return { body: body, fluid: fluid };
  }

  function unit(parent, back, pack) {
    var el = node('div', 'pack-unit' + (back ? ' pack-unit--back' : ''), parent);
    el.setAttribute('aria-hidden', 'true'); el.dataset.material = pack.design.material; el.dataset.wrapper = pack.design.wrapper;
    if (pack.design.face) el.dataset.face = pack.design.face;
    var shadow = node('div', 'pack-ground-shadow', el);
    var pose = node('div', 'pack-pose', el); node('div', 'pack-reflection', pose); node('div', 'pack-thickness', pose);
    edges(pose);
    var front = node('div', 'pack-face pack-face--front', pose);
    var glass = node('div', 'pack-body', front);
    node('div', 'pack-internal-cards', glass);
    var wrapper = texture(glass, pack);
    var fluid = node('div', 'pack-fluid', glass); node('div', 'pack-fluid__body', fluid); node('div', 'pack-meniscus', fluid);
    var specks = [], random = C.art.random(C.config.menuMotion.speckCount);
    for (var i = 0; i < C.config.menuMotion.speckCount; i++) {
      var speck = node('i', 'pack-speck', fluid), inset = C.config.menuMotion.speckInsetPercent;
      speck.style.left = (inset + random() * (100 - inset * 2)) + '%'; speck.style.top = (inset + random() * (100 - inset * 2)) + '%';
      specks.push({ el: speck, phase: random() * Math.PI * 2 });
    }
    print(glass, pack); node('div', 'pack-arrival-sweep', glass);
    if (!solid(pack)) {
      // A faint second transmitted image lives only beneath the liquid boundary.
      // It shifts relative to the etched print, giving the laminate optical depth.
      var transmitted = print(glass, pack); transmitted.classList.add('pack-print--transmitted');
    }
    C.packSkins.apply(el, pack, 'idle');
    el.dataset.pack = pack.id;
    var item = { el: el, pose: pose, shadow: shadow, glass: glass, wrapper: wrapper, fluid: fluid, specks: specks, faceFront: front, faceRear: null, rearFluid: null, rearBuilt: false, pack: pack };
    // The back is built the first time it can be seen (a flip, or an opening that starts turned over).
    item.ensureRear = function () {
      if (item.rearBuilt) return item;
      item.rearBuilt = true;
      item.faceRear = node('div', 'pack-face pack-face--rear', pose);
      var built = rearBody(item.faceRear, item.pack);
      item.rearFluid = built.fluid; item.rearFluid.style.transform = item.fluid.style.transform;
      if (C.packFaces) C.packFaces.repaint(item.faceRear);
      return item;
    };
    item.resetRear = function () {
      if (!item.rearBuilt) return;
      item.rearBuilt = false; if (item.faceRear) item.faceRear.remove(); item.faceRear = null; item.rearFluid = null;
    };
    el._packUnit = item;
    return item;
  }
  C.packMarkup = {
    node: node, unit: unit, edges: edges,
    setPack: function(el, pack, mode) {
      el.dataset.pack = pack.id; el.dataset.material = pack.design.material; el.dataset.wrapper = pack.design.wrapper;
      if (pack.design.face) el.dataset.face = pack.design.face; else delete el.dataset.face;
      if (el._packUnit) { el._packUnit.pack = pack; el._packUnit.resetRear(); }
      el.querySelectorAll('.pack-skin-layer,.pack-facets,.pack-clearcoat,.pack-gloss-sweep').forEach(function(layer) { layer.remove(); });
      el.querySelectorAll('.pack-wrapper').forEach(function(wrapper) { fillWrapper(wrapper, pack); });
      el.querySelectorAll('.pack-print:not(.pack-print--rear)').forEach(function(old) {
        var transmitted = old.classList.contains('pack-print--transmitted');
        if (transmitted && solid(pack)) { old.remove(); return; }
        var next = print(old.parentNode, pack);
        if (transmitted) next.classList.add('pack-print--transmitted');
        old.replaceWith(next);
      });
      if (!solid(pack) && !el.querySelector('.pack-print--transmitted') && el.classList.contains('pack-unit')) {
        var glass = el.querySelector('.pack-face--front .pack-body');
        if (glass) { var again = print(glass, pack); again.classList.add('pack-print--transmitted'); }
      }
      C.packSkins.apply(el, pack, mode || 'idle');
      if (C.packFaces) C.packFaces.repaint(el);
    },
    foil: function (parent, pack) {
      var el = node('div', 'opening-foil', parent);
      el.dataset.material = pack.design.material; el.dataset.wrapper = pack.design.wrapper;
      if (pack.design.face) el.dataset.face = pack.design.face;
      texture(el, pack); node('div', 'opening-silhouette', el); print(el, pack);
      C.packSkins.apply(el, pack, 'wrapper'); el.dataset.pack = pack.id;
      return el;
    }
  };
  if (C.events) C.events.on('layout:resize', function () {
    root.document.querySelectorAll('.pack-unit,.opening-foil').forEach(function (el) { if (C.packFaces) C.packFaces.repaint(el); });
  });
})(window.Cardable, window);
