(function(C,root){
  'use strict';
  var preparation=null;
  C.dev.prepareVisual=function(){if(C.visualPresets&&C.studioPresets)return Promise.resolve();if(preparation)return preparation;preparation=['src/studio/preset-catalog.js','src/studio/visual-presets.js','src/studio/presets.js'].reduce(function(chain,path){return chain.then(function(){return new Promise(function(resolve,reject){var s=root.document.createElement('script');s.src=path;s.onload=resolve;s.onerror=function(){reject(Error('Restore the local preset files.'));};root.document.head.appendChild(s);});});},Promise.resolve());return preparation;};
  C.dev.checkVisual=function(){
    if(!C.visualPresets||!C.studioPresets)throw Error('Prepare the visual preset catalog before running this check.');
    var start=root.performance.now(),checks=[],failures=[];
    function expect(name,ok){checks.push(name);if(!ok)failures.push(name);}
    var tiers=C.settingsSchema.tiers;
    expect('Five finite numeric budget profiles',tiers.length===5&&tiers.every(function(t){return Object.values(C.quality.resolve(t)).every(Number.isFinite);}));
    expect('Medium stays default; lower-tier budgets retained',C.settingsSchema.normalize().quality==='medium'&&C.settings.policyFor('medium').particles===.5&&C.quality.resolve('low').canvasDpr===1.25&&C.quality.resolve('very-low').particles===0);
    var capable={webgl2:true,maxTexture:8192,maxBuffer:8192,accelerated:true,samples:12,probeMs:8};
    expect('Hardware and startup gating',C.quality.eligibility(capable).available&&['webgl2','accelerated','maxTexture','maxBuffer','samples','probeMs'].every(function(k){var bad=Object.assign({},capable);bad[k]=k==='probeMs'?30:k==='samples'?2:k.startsWith('max')?2048:false;return !C.quality.eligibility(bad).available;}));
    var guard={slowMs:0};for(var i=0;i<100;i++)guard=C.quality.guard(guard,35,60);
    expect('Sustained slow frames fall back; short hiccups recover',guard.fallback&&!C.quality.guard({slowMs:0},100,60).fallback&&C.quality.guard({slowMs:500},16,60).slowMs<500&&!C.quality.guard({slowMs:400},5000,60).fallback);
    expect('Every pack has complete visual states and swap style',C.data.packs.every(function(p){var s=C.packSkins.registry[p.skin];return !!C.packCouture.recipes[p.id]&&s&&['renderIdle','renderWaiting','renderWrapper','renderStatic','counterThumb','quality','renderReadyMoment','renderCharge','renderDissolve','renderHover','renderSwapIn'].every(function(k){return typeof s[k]==='function';})&&!!s.swapStyle;}));
    expect('Twenty-four additions in the requested families',C.visualPresets.entries.length===24&&['scene','rig','move','look'].every(function(k,i){return C.visualPresets.entries.filter(function(e){return e.kind===k;}).length===[8,4,6,6][i];}));
    var basic=C.data.cards.find(function(c){return C.rarity(c.rarity).tier===0;}),legend=C.data.cards.find(function(c){return c.rarity==='legendary';}),references=[[basic,null,null],[basic,'rainbow-holo',null],[basic,'matte',null],[basic,'galaxy-holo',null],[basic,'gold-foil',null],[basic,null,'classic'],[legend,null,null]];
    expect('All added presets validate across seven reference cards',references.every(function(ref,index){if(!ref[0])return false;var instance={cardId:ref[0].id,instanceId:'visual-reference-'+index,serial:'REFERENCE',variantId:ref[1],cardSkinId:ref[2],packId:'standard',pulledAt:0},base=C.studioScenes.defaults(instance),profile=C.studioPresets.profile(ref[0],instance);return C.visualPresets.entries.every(function(e){try{var built=C.studioPresets.build(e,base,profile,'visual-check'),parsed=C.studioScenes.preset({version:2,kind:e.kind,id:e.id,name:e.name,scene:built});return parsed.scene.card.source.serial==='REFERENCE'&&(e.kind!=='move'||parsed.scene.keyframes.length>=2);}catch(_){return false;}});}));
    var myth=C.rarity('mythical').openingIntro,asc=C.rarity('ascendant').openingIntro;
    function ordered(spec,ids,total){var beats=spec.beats.filter(function(b){return ids.includes(b.id);});return beats.map(function(b){return b.id;}).join(',')===ids.join(',')&&beats.every(function(b,i){return !i||b.ms>=beats[i-1].ms;})&&spec.sections.reduce(function(n,s){return n+s.ms;},0)===total;}
    expect('Mythical authored duration and beat order',ordered(myth,['creak','break','impact','tendrils','clockStart','titleIn','titleBreak','flash','cardIn'],27600));
    expect('Ascendant authored duration and beat order',ordered(asc,['spark1','spark2','spark3','clockStart','clockAlign','titleIn','titleBreak','auroraRise','flash','cardIn'],28100)&&asc.beats.filter(function(b){return b.id==='flash';}).length===1);
    expect('Check stays under one second',root.performance.now()-start<1000);var result={passed:checks.length-failures.length,total:checks.length,failures:failures,elapsedMs:Math.round(root.performance.now()-start)};root.console.info('Cardable visual check',result);return result;
  };
  C.dev.register({id:'visual-check',group:'Checks',label:'Visual logic check',type:'button',run:function(){C.dev.prepareVisual().then(function(){C.dev.checkVisual();});}});
})(window.Cardable,window);
