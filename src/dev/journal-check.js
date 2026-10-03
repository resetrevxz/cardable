(function (C) {
  'use strict';
  // One opt-in, isolated logic check. Never runs at startup or in the old suite.
  C.dev.checkJournal = function () {
    var start = performance.now();
    function require(ok, label) { if (!ok) throw new Error('Journal: ' + label); }
    var card = C.data.cards[0], other = C.data.cards.find(function (c) { return c.id !== card.id && c.rarity !== card.rarity; }), variant = C.data.variants[0];
    var save = C.state.fresh(1700000000000);
    save.inventory = [
      { instanceId: 'j-3', cardId: card.id, serial: '3', pulledAt: 1700200000000, packId: 'standard', variantId: variant.id },
      { instanceId: 'j-1', cardId: card.id, serial: '1', pulledAt: 1700000000000, packId: 'standard', variantId: null },
      { instanceId: 'j-2', cardId: other.id, serial: '2', pulledAt: 1700100000000, packId: 'standard', variantId: null }
    ];
    save.stats.packsOpened = 10;
    var j = C.journal.backfill(save), pulls = j.entries.filter(function (e) { return e.type === 'pull'; });
    require(pulls.map(function (e) { return e.instanceId; }).join() === 'j-1,j-2,j-3', 'backfill order and pulls');
    require(j.entries.every(function (e, i, all) { return !i || (all[i - 1].at == null ? -1 : all[i - 1].at) <= (e.at == null ? -1 : e.at); }), 'date order');
    require(pulls[0].firstPull && pulls[0].firstTier && !pulls[0].firstVariant && pulls[1].firstPull && pulls[1].firstTier && !pulls[2].firstPull && !pulls[2].firstTier && pulls[2].firstVariant, 'first-of-each flags');
    require(j.entries.filter(function (e) { return e.type === 'firstPull'; }).length === 2 && j.entries.filter(function (e) { return e.type === 'variantFirst'; }).length === 1 && j.entries.filter(function (e) { return e.type === 'rarityFirst'; }).length === 2 && j.entries.every(function (e) { return e.retro; }), 'expected backfill entries');
    var protectedIds = j.entries.filter(C.journal.highlight).map(function (e) { return e.id; }), counts = JSON.stringify(j.counts), daily = JSON.stringify(j.days);
    C.journal.compact(j, j.entries.length - 1);
    require(JSON.stringify(j.counts) === counts && JSON.stringify(j.days) === daily && j.entries.reduce(function (n, e) { return n + (e.type === 'pull' ? 1 : e.type === 'daySummary' ? e.n : 0); }, 0) === 3 && protectedIds.every(function (id) { return j.entries.some(function (e) { return e.id === id; }); }), 'compaction counts and firsts');
    var legacy = C.state.validate(C.state.fresh(1700000000000), false);
    require(!legacy.journal && C.journal.ensure(legacy).counts.pulls === 0, 'save without journal loads');
    require(performance.now() - start < 1000, 'under one second');
    return { passed: true, milliseconds: Math.round(performance.now() - start), checks: 'backfill, first flags, compaction, legacy save' };
  };
})(window.Cardable);
