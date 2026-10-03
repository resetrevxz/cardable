(function(C) {
  'use strict';
  C.dev.checkPackSchedule = function() {
    var start = performance.now(), checks = [], seed = 0x52a7cafe;
    function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    var schedule = true, rareCount = 0;
    for (var n = 1; n <= 100; n++) {
      var type = C.packs.typeAt(n), rare = type.id === 'rare' || type.replacesPackId === 'rare';
      if (rare) rareCount++;
      if (rare !== (n % 4 === 0)) schedule = false;
    }
    checks.push({label:'100 openings: exactly every fourth is a Rare slot, including upgrades (25 total)',pass:schedule && rareCount === 25});
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
  C.dev.startups.push(function() {
    C.dev.register({id:'checks.pack-schedule',group:'Checks',label:'Check pack schedule',type:'button',helper:'Manual only: 100 openings, 3,000 seeded Rare pulls, and legacy count migration. No save writes.',run:function(){var report=C.dev.checkPackSchedule();C.dev.message((report.pass?'PASS':'FAIL')+' · Pack schedule · '+report.elapsedMs+' ms',!report.pass);}});
  });
})(window.Cardable);
