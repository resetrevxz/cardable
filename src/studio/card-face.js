(function (C, root) {
  'use strict';
  var mark = C.cutsceneCardBack.markPath;
  function canvas(w, h) { var el = root.document.createElement('canvas'); el.width = w; el.height = h; return el; }
  function round(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function text(g, value, x, y, size, family, color, weight) { g.fillStyle = color || '#F5F5F7'; g.font = (weight || 400) + ' ' + size + 'px "' + (family || 'Inter') + '"'; g.fillText(value, x, y); }
  function icon(g, kind, x, y, size) { var paths = { brand: 'M19 6a9 9 0 1 0 0 12M17 9a5 5 0 1 0 0 6M10 10h4v4h-4z', memory: 'M4 6h16v11H4zM7 9h3v4H7zM14 9h3v4h-3zM7 17v3m3-3v3m4-3v3m3-3v3', chip: 'M6 6h12v12H6zM9 9h6v6H9zM9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3', clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l4 2', bus: 'M4 4h6v6H4zM14 14h6v6h-6zM7 10v7h7M14 7h6m-3-3v6', power: 'M13 2 5 13h6l-1 9 9-13h-6z' }; g.save(); g.translate(x, y); g.scale(size / 24, size / 24); g.lineWidth = 1.35; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#B7B8BE'; g.stroke(new root.Path2D(paths[kind] || paths.chip)); g.restore(); }
  function wrapped(g, value, x, y, width, size, maxLines, family) {
    g.font = '600 ' + size + 'px "' + (family || 'Inter') + '"'; var words = String(value).split(/\s+/), line = '', lines = [];
    words.forEach(function (word) { var next = line ? line + ' ' + word : word; if (g.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next; }); lines.push(line);
    lines.slice(0, maxLines).forEach(function (value, i) { if (i === maxLines - 1 && lines.length > maxLines) value += '…'; g.fillText(value, x, y + i * size * 1.22); }); return Math.min(lines.length, maxLines) * size * 1.22;
  }
  function cover(g, image, x, y, w, h) { var scale = Math.max(w / image.width, h / image.height), sw = w / scale, sh = h / scale; g.drawImage(image, (image.width - sw) / 2, (image.height - sh) * 0.46, sw, sh, x, y, w, h); }
  async function proceduralImage(card, origin) {
    // Rasterize only the game's original procedural art, never a DOM card.
    var original = origin && origin.querySelector('.card__art-window svg'), temporary = null;
    if (!original) {
      var record = card;
      if (card.art.kind === 'image') { var seed = String(card.id).split('').reduce(function (a, ch) { return (a * 31 + ch.charCodeAt(0)) >>> 0; }, 0); record = Object.assign({}, card, { art: { kind: 'procedural', motif: 'fan', seed: seed || 1 } }); }
      original = C.art.render(record); temporary = origin ? origin.cloneNode(false) : root.document.createElement('div'); temporary.style.position = 'fixed'; temporary.style.visibility = 'hidden'; temporary.style.pointerEvents = 'none'; temporary.appendChild(original); root.document.body.appendChild(temporary);
    }
    try { var copy = original.cloneNode(true), nodes = [original].concat(Array.from(original.querySelectorAll('*'))), copies = [copy].concat(Array.from(copy.querySelectorAll('*'))); nodes.forEach(function (el, index) { var style = root.getComputedStyle(el); ['fill', 'stroke', 'stroke-width', 'stroke-opacity', 'fill-opacity', 'opacity', 'stroke-linecap', 'stroke-linejoin'].forEach(function (key) { copies[index].style.setProperty(key, style.getPropertyValue(key)); }); });
      var box = original.viewBox.baseVal; copy.setAttribute('width', box.width); copy.setAttribute('height', box.height); var image = new root.Image(); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new root.XMLSerializer().serializeToString(copy)); await image.decode(); return image;
    } catch (_) { return null; } finally { if (temporary) temporary.remove(); }
  }
  function procedural(g, card, x, y, w, h) {
    var seed = card.art.seed || String(card.id).split('').reduce(function (a, ch) { return (a * 31 + ch.charCodeAt(0)) >>> 0; }, 17), random = C.art.random(seed);
    g.save(); g.translate(x, y); g.scale(w / 400, h / 560); g.fillStyle = '#080A0D'; g.fillRect(0, 0, 400, 560); g.strokeStyle = '#596B74'; g.lineWidth = 0.8;
    for (var i = 0; i < 36; i++) { var tx = random() * 400, ty = random() * 560; g.globalAlpha = 0.2 + random() * 0.4; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx * 0.6 + 80, ty); g.lineTo(tx * 0.6 + 80, 270); g.stroke(); } g.globalAlpha = 1;
    g.translate(200, 245); g.rotate(-Math.PI / 10); g.scale(1.35, 1.35); g.fillStyle = '#292F34'; round(g, -110, -84, 220, 156, 11); g.fill(); g.strokeStyle = '#68737B';
    for (var f = 0; f < 18; f++) { g.beginPath(); g.moveTo(-99 + f * 11.5, -71); g.lineTo(-99 + f * 11.5, 59); g.stroke(); }
    if (card.art.motif === 'die') { g.fillStyle = '#080D10'; g.fillRect(-61, -57, 122, 108); g.fillStyle = '#697981'; g.fillRect(-46, -43, 92, 79); }
    else if (card.art.motif === 'vapor') { g.fillStyle = '#56656D'; round(g, -82, -58, 164, 107, 8); g.fill(); g.strokeStyle = '#B3B6AD'; g.lineWidth = 3; for (var p = 0; p < 6; p++) { g.beginPath(); g.moveTo(-74, -43 + p * 14); g.lineTo(70, -43 + p * 14); g.stroke(); } }
    else [-53, 53].forEach(function (cx) { g.save(); g.translate(cx, -8); g.fillStyle = '#0A0E12'; g.beginPath(); g.arc(0, 0, 47, 0, Math.PI * 2); g.fill(); g.fillStyle = '#758088'; for (var b = 0; b < 9; b++) { g.rotate(Math.PI * 2 / 9); g.beginPath(); g.moveTo(4, -7); g.bezierCurveTo(14, -25, 37, -27, 39, -17); g.bezierCurveTo(27, -17, 23, -9, 15, 2); g.closePath(); g.fill(); } g.fillStyle = '#BBC1C2'; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill(); g.restore(); });
    g.restore();
  }
  function finish(g, card, context, styles) {
    var definition = C.finishes.registry[C.rarity(card.rarity).finish], hook = definition.studio;
    if (hook && hook.paint) { hook.paint(g, 0, context); return; }
    var surface = context.origin && context.origin.querySelector('.card__face--front .finish-surface'), colors = surface ? root.getComputedStyle(surface).backgroundImage.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi) : null;
    var declared = hook && hook.palette || definition.palette, accent = styles.getPropertyValue('--border-accent').trim() || '#B9BDC3';
    colors = declared || colors || [accent, '#17191E']; var gradient = g.createLinearGradient(0, 0, 400, 560); colors.slice(0, 8).forEach(function (color, i, values) { gradient.addColorStop(i / Math.max(1, values.length - 1), color); }); g.fillStyle = gradient; g.fillRect(0, 0, 400, 560);
    // Exposed finish painters are read-only and receive a static local target.
    if (definition.drawBackground) definition.drawBackground({ g: g, width: 400, height: 560 }, 0, context.instance.serial, { found: true, profile: C.cutscenes.profile(), static: true });
  }
  function back(g, instance) {
    var gradient = g.createLinearGradient(0, 0, 400, 560); gradient.addColorStop(0, '#282B30'); gradient.addColorStop(0.5, '#101216'); gradient.addColorStop(1, '#282B30'); g.fillStyle = gradient; g.fillRect(0, 0, 400, 560);
    g.fillStyle = '#FFFFFF'; g.globalAlpha = 0.065; for (var y = 12; y < 560; y += 9) for (var x = 12; x < 400; x += 9) { g.beginPath(); g.arc(x, y, 0.65, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
    g.save(); g.translate(144, 193); g.scale(1.75, 1.75); var path = new root.Path2D(mark); g.strokeStyle = '#050608'; g.lineWidth = 6; g.translate(0, 0.6); g.stroke(path); g.translate(0, -0.6); g.strokeStyle = '#868C92'; g.lineWidth = 3.5; g.stroke(path); g.restore();
    g.textAlign = 'center'; text(g, 'cardable', 200, 331, 24, 'Inter', '#AFB4BB', 600); text(g, instance.serial, 200, 371, 10, 'JetBrains Mono', '#8E969F'); g.textAlign = 'left';
    g.strokeStyle = '#92979E'; g.lineWidth = 0.8; round(g, 8, 8, 384, 544, 14); g.stroke();
  }
  function plate(g, card, instance, rarity) {
    var gradient = g.createLinearGradient(25, 364, 380, 550); gradient.addColorStop(0, '#323339'); gradient.addColorStop(0.6, '#101115'); gradient.addColorStop(1, '#282A30'); round(g, 21, 363, 358, 175, 12); g.fillStyle = gradient; g.fill(); g.strokeStyle = '#FFFFFF44'; g.lineWidth = 0.7; g.stroke();
    text(g, 'GRAPHICS PROCESSOR', 34, 383, 7.6, 'JetBrains Mono', '#A3A4AA'); g.fillStyle = '#F5F5F7'; wrapped(g, card.name, 34, 409, 325, 21, 2);
    icon(g, 'memory', 34, 442, 26); text(g, C.cardSpecs.vram(card), 69, 463, 25, 'JetBrains Mono'); g.font = '400 25px "JetBrains Mono"'; var memoryWidth = g.measureText(C.cardSpecs.vram(card)).width; text(g, C.cardSpecs.memoryType(card), Math.min(265, 79 + memoryWidth), 461, 10.2, 'JetBrains Mono', '#B7B8BE');
    g.strokeStyle = '#FFFFFF2B'; g.beginPath(); g.moveTo(34, 475); g.lineTo(365, 475); g.stroke();
    C.cardSpecs.frontRows(card).slice(0, 4).forEach(function (row, i) { var x = 34 + i % 2 * 168, y = 491 + Math.floor(i / 2) * 16; icon(g, C.cardSpecs.icon(row.key), x, y - 11, 13); text(g, row.value, x + 22, y, 10.6, 'JetBrains Mono', '#E8E9ED'); });
    text(g, 'CB / ' + String(rarity.tier).padStart(2, '0'), 34, 529, 8, 'JetBrains Mono', '#A5A8AE'); for (var i = 0; i < 12; i++) { g.fillStyle = i <= rarity.tier ? '#DFE2E6' : '#FFFFFF20'; g.fillRect(220 + i * 11.5, 521, 8, 4); }
  }
  function classic(g, card, instance, context) {
    var backSide = context.side === 'back'; g.strokeStyle = '#CFC8B4'; g.lineWidth = 34; round(g, 9, 9, 382, 542, 10); g.stroke(); g.strokeStyle = '#827C69'; g.lineWidth = 1.3; round(g, 24, 24, 352, 512, 5); g.stroke();
    [[13, 13], [387, 13], [13, 547], [387, 547]].forEach(function (p) { g.fillStyle = '#8A836F'; g.beginPath(); g.arc(p[0], p[1], 4.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#3A392F'; g.beginPath(); g.moveTo(p[0] - 2.5, p[1] + 1); g.lineTo(p[0] + 2.5, p[1] - 1); g.stroke(); }); text(g, 'CLASSIC', 176, 17, 7, 'JetBrains Mono', '#675F4F', 600);
    if (backSide || !context.scene.card.plate) return;
    g.fillStyle = '#080905'; g.fillRect(25, 366, 350, 169); g.strokeStyle = '#69604A'; g.strokeRect(25, 366, 350, 169); g.fillStyle = '#FFB000'; wrapped(g, card.name.toUpperCase(), 37, 389, 326, 19, 2, 'VT323');
    var specs = card.specs || {}, clock = specs.coreClockMhz || specs.gpuClockMhz || specs.boostMhz, rarity = C.rarity(card.rarity);
    [['VRAM', C.cardSpecs.vram(card)], ['CLK', clock == null ? '—' : clock + ' MHZ'], ['BUS', specs.busBits == null ? '—' : specs.busBits + ' BIT'], ['TIER', rarity.code]].forEach(function (pair, i) { text(g, pair[0] + ' ' + String(pair[1]).toUpperCase(), 37 + i % 2 * 165, 452 + Math.floor(i / 2) * 28, 18, 'VT323', '#FFB000'); }); text(g, '█', 37, 514, 18, 'VT323', '#FFB000');
    for (var i = 0; i < 12; i++) { g.fillStyle = i <= rarity.tier ? '#D83D27' : '#773F2D'; g.fillRect(45 + i * 22, 543, 16, 5); } text(g, rarity.code, 329, 549, 9, 'JetBrains Mono', '#625846', 600);
  }
  if (C.cardSkins.registry.classic) C.cardSkins.registry.classic.studio = { paint: classic };
  if (C.finishes.registry.ascendant && !C.finishes.registry.ascendant.studio) C.finishes.registry.ascendant.studio = { paint: function (g, time, context) { C.ascendantBackground.draw(g, 400, 560, 0, context.instance.serial); } };
  C.studioFace = {
    paint: async function (card, instance, scene, tier, origin, entry, alive) {
      alive = alive || function () { return true; };
      if (root.document.fonts) await root.document.fonts.ready;
      if (!alive()) return null;
      var image = await C.art.loadData(card), embedded = !!image; if (!alive()) return null;
      if (!image) image = await proceduralImage(card, origin); if (!alive()) return null;
      var artProfile={brightness:.5};if(image){var probe=canvas(24,24),pg=probe.getContext('2d',{willReadFrequently:true});try{pg.drawImage(image,0,0,24,24);var sample=pg.getImageData(0,0,24,24).data,total=0;for(var pi=0;pi<sample.length;pi+=4)total+=(sample[pi]*.213+sample[pi+1]*.715+sample[pi+2]*.072)/255;artProfile.brightness=total/576;}catch(_){/* A procedural fallback can use neutral adaptation. */}probe.width=probe.height=1;}
      var width = Math.floor(C.studioScenes.limits(tier).texture * 5 / 7), height = Math.round(width * 7 / 5), front = canvas(width, height), rear = canvas(width, height);
      var styles = root.getComputedStyle(origin || root.document.documentElement), rarity = C.rarity(card.rarity), generation = C.data.generations.find(function (g) { return g.id === card.generation; });
      var context = { card: card, instance: instance, scene: scene, origin: origin, side: 'front' };
      [front, rear].forEach(function (face, index) { var g = face.getContext('2d'); g.scale(width / 400, height / 560); round(g, 0, 0, 400, 560, 18); g.clip(); context.side = index ? 'back' : 'front';
        if (index) back(g, instance);
        else { finish(g, card, context, styles); g.save(); round(g, 11, 11, 378, 538, 14); g.clip(); if (image) cover(g, image, 11, 11, 378, 538); else procedural(g, card, 11, 11, 378, 538); g.restore();if(entry&&entry.studioReference==='gold-foil'){g.save();g.globalCompositeOperation='screen';g.globalAlpha=.22;var gold=g.createLinearGradient(11,11,389,549);gold.addColorStop(0,'#9B6823');gold.addColorStop(.45,'#FFEAB0');gold.addColorStop(.56,'#B78631');gold.addColorStop(1,'#E9BF61');g.fillStyle=gold;g.fillRect(11,11,378,538);g.restore();}var variant=C.variant(instance.variantId),coat=variant&&variant.studio;if(coat&&coat.paint){g.save();round(g,11,11,378,538,14);g.clip();coat.paint(g,0,context);g.restore();} var shade = g.createLinearGradient(0, 0, 0, 560); shade.addColorStop(0, '#000000EF'); shade.addColorStop(0.22, '#000000CB'); shade.addColorStop(0.4, '#00000000'); shade.addColorStop(0.65, '#0000000F'); shade.addColorStop(1, '#00000070'); g.fillStyle = shade; g.fillRect(11, 11, 378, 538);
          icon(g, 'brand', 29, 32, 26); text(g, 'cardable', 59, 51, 16.8, 'Inter', '#F5F5F7', 600); g.textAlign = 'right'; text(g, instance.serial, 371, 50, 9.8, 'JetBrains Mono', '#C8C9CE'); text(g, generation ? generation.name : card.generation, 371, 81, 9, 'JetBrains Mono', '#B7B8BE'); g.textAlign = 'left'; text(g, rarity.name + ' / ' + rarity.code, 29, 81, 10.4, 'JetBrains Mono', '#D9DBE0'); g.strokeStyle = '#FFFFFF30'; g.beginPath(); g.moveTo(29, 63); g.lineTo(371, 63); g.stroke(); if (scene.card.plate) plate(g, card, instance, rarity);
        }
        var skin = C.cardSkins.registry[instance.cardSkinId]; if (skin && skin.studio && skin.studio.paint) skin.studio.paint(g, card, instance, context);
      });
      var nw=tier==='very-high'?512:256,nh=tier==='very-high'?716:358,normal = canvas(nw, nh), ng = normal.getContext('2d', { willReadFrequently: true }); ng.drawImage(front, 0, 0, nw, nh); var pixels = ng.getImageData(0, 0, nw, nh), source = pixels.data.slice(), out = pixels.data;
      function luminance(i) { return (source[i] * 0.213 + source[i + 1] * 0.715 + source[i + 2] * 0.072) / 255; }
      for (var y = 0; y < nh; y++) for (var x = 0; x < nw; x++) { var at = (y * nw + x) * 4, dx = luminance((y * nw + Math.min(nw-1, x + 1)) * 4) - luminance((y * nw + Math.max(0, x - 1)) * 4), dy = luminance((Math.min(nh-1, y + 1) * nw + x) * 4) - luminance((Math.max(0, y - 1) * nw + x) * 4); out[at] = 128 - dx * 28; out[at + 1] = 128 + dy * 28; out[at + 2] = 255; out[at + 3] = y > nh*.648 ? 190 : 125; } ng.putImageData(pixels, 0, 0);
      var tags = canvas(1024, 88), tg = tags.getContext('2d'); var tagEntry = entry && entry.card ? entry : { card: card, rarity: rarity, variantId: instance.variantId, stackKey: C.stacks.key(card.id, instance.variantId), owned: true, isNew: false }; var labels = C.cardTags.derive(tagEntry, instance, 'compact').map(function (tag) { return tag.text || tag.label; }); var left = 12;
      tg.font = '500 19px "JetBrains Mono"'; labels.slice(0, 3).forEach(function (label) { var w = Math.min(430, tg.measureText(label).width + 28); round(tg, left, 18, w, 45, 22); tg.fillStyle = '#19191D'; tg.fill(); tg.strokeStyle = '#FFFFFF30'; tg.stroke(); tg.fillStyle = '#D8D8DC'; tg.fillText(label, left + 14, 47); left += w + 12; });
      return { artProfile:artProfile, front: front, back: rear, normal: normal, tags: tags, material: Object.assign(C.studioMaterials.info(card,instance),{plate:scene.card.plate,variant:entry&&entry.studioReference==='gold-foil'?201:C.studioMaterials.info(card,instance).variant}), source: embedded ? 'embedded' : 'procedural', width: width, height: height,
        destroy: function () { [front, rear, normal, tags].forEach(function (el) { el.width = el.height = 1; }); image = null; } };
    }
  };
})(window.Cardable, window);
