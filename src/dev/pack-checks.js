(function(C) {
  'use strict';
  C.dev.checkPackSchedule = function() {
    var start = performance.now(), checks = [], seed = 0x52a7cafe;
    function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    var schedule = true, rareCount = 0;
    for (var n = 1; n <= 100; n++) {
      var type = C.packs.typeAt(n), rare = type.id === 'rare' || type.replacesPackId === 'rare';
      if (rare) rareCount++;
      if (rare !== (n % 6 === 0)) schedule = false;
    }
    checks.push({label:'100 openings: exactly every sixth is a Rare slot, including upgrades (16 total)',pass:schedule && rareCount === 16});
    var sampler = C.pull.createSampler(C.pack('rare'), {random:random}), safe = true;
    for (var i = 0; i < 3000; i++) {
      var result = sampler.draw();
      if (C.rarity(C.card(result.cardId).rarity).tier < 3) safe = false;
    }
    checks.push({label:'3,000 seeded Rare pulls: no tier below Rare',pass:safe});
    var legacy = C.state.fresh(0); legacy.schemaVersion = 3; legacy.stats.packsOpened = 37; delete legacy.packs.openedCount;
    var migrated = C.state.migrate(legacy);
    checks.push({label:'Legacy openedCount migrates from stats.packsOpened',pass:migrated.packs.openedCount === 37 && migrated.schemaVersion === C.config.storage.schemaVersion});
    var elapsedMs = performance.now() - start;
    var report = {pass:checks.every(function(c){return c.pass;}) && elapsedMs < 1000,checks:checks,elapsedMs:Number(elapsedMs.toFixed(2))};
    C.dev.packScheduleReport = report;
    return report;
  };
  // Pack faces: every pack has a printed back, the flip key is bound without conflicts, and the
  // opening always starts from the front. Builds throw-away units; no save writes.
  C.dev.checkPackFaces = function() {
    var start = performance.now(), checks = [], host = document.createElement('div');
    host.className = 'pack-stage'; host.style.cssText = 'position:fixed;left:-9999px;top:0;width:240px;height:356px;visibility:hidden';
    document.body.appendChild(host);
    try {
      C.data.packs.filter(function(p) { return p.design && p.design.face; }).map(function(p) { return p.id; }).forEach(function(id) {
        var pack = C.pack(id), unit = C.packMarkup.unit(host, false, pack);
        checks.push({label:id + ': designed face registered',pass:C.packFaces.has(pack) && !!unit.wrapper._packFace});
        unit.ensureRear();
        checks.push({label:id + ': printed back built with its own artwork',pass:!!unit.faceRear && !!unit.faceRear.querySelector('canvas.pack-face-art') && !!unit.faceRear.querySelector('.pack-series-mark')});
        checks.push({label:id + ': extruded edge strips exist',pass:unit.el.querySelectorAll('.pack-edge').length >= 8});
        unit.el.remove();
      });
      var generic = C.packMarkup.unit(host, false, C.pack('classic')).ensureRear();
      checks.push({label:'Packs without a designed face get a generic back',pass:!!generic.faceRear.querySelector('.pack-rear-generic') || !!generic.faceRear.querySelector('canvas.pack-face-art')});
      generic.el.remove();
      checks.push({label:'Every swapIn names a registered transition',pass:C.data.packs.every(function(p) { return !p.swapIn || !!C.packTransitions.create && ['tornadoPixel','fanCollapse','monolithDrop','goldShine'].concat(Object.keys(C.packFaces.arrivals)).indexOf(p.swapIn) !== -1; })});
      checks.push({label:'Every pack opening strategy is registered',pass:C.data.packs.every(function(p) { return !p.opening || p.opening === 'cut' || !!C.packOpenings.get(p); })});
      var entry = C.keys.entries.get('menu.flip-pack');
      checks.push({label:'R is bound to Flip pack without conflicts',pass:!!entry && entry.defaults.indexOf('KeyR') !== -1 && C.keys.conflicts('menu.flip-pack','KeyR').length === 0});
      var view = C.packView && C.packView.interaction;
      if (view) {
        var before = view.flipped, started = view.flip(), turned = view.flipped; view.faceFront();
        // While a pack is open the flip is deliberately blocked, so only an idle stage can toggle.
        checks.push({label:'Flip toggles and opening resets to the front',pass:started === false ? view.flipped === before : turned !== before && view.flipped === false});
      }
    } finally { host.remove(); }
    var report = {pass:checks.every(function(c){return c.pass;}),checks:checks,elapsedMs:Number((performance.now() - start).toFixed(2))};
    C.dev.packFaceReport = report;
    return report;
  };
  C.dev.startups.push(function() {
    C.dev.register({id:'checks.pack-faces',group:'Checks',label:'Check pack faces',type:'button',helper:'Manual only: printed backs, edge strips, the Flip key and the front-first opening. Throw-away elements; no save writes.',run:function(){var report=C.dev.checkPackFaces();C.dev.message((report.pass?'PASS':'FAIL')+' · Pack faces · '+report.elapsedMs+' ms',!report.pass);}});
    C.dev.register({id:'checks.pack-schedule',group:'Checks',label:'Check pack schedule',type:'button',helper:'Manual only: 100 openings, 3,000 seeded Rare pulls, and legacy count migration. No save writes.',run:function(){var report=C.dev.checkPackSchedule();C.dev.message((report.pass?'PASS':'FAIL')+' · Pack schedule · '+report.elapsedMs+' ms',!report.pass);}});
  });
})(window.Cardable);
