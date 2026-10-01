'use strict';
// Actual classic scripts in the existing instrumented DOM. No browser paint/FPS claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {runtime}=require('./check-stage1.cjs');
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name);throw e;}}
function key(r,type,name,extra={}){const e={key:name,code:name===' '?'Space':name,target:r.document.activeElement,repeat:false,preventDefault(){this.prevented=true;},...extra};r.document.fire(type,e);return e;}
function tap(r,name){key(r,'keydown',name);key(r,'keyup',name);}
function clone(o){return JSON.parse(JSON.stringify(o));}
function open(tier='common',duplicate=false,count=1){
 const r=runtime(true);r.advance(40);const C=r.C, select=C.dev.panel.querySelector('select');select.value=tier;select.fire('change');
 const pack=C.data.packs.find(p=>p.enabled&&p.obtainable==='timer');pack.cardsPerPack=count;
 if(duplicate){C.data.cards.filter(c=>c.rarity===tier).forEach((card,i)=>C.state.current.inventory.push({cardId:card.id,instanceId:'owned-fixture-'+i,serial:'CBL-2345-'+String(99+i).padStart(6,'0'),pulledAt:0,seen:false}));C.state.save();}
 key(r,'keydown',' ',{target:r.document.body});r.advance(3000);key(r,'keyup',' ');r.advance(930);tap(r,'Enter');
 return r;
}
function until(r,phase,limit=20000){let spent=0;while(r.C.opening.phase!==phase&&spent<limit){r.advance(20);spent+=20;}assert.equal(r.C.opening.phase,phase);}
function ready(r){until(r,'revealed');let spent=0;while(r.C.opening.keepButton.hidden&&spent<5000){r.advance(20);spent+=20;}assert(!r.C.opening.keepButton.hidden);}
function clickKeep(r){r.click(640,650,r.C.opening.keepButton);}
check('Common, Legendary and Secret retain distinct registered pacing and one full card',()=>{
 for(const id of ['common','legendary','secret']){const r=open(id);until(r,'rising');const C=r.C, data=C.rarity(id).reveal;
  assert.equal(C.opening.view.card.rarity,id);assert.equal(C.opening.timings.riseMs,data.riseMs);assert.equal(C.opening.timings.preFlipPauseMs,data.preFlipPauseMs);assert.equal(C.opening.timings.flipMs,data.flipMs);assert.equal(C.cardView.stats.fullCards,1);
  assert.equal(C.opening.view.side,'back');assert.equal(C.opening.view.el.getAttribute('role'),'group');assert.equal(C.opening.view.el.getAttribute('tabindex'),'-1');
  ready(r);assert.equal(C.opening.stats.shines,1);assert.equal(C.opening.stats.commits,1);assert.equal(C.state.current.inventory.length,0);assert.equal(C.opening.view.stats.stamps,1);
  assert(!r.logs.some(x=>x.level==='error'||x.text.includes('FAIL')));
 }
});
check('rise uses height, scale and Y turn; controlled card keys cannot flip it',()=>{
 const r=open();until(r,'rising');r.advance(200);const v=r.C.opening.view, frame=v.revealFrame;
 assert(frame.pose.y>0);assert(frame.pose.scale>1&&frame.pose.scale<1.06);assert(frame.pose.turn>0&&frame.pose.turn<=6);
 v.el.fire('keydown',{key:'Enter',preventDefault(){}});assert.equal(v.side,'back');
 r.window.innerWidth=200;r.window.innerHeight=400;r.window.fire('resize');assert(parseFloat(r.C.opening.scene.style['--reveal-width'])<=72);
});
check('preFlip dims grid, retains a Secret halo and performs its one-pixel shift without a rarity-spoiling back flourish',()=>{
 const r=open('secret');until(r,'preFlip');r.advance(120);assert.equal(r.C.opening.scene.style.transform,'translateX(1px)');
 assert.equal(r.C.opening.view.revealFrame.backLogo,'cardable');assert.equal(r.C.opening.view.finishState,'found');
 assert(r.C.dots.stats.visibleDots>0);assert(r.drawing.arcs.every(p=>Math.hypot(p.x-640,p.y-360)<r.C.config.revealMotion.haloRadiusPx+5));
 const pending=clone(r.C.state.current.pendingReveal);assert.equal(r.C.state.current.inventory.length,0);assert.equal(r.C.card(pending.cards[0].cardId).rarity,'secret');
 until(r,'flipping');assert.equal(r.C.opening.scene.style.transform,'');
});
check('flip hides cursor, starts shine once at halfway, overshoots and lets the sweep finish in settle',()=>{
 const r=open();r.move(650,350);until(r,'flipping');const cursor=r.document.getElementById('cursor-glow');
 assert(cursor.classList.contains('is-reveal-hidden'));r.advance(350);assert.equal(r.C.opening.stats.shines,0);
 r.advance(50);assert.equal(r.C.opening.stats.shines,1);assert.equal(r.C.opening.view.side,'front');
 r.advance(300);assert(r.C.opening.view.revealFrame.angle<0);until(r,'settling');assert(!cursor.classList.contains('is-reveal-hidden'));
 const shine=r.C.opening.view.el.querySelectorAll('.card__reveal-shine')[0];assert(Number(shine.style.opacity)>0);
 r.advance(800);assert(Number(shine.style.opacity)<0.00001);assert.equal(r.C.opening.stats.shines,1);assert(!r.C.opening.view.revealControlled);
});
check('info staggers name, stamp, VRAM/specs, badge and meter before Keep',()=>{
 const r=open();until(r,'settling');const v=r.C.opening.view, name=v.el.querySelectorAll('.card__name')[0],serial=v.el.querySelectorAll('.card__serial')[0];
 r.advance(100);assert(Number(name.style.opacity)>0);assert.equal(Number(serial.style.opacity),0);
 r.advance(160);assert(Number(serial.style.opacity)>0);assert.equal(Number(v.el.querySelectorAll('.card__badge')[0].style.opacity),0);
 r.advance(400);const specs=v.el.querySelectorAll('.card__spec');assert(specs.every(s=>Number(s.style.opacity)>0));assert(r.C.opening.keepButton.hidden);
 ready(r);assert(v.el.querySelectorAll('.card__meter-tick').every(x=>Number(x.style.opacity)===1));
 assert(v.el.querySelectorAll('.card__serial-char').every(x=>Number(x.style.opacity)===1));assert(r.C.opening.infoClock>=1500);assert.equal(r.C.opening.note.textContent,'New');
});
check('duplicates accelerate only low-tier motion and show their actual stack count',()=>{
 for(const tier of ['common','legendary','secret']){const r=open(tier,true);until(r,'rising');const scale=r.C.rarity(tier).tier<7?.85:1;
  assert.equal(r.C.opening.timings.riseMs,r.C.rarity(tier).reveal.riseMs*scale);assert.equal(r.C.opening.note.textContent,'x2');ready(r);
 }
});
check('still-held initiating keys, repeat Enter and unrelated controls cannot Keep',()=>{
 const r=open();until(r,'rising');key(r,'keydown',' ');ready(r);clickKeep(r);assert.equal(r.C.opening.phase,'revealed');key(r,'keyup',' ');
 key(r,'keydown','Enter',{repeat:true});assert.equal(r.C.opening.phase,'revealed');key(r,'keyup','Enter');
 const input=new r.Element('input');key(r,'keydown','Enter',{target:input});assert.equal(r.C.opening.phase,'revealed');key(r,'keyup','Enter');
 tap(r,'Enter');assert.equal(r.C.opening.phase,'collecting');clickKeep(r);assert.equal(r.C.opening.stats.keeps,1);
});
check('failed Keep retains pending state and storage, then retry commits exactly once',()=>{
 const r=open();ready(r);const before=clone(r.C.state.current),saved=r.store.get('cardable.save'),original=r.window.localStorage.setItem;
 r.window.localStorage.setItem=()=>{throw Error('quota');};clickKeep(r);
 assert.deepEqual(clone(r.C.state.current),before);assert.equal(r.store.get('cardable.save'),saved);assert.equal(r.C.opening.phase,'revealed');assert(!r.C.opening.keepButton.disabled);assert(r.C.opening.error.textContent.includes('reserved'));
 let writes=0;r.window.localStorage.setItem=(k,v)=>{writes++;original(k,v);};clickKeep(r);assert.equal(writes,1);assert.equal(r.C.state.current.inventory.length,1);assert.equal(r.C.state.current.pendingReveal,null);assert.equal(r.C.state.current.stats.packsOpened,1);assert.equal(r.C.state.current.serialCounter,1);
});
check('collection has only lite cards, a single pulse/toast, menu delay and no post-commit replay',()=>{
 const r=open();ready(r);let pulses=0,handoffs=0;r.C.events.on('inventory:collectPulse',()=>pulses++);r.C.events.on('pack:handoff',()=>handoffs++);
 clickKeep(r);assert.equal(r.C.opening.phase,'collecting');assert.equal(r.C.cardView.stats.fullCards,0);assert(r.C.opening.toast.hidden);r.advance(180);assert(!r.C.opening.toast.hidden);assert.equal(r.C.opening.view.el.style.visibility,'hidden');assert.equal(r.C.opening.stats.collections,1);
 r.advance(740);assert.equal(pulses,1);assert.equal(r.C.opening.phase,'collecting');r.advance(220);assert.equal(r.C.opening.phase,'idle');assert.equal(handoffs,1);assert(!r.pack.inert);assert(!r.C.menu.idle);
 assert(r.C.packView.front.el.style.transform.includes('translate'));const restored=runtime(false,false,clone(r.C.state.current));assert.equal(restored.C.opening.phase,'idle');assert.equal(restored.C.state.current.inventory.length,1);
 r.advance(1600);assert(r.C.opening.toast.hidden);assert.equal(pulses,1);
});
check('every committed reveal phase reloads immediately at Keep with identical instances',()=>{
 for(const phase of ['dissolving','cutting','tearing','rising','preFlip','flipping','settling','revealed']){
  const r=runtime(true);const select=r.C.dev.panel.querySelector('select');select.value='secret';select.fire('change');
  key(r,'keydown',' ');r.advance(3000);key(r,'keyup',' ');
  if(!['dissolving','cutting'].includes(phase)){until(r,'cutting');tap(r,'Enter');}until(r,phase);
  const saved=clone(r.C.state.current);delete saved.pendingReveal.keptCount;
  const restored=runtime(false,false,saved);assert.equal(restored.C.opening.phase,'revealed');assert(!restored.C.opening.keepButton.hidden);
  assert.deepEqual(clone(restored.C.state.current.pendingReveal.cards),saved.pendingReveal.cards);assert.equal(restored.C.opening.stats.shines,0);assert.equal(restored.C.opening.stats.commits,0);assert.equal(restored.C.opening.view.finishState,'found');
 }
});
check('multi-card Keep persists progress, recovers the next card and collects once with unique instances',()=>{
 const r=open('common',false,3);ready(r);const all=clone(r.C.state.current.pendingReveal.cards);assert.equal(new Set(all.map(c=>c.serial)).size,3);
 clickKeep(r);assert.equal(r.C.state.current.pendingReveal.keptCount,1);assert.equal(r.C.state.current.inventory.length,0);assert.equal(r.C.opening.cardIndex,1);assert.equal(r.C.opening.phase,'rising');assert.equal(r.C.cardView.stats.fullCards,1);
 const restored=runtime(false,false,clone(r.C.state.current));assert.equal(restored.C.opening.cardIndex,1);assert.equal(restored.C.opening.view.instance.instanceId,all[1].instanceId);
 clickKeep(restored);ready(restored);clickKeep(restored);assert.equal(restored.C.opening.phase,'collecting');assert.equal(restored.C.state.current.inventory.length,3);assert.deepEqual(clone(restored.C.state.current.inventory),all);
 assert.equal(restored.C.opening.stats.collections,1);assert.equal(restored.C.cardView.stats.fullCards,0);assert.equal(restored.C.opening.el.querySelectorAll('.collection-flight').length,3);assert.equal(restored.C.opening.toast.querySelectorAll('.collection-toast-name')[0].textContent,'3 cards');
 restored.advance(1200);assert.equal(restored.C.opening.phase,'idle');assert.equal(restored.C.state.current.serialCounter,3);assert.equal(restored.C.state.current.stats.packsOpened,1);
});
check('same-card results inside a pack become x2/x3 without changing saved instances',()=>{
 const r=open('common',false,3);const pending=r.C.state.current.pendingReveal;pending.cards.forEach(c=>c.cardId=pending.cards[0].cardId);r.C.state.save();ready(r);clickKeep(r);assert.equal(r.C.opening.note.textContent,'x2');ready(r);clickKeep(r);assert.equal(r.C.opening.note.textContent,'x3');ready(r);clickKeep(r);assert.equal(r.C.state.current.inventory.length,3);
});
check('hidden tabs pause flip, shine, stamp, collection and toast while timer/title remain real',()=>{
 const r=open('legendary');until(r,'flipping');r.advance(700);const frame=clone(r.C.opening.view.revealFrame),stats=r.C.opening.stats.shines;
 r.hidden(true);r.advance(20000);assert.deepEqual(clone(r.C.opening.view.revealFrame),frame);assert.equal(r.C.opening.stats.shines,stats);assert.equal(r.document.title,'Cardable · pack ready');
 r.hidden(false);ready(r);clickKeep(r);r.advance(200);const flight=r.C.opening.el.querySelectorAll('.collection-flight')[0],transform=flight.style.transform,toast=r.C.opening.toast.style.opacity;
 r.hidden(true);r.advance(10000);assert.equal(flight.style.transform,transform);assert.equal(r.C.opening.toast.style.opacity,toast);assert.equal(r.C.opening.phase,'collecting');r.hidden(false);r.advance(920);assert.equal(r.C.opening.phase,'idle');
});
check('live reduced motion removes turn/shift/dust, keeps soft shine and fades collection in place',()=>{
 const r=open('secret');until(r,'preFlip');r.reduced(true);r.advance(120);assert.equal(r.C.opening.scene.style.transform,'');assert.equal(r.C.opening.view.revealFrame.backLogo,'cardable');until(r,'flipping');r.advance(1200);
 const shine=r.C.opening.view.el.querySelectorAll('.card__reveal-shine')[0];assert.equal(shine.style.transform,'none');assert.equal(r.C.opening.view.el.querySelectorAll('.card__flipper')[0].style.transform,'none');
 until(r,'settling');assert.equal(r.C.opening.stats.particles,0);ready(r);clickKeep(r);r.advance(200);assert.equal(r.C.opening.toast.style.transform,'translateX(-50%)');assert(!r.C.opening.el.querySelectorAll('.collection-flight')[0].style.transform.includes('scale'));
 r.reduced(false);r.advance(1000);assert.equal(r.C.opening.phase,'idle');
});
check('reset and replay clean up holds/views without rerolling or changing counters',()=>{
 const r=open('secret');ready(r);const saved=clone(r.C.state.current);r.C.events.emit('opening:replay');assert.equal(r.C.opening.phase,'cutting');assert.equal(r.C.opening.view,null);assert.deepEqual(clone(r.C.state.current),saved);
 tap(r,'Enter');ready(r);assert.equal(r.C.opening.stats.commits,1);clickKeep(r);r.advance(100);r.C.state.reset();assert.equal(r.C.opening.phase,'idle');assert(r.C.opening.toast.hidden);assert.equal(r.C.cardView.stats.fullCards,0);assert(!r.pack.inert);assert(!r.document.getElementById('cursor-glow').classList.contains('is-reveal-hidden'));
});
check('existing ten-layer stack and classic offline loading are retained',()=>{
 const r=open();ready(r);assert.equal(r.C.opening.view.el.querySelectorAll('.card__face--front')[0].children.length,9);assert.equal(r.C.opening.view.el.querySelectorAll('.card__face--back')[0].children.length,9);
 const source=fs.readFileSync(path.join(__dirname,'../src/ui/opening.js'),'utf8');assert(!source.includes('requestAnimationFrame('));assert(!source.includes('setInterval('));assert(!source.includes('marketValueUsd'));
 assert.equal(r.C.config.flags.market,false);assert.equal(r.C.config.flags.audio,false);assert.equal(r.C.config.flags.variants,false);
});
check('New adds exactly 200ms at the final hold while low-tier duplicate info delays remain readable',()=>{
 const r=open();ready(r);const info=r.C.opening.infoClock;
 const d=open('common',true);ready(d);assert(Math.abs(info-d.C.opening.infoClock-200)<25, 'New infoClock=' + info + ', duplicate infoClock=' + d.C.opening.infoClock);
});
check('holding original Space or tear Enter through reveal never activates Keep',()=>{
 const r=runtime();key(r,'keydown',' ');r.advance(4000);assert.equal(r.C.opening.phase,'cutting');
 key(r,'keyup',' ');key(r,'keydown','Enter');ready(r);key(r,'keydown','Enter',{repeat:true});clickKeep(r);assert.equal(r.C.opening.phase,'revealed');key(r,'keyup','Enter');tap(r,'Enter');assert.equal(r.C.opening.phase,'collecting');
 const b=runtime();key(b,'keydown',' ');b.advance(4000);b.C.events.emit('input:tear');ready(b);clickKeep(b);assert.equal(b.C.opening.phase,'revealed');key(b,'keyup',' ');clickKeep(b);assert.equal(b.C.opening.phase,'collecting');
});
check('Space keeps its native behavior on unrelated controls',()=>{
 const r=runtime(true), button=r.C.dev.panel.querySelectorAll('button')[0];
 assert(!key(r,'keydown',' ',{target:button}).prevented);assert(!key(r,'keyup',' ',{target:button}).prevented);assert.equal(r.C.opening.phase,'idle');
});
check('hidden settling preserves serial and meter progress and resumes on visible frames',()=>{
 const r=open();until(r,'settling');r.advance(420);const serial=r.C.opening.view.el.querySelectorAll('.card__serial-char').map(c=>c.style.opacity),clock=r.C.opening.infoClock;
 r.hidden(true);r.advance(10000);assert.deepEqual(r.C.opening.view.el.querySelectorAll('.card__serial-char').map(c=>c.style.opacity),serial);assert.equal(r.C.opening.infoClock,clock);r.hidden(false);r.advance(200);assert(r.C.opening.infoClock>clock);assert(r.C.opening.keepButton.hidden);
});
check('live reduced motion after landing keeps the front visible and immediately clears dust',()=>{
 const r=open('legendary');until(r,'settling');r.advance(100);assert(r.C.opening.stats.particles>0);r.reduced(true);r.advance(20);
 assert.equal(r.C.opening.stats.particles,0);const v=r.C.opening.view;assert.equal(v.el.querySelectorAll('.card__face--front')[0].style.opacity,1);assert.equal(v.el.querySelectorAll('.card__face--back')[0].style.opacity,0);
 ready(r);r.reduced(false);r.advance(20);assert.equal(v.el.querySelectorAll('.card__face--back')[0].style.opacity,'');assert.equal(v.side,'front');
});
check('live color/mono changes update finish/bloom, persist the display preference and preserve pending data',()=>{
 const r=open('secret');ready(r);const saved=clone(r.C.state.current), button=r.C.dev.panel.querySelectorAll('button').find(b=>b.textContent==='Toggle rarityColorMode');
 const original=r.C.config.rarityColorMode;r.click(10,10,button);assert.notEqual(r.C.config.rarityColorMode,original);assert.equal(r.C.opening.view.el.dataset.colorMode,r.C.config.rarityColorMode);saved.settings.rarityColorMode=r.C.config.rarityColorMode;assert.deepEqual(clone(r.C.state.current),saved);
 r.click(10,10,button);assert.equal(r.C.config.rarityColorMode,original);assert.equal(r.C.opening.view.el.dataset.colorMode,original);
 assert.equal(r.C.opening.scene.querySelectorAll('.opening-bloom')[0].style['--reveal-accent'],original==='mono'?'white':'#FFFFFF');
});
check('collection resize retargets lite flights without another commit or pulse',()=>{
 const r=open();ready(r);clickKeep(r);r.advance(200);let pulse=0;r.C.events.on('inventory:collectPulse',()=>pulse++);
 const mount=r.C.opening.scene.querySelectorAll('.opening-card-mount')[0];mount.rect={left:500,top:100,width:300,height:420};r.C.inventoryHint.arrow.rect={left:900,top:650,width:20,height:20};r.window.innerWidth=1800;r.window.fire('resize');r.advance(20);
 const flight=r.C.opening.el.querySelectorAll('.collection-flight')[0];assert.equal(flight.style.width,'300px');assert(!flight.style.transform.includes('NaN'));r.advance(1000);assert.equal(pulse,1);assert.equal(r.C.opening.stats.keeps,1);
});
check('final Keep deduplicates existing instance IDs and emits kept after the collection phase begins',()=>{
 const r=open();ready(r);const instance=r.C.state.current.pendingReveal.cards[0];r.C.state.current.inventory.push(clone(instance));let eventPhase;
 r.C.events.on('card:kept',()=>{eventPhase=r.C.opening.phase;r.C.state.save();});clickKeep(r);assert.equal(eventPhase,'collecting');assert.equal(r.C.state.current.inventory.length,1);assert.equal(r.C.opening.phase,'collecting');
});
console.log('\n'+passed+' reveal/collection behavior groups passed. Visuals, screenshots and measured FPS remain unverified.');
