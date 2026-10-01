'use strict';
// Host CPU / simulated DOM evidence only; excludes raster, layout, compositing and GPU time.
const {performance} = require('node:perf_hooks');
const fs = require('node:fs');
const path = require('node:path');
const {runtime} = require('./check-stage1.cjs');
const samples = [];
for(const quality of ['high','medium','low']){
 const r=runtime(true,true),C=r.C;r.advance(1000);C.settings.set('quality',quality);C.preferences.show();
 const cycle=C.preferences.panel.querySelectorAll('button').find(b=>b.textContent==='›');
 while(C.rarity(C.preferences.preview.card.rarity).tier!==7)cycle.fire('click');
 r.advance(1000);const view=C.preferences.preview,definition=C.finishes.registry[C.rarity(view.card.rarity).finish],original=definition.update;
 let finishUpdates=0,corePaints=0;definition.update=function(...args){finishUpdates++;return original.apply(this,args);};
 const setter=view.el.style.setProperty;view.el.style.setProperty=function(key,value){if(key==='--core-x')corePaints++;return setter.call(this,key,value);};
 const times=[],before=view.stats.updates;
 for(let i=0;i<300;i++){const begin=performance.now();r.move(100+Math.sin(i*.13)*8,70,view.el);r.advance(1000/60);times.push(performance.now()-begin);}
 times.sort((a,b)=>a-b);definition.update=original;
 samples.push({quality,environment:'Node VM / simulated DOM; host CPU only',p95StepMs:+times[Math.ceil(times.length*.95)-1].toFixed(3),
  maxStepMs:+times.at(-1).toFixed(3),averageStepMs:+(times.reduce((a,b)=>a+b)/times.length).toFixed(3),
  simulatedSeconds:5,poseUpdates:view.stats.updates-before,finishUpdates,corePaints,fullCards:C.cardView.stats.fullCards,
  liveViews:C.cardView.stats.liveViews,policy:C.settings.policy});
 C.preferences.close();
}
fs.writeFileSync(path.resolve(__dirname,'../docs/SETTINGS-11A-PROFILE.json'),JSON.stringify(samples,null,2)+'\n');
console.log(JSON.stringify(samples,null,2));
