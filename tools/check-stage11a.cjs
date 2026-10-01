'use strict';
// Instrumented classic-script DOM and clock. This suite makes no browser paint/FPS claim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runtime } = require('./check-stage1.cjs');
const clone = x => JSON.parse(JSON.stringify(x));
let count = 0;
function check(name, fn) { try { fn(); console.log('PASS ' + name); count++; } catch (e) { console.error('FAIL ' + name); throw e; } }
function boot(options = {}) { const seed = runtime().C.state.fresh(); seed.tutorial = {step:'done',done:true}; const r = runtime(!!options.dev, !!options.gallery, options.save || seed, !!options.tutorial, true); r.advance(600); return r; }
function key(r, name, type = 'keydown', target = r.document.body, extra = {}) { const e = {key:name,code:name===' '?'Space':name,target,repeat:false,preventDefault(){this.prevented=true;},...extra}; r.document.fire(type,e); return e; }
function tap(r, name, target) { key(r,name,'keydown',target); key(r,name,'keyup',target); }
function until(r, phase) { for(let i=0;i<2000 && (r.C.opening.phase!==phase || phase==='revealed' && r.C.opening.keepButton.hidden);i++)r.advance(20); assert.equal(r.C.opening.phase,phase); }
function freshPending(r) { const s=clone(r.C.state.current); s.serialCounter=1; const card=r.C.data.cards[0];s.pendingReveal={packId:r.C.data.packs[0].id,committedAt:1,keptCount:0,cards:[{instanceId:'pending-one',cardId:card.id,serial:r.C.serial.format(s.playerCode,1),pulledAt:1,seen:false}]}; return s; }
check('defaults, enums, booleans, finite volume and unknown-field removal',()=>{
 const r=boot(),s=r.C.settingsSchema.normalize({motion:'wrong',quality:null,cursorGlow:'true',volume:101,nudgeDismissed:1,extra:1});
 assert.equal(s.motion,'auto');assert.equal(s.quality,'high');assert.equal(s.cursorGlow,true);assert.equal(s.volume,100);assert.equal(s.nudgeDismissed,false);assert(!('extra'in s));
 assert.equal(r.C.settingsSchema.normalize({volume:-4}).volume,0);assert.equal(r.C.settingsSchema.normalize({volume:Infinity}).volume,70);
 assert.equal(r.C.state.current.settings.settingsVersion,1);assert.equal(r.C.state.current.schemaVersion,2);
});
check('legacy preferences migrate without touching game progress',()=>{
 const r=boot(),s=clone(r.C.state.current);s.settings={reducedMotion:false,rarityColorMode:'mono'};s.currency=123;const next=boot({save:s});next.reduced(true);
 assert.equal(next.C.settings.get('motion'),'off');assert.equal(next.C.config.rarityColorMode,'mono');assert(!next.C.motion.reduced);assert.equal(next.C.state.current.currency,123);assert(!('reducedMotion'in next.C.state.current.settings));
});
check('invalid settings containers default without replacing a valid save',()=>{
 const r=boot();for(const invalid of [null,[],42,'old']){const s=clone(r.C.state.current);s.currency=789;s.settings=invalid;const n=boot({save:s});assert.equal(n.C.state.current.currency,789);assert.equal(n.C.settings.get('quality'),'high');assert.equal(n.C.state.recovery,null);}
});
check('one write and one event per change; compatibility callers do not loop',()=>{
 const r=boot();let writes=0,events=0;const original=r.window.localStorage.setItem;r.window.localStorage.setItem=(k,v)=>{writes++;original(k,v);};const stop=r.C.settings.onChange('rarityColor',()=>events++);
 r.C.settings.set('rarityColor','mono');assert.equal(writes,1);assert.equal(events,1);r.C.events.emit('settings:rarityColorMode','color');assert.equal(writes,2);assert.equal(events,2);
 stop();stop();r.C.settings.set('rarityColor','mono');assert.equal(events,2);r.C.settings.set('rarityColor','mono');assert.equal(writes,3);
});
check('storage failure applies session settings, with honest feedback and memory reload',()=>{
 const r=boot();r.C.preferences.show();r.window.localStorage.setItem=()=>{throw Error('blocked');};r.C.settings.set('quality','low');r.advance(240);
 assert.equal(r.C.settings.get('quality'),'low');assert(!r.C.settings.saved);assert(r.C.preferences.feedback.textContent.includes('session only'));assert(!r.C.preferences.feedback.textContent.includes('Saved'));
 r.window.localStorage.getItem=()=>{throw Error('blocked');};r.C.state.load();assert.equal(r.C.settings.get('quality'),'low');
});
check('reload, reset and replacement preserve validated settings and progress ownership',()=>{
 const r=boot();r.C.settings.set('openKey','enter');r.C.settings.set('dots','subtle');let replaced=0;r.C.events.on('save:replaced',()=>replaced++);r.C.state.reset();assert.equal(r.C.settings.get('openKey'),'enter');assert.equal(replaced,1);
 const next=boot({save:clone(r.C.state.current)});assert.equal(next.C.settings.get('dots'),'subtle');const imported=clone(next.C.state.current);imported.settings={quality:'medium',garbage:2};next.C.saveFiles.apply(imported);assert.equal(next.C.settings.get('quality'),'medium');assert.equal(next.C.settings.get('openKey'),'space');
});
check('motion Auto/On/Off precedence survives live OS changes and CSS uses resolved class',()=>{
 const r=boot();r.reduced(true);assert(r.C.motion.reduced);r.C.settings.set('motion','off');assert(!r.C.motion.reduced);r.reduced(false);r.reduced(true);assert(!r.C.motion.reduced);r.C.settings.set('motion','on');r.reduced(false);assert(r.C.motion.reduced);r.C.settings.set('motion','auto');assert(!r.C.motion.reduced);
 for(const name of ['menu','pack','opening','tutorial','inventory'])assert(!fs.readFileSync('src/styles/'+name+'.css','utf8').includes('@media (prefers-reduced-motion'));
});
check('Subtle scales dots/ripples, removes trails; Off detaches and restores one canvas',()=>{
 const r=boot();r.C.settings.set('dots','subtle');const p=r.C.settings.dotsPolicy();assert.equal(p.maxAlpha,r.C.config.dots.maxAlpha*.5);assert.equal(p.influenceRadius,r.C.config.dots.influenceRadius*.8);assert.equal(p.lean,0);assert(!p.trail);
 r.move(300,300);r.move(900,300);r.advance(40);assert.equal(r.C.dots.stats.trailCells,0);r.C.settings.set('dots','off');r.advance(40);assert(!r.document.body.contains(r.canvas));const draws=r.C.dots.stats.draws;r.move(800,400);r.click(800,400);r.advance(1000);assert.equal(r.C.dots.stats.draws,draws);assert.equal(r.C.dots.stats.ripples,0);
 r.C.settings.set('dots','on');r.advance(40);assert(r.document.body.contains(r.canvas));assert(r.C.dots.stats.visibleDots>0);
});
check('quality matrix limits ripple, finish update rate, particle count and preserves ten structural layers',()=>{
 const r=boot();for(const [quality,hz,limit,scale] of [['high',60,3,1],['medium',30,2,.5],['low',15,1,.15]]){
 r.C.settings.set('quality',quality);assert.equal(r.C.settings.policy.finishHz,hz);assert.equal(r.C.settings.policy.rippleLimit,limit);
 r.click(600,500);r.click(600,500);r.click(600,500);r.advance(30);assert(r.C.dots.stats.ripples<=limit);
 let calls=0,clock=0;r.C.finishes.register('check-'+quality,{mount(){return{};},update(dt){calls++;clock+=dt;return true;},destroy(){},lite(){return new r.Element('div');}});const binding=r.C.finishes.bind('check-'+quality,new r.Element('div'),{},{});for(let i=0;i<60;i++)binding.update(1000/60,{});assert.equal(calls,hz);assert(Math.abs(clock-1000)<.1);binding.destroy();
 const pool=r.C.particles.create(new r.Element('div'),40);pool.emit('dissolve',null,100,100);assert.equal(pool.count,Math.ceil(40*scale));
 }
 r.C.preferences.show();const view=r.C.preferences.preview;assert.equal(view.el.querySelectorAll('.card__face--front')[0].children.length,9);assert.equal(view.el.querySelectorAll('.card__shadow').length,1);
 const css=fs.readFileSync('src/styles/settings.css','utf8');for(const layer of ['shadow','foil','beam'])assert(css.includes('[data-quality="low"] .card__'+layer));
});
check('cursor Off sleeps but preserves cutting blade; idle Never and five seconds keep holds',()=>{
 const r=boot();r.C.settings.set('cursorGlow',false);r.move(200,200);r.advance(30);const cursor=r.document.getElementById('cursor-glow');assert(!cursor.classList.contains('is-present'));r.C.events.emit('cursor:blade',true);r.advance(30);assert(cursor.classList.contains('is-present'));r.C.events.emit('cursor:blade',false);
 r.C.settings.set('idleFade','never');r.advance(10000);assert(!r.C.menu.idle);r.C.settings.set('idleFade','5');r.advance(4900);assert(!r.C.menu.idle);r.advance(150);assert(r.C.menu.idle);r.C.menu.holdVisible('check');assert(!r.C.menu.idle);r.advance(6000);assert(!r.C.menu.idle);r.C.menu.holdVisible('check',false);
});
check('panel blocks charge and inventory, requires fresh press and is disabled for every non-idle phase',()=>{
 const r=boot();r.C.preferences.show();r.advance(200);const packs=r.C.state.current.packs.ready;key(r,' ');r.advance(3100);r.C.input.chargeStart();assert.equal(r.C.opening.phase,'idle');r.C.events.emit('inventory:request',true);assert(!r.C.inventory.active);
 r.C.preferences.close();key(r,' ', 'keydown',r.document.body,{repeat:true});r.advance(50);assert.equal(r.C.opening.phase,'idle');key(r,' ','keyup');key(r,' ');assert.equal(r.C.opening.phase,'charging');assert(r.C.preferences.gear.disabled);assert.equal(r.C.preferences.show(),false);key(r,' ','keyup');r.advance(800);assert.equal(r.C.state.current.packs.ready,packs);
 const recovered=boot({save:freshPending(r)});assert.equal(recovered.C.opening.phase,'revealed');assert.equal(recovered.C.preferences.show(),false);assert(recovered.C.preferences.gear.disabled);
});
check('both hold/action mappings charge, cancel, tear and collect without changing the fixed hold',()=>{
 for(const mapping of ['space','enter']){
 const r=boot();r.C.settings.set('openKey',mapping);const hold=mapping==='enter'?'Enter':' ',action=mapping==='enter'?' ':'Enter';
 tap(r,action);assert.equal(r.C.opening.phase,'idle');key(r,hold);r.advance(2900);key(r,hold,'keyup');assert.equal(r.C.opening.phase,'draining');r.advance(800);
 key(r,hold);r.advance(3050);assert.equal(r.C.opening.stats.commits,1);key(r,hold,'keyup');until(r,'cutting');tap(r,action);until(r,'revealed');assert(!r.C.opening.keepButton.hidden);tap(r,action);until(r,'idle');assert.equal(r.C.state.current.inventory.length,1);assert.equal(r.C.opening.stats.collections,1);
 }
});
check('typing and unrelated controls are excluded, repeats and R cannot commit a pack',()=>{
 const r=boot();for(const mapping of ['space','enter']){r.C.settings.set('openKey',mapping);const hold=mapping==='enter'?'Enter':' ';tap(r,hold,new r.Element('input'));tap(r,hold,new r.Element('button'));key(r,hold,'keydown',r.document.body,{repeat:true});key(r,hold,'keyup');tap(r,'r');assert.equal(r.C.opening.phase,'idle');}
});
check('Space is an additional fresh Keep shortcut for both mappings',()=>{
 for(const mapping of ['space','enter']){const r=boot(),s=freshPending(r);s.settings.openKey=mapping;const n=boot({save:s});key(n,' ','keydown',n.document.body,{repeat:true});assert(n.C.state.current.pendingReveal);key(n,' ','keyup');tap(n,' ');until(n,'idle');assert.equal(n.C.state.current.inventory.length,1);assert.equal(n.C.opening.stats.collections,1);}
});
check('a live key remap still releases the original initiating key and updates the pack hint',()=>{
 const r=boot();key(r,' ');r.advance(1000);r.C.settings.set('openKey','enter');key(r,' ','keyup');assert.equal(r.C.opening.phase,'draining');r.advance(800);assert.equal(r.C.opening.stats.commits,0);assert.equal(r.C.packView.el.querySelectorAll('.pack-key-hint')[0].querySelector('kbd').textContent,'Enter');
});
check('unrelated key releases cannot cancel a pointer-owned charge',()=>{
 const r=boot();r.C.input.chargeStart();r.advance(500);tap(r,'r');tap(r,'s');assert.equal(r.C.opening.phase,'charging');assert(!r.C.preferences.open);r.C.input.chargeEnd();assert.equal(r.C.opening.phase,'draining');
});
check('preview uses newest acquisition, cycles every registered tier, never allocates serials and owns sole full focus',()=>{
 const r=boot();const s=clone(r.C.state.current);s.serialCounter=2;s.inventory=[1,2].map(i=>({instanceId:'owned-'+i,cardId:r.C.data.cards[i].id,serial:r.C.serial.format(s.playerCode,i),pulledAt:i,seen:false}));const next=boot({save:s,gallery:true});const prior=next.C.gallery&&next.C.cardView.active;const before=JSON.stringify(next.C.state.current);next.C.preferences.show();assert.equal(next.C.preferences.preview.instance.instanceId,'owned-2');assert.equal(next.C.cardView.stats.fullCards,1);
 const buttons=next.C.preferences.panel.querySelectorAll('button'),cycle=buttons.find(b=>b.textContent==='›');let foundSecret=false;
 for(let i=0;i<next.C.data.rarities.length;i++){if(next.C.preferences.preview.card.rarity==='secret'){foundSecret=true;assert.equal(next.C.preferences.preview.finishState,'unfound');}cycle.fire('click');assert.equal(next.C.cardView.stats.fullCards,1);}
 assert(foundSecret);assert.equal(JSON.stringify(next.C.state.current),before);next.C.preferences.close();if(prior&&!prior.destroyed)assert.equal(next.C.cardView.active,prior);
});
check('tilt changes caps live, serial preference targets front only and rarity switch uses old event',()=>{
 const r=boot();r.C.preferences.show();const v=r.C.preferences.preview;
 for(const [name,cap] of [['low',8],['normal',14],['high',18]]){r.C.settings.set('tilt',name);r.move(1000,1000,v.el);r.advance(800);assert(Math.abs(parseFloat(v.el.style['--rx']))<=cap+.01);assert(Math.abs(parseFloat(v.el.style['--ry']))<=cap+.01);}
 r.C.settings.set('rarityColor','mono');assert.equal(v.el.dataset.colorMode,'mono');r.C.settings.set('serialOnFront',false);assert.equal(r.document.documentElement.getAttribute('data-serial-on-front'),'false');const css=fs.readFileSync('src/styles/settings.css','utf8');assert(css.includes('.card__face--front .card__serial'));assert(!css.includes('.card__back-serial { visibility'));
});
check('quality throttles core glare while pose and controlled reveal remain at display cadence',()=>{
 for(const controlled of [false,true])for(const [quality,hz] of [['high',60],['medium',30],['low',15]]){
  const r=boot();r.C.settings.set('quality',quality);const card=r.C.data.cards.find(c=>!c.retired),v=r.C.cardView.create(card,{serial:'PREVIEW',cardId:card.id},{controlledReveal:controlled,autoStamp:false});v.setMode('full');let writes=0;const original=v.el.style.setProperty;v.el.style.setProperty=function(k,value){if(k==='--core-x')writes++;return original.call(this,k,value);};
  const before=v.stats.updates;for(let i=0;i<120;i++){v.pointer({pointer:{x:100+Math.sin(i*.1)*8,y:70}});v.update(i*1000/120,1000/120);if(controlled)v.setRevealFrame({pose:{y:0,turn:i/100,scale:1},angle:180});}
  assert.equal(v.stats.updates-before,120);assert(writes>=hz-1&&writes<=hz+1,quality+' core paints '+writes);v.destroy();
 }
});
check('Fast reveal preserves normalized live phase progress and never speeds charge or cut',()=>{
 const r=boot();key(r,' ');r.advance(3050);key(r,' ','keyup');until(r,'cutting');tap(r,'Enter');until(r,'rising');r.advance(200);const old=r.C.opening.timings.riseMs,before=r.C.opening.view.revealFrame.pose.y;r.C.settings.set('revealSpeed','fast');assert.equal(r.C.opening.timings.riseMs,old*.7);r.advance(1000/60);const after=r.C.opening.view.revealFrame.pose.y;assert(after<=before&&after>before*.85,'live timing change must not jump the pose');assert.equal(r.C.config.hold.chargeMs,3000);
 const t=r.C.settings.revealTiming({riseMs:1000,flipMs:1000,preFlipPauseMs:1000},11,1);assert.equal(t.preFlipPauseMs,600);assert.equal(t.riseMs,700);assert.equal(r.C.settings.cutPolicy.span,.8);r.C.settings.set('cutAssist','easy');assert.equal(r.C.settings.cutPolicy.span,.6);assert.equal(r.C.settings.cutPolicy.smoothing,2);assert.equal(r.C.settings.cutPolicy.tolerance,1.5);
});
check('defaults confirm expires at three seconds; Undo lasts eight, Escape respects nested layers',()=>{
 const r=boot();r.C.preferences.show();r.C.settings.set('dots','off');const p=r.C.preferences;p.defaults.fire('click');assert(p.confirmation.active);r.advance(3100);assert(!p.confirmation.active);assert.equal(r.C.settings.get('dots'),'off');p.defaults.fire('click');tap(r,'Escape');assert(!p.confirmation.active);assert(p.open);p.defaults.fire('click');p.defaults.fire('click');assert.equal(r.C.settings.get('dots'),'on');assert(!p.undo.hidden);p.undo.fire('click');assert.equal(r.C.settings.get('dots'),'off');p.defaults.fire('click');p.defaults.fire('click');r.advance(8100);assert(p.undo.hidden);
 p.panel.querySelectorAll('button').find(b=>b.textContent==='Credits and licenses').fire('click');assert(!p.credits.hidden);tap(r,'Escape');assert(p.credits.hidden);assert(p.open);tap(r,'Escape');assert(!p.open);assert.equal(r.document.activeElement,p.gear);
});
check('reusable hold confirmation rejects short holds/repeats and cancels on Escape, blur and hiding',()=>{
 const r=boot(),b=new r.Element('button');b.textContent='Reset';let actions=0;const before=r.document.listeners.get('pointerup').length,c=r.C.settingsControls.confirmation(b,()=>actions++,{mode:'hold'});
 const start=()=>b.fire('keydown',{key:'Enter',preventDefault(){}}),update=ms=>c.update(r.now()+ms,ms);
 start();update(2900);b.fire('keyup',{key:'Enter'});update(700);assert.equal(actions,0);assert(!c.active);b.fire('keydown',{key:'Enter',repeat:true,preventDefault(){}});update(3000);assert.equal(actions,0);
 for(const abort of [()=>tap(r,'Escape'),()=>b.fire('blur'),()=>r.hidden(true)]){start();update(1000);abort();update(3000);assert.equal(actions,0);assert(!c.active);r.hidden(false);}
 start();update(3000);update(100);assert.equal(actions,1);c.destroy();assert.equal(r.document.listeners.get('pointerup').length,before);
});
check('repeated modal cycles and tier changes do not retain card views, subscriptions or focus traps',()=>{
 const r=boot({gallery:true});r.C.preferences.show();r.C.preferences.close();r.advance(3000);const listeners=r.C.events.listenerCount,views=r.C.cardView.stats.liveViews,subscribers=r.C.fx.stats.subscribers;
 for(let i=0;i<50;i++){r.C.preferences.show();r.C.preferences.panel.querySelectorAll('button').find(b=>b.textContent==='›').fire('click');r.C.preferences.close();r.advance(350);}
 assert.equal(r.C.events.listenerCount,listeners);assert.equal(r.C.cardView.stats.liveViews,views);assert.equal(r.C.fx.stats.subscribers,subscribers);assert.equal(r.C.cardView.stats.fullCards,0);assert(!key(r,'Tab').prevented);
});
check('the preview keeps sole focus through live inventory rebuilds and restores the surviving selection',()=>{
 const r=boot();r.C.events.emit('inventory:preview',300);r.C.inventory.request(true);r.advance(1200);const index=r.C.inventory.entries.findIndex(e=>e.owned);r.C.inventory.carousel.snap(index*(parseFloat(r.C.inventory.shelf.style['--inventory-tile-width'])+r.C.config.inventoryMotion.tileGapPx));r.advance(1400);const id=r.C.cardView.active.card.id;r.C.preferences.show();r.C.settings.set('rarityColor','mono');r.C.settings.set('motion','on');r.advance(200);assert.equal(r.C.cardView.active,r.C.preferences.preview);assert.equal(r.C.cardView.stats.fullCards,1);r.C.preferences.close();r.advance(200);assert.equal(r.C.cardView.active.card.id,id);assert.equal(r.C.cardView.stats.fullCards,1);
});
check('focus trap, disabled Sound/Data, segmented arrows and keyboard keycaps are accessible',()=>{
 const r=boot();r.C.preferences.show();const p=r.C.preferences,list=r.C.accessibility.focusables(p.panel);list.at(-1).focus();const e=key(r,'Tab','keydown',r.document.activeElement);assert(e.prevented);assert.equal(r.document.activeElement,list[0]);
 for(const name of ['Export save','Import save','Reset save','Restore previous save','Replay tutorial'])assert(p.panel.querySelectorAll('button').find(b=>b.textContent===name).disabled);
 assert(p.controls.filter(c=>c.row.querySelectorAll('input').length).every(c=>c.el.disabled));
 const c=p.controls.find(c=>c.el.getAttribute('aria-labelledby')==='setting-motion');c.buttons[0].fire('keydown',{key:'ArrowRight',preventDefault(){}});assert.equal(r.C.settings.get('motion'),'on');const k=p.controls.find(c=>c.el.getAttribute('aria-labelledby')==='setting-openKey');k.buttons[0].fire('keydown',{key:'Enter',preventDefault(){}});assert.equal(r.C.settings.get('openKey'),'enter');
});
check('Saved feedback follows successful storage; tutorial required hints reflect remapping',()=>{
 const r=boot();r.C.preferences.show();r.C.settings.set('dots','subtle');r.advance(190);assert(!r.C.preferences.feedback.textContent.includes('Saved'));r.advance(40);assert(r.C.preferences.feedback.textContent.includes('Saved'));r.advance(1250);assert.equal(r.C.preferences.feedback.style.opacity,0);
 const seed=r.C.state.fresh();seed.settings.openKey='enter';seed.settings.keyHints=false;const t=boot({save:seed,tutorial:true});t.advance(3000);assert.equal(t.C.tutorial.instruction.textContent,'Hold Enter to open.');assert.equal(t.C.opening.hint.querySelector('kbd').textContent,'Enter');assert(t.document.body.classList.contains('has-tutorial'));
});
check('nudge excludes sleep and hidden gaps, offers Medium once and persists Dismiss',()=>{
 const r=boot(),p=r.C.preferences;for(let i=0;i<100;i++)r.C.events.emit('fx:frame',{realDt:25});r.C.events.emit('fx:sleep');for(let i=0;i<100;i++)r.C.events.emit('fx:frame',{realDt:25});assert(p.nudge.hidden);r.hidden(true);r.hidden(false);for(let i=0;i<201;i++)r.C.events.emit('fx:frame',{realDt:25});assert(!p.nudge.hidden);p.nudge.querySelectorAll('button').find(b=>b.textContent==='Dismiss').fire('click');assert(r.C.settings.get('nudgeDismissed'));assert(p.nudge.hidden);const n=boot({save:clone(r.C.state.current)});for(let i=0;i<250;i++)n.C.events.emit('fx:frame',{realDt:25});assert(n.C.preferences.nudge.hidden);
});
check('nudge Switch changes quality once, and live reduced motion pauses hidden panel presentation',()=>{
 const r=boot(),p=r.C.preferences;for(let i=0;i<201;i++)r.C.events.emit('fx:frame',{realDt:25});p.nudge.querySelectorAll('button').find(b=>b.textContent==='Switch').fire('click');assert.equal(r.C.settings.get('quality'),'medium');assert(p.nudge.hidden);r.C.settings.set('quality','high');for(let i=0;i<201;i++)r.C.events.emit('fx:frame',{realDt:25});assert(p.nudge.hidden);
 p.show();r.advance(30);r.hidden(true);const transform=p.panel.style.transform;r.advance(4000);assert.equal(p.panel.style.transform,transform);r.hidden(false);r.C.settings.set('motion','on');r.advance(200);assert.equal(p.panel.style.transform,'none');assert.equal(p.panel.style.opacity,1);p.close();r.advance(200);assert(p.el.hidden);
});
check('isolated dev console checks all PASS, no application console errors',()=>{
 const r=boot({dev:true});assert(r.C.dev.runBugChecks());assert(!r.logs.some(x=>x.level==='error'));console.log('SIMULATED dev checks: '+r.C.dev.checkCount+' PASS');
});
console.log('\n'+count+' Stage 11a behavior groups passed. Browser screenshots and actual FPS remain unconfirmed.');
