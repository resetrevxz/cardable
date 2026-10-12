(function (C, root) {
  'use strict';
  // A material painter for the shared intro controller. No timer, pull RNG or DOM state.
  var TAU = Math.PI * 2;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function mix(a, b, p) { return a + (b - a) * p; }
  function rgba(c, a) { return 'rgba(' + c.join(',') + ',' + clamp(a) + ')'; }
  function mono(c) {
    if (C.config.rarityColorMode !== 'mono') return c;
    var l = Math.round(c[0] * .213 + c[1] * .715 + c[2] * .072); return [l, l, l];
  }
  function randomFor(seed) {
    var n = 2166136261, text = String(seed);
    for (var i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
    return function () { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  }
  var materials = Object.create(null), materialKeys = [];
  function material(palette) {
    var key = palette.base + ':' + palette.light + ':' + palette.dark;
    if (materials[key]) return materials[key];
    var size = C.config.rarityIntro.glassSize, canvas = root.document.createElement('canvas');
    canvas.width = canvas.height = size;
    var q = canvas.getContext('2d'), image = q.createImageData(size, size), random = randomFor('cardable-refractive-gel-v1');
    var shine = root.document.createElement('canvas'); shine.width = shine.height = size;
    var shineContext = shine.getContext('2d'), shineImage = shineContext.createImageData(size, size);
    var grid = new Float32Array(33 * 33);
    for (var i = 0; i < grid.length; i++) grid[i] = random();
    var facets = [];
    for (var f = 0; f < 24; f++) facets.push({ x: random() * 1.2 - .1, y: random() * 1.2 - .1, shade: random() });
    function noise(x, y) {
      x = (x % 32 + 32) % 32; y = (y % 32 + 32) % 32;
      var ix = Math.floor(x), iy = Math.floor(y), px = smooth(x - ix), py = smooth(y - iy);
      return mix(mix(grid[iy * 33 + ix], grid[iy * 33 + ix + 1], px), mix(grid[(iy + 1) * 33 + ix], grid[(iy + 1) * 33 + ix + 1], px), py);
    }
    // Broad refracted bands, smaller glass folds, and sharp caustics; baked only once.
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var u = x / size, v = y / size, broad = noise(u * 4.8, v * 4.2), fold = noise(u * 13, v * 11);
      var warp = u * 7.5 + .56 * Math.sin(v * 8 + broad * 4) + broad * 1.4;
      var band = .5 + .5 * Math.sin(warp * TAU), ridge = Math.pow(band, 20);
      var inner = .5 + .5 * Math.sin((warp + fold * .24) * TAU);
      var first = Infinity, second = Infinity, facet = facets[0], fx = u + (broad - .5) * .055, fy = v + (fold - .5) * .025;
      for (var cell = 0; cell < facets.length; cell++) {
        var site = facets[cell], dx = (fx - site.x) * 1.15, dy = (fy - site.y) * .8, distance = dx * dx + dy * dy;
        if (distance < first) { second = first; first = distance; facet = site; } else if (distance < second) second = distance;
      }
      var edge = 1 - smooth((second - first) / .004), face = facet.shade * .22 + (u - facet.x) * .3 - (v - facet.y) * .4;
      var height = clamp(.05 + .38 * broad + .2 * inner + .12 * fold + face), light = clamp(ridge * .7 + edge * .27 + Math.pow(fold, 5) * .2);
      var at = (y * size + x) * 4;
      for (var ch = 0; ch < 3; ch++) {
        image.data[at + ch] = mix(mix(palette.dark[ch], palette.base[ch], height), palette.light[ch], light);
        shineImage.data[at + ch] = palette.light[ch];
      }
      image.data[at + 3] = 255;
      shineImage.data[at + 3] = clamp(ridge * .4 + edge * .2) * 255;
    }
    q.putImageData(image, 0, 0); shineContext.putImageData(shineImage, 0, 0);
    materials[key] = { body: canvas, shine: shine }; materialKeys.push(key);
    // Color and Mono for three palettes, with one spare. No unbounded instance cache.
    if (materialKeys.length > 7) delete materials[materialKeys.shift()];
    return materials[key];
  }
  function blendedMaterial(palettes) {
    var a=palettes[0],b=palettes[1],key='woven:'+a.base+':'+b.base+':'+a.light+':'+b.light;
    if(materials[key])return materials[key];
    var size=C.config.rarityIntro.glassSize,body=root.document.createElement('canvas'),shine=root.document.createElement('canvas');
    body.width=body.height=shine.width=shine.height=size;
    var q=body.getContext('2d'),sq=shine.getContext('2d'),image=q.createImageData(size,size),highlights=sq.createImageData(size,size),random=randomFor('sapphire-gold-glass-v1');
    var grid=new Float32Array(33*33);for(var k=0;k<grid.length;k++)grid[k]=random();
    function noise(x,y){
      x=(x%32+32)%32;y=(y%32+32)%32;var ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
      return mix(mix(grid[iy*33+ix],grid[iy*33+ix+1],fx),mix(grid[(iy+1)*33+ix],grid[(iy+1)*33+ix+1],fx),fy);
    }
    var pearl=mono([172,190,206]);
    for(var y=0;y<size;y++)for(var x=0;x<size;x++){
      var u=x/size,v=y/size,broad=noise(u*4.2,v*4.6),fine=noise(u*12,v*11);
      var flow=u*1.85-v*1.12+Math.sin(v*7.2+u*3)*.27+(broad-.5)*.17;
      var weight=smooth((.5+.5*Math.sin(flow*TAU)-.1)/.8);
      var fold=u*2.1+v*1.5+Math.sin(v*5.3+broad*2)*.38+(broad-.5)*.36;
      var ridge=Math.pow(.5+.5*Math.sin(fold*TAU),18),face=.43+broad*.3+fine*.09;
      var light=clamp(ridge*.72+Math.pow(fine,6)*.25),at=(y*size+x)*4;
      for(var ch=0;ch<3;ch++){
        var base=weight<.5?mix(a.base[ch],pearl[ch],smooth(weight*2)):mix(pearl[ch],b.base[ch],smooth((weight-.5)*2));
        var dark=mix(a.dark[ch],b.dark[ch],weight),bright=mix(a.light[ch],b.light[ch],weight);
        image.data[at+ch]=mix(mix(dark,base,face),bright,light);highlights.data[at+ch]=bright;
      }
      image.data[at+3]=255;highlights.data[at+3]=Math.round((ridge*.45+Math.pow(fine,6)*.12)*255);
    }
    q.putImageData(image,0,0);sq.putImageData(highlights,0,0);materials[key]={body:body,shine:shine};materialKeys.push(key);
    if(materialKeys.length>7)delete materials[materialKeys.shift()];return materials[key];
  }
  C.refractionIntro = { create: function () {
    var spec, panes = [], rays = [], glints = [], palettes = [], atlas = [], preparedKey = '', glowSprites = Object.create(null);
    var surface = null, surfaceContext, surfaceKey = '', surfaceAt = -Infinity, blendPalettes=[];
    function start(next, seed) {
      spec = next; var random = randomFor(seed + ':glass'); panes = []; rays = []; glints = [];
      for (var i = 0; i < 7; i++) {
        var points = [], x = (i + .1 + random() * .8) / 7;
        for (var j = 0; j < 7; j++) points.push({ x: x + (random() - .5) * .055, y: j / 6 });
        panes.push({ points: points, bend: (random() - .5) * .026, phase: random() * TAU, shine: .4 + random() * .6 });
      }
      for (var k = 0; k < 24; k++) rays.push({ y: .04 + random() * .92, phase: random(), tilt: (random() - .5) * .19,
        width: .004 + random() * .009, length: .2 + random() * .42, white: k % 3 === 0, direction: k % 4 === 0 ? -1 : 1 });
      // The first slow sweep is staged visibly; random offscreen rays cannot swallow ignition.
      rays[0] = { y: .62, phase: .15, tilt: -.075, width: .008, length: .48, white: true, direction: -1 };
      for (var s = 0; s < 7; s++) glints.push({ x: .08 + random() * .84, y: .08 + random() * .84, phase: random() * TAU, size: .008 + random() * .011 });
      // One deliberate large, elongated caustic sparkle echoes the reference's corner.
      glints[0] = { x: .77, y: .22, phase: .6, size: .036 };
      palettes = []; atlas = []; preparedKey = ''; surfaceKey = ''; surfaceAt = -Infinity;
    }
    function prepare() {
      var next = [{ base: mono(spec.color), accent: mono(spec.orbitColor), light: mono(spec.starColor), dark: mono(spec.background) }];
      if (spec.split || spec.blend) next.push({ base: mono(spec.secondColor), accent: mono(spec.secondAccent), light: mono(spec.secondLight), dark: mono(spec.secondaryBackground) });
      var key = next.map(function(p){return p.base+':'+p.light;}).join('|') + ':' + C.settings.get('cinematicQuality');
      if (preparedKey !== key) {
        preparedKey = key;
        palettes = next;
        atlas = C.settings.get('cinematicQuality') === 'very-low' ? [] : spec.blend ? [blendedMaterial(palettes)] : palettes.map(material);
        blendPalettes=[];
        if(spec.blend)for(var i=0;i<=16;i++){
          var p={};['base','accent','light','dark'].forEach(function(name){p[name]=palettes[0][name].map(function(v,ch){return Math.round(mix(v,palettes[1][name][ch],i/16));});});blendPalettes.push(p);
        }
      }
    }
    function glow(g, x, y, rx, ry, c, a) {
      if (a <= 0) return;
      var key = c.join(','), sprite = glowSprites[key];
      if (!sprite) {
        sprite = root.document.createElement('canvas'); sprite.width = sprite.height = 96;
        var q = sprite.getContext('2d'), grad = q.createRadialGradient(48, 48, 0, 48, 48, 48);
        grad.addColorStop(0, rgba(c, 1)); grad.addColorStop(.25, rgba(c, .5)); grad.addColorStop(1, rgba(c, 0));
        q.fillStyle = grad; q.fillRect(0, 0, 96, 96); glowSprites[key] = sprite;
        if (Object.keys(glowSprites).length > (spec.blend ? 40 : 8)) delete glowSprites[Object.keys(glowSprites)[0]];
      }
      g.globalAlpha = a; g.drawImage(sprite, x - rx, y - ry, rx * 2, ry * 2); g.globalAlpha = 1;
    }
    function seam(g, pane, w, h, t, offset) {
      var ps = pane.points, drift = Math.sin(t * .42 + pane.phase) * pane.bend;
      g.beginPath(); g.moveTo((ps[0].x + drift) * w + offset, -.04 * h);
      for (var i = 1; i < ps.length; i++) {
        var prev = ps[i - 1], p = ps[i], bend = Math.sin(t * .27 + pane.phase + i) * .008;
        g.bezierCurveTo((prev.x + drift + bend) * w + offset, (prev.y + .055) * h,
          (p.x + drift - bend) * w + offset, (p.y - .055) * h, (p.x + drift) * w + offset, p.y * h);
      }
    }
    function glass(g, w, h, t, p, strength, quiet) {
      g.globalAlpha = strength;
      if (atlas.length) {
        // Overscan gives texture movement without wrapping seams or repeated tiling.
        var driftX = quiet ? 0 : Math.sin(t * .17) * w * .018, driftY = quiet ? 0 : Math.cos(t * .13) * h * .025;
        g.drawImage(atlas[p].body, -w * .055 + driftX, -h * .055 + driftY, w * 1.11, h * 1.11);
        // Independent highlight advection through the same glass gives visible depth.
        g.globalAlpha = strength * (quiet ? .15 : .3);
        g.drawImage(atlas[p].shine, -w * .09 - driftX * 1.4, -h * .09 + driftY * 1.3, w * 1.18, h * 1.18);
      } else { g.fillStyle = rgba(palettes[p].base, .5); g.fillRect(0, 0, w, h); }
      g.globalAlpha = 1;
      var palette = palettes[p], lamp = quiet ? .62 : .48 + Math.sin(t * .32 + p * 1.4) * .16;
      var wash = g.createLinearGradient(0, 0, w, h);
      wash.addColorStop(0, rgba(palette.accent, .3 * strength)); wash.addColorStop(.42, rgba(palette.base, .08 * strength));
      wash.addColorStop(lamp, rgba(palette.light, .28 * strength)); wash.addColorStop(1, rgba(palette.dark, .45 * strength));
      g.fillStyle = wash; g.fillRect(0, 0, w, h);
      // Thin refracted seams and broad irregular folds keep the gel translucent.
      for (var i = 0; i < panes.length; i++) {
        var pane = panes[i]; seam(g, pane, w, h, t, 0); g.lineWidth = Math.max(1, w * .0016);
        g.strokeStyle = rgba(palette.dark, strength * .24); g.stroke();
        seam(g, pane, w, h, t, w * .0012); g.lineWidth = Math.max(.75, w * .0007);
        var edge = g.createLinearGradient(0, 0, 0, h);
        edge.addColorStop(0, rgba(palette.light, strength * .7 * pane.shine)); edge.addColorStop(.45, rgba(palette.accent, strength * .15));
        edge.addColorStop(.7, rgba(palette.light, strength * .5 * pane.shine)); edge.addColorStop(1, rgba(palette.light, 0));
        g.strokeStyle = edge; g.stroke();
        // Broad angular folds catch a moving light; no repeated outlined triangles.
        var point = pane.points[2 + i % 3], d = Math.sin(t * .42 + pane.phase) * pane.bend;
        g.beginPath(); g.moveTo((point.x + d) * w, point.y * h);
        g.lineTo((point.x + d + .07) * w, (point.y - .21) * h);
        g.lineTo((point.x + d + .16) * w, (point.y - .12) * h);
        g.lineTo((point.x + d + .13) * w, (point.y + .14) * h);
        g.lineTo((point.x + d + .025) * w, (point.y + .29) * h); g.closePath();
        var fold = g.createLinearGradient(point.x * w, point.y * h, (point.x + .14) * w, (point.y + .15) * h);
        fold.addColorStop(0, rgba(palette.dark, strength * .28)); fold.addColorStop(.3, rgba(palette.accent, strength * .05));
        fold.addColorStop(.8, rgba(palette.light, strength * .16)); fold.addColorStop(1, rgba(palette.dark, 0)); g.fillStyle = fold; g.fill();
      }
    }
    function sparkle(g, x, y, r, palette, a) {
      glow(g, x, y, r * 3, r * 5, palette.accent, a * .35);
      g.save(); g.translate(x, y); g.scale(.58, 1.55); g.beginPath(); g.moveTo(0, -r);
      g.quadraticCurveTo(r * .1, -r * .1, r, 0); g.quadraticCurveTo(r * .1, r * .1, 0, r);
      g.quadraticCurveTo(-r * .1, r * .1, -r, 0); g.quadraticCurveTo(-r * .1, -r * .1, 0, -r);
      g.closePath(); g.fillStyle = rgba(palette.light, a); g.fill(); g.restore();
    }
    function beam(g, ray, x, w, h, palette, a, t) {
      var length = w * ray.length, thickness = Math.max(2, h * ray.width), c = ray.white ? palette.light : palette.accent;
      var y = ray.y * h + Math.sin(t * .45 + ray.phase * TAU) * h * .013;
      g.save(); g.translate(x, y); g.rotate(ray.tilt); g.scale(ray.direction, 1); g.globalCompositeOperation = 'screen';
      glow(g, 0, 0, length * .75, thickness * 10, c, a * .5);
      var gradient = g.createLinearGradient(-length, 0, length * .3, 0);
      gradient.addColorStop(0, rgba(c, 0)); gradient.addColorStop(.45, rgba(c, a * .22));
      gradient.addColorStop(.8, rgba(c, a)); gradient.addColorStop(.91, rgba(palette.light, a)); gradient.addColorStop(1, rgba(c, 0));
      g.fillStyle = gradient; g.beginPath(); g.moveTo(-length, 0); g.lineTo(-length * .1, -thickness);
      g.quadraticCurveTo(length * .12, -thickness, length * .3, 0); g.quadraticCurveTo(length * .12, thickness, -length * .1, thickness); g.closePath(); g.fill();
      g.fillStyle = rgba(palette.light, a * .65); g.beginPath(); g.moveTo(-length * .7, 0);
      g.lineTo(length * .05, -thickness * .12); g.lineTo(length * .18, 0); g.lineTo(length * .05, thickness * .12); g.closePath(); g.fill();
      g.fillStyle = gradient;
      g.globalAlpha = .2; g.beginPath(); g.moveTo(-length * .8, thickness * 3); g.lineTo(length * .16, thickness * 2.6);
      g.lineTo(-length * .15, thickness * 3.4); g.closePath(); g.fill(); g.globalAlpha = 1;
      g.restore();
    }
    function choreography(s) {
      var p = s.p, strength = 1, energy = 0, wash = 0, clock = 0;
      if (s.id === 'material') { strength = smooth(p); clock = p * 1.5; }
      else if (s.id === 'ignition') { energy = .1 + .17 * smooth(p); clock = 1.5 + p * 1.1; }
      else if (s.id === 'accelerate') { energy = .27 + .55 * p * p; clock = 2.6 + p * 2.2; }
      else if (s.id === 'saturate') { energy = .82 + .18 * smooth(p); wash = smooth(p) * .9; clock = 4.8 + p * 1.66; }
      else if (s.id === 'lock') { energy = 1; wash = .9 + .08 * smooth(p); clock = 6.46; }
      else { energy = 1 - smooth(p); wash = .98 - .25 * smooth(p); clock = 6.46; }
      var offset = 0;
      for (var i = 0; i < spec.sections.length; i++) {
        var part = spec.sections[i];
        if (part.id === 'lock' || part.id === 'release') { clock = offset / 1000; break; }
        if (part.id === s.id) { clock = (offset + part.ms * p) / 1000; break; }
        offset += part.ms;
      }
      return { strength: strength, energy: energy, wash: wash, clock: clock };
    }
    function paletteAt(x,y,t) {
      var flow=x*.85-y*.55+Math.sin(y*5.6+x*2+t*.16)*.21+t*.025;
      return blendPalettes[Math.round((.5+.5*Math.sin(flow*TAU))*16)];
    }
    function wovenRibbon(g,w,h,t,index,strength) {
      var a=palettes[index%2],b=palettes[1-index%2],phase=panes[index].phase,offset=(index-1)*h*.085,thick=h*(.038+index*.012),bend=index===1?-1:1;
      var angle=[-.33,.28,-.75][index]+Math.sin(t*.22+phase)*.07;
      g.save();g.translate(w*.5,h*.5);g.rotate(angle);
      g.beginPath();g.moveTo(-w*.68,offset+thick);
      g.bezierCurveTo(-w*.24,offset+h*.39*bend,w*.08,offset-h*.35*bend,w*.68,offset+h*.08*bend);
      g.lineTo(w*.68,offset+h*.08*bend-thick);
      g.bezierCurveTo(w*.08,offset-h*.35*bend-thick,-w*.24,offset+h*.39*bend-thick,-w*.68,offset-thick);g.closePath();
      var shade=g.createLinearGradient(-w*.5,offset-h*.3,w*.5,offset+h*.3);
      shade.addColorStop(0,rgba(a.dark,.6*strength));shade.addColorStop(.28,rgba(a.accent,.55*strength));
      shade.addColorStop(.52,rgba(b.light,.43*strength));shade.addColorStop(.7,rgba(b.accent,.6*strength));shade.addColorStop(1,rgba(a.base,.35*strength));
      g.fillStyle=shade;g.fill();
      if(atlas.length){g.save();g.clip();g.globalAlpha=.27*strength;g.drawImage(atlas[0].body,-w*.68,-h*.65,w*1.36,h*1.3);g.restore();}
      g.strokeStyle=rgba(a.dark,.22*strength);g.lineWidth=h*.013;g.stroke();
      var rim=g.createLinearGradient(-w*.55,0,w*.55,0);
      rim.addColorStop(0,rgba(a.accent,0));rim.addColorStop(.18,rgba(b.accent,.75*strength));rim.addColorStop(.38,rgba(a.light,.68*strength));rim.addColorStop(.62,rgba(b.light,.92*strength));rim.addColorStop(.82,rgba(a.accent,.72*strength));rim.addColorStop(1,rgba(a.light,0));
      g.strokeStyle=rim;g.lineWidth=Math.max(.65,h*.0017);g.stroke();
      g.beginPath();g.moveTo(-w*.65,offset-thick*.35);g.bezierCurveTo(-w*.24,offset+h*.39*bend-thick*.35,w*.08,offset-h*.35*bend-thick*.35,w*.65,offset+h*.08*bend-thick*.35);
      g.strokeStyle=rgba(b.light,.18*strength);g.lineWidth=Math.max(1,h*.004);g.stroke();g.restore();
    }
    function wovenPrism(g,w,h,t,q) {
      var unit=Math.min(w,h),formed=smooth(q.strength),r=unit*mix(.12,.235,formed)*(1+q.energy*.18),a=palettes[0],b=palettes[1];
      var shift=Math.sin(t*.19)*unit*.022;
      g.save();g.globalCompositeOperation='screen';
      glow(g,w*.5+shift,h*.5,r*2.3,r*2.5,a.accent,q.strength*(.22+q.energy*.18));
      glow(g,w*.5-shift,h*.5,r*1.6,r*2.1,b.accent,q.strength*(.2+q.energy*.2));g.restore();
      var yaw=.4+t*.19,pitch=.18+Math.sin(t*.23)*.1,roll=-.14+Math.sin(t*.2)*.035;
      var vertices=[[0,-1.22,0],[0,1.22,0]];
      for(var i=0;i<8;i++){var angle=i*TAU/8;vertices.push([Math.cos(angle)*.84,Math.sin(angle*2)*.045,Math.sin(angle)*.68]);}
      var points=vertices.map(function(v){
        var x=v[0]*Math.cos(yaw)+v[2]*Math.sin(yaw),z=-v[0]*Math.sin(yaw)+v[2]*Math.cos(yaw),y=v[1]*Math.cos(pitch)-z*Math.sin(pitch);z=v[1]*Math.sin(pitch)+z*Math.cos(pitch);
        var rx=x*Math.cos(roll)-y*Math.sin(roll),ry=x*Math.sin(roll)+y*Math.cos(roll),perspective=3/(3+z);
        return {x:rx*r*perspective,y:ry*r*perspective,z:z,world:[rx,ry,z]};
      });
      var faces=[];for(var j=0;j<8;j++){faces.push([0,2+j,2+(j+1)%8]);faces.push([1,2+(j+1)%8,2+j]);}
      faces.sort(function(a,b){return b.reduce(function(n,i){return n+points[i].z;},0)-a.reduce(function(n,i){return n+points[i].z;},0);});
      g.save();g.translate(w*.5,h*.5);
      faces.forEach(function(indices){
        var ps=indices.map(function(i){return points[i];}),v=ps[0].world,u=ps[1].world,z=ps[2].world;
        var ux=u[0]-v[0],uy=u[1]-v[1],uz=u[2]-v[2],vx=z[0]-v[0],vy=z[1]-v[1],vz=z[2]-v[2];
        var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,length=Math.hypot(nx,ny,nz);nx/=length;ny/=length;nz/=length;
        var front=nz<0,opacity=q.strength*(front?.85:.26),blue=Math.max(0,-nx*.5-ny*.5-nz*.7),gold=Math.max(0,nx*.65-ny*.35-nz*.65);
        var weight=smooth((.5+.5*Math.sin(Math.atan2(nz,nx)*2+ny*1.4+t*.25)-.2)/.6),palette=blendPalettes[Math.round(weight*16)];
        var highlight=Math.pow(Math.max(0,-ny*.32-nz*.92),18),shade=.32+blue*.23+gold*.23;
        var tone=palette.base.map(function(value,ch){return Math.round(Math.min(255,value*shade+a.accent[ch]*blue*.17+b.accent[ch]*gold*.18+palette.light[ch]*highlight*.6));});
        g.beginPath();g.moveTo(ps[0].x,ps[0].y);g.lineTo(ps[1].x,ps[1].y);g.lineTo(ps[2].x,ps[2].y);g.closePath();
        var facet=g.createLinearGradient(ps[0].x,ps[0].y,(ps[1].x+ps[2].x)/2,(ps[1].y+ps[2].y)/2);facet.addColorStop(0,rgba(palette.light,opacity*.5));facet.addColorStop(.23,rgba(tone,opacity));facet.addColorStop(.8,rgba(tone,opacity*.9));facet.addColorStop(1,rgba(palette.dark,opacity*.65));g.fillStyle=facet;g.fill();
        if(atlas.length&&front){g.save();g.clip();g.globalCompositeOperation='screen';g.globalAlpha=q.strength*.48;g.drawImage(atlas[0].body,-r*1.2+Math.sin(t*.18)*r*.3,-r*1.4,r*2.4,r*2.8);g.globalAlpha=q.strength*.38;g.drawImage(atlas[0].shine,-r*1.3-Math.sin(t*.18)*r*.2,-r*1.5,r*2.6,r*3);g.restore();}
        g.strokeStyle=rgba(palette.light,q.strength*(front?.58:.15));g.lineWidth=front?1:.55;g.stroke();
      });
      sparkle(g,points[0].x,points[0].y,r*.075,a,q.strength*.72);sparkle(g,points[1].x,points[1].y,r*.045,b,q.strength*.44);g.restore();
    }
    function paintBlend(g,w,h,s,q,quiet) {
      var t=q.clock,e=q.energy,unit=Math.min(w,h),a=palettes[0],b=palettes[1];
      var tier=C.settings.get('cinematicQuality'),fieldMax=tier==='high'||tier==='very-high'?960:C.config.rarityIntro.glassFieldSize;
      var scale=Math.min(1,fieldMax/Math.max(w,h)),fw=Math.max(1,Math.round(w*scale)),fh=Math.max(1,Math.round(h*scale));
      var key=preparedKey+':woven:'+fw+':'+fh+':'+quiet+':'+q.strength.toFixed(2);
      if(!surface){surface=root.document.createElement('canvas');surfaceContext=surface.getContext('2d',{alpha:false});}
      if(key!==surfaceKey||t<surfaceAt||t-surfaceAt>=1/30){
        if(surface.width!==fw||surface.height!==fh){surface.width=fw;surface.height=fh;}
        var field=surfaceContext;field.globalAlpha=1;field.globalCompositeOperation='source-over';field.fillStyle=rgba(mono([7,11,21]),1);field.fillRect(0,0,fw,fh);
        if(atlas.length){
          field.save();field.translate(fw*.5,fh*.5);field.rotate(Math.sin(t*.11)*.065);field.globalAlpha=q.strength*.62;
          field.drawImage(atlas[0].body,-fw*.62+Math.sin(t*.17)*fw*.028,-fh*.64+Math.cos(t*.12)*fh*.025,fw*1.24,fh*1.28);
          field.globalCompositeOperation='screen';field.globalAlpha=q.strength*.14;field.drawImage(atlas[0].shine,-fw*.68-Math.sin(t*.17)*fw*.035,-fh*.7,fw*1.36,fh*1.4);field.restore();
        }
        field.save();field.globalCompositeOperation='screen';
        glow(field,fw*(.4+.08*Math.sin(t*.14)),fh*.43,fw*.57,fh*.8,a.base,q.strength*.5);
        glow(field,fw*(.6-.08*Math.sin(t*.14)),fh*.58,fw*.51,fh*.72,b.base,q.strength*.46);field.restore();
        wovenRibbon(field,fw,fh,t,0,q.strength);wovenRibbon(field,fw,fh,t,2,q.strength*.7);
        wovenPrism(field,fw,fh,t,q);wovenRibbon(field,fw,fh,t,1,q.strength*.82);
        surfaceKey=key;surfaceAt=t;
      }
      g.drawImage(surface,0,0,w,h);
      if(!quiet){
        for(var j=0;j<glints.length;j++){
          var glint=glints[j],pulse=.5+.5*Math.sin(t*.85+glint.phase);
          sparkle(g,glint.x*w,glint.y*h,unit*glint.size*.72,paletteAt(glint.x,glint.y,t),q.strength*(.15+pulse*.45)*(1-q.wash));
        }
        var count=1+e*e*(Math.min(14,rays.length)-1),travel=.12*t+.016*Math.pow(Math.max(0,t-1.5),3);
        for(var i=0;i<rays.length;i++){
          var ray=rays[i],opacity=smooth(count-i)*smooth(e/.14);if(opacity<=0)continue;
          var cycle=(ray.phase+travel*(1+i*.034))%1,x=mix(-w*.65,w*1.65,ray.direction>0?cycle:1-cycle);
          beam(g,ray,x,w,h,paletteAt(cycle,ray.y,t),opacity*(.3+e*.43)*(1-q.wash*.66),t);
        }
      }
      if(q.wash>0){
        var pearl=blendPalettes[8].light,veil=g.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,Math.hypot(w,h)*.7);
        veil.addColorStop(0,rgba(pearl,q.wash*.78));veil.addColorStop(.45,rgba(pearl,q.wash*.55));veil.addColorStop(1,rgba(pearl,q.wash*.17));g.fillStyle=veil;g.fillRect(0,0,w,h);
        g.save();g.globalCompositeOperation='screen';
        glow(g,w*.43,h*.47,w*.55,h*.58,a.accent,q.wash*.37);glow(g,w*.57,h*.53,w*.55,h*.58,b.accent,q.wash*.37);g.restore();
      }
      var vignette=g.createRadialGradient(w/2,h/2,unit*.25,w/2,h/2,Math.hypot(w,h)*.62);
      vignette.addColorStop(0,rgba(mono([4,6,12]),0));vignette.addColorStop(1,rgba(mono([4,6,12]),.55));g.fillStyle=vignette;g.fillRect(0,0,w,h);g.globalAlpha=1;
    }
    function paint(g, w, h, s, elapsed, stillProgress) {
      prepare(); var quiet = typeof stillProgress === 'number', q = choreography(s);
      if (quiet) q = { strength: .7 * smooth(stillProgress / .25), energy: 0, wash: .25 * Math.sin(stillProgress * Math.PI), clock: 0 };
      if(spec.blend){paintBlend(g,w,h,s,q,quiet);return;}
      var t = q.clock, e = q.energy, half = spec.split ? w / 2 : w, short = Math.min(w, h);
      // Cache only the slowly moving glass. Beams and handoff still draw every shared frame.
      var fieldScale = Math.min(1, C.config.rarityIntro.glassFieldSize / Math.max(w, h)), fw = Math.max(1, Math.round(w * fieldScale)), fh = Math.max(1, Math.round(h * fieldScale));
      var key = preparedKey + ':' + fw + ':' + fh + ':' + quiet + ':' + (quiet || s.id === 'material' ? q.strength.toFixed(2) : 'formed');
      if (!surface) { surface = root.document.createElement('canvas'); surfaceContext = surface.getContext('2d', { alpha: false }); }
      if (key !== surfaceKey || t < surfaceAt || t - surfaceAt >= 1 / 30) {
        if (surface.width !== fw || surface.height !== fh) { surface.width = fw; surface.height = fh; }
        var fieldHalf = spec.split ? fw / 2 : fw, field = surfaceContext;
        for (var side = 0; side < palettes.length; side++) {
          field.save(); field.beginPath(); field.rect(side * fieldHalf, 0, fieldHalf, fh); field.clip();
          field.fillStyle = rgba(palettes[side].dark, 1); field.fillRect(0, 0, fw, fh);
          glass(field, fw, fh, t, side, q.strength, quiet);
          field.restore();
        }
        surfaceKey = key; surfaceAt = t;
      }
      g.drawImage(surface, 0, 0, w, h);
      // Palette clips preserve the blue/gold split even as a beam crosses the center.
      for (var p = 0; p < palettes.length; p++) {
        var palette = palettes[p]; g.save(); g.beginPath(); g.rect(p * half, 0, half, h); g.clip();
        if (!quiet) {
          for (var j = 0; j < glints.length; j++) {
            var glint = glints[j], pulse = .5 + .5 * Math.sin(t * 1.35 + glint.phase);
            sparkle(g, glint.x * w, glint.y * h, short * glint.size, palette, q.strength * (.25 + pulse * .6) * (1 - q.wash));
          }
          var count = 1 + e * e * (rays.length - 1);
          // Integrated accelerating travel, then a genuine frozen 140 ms impact hold.
          var travel = .12 * t + .016 * Math.pow(Math.max(0, t - 1.5), 3);
          for (var i = 0; i < rays.length; i++) {
            var ray = rays[i], opacity = smooth(count - i) * smooth(e / .14);
            if (opacity <= 0) continue;
            var cycle = (ray.phase + travel * (1 + i * .034)) % 1, x = mix(-w * .65, w * 1.65, ray.direction > 0 ? cycle : 1 - cycle);
            beam(g, ray, x, w, h, palette, opacity * (.4 + e * .48) * (1 - q.wash * .58), t);
          }
        }
        if (q.wash > 0) {
          // Each side remains tinted at the white peak. One rise, no strobe loop.
          var wash = g.createLinearGradient(p * half, 0, (p + 1) * half, h);
          wash.addColorStop(0, rgba(palette.light, q.wash)); wash.addColorStop(.5, rgba(palette.accent, q.wash * .8));
          wash.addColorStop(1, rgba(palette.light, q.wash)); g.fillStyle = wash; g.fillRect(0, 0, w, h);
          glow(g, spec.split ? half * (p + .5) : w * .55, h * .46, half * .85, h * .7, palette.light, q.wash * .5);
        }
        g.restore();
      }
      if (spec.split) {
        var seamLight = palettes[0].light; g.fillStyle = rgba(seamLight, q.strength * (.12 + e * .25)); g.fillRect(w / 2 - .5, 0, 1, h);
      }
      g.globalAlpha = 1;
    }
    return { start: start, paint: paint };
  } };
})(window.Cardable, window);
