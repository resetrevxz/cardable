'use strict';
// Deterministic scheduling/resource checks, not a hardware FPS benchmark.
const assert = require('node:assert/strict');
const {runtime}=require('./check-stage1.cjs');
let count=0;
function check(name,fn){fn();console.log('PASS '+name);count++;}
function boot(tier='medium',hz=60){const s=runtime().C.state.fresh();s.tutorial={step:'done',done:true};s.settings={quality:tier};return runtime(false,false,s,false,true,hz);}
const tiers=['very-low','low','medium','high'];
check('legacy presets migrate all graphics controls; fresh saves choose Medium',()=>{
 assert.equal(runtime().C.settings.get('quality'),'medium');
 for(const tier of tiers){const r=boot(tier);for(const key of r.C.settingsSchema.graphicsKeys)assert.equal(r.C.settings.get(key),tier);assert.equal(r.C.settings.get('fpsLimit'),'display');}
});
check('presets persist atomically, preserve independent preferences and detect customization',()=>{
 const r=boot();r.C.settings.set('fpsLimit','90');r.C.settings.set('motion','on');let saves=0;r.C.events.on('save:written',()=>saves++);
 r.C.settings.applyPreset('low');assert.equal(saves,1);assert(!r.C.settings.customized);r.C.settings.set('reflectionQuality','high');assert(r.C.settings.customized);assert.equal(r.C.settings.policy.glareHz,Infinity);assert.equal(r.C.settings.policy.finishHz,15);r.C.settings.applyPreset('very-low');assert.equal(r.C.settings.get('fpsLimit'),'90');assert.equal(r.C.settings.get('motion'),'on');assert(!r.C.settings.customized);
});
check('60/120/240 Hz dispatch stays at display rate and fractional caps average correctly',()=>{
 for(const hz of [60,120,240])for(const limit of ['display','30','60','90','120','144','165','240']){
  const r=boot('high',hz);r.C.settings.set('fpsLimit',limit);const stop=r.C.fx.subscribe(()=>true);r.advance(1000);const before=r.C.fx.stats.frameCount;r.advance(2000);const actual=(r.C.fx.stats.frameCount-before)/2,target=Math.min(hz,limit==='display'?hz:Number(limit));assert(Math.abs(actual-target)<=1,`${hz}/${limit}: ${actual} vs ${target}`);stop();
 }
});
check('hidden sleep stops timers and frames; timer mode is visual-free and returning reconciles',()=>{
 const r=boot();r.advance(1000);r.C.state.current.packs={ready:0,timerStartedAt:r.date()};r.hidden(true);assert(!r.C.timers.running);const frames=r.C.fx.stats.frameCount;r.wall(r.C.config.packs.regenMs*2);r.advance(5000);assert.equal(r.C.fx.stats.frameCount,frames);assert.equal(r.C.state.current.packs.ready,0);r.hidden(false);assert.equal(r.C.state.current.packs.ready,2);r.hidden(true);r.C.settings.set('backgroundMode','timer');assert(r.C.timers.running);r.wall(r.C.config.packs.regenMs);r.advance(1001);assert.equal(r.C.state.current.packs.ready,3);assert.equal(r.C.fx.stats.frameCount,frames);
});
check('visible blur caps or pauses according to preference and focus resumes',()=>{
 const r=boot('high',120);r.C.fx.subscribe(()=>true);r.C.settings.set('unfocusedMode','30');r.window.fire('blur');r.advance(1000);let before=r.C.fx.stats.frameCount;r.advance(1000);assert(Math.abs(r.C.fx.stats.frameCount-before-30)<=1);r.C.settings.set('unfocusedMode','pause');before=r.C.fx.stats.frameCount;r.advance(2000);assert.equal(r.C.fx.stats.frameCount,before);r.window.fire('focus');r.advance(100);assert(r.C.fx.stats.frameCount>before);
});
check('Very Low detaches dots, emits no particles and never mounts animated materials',()=>{
 const r=boot('very-low');r.advance(2000);assert.equal(r.canvas.width,1);assert.equal(r.canvas.height,1);assert.equal(r.C.settings.policy.finishHz,0);let mounts=0;const id='quality-probe';r.C.finishes.register(id,{mount(){mounts++;return {};},update(){return true;},destroy(){},lite(){return new r.Element('div');}});const b=r.C.finishes.bind(id,new r.Element('div'),{},{});b.activate();for(let i=0;i<100;i++)assert(!b.update(16,{}));assert.equal(mounts,0);r.C.settings.set('finishQuality','low');b.activate();assert.equal(mounts,1);b.deactivate();b.destroy();
});
check('Very Low and Low stop continuous decorative frames even with idle fade disabled',()=>{
 for(const tier of ['very-low','low']){const r=boot(tier);r.C.settings.set('idleFade','never');r.advance(5000);const before=r.C.fx.stats.frameCount;r.advance(500);assert(r.C.fx.stats.frameCount-before<10,tier+' kept rendering');}
});
check('particle pools allocate on emission, scale by tier and release on Very Low',()=>{
 const r=boot('high'),pool=r.C.particles.create(new r.Element('div'),64);assert.equal(pool.allocated,0);let prior=0;
 for(const tier of tiers){r.C.settings.applyPreset(tier);pool.emit('dissolve',null,200,300);assert(pool.allocated>=prior);if(tier==='very-low')assert.equal(pool.allocated,0);prior=pool.allocated;}
 r.C.settings.applyPreset('very-low');pool.update(16);assert.equal(pool.allocated,0);
});
check('front-only thumbnails contain no back or live material; detail promotion remains available',()=>{
 const r=boot('high');const card=r.C.data.cards.find(c=>!c.retired);const v=r.C.cardView.createThumbnail(card,{cardId:card.id,variantId:'normal'},{owned:true});assert(v.thumbnail);assert.equal(v.el.querySelectorAll('.card__face--back').length,0);assert.equal(v.el.querySelectorAll('.card__material--live').length,0);const before=r.C.cardView.stats.liveViews;v.destroy();assert.equal(r.C.cardView.stats.liveViews,before-1);
});
check('a live animation override preserves the chosen back face across static and 3D rendering',()=>{
 const r=boot(),v=r.C.cardView.create(r.C.data.cards[0],{serial:'QA',cardId:r.C.data.cards[0].id},{owned:true});v.setMode('full');v.setFace('back');r.C.settings.set('animationQuality','very-low');assert.equal(v.el.querySelectorAll('.card__face--front')[0].style.opacity,0);assert.equal(v.el.querySelectorAll('.card__face--back')[0].style.opacity,1);r.C.settings.set('animationQuality','high');assert.equal(v.el.querySelectorAll('.card__face--front')[0].style.opacity,'');assert.equal(v.side,'back');v.destroy();
});
check('missing memory metadata stays Unknown and cannot crash filters, thumbnails or full cards',()=>{
 const r=boot(),card=Object.assign({},r.C.data.cards.find(c=>c.pullable),{vram:null,specs:{}}),instance={instanceId:'qa-null',cardId:card.id,serial:'QA',pulledAt:1,seen:true,variantId:null};
 assert.equal(r.C.cardSpecs.vram(card),'Unknown');assert.equal(r.C.cardSpecs.memoryType(card),'');
 const base=r.C.collection.project([card],[instance]),ui=r.C.inventoryModel.defaults();ui.showUnowned=false;
 assert.equal(r.C.inventoryQuery.run(base,ui,'unknown',{}).shown,1);assert.equal(r.C.inventoryQuery.run(base,ui,'shared',{}).shown,0);assert.equal(r.C.inventoryQuery.run(base,ui,'',{memoryType:['GDDR6']}).shown,0);
 const full=r.C.cardView.create(card,instance,{owned:true}),thumb=r.C.cardView.createThumbnail(card,instance,{owned:true});full.destroy();thumb.destroy();
});
console.log(count+' graphics groups passed.');
