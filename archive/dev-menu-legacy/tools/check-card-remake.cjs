'use strict';
// Durable reward/discard checks in the existing simulated runtime; browser checks are separate.
const assert=require('node:assert/strict');
const {runtime}=require('./check-stage1.cjs');
let passed=0;const clone=x=>JSON.parse(JSON.stringify(x));
function check(name,fn){fn();passed++;console.log('PASS '+name);}
function key(r,type,name,target=r.document.body,extra={}){r.document.fire(type,{key:name,code:name===' '?'Space':name,target,repeat:false,preventDefault(){},...extra});}
function tap(r,name,target){key(r,'keydown',name,target);key(r,'keyup',name,target);}
function charge(r){key(r,'keydown',' ');r.advance(3000);key(r,'keyup',' ');}
function until(r,phase){let t=0;while(r.C.opening.phase!==phase&&t<20000){r.advance(30);t+=30;}assert.equal(r.C.opening.phase,phase);}
function ready(r){until(r,'cutting');tap(r,'Enter');until(r,'revealed');r.advance(3000);assert(!r.C.opening.keepButton.hidden);assert(!r.C.opening.deleteButton.hidden);}
function decide(r,discard){r.click(600,640,discard?r.C.opening.deleteButton:r.C.opening.keepButton);}
check('the first seven portrait tiers and their odds survive the second remake pass',()=>{
 const r=runtime(true,true),C=r.C;assert.deepEqual(Array.from(C.data.rarities.filter(x=>x.frontDesign==='full-art'&&x.tier<=6),x=>x.id),['basic','common','uncommon','rare','super-rare','unusual','double-super-rare']);
 assert.deepEqual(Array.from(C.data.rarities.slice(0,7),x=>x.chance),[46.5,23.5,15,7.5,2.5,2,1.5]);
 for(const v of C.gallery.views.filter(x=>C.rarity(x.card.rarity).tier<=6)){
  assert(v.el.querySelectorAll('.card__brand').length);assert(v.el.querySelectorAll('.card__spec-icon').length>=3);assert(v.el.querySelectorAll('.card__badge')[0].textContent===C.rarity(v.card.rarity).name);
  assert.equal(v.el.querySelectorAll('.card__prop')[0].children.length,0);assert(v.el.querySelectorAll('.card__spec').length<=4);
 }
 assert(C.gallery.views.filter(x=>x.card.rarity==='limited').every(v=>!v.el.dataset.frontDesign));
});
check('cancel and failed charge award nothing; successful retry makes one durable reward',()=>{
 const r=runtime(true),C=r.C;r.advance(40);key(r,'keydown',' ');r.advance(2999);key(r,'keyup',' ');r.advance(730);assert.equal(C.state.current.currency,0);
 const before=clone(C.state.current),saved=r.store.get('cardable.save'),set=r.window.localStorage.setItem;let rewards=0;C.events.on('pack:reward',()=>rewards++);
 r.window.localStorage.setItem=()=>{throw Error('quota');};charge(r);r.advance(730);assert.deepEqual(clone(C.state.current),before);assert.equal(r.store.get('cardable.save'),saved);assert.equal(rewards,0);
 let writes=0;r.window.localStorage.setItem=(k,v)=>{writes++;set(k,v);};charge(r);assert.equal(writes,1);assert.equal(C.state.current.currency,200);assert.equal(rewards,1);assert.equal(JSON.parse(r.store.get('cardable.save')).currency,200);
});
check('failed Delete preserves the reserved card and balance; retry discards once without collection',()=>{
 const r=runtime(true),C=r.C;r.advance(40);charge(r);ready(r);const before=clone(C.state.current),set=r.window.localStorage.setItem;let discarded=0;C.events.on('card:discarded',()=>discarded++);
 r.window.localStorage.setItem=()=>{throw Error('quota');};decide(r,true);assert.deepEqual(clone(C.state.current),before);assert(!C.opening.deleteButton.disabled);assert.equal(discarded,0);
 r.window.localStorage.setItem=set;decide(r,true);decide(r,true);assert.equal(C.state.current.currency,200);assert.equal(C.state.current.inventory.length,0);assert.equal(C.state.current.pendingReveal,null);assert.equal(discarded,1);assert.equal(C.opening.stats.collections,0);r.advance(340);assert.equal(C.opening.phase,'idle');
 const restored=runtime(false,false,clone(C.state.current));assert.equal(restored.C.state.current.currency,200);assert.equal(restored.C.opening.phase,'idle');
});
check('reload of a committed pack never awards again and Keep preserves the same reward',()=>{
 const r=runtime(true);r.advance(40);charge(r);const saved=clone(r.C.state.current),restored=runtime(false,false,saved),C=restored.C;
 assert.equal(C.state.current.currency,200);assert.equal(C.opening.phase,'revealed');decide(restored,false);assert.equal(C.state.current.currency,200);assert.equal(C.state.current.inventory.length,1);assert.equal(C.opening.stats.commits,0);
});
check('mixed decisions in a future multi-card pack survive reload and award per pack',()=>{
 const r=runtime(true),C=r.C;r.advance(40);C.pack('standard').cardsPerPack=3;charge(r);ready(r);const cards=clone(C.state.current.pendingReveal.cards);decide(r,true);
 assert.equal(C.state.current.pendingReveal.keptCount,1);assert.equal(C.state.current.currency,200);
 const restored=runtime(false,false,clone(C.state.current)),D=restored.C;assert.equal(D.opening.cardIndex,1);decide(restored,false);until(restored,'revealed');restored.advance(3000);decide(restored,true);
 assert.equal(D.state.current.currency,200);assert.equal(D.state.current.pendingReveal,null);assert.deepEqual(Array.from(D.state.current.inventory,x=>x.instanceId),[cards[1].instanceId]);assert.equal(D.opening.stats.collections,1);
});
check('Delete ignores held initiating Space and repeat Enter; focused Enter deletes explicitly',()=>{
 const r=runtime(true),C=r.C;r.advance(40);key(r,'keydown',' ');r.advance(3000);until(r,'cutting');C.events.emit('input:tear');until(r,'revealed');r.advance(3000);decide(r,true);assert(C.state.current.pendingReveal);key(r,'keyup',' ');
 key(r,'keydown','Enter',C.opening.deleteButton,{repeat:true});assert(C.state.current.pendingReveal);key(r,'keyup','Enter',C.opening.deleteButton);
 tap(r,'Enter',C.opening.deleteButton);assert.equal(C.state.current.pendingReveal,null);assert.equal(C.state.current.inventory.length,0);
});
check('lite backs show serials immediately; reward flights clean up and reduced motion emits no coins',()=>{
 const r=runtime(true,true),C=r.C,v=C.gallery.views[0];v.setMode('lite');v.setFace('back');assert(v.el.querySelectorAll('.card__back-char').every(x=>Number(x.style.opacity)===1));
 const s=runtime(true);s.advance(40);charge(s);assert.equal(s.document.body.querySelectorAll('.pack-reward__coin').length,6);s.advance(1800);assert.equal(s.document.body.querySelectorAll('.pack-reward').length,0);
 const reduced=runtime(true);reduced.advance(40);reduced.reduced(true);charge(reduced);assert.equal(reduced.document.body.querySelectorAll('.pack-reward__coin').length,0);assert.equal(reduced.C.state.current.currency,200);
});
console.log('\n'+passed+' card remake and reward/discard behavior groups passed.');
