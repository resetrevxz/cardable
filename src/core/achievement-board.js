(function (C) {
  'use strict';
  var WEEK = 604800000, MONDAY = Date.UTC(1970,0,5);
  function weekAt(now) { return MONDAY + Math.floor((now-MONDAY)/WEEK)*WEEK; }
  function integer(n) { return Number.isSafeInteger(n) && n >= 0; }
  function validate(b) {
    if (b === undefined) return;
    function require(ok) { if (!ok) throw new Error('Invalid achievement board'); }
    require(b && typeof b === 'object' && !Array.isArray(b));
    require(integer(b.week) && integer(b.earned));
    require(Array.isArray(b.pins) && b.pins.every(function (id) { return typeof id === 'string'; }));
    function bases(values) { require(values && typeof values === 'object' && !Array.isArray(values)); Object.values(values).forEach(function (v) { require(integer(v)); }); }
    bases(b.weekBase); bases(b.recurringBase);
    require(b.recurring && typeof b.recurring === 'object' && !Array.isArray(b.recurring));
    Object.values(b.recurring).forEach(function (r) { require(r && integer(r.cycles) && integer(r.at)); });
    require(b.weekly && typeof b.weekly === 'object' && !Array.isArray(b.weekly));
    Object.keys(b.weekly).forEach(function (id) {
      var r=b.weekly[id]; require(r && typeof r.ready === 'boolean' && typeof r.claimed === 'boolean' && integer(r.at) && integer(r.week));
      var def=C.data.weeklyAchievements(r.week).find(function (d) { return d.id === id; }); require(!!def && (!r.claimed || r.ready));
    });
  }
  function create(adapter) {
    var notices=[];
    function save() { return adapter.current(); }
    function data() { return save().achievements; }
    function board() { return data().board; }
    function counts() { return data().counters; }
    function snapshot() { return Object.assign({},counts()); }
    function count(key) { return counts()[key] || 0; }
    function init() {
      if (!board()) data().board={week:weekAt(adapter.now()),weekBase:snapshot(),recurringBase:snapshot(),weekly:{},recurring:{},pins:[],earned:0};
      validate(board()); refresh();
    }
    function list() {
      var b=board(); if (!b) return [];
      var live=C.data.weeklyAchievements(b.week), old=[];
      Object.keys(b.weekly).forEach(function (id) { var r=b.weekly[id]; if (r.week !== b.week && r.ready && !r.claimed) { var d=C.data.weeklyAchievements(r.week).find(function (d) { return d.id===id; }); old.push(Object.assign({},d,{group:'unclaimed',archived:true})); } });
      return live.concat(C.data.recurringAchievements,old);
    }
    function objectives(def) {
      var b=board(), base=def.kind==='weekly'?b.weekBase:b.recurringBase;
      var cycles=b.recurring[def.id]?.cycles || 0, r=b.weekly[def.id];
      return def.objectives.map(function (o) {
        var total=Math.max(0,count(o.counter)-(base[o.counter] || 0));
        var value=def.kind==='weekly' && r?.ready ? o.goal : def.kind==='recurring' ? total-cycles*o.goal : total;
        return Object.assign({},o,{value:Math.max(0,Math.min(o.goal,value)),total:total});
      });
    }
    function progress(id) {
      var def=list().find(function (d) { return d.id===id; }); if (!def) return null;
      var tasks=objectives(def), b=board(), r=def.kind==='weekly'?b.weekly[id]:b.recurring[id];
      var cycles=def.kind==='recurring'?r?.cycles || 0:0;
      var rank=C.data.achievementRanks.filter(function (n) { return cycles>=n; }).length;
      var ratio=tasks.reduce(function (n,o) { return n+o.value/o.goal; },0)/tasks.length;
      return {value:Math.round(ratio*100),goal:100,tier:def.kind==='weekly'?(r?.ready?1:0):rank,maxTier:def.kind==='weekly'?1:5,ratio:ratio,objectives:tasks,cycles:cycles,ready:!!r?.ready,claimed:!!r?.claimed,at:r?.at || null,rank:rank,credits:def.credits};
    }
    function pay(credits) { if (!integer(credits) || !integer(board().earned+credits)) throw new Error('Invalid achievement credits'); adapter.reward({credits:credits},save()); board().earned+=credits; }
    function notice(id,tier,at) { notices.push({id:id,tier:tier,at:at,retro:false}); }
    function refresh() {
      var b=board(); if (!b) return false; var changed=false, week=weekAt(adapter.now());
      // Advance only: adjusting a local clock backwards never rerolls the current week.
      if (week>b.week) {
        Object.keys(b.weekly).forEach(function (id) { if (b.weekly[id].claimed || !b.weekly[id].ready) delete b.weekly[id]; });
        b.week=week;b.weekBase=snapshot();changed=true;
      }
      C.data.weeklyAchievements(b.week).forEach(function (def) {
        if (b.weekly[def.id]?.ready) return;
        if (objectives(def).every(function (o) { return o.value>=o.goal; })) {
          b.weekly[def.id]={ready:true,claimed:false,at:adapter.now(),week:b.week};notice(def.id,1,adapter.now());changed=true;
        }
      });
      C.data.recurringAchievements.forEach(function (def) {
        var completed=Math.min.apply(null,def.objectives.map(function (o) { return Math.floor(Math.max(0,count(o.counter)-(b.recurringBase[o.counter] || 0))/o.goal); }));
        var before=b.recurring[def.id]?.cycles || 0;
        if (completed>before) {
          pay((completed-before)*def.credits);b.recurring[def.id]={cycles:completed,at:adapter.now()};notice(def.id,completed,adapter.now());changed=true;
        }
      });
      return changed;
    }
    function drain() { while (notices.length) adapter.emit('achievement:unlocked',notices.shift()); }
    function claim(id) {
      var changed=refresh(), def=list().find(function (d) { return d.id===id && d.kind==='weekly'; }), r=board().weekly[id];
      if (!def || !r?.ready || r.claimed) { if (changed) { adapter.persist();drain();adapter.emit('achievement:changed'); } return false; }
      pay(def.credits);r.claimed=true;adapter.persist();drain();adapter.emit('achievement:changed');return true;
    }
    function pinKey(id) { var def=list().find(function (d) { return d.id===id; }); return def?.kind==='weekly'&&!def.archived?'weekly-'+def.slot:id; }
    return {init:init,refresh:refresh,drain:drain,list:list,progress:progress,claim:claim,
      isPinned:function (id) { return !!board()?.pins.includes(pinKey(id)); },
      togglePin:function (id) { var key=pinKey(id),pins=board().pins,i=pins.indexOf(key);if(i<0)pins.push(key);else pins.splice(i,1);adapter.persist();adapter.emit('achievement:changed');return i<0; },
      get weekEndsAt() { return board().week+WEEK; },get earned() { return board().earned; }
    };
  }
  C.achievementBoard={create:create,validate:validate,weekAt:weekAt};
})(window.Cardable);
