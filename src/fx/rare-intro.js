(function (C, root) {
  'use strict';
  var TAU = Math.PI * 2, warmed = null;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function mix(a, b, p) { return a + (b - a) * p; }
  function rgba(c, a) { return C.fxColor.rgba(c, a); }
  function tone(c) { return C.fxColor.tone(c); }
  function random() { var s = 1736149; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  // A separate material keeps Rare's sky photography distinct from Super Rare's seal.
  // Its two seamless sky atlases are baked once, then moved by the shared film clock.
  C.rareIntro = { create: function () {
    var material = null, materialKey = '', glows = Object.create(null), frozen = null;
    function sky(quality) {
      var key = C.settings.get('rarityColor') + ':' + quality;
      if (material && materialKey === key) return material;
      if (warmed && warmed.key === key) { material = warmed.material; materialKey = key; frozen = null; warmed = null; return material; }
      var width = quality === 'high' || quality === 'very-high' ? 768 : 512, height = width / 2;
      var rng = random(), grids = [8, 16, 32, 64, 128].map(function (n) {
        var a = new Float32Array(n * n); for (var i = 0; i < a.length; i++) a[i] = rng(); return { n: n, a: a };
      });
      function noise(index, u, v) {
        var grid = grids[index], n = grid.n, x = ((u % 1 + 1) % 1) * n, y = ((v % 1 + 1) % 1) * n;
        var ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy), a = grid.a;
        return mix(mix(a[iy * n + ix], a[iy * n + (ix + 1) % n], fx), mix(a[((iy + 1) % n) * n + ix], a[((iy + 1) % n) * n + (ix + 1) % n], fx), fy);
      }
      function density(u, v) {
        var warp = noise(0, u, v) - .5;
        u += warp * .1; v += (noise(1, u, v) - .5) * .075;
        return noise(0, u, v) * .48 + noise(1, u, v) * .27 + noise(2, u, v) * .14 + noise(3, u, v) * .075 + noise(4, u, v) * .035;
      }
      var mist = root.document.createElement('canvas'), body = root.document.createElement('canvas');
      mist.width = body.width = width; mist.height = body.height = height;
      var q = mist.getContext('2d'), b = body.getContext('2d'), fog = q.createImageData(width, height), inside = b.createImageData(width, height);
      var blue = tone([31, 116, 219]), pale = tone([184, 231, 255]), deep = tone([13, 63, 135]);
      var field = new Float32Array(width * height);
      for (var fy = 0; fy < height; fy++) for (var fx = 0; fx < width; fx++) field[fy * width + fx] = density(fx / width, fy / height);
      var dx = Math.max(1, Math.round(width * .003)), dy = Math.max(1, Math.round(height * .012));
      for (var y = 0; y < height; y++) for (var x = 0; x < width; x++) {
        var v = y / height, n = field[y * width + x], shaped = smooth((n - .39) / .27);
        var rim = clamp((field[((y - dy + height) % height) * width + (x - dx + width) % width] - n) * 17 + .38);
        var light = clamp(shaped * .66 + rim * .42), fade = Math.pow(Math.sin(v * Math.PI), 1.6), i = (y * width + x) * 4;
        for (var c = 0; c < 3; c++) {
          fog.data[i + c] = mix(blue[c], pale[c], light);
          inside.data[i + c] = mix(deep[c], pale[c], clamp(.15 + shaped * .7 + rim * shaped * .3));
        }
        fog.data[i + 3] = Math.round(shaped * fade * 220); inside.data[i + 3] = 255;
      }
      q.putImageData(fog, 0, 0); b.putImageData(inside, 0, 0);
      material = { mist: mist, body: body }; materialKey = key; frozen = null; return material;
    }
    function bloom(q, x, y, r, c, alpha, aspect) {
      if (alpha <= 0 || r <= 0) return;
      var key = c.join(','), sprite = glows[key];
      if (!sprite) {
        sprite = root.document.createElement('canvas'); sprite.width = sprite.height = 128;
        var g = sprite.getContext('2d'), a = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        a.addColorStop(0, rgba(c, 1)); a.addColorStop(.12, rgba(c, .7)); a.addColorStop(.4, rgba(c, .17)); a.addColorStop(1, rgba(c, 0));
        g.fillStyle = a; g.fillRect(0, 0, 128, 128); glows[key] = sprite;
      }
      q.save(); q.globalAlpha *= alpha; q.drawImage(sprite, x - r, y - r * (aspect || 1), r * 2, r * 2 * (aspect || 1)); q.restore();
    }
    function path(q, r) {
      q.beginPath(); q.moveTo(0, -r);
      q.bezierCurveTo(r * .055, -r * .32, r * .12, -r * .12, r, 0);
      q.bezierCurveTo(r * .12, r * .12, r * .055, r * .32, 0, r);
      q.bezierCurveTo(-r * .055, r * .32, -r * .12, r * .12, -r, 0);
      q.bezierCurveTo(-r * .12, -r * .12, -r * .055, -r * .32, 0, -r); q.closePath();
    }
    function tiles(q, atlas, left, top, width, height, travel) {
      var offset = ((travel % 1 + 1) % 1) * width;
      for (var j = -1; j <= 1; j++) q.drawImage(atlas, left + j * width - offset, top, width, height);
    }
    function surface(q, r, travel, charge, quality) {
      var atlas = sky(quality), light = tone([211, 246, 255]);
      q.save(); path(q, r); q.clip();
      tiles(q, atlas.body, -r, -r, r * 2, r * 2, travel);
      q.globalCompositeOperation = 'screen'; q.globalAlpha *= .55;
      tiles(q, atlas.mist, -r, -r * .75, r * 2, r * 1.6, travel * .68 + .17);
      q.restore();
      q.save(); path(q, r); q.clip();
      var illumination = q.createRadialGradient(0, 0, r * .025, 0, 0, r * .8);
      illumination.addColorStop(0, rgba(light, .45 + .3 * charge)); illumination.addColorStop(.24, rgba(light, .12 + .25 * charge)); illumination.addColorStop(1, rgba(light, 0));
      q.globalCompositeOperation = 'screen'; q.fillStyle = illumination; q.fillRect(-r, -r, r * 2, r * 2); q.restore();
      // Four glass faces preserve moving clouds beneath a directional bevel.
      for (var arm = 0; arm < 4; arm++) {
        q.save(); q.rotate(arm * Math.PI / 2);
        q.beginPath(); q.moveTo(0, -r); q.lineTo(r * .12, -r * .12); q.lineTo(0, 0); q.closePath();
        var facet = q.createLinearGradient(0, -r, r * .2, 0);
        facet.addColorStop(0, rgba(light, .58)); facet.addColorStop(.55, rgba(light, arm % 2 ? .02 : .18)); facet.addColorStop(1, rgba(light, .32));
        q.fillStyle = facet; q.fill(); q.restore();
      }
      path(q, r); q.strokeStyle = rgba(light, .65 + .2 * charge); q.lineWidth = .8; q.stroke();
      q.beginPath(); q.moveTo(0, -r * .94); q.lineTo(0, r * .94); q.moveTo(-r * .94, 0); q.lineTo(r * .94, 0);
      q.strokeStyle = rgba(light, .22); q.lineWidth = .6; q.stroke();
      bloom(q, 0, 0, r * .46, light, .24 + .34 * charge);
      path(q, r * .09); q.fillStyle = rgba(light, .85); q.fill();
    }
    function cracks(q, r, amount) {
      if (!amount) return;
      q.save(); q.globalAlpha *= amount; path(q, r); q.clip();
      var light = tone([217, 248, 255]);
      for (var arm = 0; arm < 4; arm++) {
        q.save(); q.rotate(arm * Math.PI / 2);
        q.beginPath(); q.moveTo(-r * .14, -r * .36); q.lineTo(r * .04, -r * .29); q.lineTo(-r * .028, -r * .14); q.lineTo(r * .14, -r * .095);
        q.strokeStyle = rgba(light, .86); q.lineWidth = 1.2; q.stroke(); q.restore();
      }
      q.restore();
    }
    function fragments(q, r, p, travel, quality) {
      // Curved wedges tile exactly the original silhouette. Every fragment keeps
      // the frozen last cloud frame, avoiding a material jump at the break.
      var light = tone([211, 246, 255]);
      sky(quality);
      if (!frozen) {
        frozen = root.document.createElement('canvas'); frozen.width = frozen.height = quality === 'high' ? 512 : 384;
        var paint = frozen.getContext('2d'), fr = frozen.width / 2;
        paint.translate(fr, fr); paint.save(); path(paint, fr); paint.clip(); surface(paint, fr, travel, 1, quality); cracks(paint, fr, .7); paint.restore();
      }
      for (var arm = 0; arm < 4; arm++) for (var half = 0; half < 2; half++) for (var band = 0; band < 2; band++) {
        var side = half ? -1 : 1, angle = arm * Math.PI / 2;
        var progress = clamp((p - (arm % 2) * .035 - band * .025) / .92);
        var distance = r * (progress * .38 + progress * progress * 1.4) * (band ? .72 : 1) * [.84, 1.13, .95, 1.06][arm] * (half ? 1.08 : .94);
        q.save(); q.rotate(angle); q.translate(side * distance * .28, -distance);
        q.rotate(side * progress * (band ? .5 : .24) * (1 + arm * .08)); q.scale(1 - progress * .18, 1 - progress * .1);
        q.globalAlpha *= 1 - smooth((progress - .22) / .78);
        // Eight non-overlapping angular sectors, each split once across its arm.
        // The frozen alpha supplies the exact curved boundary of the original star.
        q.save(); q.beginPath(); q.moveTo(0, 0); q.lineTo(0, -r); q.lineTo(side * r, -r); q.closePath(); q.clip();
        q.beginPath(); q.rect(-r, band ? -r * .3 : -r, r * 2, band ? r * 1.3 : r * .7); q.clip();
        q.save(); q.rotate(-angle); q.drawImage(frozen, -r, -r, r * 2, r * 2); q.restore();
        q.beginPath(); q.moveTo(0, -r * .3); q.lineTo(side * r * .16, -r * .3);
        q.strokeStyle = rgba(light, .9); q.lineWidth = .9; q.stroke(); q.restore(); q.restore();
      }
    }
    function lightSides(q, w, h, level, wash) {
      var blue = tone([55, 157, 255]), pale = tone([152, 222, 255]);
      for (var side = 0; side < 2; side++) {
        var x = side ? w : 0, end = side ? w * .35 : w * .65, gradient = q.createLinearGradient(x, 0, end, 0);
        gradient.addColorStop(0, rgba(pale, .26 * level)); gradient.addColorStop(.18, rgba(blue, .19 * level)); gradient.addColorStop(1, rgba(blue, 0));
        q.fillStyle = gradient; q.fillRect(0, 0, w, h);
        q.save(); q.translate(x, h * .5); q.scale(1, 1.4);
        bloom(q, 0, 0, Math.min(w * .55, h * .8), pale, .3 * level); q.restore();
      }
      if (wash > 0) {
        var a = q.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) * .7);
        a.addColorStop(0, rgba(tone([220, 247, 255]), wash)); a.addColorStop(.48, rgba(tone([165, 221, 255]), wash)); a.addColorStop(1, rgba(tone([127, 203, 255]), wash));
        q.fillStyle = a; q.fillRect(0, 0, w, h);
      }
    }
    function paint(q, w, h, section, seconds, quality) {
      var id = section.id, p = section.p, min = Math.min(w, h), r = min * .255;
      var entrance = id === 'sideLight' ? smooth(p) : 1;
      var charge = id === 'timelapse' ? p : id === 'fracture' || id === 'wash' ? 1 : 0;
      var travel = id === 'starRise' ? .025 * p : id === 'timelapse' ? .025 + .09 * p + 2.5 * Math.pow(p, 4) : 2.615;
      var breakup = id === 'fracture' ? p : id === 'wash' ? 1 : 0;
      var wash = id === 'fracture' ? .42 * smooth(p) : id === 'wash' ? mix(.42, 1, smooth(p)) : 0;
      var clouds = sky(quality), pale = tone([173, 227, 255]);
      lightSides(q, w, h, entrance, 0);
      // Sky layers share accelerating travel, with depth-dependent parallax.
      // No rotating discs: these are broad, illuminated clouds crossing the frame.
      if (id !== 'wash') {
        q.save(); q.globalAlpha = entrance * (.25 + charge * .13) * (1 - smooth(breakup));
        var cloudWidth = Math.max(w * 1.35, h * 1.8);
        tiles(q, clouds.mist, -cloudWidth * .25, -h * .32, cloudWidth, h * 1.16, travel * .2 + seconds * .007);
        q.globalAlpha *= .65;
        tiles(q, clouds.mist, -cloudWidth * .25, h * .34, cloudWidth, h * .8, travel * .32 + .5);
        q.restore();
      }
      var visible = id === 'sideLight' ? 0 : id === 'starRise' ? smooth(p) : 1;
      if (visible && id !== 'wash') {
        var radius = r * (id === 'starRise' ? mix(.7, 1, smooth(p)) : 1 + charge * .08);
        q.save(); q.translate(w / 2, h / 2); q.globalAlpha = visible;
        q.save(); q.globalCompositeOperation = 'screen'; bloom(q, 0, 0, radius * 2.4, pale, (.3 + charge * .45) * (1 - smooth(breakup))); q.restore();
        if (id === 'fracture') fragments(q, r * 1.08, p, 2.615, quality);
        else { surface(q, radius, travel, charge, quality); cracks(q, radius, smooth((charge - .79) / .21) * .7); }
        // A photographic flare builds with the pressure, then expands once.
        var flare = id === 'fracture' ? (1 - smooth(p)) : .15 + charge * charge * .6;
        bloom(q, 0, 0, min * (.7 + breakup * 1.5), pale, flare * .16, .018);
        bloom(q, 0, 0, radius * .9, pale, flare * .18, .05);
        if (id === 'fracture') bloom(q, 0, 0, min * mix(.13, 1.1, smooth(p)), pale, .65 * Math.sin(p * Math.PI));
        q.restore();
      }
      // Sparse backlit dust supplies scale; it never obscures the star silhouette.
      if (id !== 'wash') {
        q.save(); q.fillStyle = rgba(pale, .4 * entrance * (1 - breakup));
        for (var i = 0; i < (quality === 'high' ? 28 : 16); i++) {
          var x = ((i * .6180339 + seconds * .002) % 1) * w, y = ((i * .381966 + .19) % 1) * h;
          q.globalAlpha = .3 + (i % 5) * .13; q.beginPath(); q.arc(x, y, i % 7 ? .65 : 1.1, 0, TAU); q.fill();
        }
        q.restore();
      }
      lightSides(q, w, h, 0, wash);
    }
    return { paint: paint, prepare: sky, stop: function () { material = null; materialKey = ''; frozen = null; warmed = null; glows = Object.create(null); } };
  } };
  C.rareIntro.warmup = function () {
    var quality = C.settings.get('cinematicQuality');
    if (C.cutscenes.mode() === 'light' || quality === 'low') { warmed = null; return; }
    var key = C.settings.get('rarityColor') + ':' + quality;
    if (warmed && warmed.key === key) return;
    var painter = C.rareIntro.create(); warmed = { key: key, material: painter.prepare(quality) };
  };
})(window.Cardable, window);
