(function (C, root) {
  'use strict';
  var generators = new Map(), cache = new Map(), NS = 'http://www.w3.org/2000/svg';
  function random(seed) {
    var value = Number(seed) >>> 0;
    return function () { value += 0x6D2B79F5; var n = value; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  }
  function shape(tag, attrs) {
    var el = root.document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }
  function append(parent, tag, attrs) { var el = shape(tag, attrs); parent.appendChild(el); return el; }
  function procedural(card) {
    var portrait = C.rarity(card.rarity).frontDesign === 'full-art';
    var rng = random(card.art.seed), svg = shape('svg', { viewBox: portrait ? '0 0 400 560' : '0 0 400 280', role: 'img', 'aria-label': 'Original procedural GPU composition for ' + card.name });
    var background = append(svg, 'g', { class: 'gpu-art__board' });
    append(background, 'rect', { x: 0, y: 0, width: 400, height: portrait ? 560 : 280, rx: 12 });
    var traces = append(svg, 'g', { class: 'gpu-art__traces', fill: 'none' });
    for (var i = 0; i < 36; i += 1) {
      var startX = 15 + rng() * 370, startY = 16 + rng() * (portrait ? 520 : 248);
      var endX = 100 + rng() * 200, endY = 75 + rng() * 140, bend = startX + (endX - startX) * 0.4;
      append(traces, 'path', { d: 'M' + startX + ' ' + startY + 'H' + bend + 'V' + endY + 'H' + endX, opacity: 0.2 + rng() * 0.6 });
      append(traces, 'circle', { cx: startX, cy: startY, r: 1.6 });
    }
    var hardware = append(svg, 'g', { transform: portrait ? 'translate(200 245) rotate(-18) scale(1.35)' : 'translate(200 141) rotate(-12)', class: 'gpu-art__hardware' });
    append(hardware, 'rect', { x: -117, y: -83, width: 234, height: 166, rx: 14, class: 'gpu-art__shadow' });
    append(hardware, 'rect', { x: -110, y: -84, width: 220, height: 156, rx: 11, class: 'gpu-art__plate' });
    var fins = append(hardware, 'g', { class: 'gpu-art__fins' });
    for (var f = 0; f < 18; f += 1) append(fins, 'path', { d: 'M' + (-99 + f * 11.5) + ' -71V59' });
    if (card.art.motif === 'fan') {
      for (var fan = 0; fan < 2; fan += 1) {
        var wheel = append(hardware, 'g', { transform: 'translate(' + (fan ? 53 : -53) + ' -8)' });
        append(wheel, 'circle', { cx: 0, cy: 0, r: 47, class: 'gpu-art__fan-ring' });
        for (var blade = 0; blade < 9; blade += 1) append(wheel, 'path', { d: 'M4 -7C14 -25 37 -27 39 -17C27 -17 23 -9 15 2Z', transform: 'rotate(' + blade * 40 + ')', class: 'gpu-art__blade' });
        append(wheel, 'circle', { cx: 0, cy: 0, r: 10, class: 'gpu-art__die' });
      }
    } else if (card.art.motif === 'vapor') {
      append(hardware, 'rect', { x: -82, y: -58, width: 164, height: 107, rx: 8, class: 'gpu-art__die' });
      for (var pipe = 0; pipe < 6; pipe += 1) append(hardware, 'path', { d: 'M-74 ' + (-43 + pipe * 14) + 'H62Q76 ' + (-43 + pipe * 14) + ' 76 ' + (-29 + pipe * 14), class: 'gpu-art__pipe', fill: 'none' });
    } else {
      append(hardware, 'rect', { x: -61, y: -57, width: 122, height: 108, rx: 8, class: 'gpu-art__socket' });
      append(hardware, 'rect', { x: -46, y: -43, width: 92, height: 79, rx: 3, class: 'gpu-art__die' });
      var dieLines = append(hardware, 'g', { class: 'gpu-art__die-grid' });
      for (var d = 0; d < 8; d += 1) {
        append(dieLines, 'path', { d: 'M' + (-36 + d * 10) + ' -35V28' });
        append(dieLines, 'path', { d: 'M-36 ' + (-35 + d * 9) + 'H36' });
      }
    }
    [[-96, -70], [96, -70], [-96, 58], [96, 58]].forEach(function (p) {
      append(hardware, 'circle', { cx: p[0], cy: p[1], r: 3.5, class: 'gpu-art__screw' });
    });
    return svg;
  }
  generators.set('procedural', procedural);
  generators.set('image', function (card) {
    if (!/^assets\//.test(card.art.src)) throw new Error('Card art must use a local assets/ path');
    var image = root.document.createElement('img'); image.src = card.art.src; image.alt = card.name; return image;
  });
  C.art = {
    random: random,
    register: function (kind, generator) { generators.set(kind, generator); },
    render: function (card, options) {
      options = options || {};
      var generator = generators.get(card.art.kind);
      if (!generator) throw new Error('Unknown card art kind: ' + card.art.kind);
      if (card.art.kind === 'image') {
        var image = generator(card); image.decoding = 'async';
        if (options.thumbnail || C.settings.get('quality') === 'very-low') image.src = card.art.src.replace(/\.webp$/, '-thumb.webp');
        return image;
      }
      var key = JSON.stringify([card.art, card.rarity, options.thumbnail]);
      if (!cache.has(key)) {
        var art = generator(card);
        if (options.thumbnail) art.querySelectorAll('.gpu-art__traces,.gpu-art__die-grid').forEach(function (part) { part.remove(); });
        cache.set(key, art); if (cache.size > 96) cache.delete(cache.keys().next().value);
      }
      var copy = cache.get(key).cloneNode(true); copy.setAttribute('aria-label', card.name); return copy;
    }
  };
})(window.Cardable, window);
