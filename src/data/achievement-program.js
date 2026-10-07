(function (C) {
  'use strict';
  // Keep the original IDs and receipts: an existing award never pays a second time.
  var names = {
    'collector':'Card Collector','duplicates':'Card Duplicates','newcomer':'Generation Arrival',
    'streak':'Pack Streak','hot-streak':'Pack Fortune','cold-snap':'Pack Persistence',
    'spender':'Credit Spender','saver':'Credit Saver','tidy':'Card Favorites',
    'archivist':'Save Archivist','shutterbug':'Photo Debut','director':'Prop Director',
    'colorist':'Light Colorist','portfolio':'Photo Portfolio','palindrome':'Serial Palindrome',
    'triplets':'Serial Triplets','first-serial':'Serial First','low-serial':'Serial Low',
    'round-number':'Serial Round','lucky-seven':'Serial Seven','cut-above':'Cut Precision',
    'skipper':'Cutscene Skip','fatal-exception':'Cutscene Completion','secret-occurred':'Secret Discovery',
    'pickers-remorse':'Picker Humility','good-eye':'Picker Judgment','first-super-rare':'Superrare Discovery',
    'first-rare':'Rare Discovery','first-legendary':'Legendary Discovery','first-mythical':'Mythical Discovery',
    'first-exotic':'Exotic Discovery','first-ascendant':'Ascendant Discovery',
    'variety-pack':'Pack Variety','rare-find':'Pack Rarity','legendary-moment':'Pack Legend',
    'patient-collector':'Pack Patience','full-spectrum':'Rarity Spectrum','first-variant':'Variant Debut',
    'slot-machine':'Variant Slots','combo-breaker':'Variant Combinations','triple-threat':'Variant Trio',
    'mythic-touch':'Variant Mythic','time-capsule':'Card Vintage','daily-ritual':'Pack Ritual',
    'night-owl':'Pack Nightfall','welcome-back':'Game Return','settings-tinkerer':'Settings Tinkerer'
  };
  C.data.achievements.forEach(function (def) {
    def.kind = 'eternal';
    def.name = names[def.id] || (def.id.startsWith('brand-loyalty-') ? def.id.split('-').pop().toUpperCase() + ' Collection' : def.name);
    def.tiers = [def.tiers[0]]; // One-time achievements have no milestone ladder.
    def.difficulty = def.hidden ? 'Legendary' : ['serials','luck','variants'].includes(def.group) ? 'Rare' : def.group === 'collection' ? 'Uncommon' : 'Common';
    if (/first-(legendary|mythical|exotic|ascendant)/.test(def.id)) def.difficulty = 'Legendary';
    if (def.id === 'first-rare' || def.id === 'first-super-rare') def.difficulty = 'Rare';
  });
  var rare = C.data.achievements.find(function (d) { return d.id === 'first-rare'; });
  function rareOrHigher(item) { return (C.rarity(C.card(item?.cardId)?.rarity)?.tier ?? -1) >= C.data.rarities.find(function (r) { return r.id === 'rare'; }).tier; }
  rare.description = 'Pull a Rare card or higher.'; rare.track.test = rareOrHigher;
  rare.track.backfill = function (s) { return s.inventory.filter(rareOrHigher); };
  C.data.achievementCatalogRevision = 2;
  function objective(counter, goal, unit, verb) { return { counter:counter, goal:goal, unit:unit, verb:verb }; }
  function recurring(id, name, glyph, difficulty, credits, task) {
    return { id:'recurring-'+id, kind:'recurring', group:'recurring', name:name, glyph:glyph, difficulty:difficulty, credits:credits, objectives:[task], tiers:[{goal:task.goal,reward:{credits:credits}}] };
  }
  C.data.recurringAchievements = [
    recurring('pack-routine','Pack Routine','pack','Common',25,objective('packsOpened',5,'packs','Open')),
    recurring('pack-enthusiast','Pack Enthusiast','pack','Uncommon',75,objective('packsOpened',15,'packs','Open')),
    recurring('pack-devotee','Pack Devotee','pack','Uncommon',150,objective('packsOpened',30,'packs','Open')),
    recurring('pack-veteran','Pack Veteran','pack','Rare',300,objective('packsOpened',60,'packs','Open')),
    recurring('pack-expert','Pack Expert','pack','Rare',500,objective('packsOpened',100,'packs','Open')),
    recurring('pack-legend','Pack Legend','pack','Legendary',1250,objective('packsOpened',250,'packs','Open')),
    recurring('time-moment','Time Moment','clock','Common',15,objective('openSeconds',900,'seconds','Keep the game visible for')),
    recurring('time-regular','Time Regular','clock','Common',30,objective('openSeconds',1800,'seconds','Keep the game visible for')),
    recurring('time-companion','Time Companion','clock','Uncommon',60,objective('openSeconds',3600,'seconds','Keep the game visible for')),
    recurring('time-dedication','Time Dedication','clock','Uncommon',120,objective('openSeconds',7200,'seconds','Keep the game visible for')),
    recurring('time-marathon','Time Marathon','clock','Rare',240,objective('openSeconds',14400,'seconds','Keep the game visible for')),
    recurring('time-endurance','Time Endurance','clock','Legendary',480,objective('openSeconds',28800,'seconds','Keep the game visible for')),
    recurring('card-curator','Card Curator','collection','Common',20,objective('cardsKept',3,'cards','Keep')),
    recurring('card-keeper','Card Keeper','collection','Common',50,objective('cardsKept',10,'cards','Keep')),
    recurring('card-patron','Card Patron','collection','Uncommon',125,objective('cardsKept',25,'cards','Keep')),
    recurring('card-custodian','Card Custodian','collection','Rare',250,objective('cardsKept',50,'cards','Keep')),
    recurring('photo-practice','Photo Practice','camera','Common',30,objective('event.shutterbug',3,'Studio photos','Save')),
    recurring('photo-study','Photo Study','camera','Uncommon',100,objective('event.shutterbug',10,'Studio photos','Save')),
    recurring('day-routine','Day Routine','clock','Uncommon',75,objective('openingDays',3,'different days','Open packs on')),
    recurring('day-dedication','Day Dedication','clock','Rare',200,objective('openingDays',7,'different days','Open packs on'))
  ];
  C.data.weeklyAchievements = function (week) {
    var rotation = Math.abs(Math.floor(week / 604800000)) % 3;
    return [
      {slot:'pack',name:'Pack Enthusiast',glyph:'pack',difficulty:['Common','Uncommon','Rare'][rotation],credits:[100,175,250][rotation],objectives:[objective('packsOpened',[8,12,16][rotation],'packs','Open')]},
      {slot:'time',name:'Time Investor',glyph:'clock',difficulty:['Uncommon','Rare','Uncommon'][rotation],credits:[150,225,175][rotation],objectives:[objective('openSeconds',[7200,10800,9000][rotation],'seconds','Keep the game visible for')]},
      {slot:'routine',name:'Pack Dedication',glyph:'collection',difficulty:'Legendary',credits:350,objectives:[objective('packsOpened',20,'packs','Open'),objective('openSeconds',14400,'seconds','Keep the game visible for')]}
    ].map(function (d) { return Object.assign(d,{id:'weekly-'+d.slot+'-'+week,kind:'weekly',group:'weekly',week:week,tiers:[{goal:1,reward:{credits:d.credits}}]}); });
  };
  C.data.achievementRanks = [1,3,10,25,100];
  C.data.achievementRankNames = ['Foundation','Etched','Faceted','Crowned','Radiant'];
})(window.Cardable);
