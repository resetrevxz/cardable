(function(C){
  'use strict';
  var rarity=C.data.rarities.find(function(r){return r.id==='secret';});
  // Milestone A ends cleanly after POST. The release is replaced by Acts D–H later.
  rarity.openingIntro={kind:'system',cutscene:'secret',milestone:'A',color:[250,250,250],background:[0,0,0],
    sections:[{id:'fakeout',ms:2400},{id:'black',ms:1600},{id:'boot',ms:6000},{id:'release',ms:600}],
    handoff:{flipMs:400,fadeMs:160},backdrop:{enabled:true,animated:true,exitMs:450},
    light:{ms:4000,handoffMs:3600},
    beats:[{id:'cut',ms:2400},{id:'black',ms:2400},{id:'hum',ms:3000},{id:'post',ms:4000},{id:'bootFail',ms:7300},{id:'cardIn',ms:10600}],
    os:{name:'NorthStar OS',buffers:[[400,225],[400,225],[480,270],[640,360]],
      palette:{desktop:'#0B7285',bar:'#12206B',face:'#C8C8CC',stop:'#0A2A6B',magenta:'#FF00FF',cyan:'#00FFFF',green:'#39FF14'}}};
})(window.Cardable);
