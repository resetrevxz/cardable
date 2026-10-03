'use strict';
// Host CPU measurements of the Node VM/instrumented DOM. No browser raster/GPU evidence.
const { performance } = require('node:perf_hooks');
const { runtime } = require('./check-stage1.cjs');
const samples = [];
function run(label, create, prepare, tick) {
  const r = create(); r.C.state.current.tutorial.done = true; r.C.state.current.tutorial.step = 'done'; r.C.state.save(); r.advance(1000); prepare(r); r.advance(3000);
  let writes = 0;
  function track(el) { const original = el.style.setProperty; el.style.setProperty = function (...args) { writes++; return original.apply(this, args); }; el.children.forEach(track); }
  track(r.document.body);
  const times = [], beforeFrames = r.C.fx.stats.frameCount, beforeDraws = r.C.dots.stats.draws;
  for (let i = 0; i < 300; i++) {
    const start = performance.now(); if (tick) tick(r, i); r.advance(1000 / 60); times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const frames = r.C.fx.stats.frameCount - beforeFrames;
  samples.push({ label, environment: 'Node VM with simulated DOM; host CPU only', p95StepMs: +times[Math.ceil(times.length * .95) - 1].toFixed(3),
    maxStepMs: +times[times.length - 1].toFixed(3), averageStepMs: +(times.reduce((a, b) => a + b) / times.length).toFixed(3),
    simulatedFrames: frames, propertyWritesPerFrame: frames ? +(writes / frames).toFixed(1) : 0,
    fullCards: r.C.cardView.stats.fullCards, gridDraws: r.C.dots.stats.draws - beforeDraws,
    mountedShelfViews: r.C.inventory.rendered.size });
}
run('Ready menu', () => runtime(false, false, null, true, true), () => {});
run('Waiting menu', () => runtime(false, false, null, true, true), r => { r.C.state.current.packs.ready = 0; r.C.state.current.packs.timerStartedAt = r.date(); r.C.state.save(); });
run('1920x1080 pointer trail and click ripples', () => runtime(false, false, null, true, true), r => { r.window.innerWidth = 1920; r.window.innerHeight = 1080; r.window.devicePixelRatio = 2; r.window.fire('resize'); },
  (r, i) => { r.move(960 + Math.sin(i / 20) * 700, 540 + Math.cos(i / 25) * 380); if (i % 30 === 0) r.click(960, 540); });
run('Reduced-motion ready menu', () => runtime(false, false, null, true, true), r => r.reduced(true));
run('300 tiles with one full Secret', () => runtime(true, false, null, true, true), r => {
  r.C.events.emit('inventory:preview', true); r.C.events.emit('inventory:request', true); r.advance(1200);
  const index = r.C.inventory.entries.findIndex(e => e.owned && e.rarity.finish === 'secret');
  r.C.inventory.carousel.snap(index * (parseFloat(r.C.inventory.shelf.style['--inventory-tile-width']) + r.C.config.inventoryMotion.tileGapPx)); r.C.fx.wake(); r.advance(1400);
  r.C.inventory.rendered.get(r.C.inventory.center).el.fire('click');
});
run('300-tile carousel in motion', () => runtime(true, false, null, true, true), r => { r.C.events.emit('inventory:preview', true); r.C.events.emit('inventory:request', true); }, (r, i) => { r.C.inventory.carousel.move((80 + Math.sin(i / 24) * 30) * (parseFloat(r.C.inventory.shelf.style['--inventory-tile-width']) + r.C.config.inventoryMotion.tileGapPx)); r.C.fx.wake(); });
run('Gallery: one full Secret, all other cards lite', () => runtime(true, true, null, false, true), r => r.C.gallery.views.find(v => v.finishState === 'found').el.fire('pointerenter'));
run('1000-tile Grid in motion', () => runtime(true, false, null, true, true), r => { r.C.events.emit('inventory:preview', 1000); r.C.events.emit('inventory:request', true); r.C.inventoryModel.update({viewMode:'grid'}); }, (r, i) => { r.C.inventory.grid.scrollTop=10000+Math.sin(i/24)*3000;r.C.inventory.grid.fire('scroll'); });
run('1000-entry live query changes', () => runtime(true, false, null, true, true), r => { r.C.events.emit('inventory:preview', 1000);r.C.events.emit('inventory:request',true); }, (r,i)=>{if(i%30===0){r.C.inventory.toolbar.input.value=i%60?'rarity:rare':'owned:true';r.C.inventory.toolbar.input.fire('input');}});
run('Acquisition handoff with lite source clone', () => runtime(true, false, null, false, true), r => {
  const card=r.C.data.cards.find(c=>!c.retired);r.C.state.current.inventory.push({cardId:card.id,instanceId:'profile-owned',serial:r.C.serial.format(r.C.state.current.playerCode,1),pulledAt:r.date(),seen:false});r.C.state.current.serialCounter=1;r.C.state.save();
}, (r,i)=>{if(i%100===0){r.C.inventory.request(false);r.advance(1200);const id=r.C.state.current.inventory[0].cardId;r.C.events.emit('inventory:handoffSource',{cardId:id,rect:{left:520,top:150,width:280,height:392}});r.C.inventoryModel.update({pendingFocusCardId:id});r.C.inventory.request(true);}});
console.log(JSON.stringify(samples, null, 2));
