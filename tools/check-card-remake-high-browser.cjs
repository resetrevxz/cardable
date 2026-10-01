'use strict';
// Real file:// Chromium rendering in isolated browser storage. GPU timings are observations, not a hardware guarantee.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const output=process.env.CARDABLE_QA_OUTPUT||path.resolve(__dirname,'../../../outputs/card-remake-pass2/browser');
const evidence={groups:[],errors:[],network:[],layouts:[],reveals:[]};
async function group(name,fn){await fn();evidence.groups.push(name);console.log('PASS '+name);}
async function study(page){
 await page.evaluate(()=>{
  document.querySelectorAll('.card-gallery,.gallery-profile,.menu-shell,.dev-panel,.tutorial,.preferences-entry').forEach(el=>el.style.display='none');
  const grid=document.createElement('main');grid.id='higher-study';grid.style.cssText='position:relative;z-index:20;display:grid;grid-template-columns:repeat(3,360px);gap:110px 100px;padding:100px 140px 80px;background:#08080a;width:max-content;';const views=[];
  Cardable.data.rarities.filter(r=>r.tier>=7&&r.tier<=11).forEach((r,i)=>{
   const card=Cardable.data.cards.find(c=>c.pullable&&c.rarity===r.id&&c.art.kind==='image')||Cardable.data.cards.find(c=>c.pullable&&c.rarity===r.id);
   const v=Cardable.cardView.create(card,{cardId:card.id,instanceId:'higher-'+i,serial:Cardable.serial.format(Cardable.state.current.playerCode,100+i)},{autoFocus:false,owned:true});views.push(v);
  });
  const secret=views[4],unfound=Cardable.cardView.create(secret.card,secret.instance,{autoFocus:false,owned:false});views.push(unfound);
  views.forEach(v=>{const fig=document.createElement('figure');fig.style.cssText='margin:0;width:360px';fig.appendChild(v.el);const label=document.createElement('figcaption');label.textContent=Cardable.rarity(v.card.rarity).name+(v.finishState?' / '+v.finishState:'');label.style.cssText='color:#888;font:12px monospace;padding-top:46px';fig.appendChild(label);grid.appendChild(fig);});document.body.appendChild(grid);window.higherViews=views;
 });await page.waitForTimeout(200);
}
async function focus(page,i){await page.evaluate(i=>{higherViews[i].el.scrollIntoView({block:'center'});higherViews[i].setMode('full');},i);await page.waitForTimeout(220);}
async function live(page,i,selector,property,attribute=false){return page.evaluate(({i,selector,property,attribute})=>{const e=higherViews[i].el.querySelector('.card__material--live '+selector);return attribute?e.getAttribute(property):property.startsWith('--')?e.style.getPropertyValue(property):e.style[property];},{i,selector,property,attribute});}
async function moving(page,i,selector,property,attribute=false){const a=await live(page,i,selector,property,attribute);await page.waitForTimeout(250);assert.notEqual(await live(page,i,selector,property,attribute),a);}
async function main(){
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1640,height:1180}});
  page.on('pageerror',e=>evidence.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))evidence.network.push(r.url());});
  const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
  await page.goto(url+'?dev=1&gallery=1');await study(page);
  await group('five portrait tiers, local art, contained glass panels and top serials',async()=>{
   const layouts=await page.evaluate(()=>higherViews.slice(0,5).map(v=>{const rect=e=>e.getBoundingClientRect().toJSON();return {tier:v.card.rarity,card:rect(v.el),art:rect(v.el.querySelector('.card__art-window')),info:rect(v.el.querySelector('.card__info')),serial:rect(v.el.querySelector('.card__serial')),image:v.el.querySelector('img').naturalWidth,mask:getComputedStyle(v.el.querySelector('.card__finish')).maskComposite,specs:v.el.querySelectorAll('.card__spec').length,front:v.el.dataset.frontDesign};}));
   for(const l of layouts){assert.equal(l.front,'full-art');assert(l.image>0);assert(l.art.height>l.card.height*.9);assert(l.info.bottom<l.card.bottom);assert(l.serial.top<l.card.top+l.card.height*.15);assert(l.specs<=4);assert(l.mask.includes('exclude'));}evidence.layouts=layouts;
   await page.screenshot({path:path.join(output,'higher-tiers.png'),fullPage:true});
  });
  await group('crown outside the top, bottom-only external flames, and attached squircle frames',async()=>{
   const props=await page.evaluate(()=>higherViews.slice(0,4).map(v=>{const e=v.el.querySelector('.card__material--lite .finish-legendary-crown,.card__material--lite .finish-mythical-flames,.card__material--lite .finish-exotic-frame,.card__material--lite .finish-ascendant-frame');return {tier:v.card.rarity,card:v.el.getBoundingClientRect().toJSON(),prop:e.getBoundingClientRect().toJSON(),layer:e.closest('.card__layer').dataset.layer};}));
   for(const p of props)assert.equal(p.layer,'prop');assert(props[0].prop.top<props[0].card.top);assert(props[0].prop.bottom>props[0].card.top);
   assert(props[1].prop.top>props[1].card.top+props[1].card.height*.85);assert(props[1].prop.bottom>props[1].card.bottom);
   for(const p of props.slice(2)){assert(p.prop.left<p.card.left);assert(p.prop.right>p.card.right);}evidence.props=props;
  });
  await group('gold/maroon wave, rotating red hexagon, static mythril and green gem',async()=>{
   await focus(page,0);const blue=await page.evaluate(()=>higherViews[0].el.querySelector('.card__material--live .crown-mythril').outerHTML);
   await moving(page,0,'.finish-legendary-band','transform');await moving(page,0,'.crown-red-glow','transform',true);
   assert.equal(await page.evaluate(()=>higherViews[0].el.querySelector('.card__material--live .crown-mythril').outerHTML),blue);
   assert.equal(await page.evaluate(()=>higherViews[0].el.querySelector('.card__material--live .crown-green-gem').getAttribute('stroke')),'var(--gem-green-edge)');
  });
  await group('faceted ruby catches moving refractions while curled bottom flames burn',async()=>{
   await focus(page,1);assert.equal(await page.evaluate(()=>higherViews[1].el.querySelectorAll('.finish-mythical-nametag').length),0);
   assert.equal(await page.evaluate(()=>higherViews[1].el.querySelector('.card__material--live .finish-mythical-crystal').querySelectorAll('polygon').length),48);
   await moving(page,1,'.finish-mythical-shine','--ruby-ray');await moving(page,1,'.finish-flame','transform');
  });
  await group('Exotic shapes drift in the middle side borders and a white dash circles the outer frame',async()=>{
   await focus(page,2);await moving(page,2,'.finish-exotic-shape','transform');await moving(page,2,'.exotic-border-highlight','strokeDashoffset');
   const positions=await page.evaluate(()=>Array.from(higherViews[2].el.querySelectorAll('.card__material--live .finish-exotic-shape'),e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)})));
   assert(positions.every(p=>(p.x<1||p.x>96)&&p.y>=28&&p.y<=62));
  });
  await group('Ascendant pastel sides and aurora move with a timed one-second rim splash',async()=>{
   await focus(page,3);await moving(page,3,'.finish-ascendant','--asc-angle');await moving(page,3,'.finish-ascendant-prop','--aurora-color-1');
   await page.waitForFunction(()=>parseFloat(higherViews[3].el.querySelector('.card__material--live .finish-ascendant-splash').style.opacity)>.05,{timeout:4500});
   const splash=await page.evaluate(()=>{const e=higherViews[3].el.querySelector('.card__material--live .finish-ascendant-splash');return {x:e.style.getPropertyValue('--splash-x'),y:e.style.getPropertyValue('--splash-y')};});assert([splash.x,splash.y].some(p=>p==='0%'||p==='100%'));
   await page.waitForFunction(()=>Number(higherViews[3].el.querySelector('.card__material--live .finish-ascendant-splash').style.opacity)===0,{timeout:1400});
  });
  await group('Secret preserves sweep/inversion/coverage on its sides with no animated lettering or identity leaks',async()=>{
   assert.equal(await page.locator('.finish-secret-logo,.finish-secret-glyph').count(),0);await focus(page,4);
   const mask=await page.evaluate(()=>getComputedStyle(higherViews[4].el.querySelector('.finish-secret')).maskImage);assert(mask.includes('90deg'));evidence.secretSideMask=mask;
   await moving(page,4,'.finish-secret-line','transform');
   await page.waitForFunction(()=>higherViews[4].el.querySelector('.card__material--live .finish-secret').dataset.phase==='cover',{timeout:5000});
   await page.screenshot({path:path.join(output,'secret-inverted.png'),fullPage:true});
   const concealed=await page.evaluate(()=>{const v=higherViews[5];return {text:v.el.textContent,name:v.card.name,leaks:v.el.querySelectorAll('.card__name,.card__memory,.card__specs,.card__serial,.card__back-serial,.card__art-window').length};});assert.equal(concealed.leaks,0);assert(!concealed.text.includes(concealed.name));
  });
  await group('one full card, static unfocused cards, frozen reduced motion and neutral monochrome finishes',async()=>{
   assert.equal(await page.evaluate(()=>Cardable.cardView.stats.fullCards),1);
   const snapshot=()=>page.evaluate(()=>higherViews.slice(0,4).map(v=>v.el.querySelector('.card__finish .card__material--live').innerHTML));const before=await snapshot();await page.waitForTimeout(300);assert.deepEqual(await snapshot(),before);
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(220);
   const frozen=await live(page,4,'.finish-secret-line','transform');await page.waitForTimeout(300);assert.equal(await live(page,4,'.finish-secret-line','transform'),frozen);
   assert(parseFloat(await page.evaluate(()=>getComputedStyle(higherViews[4].el.querySelector('.card__finish .card__material--live')).opacity))<.01);
   await page.evaluate(()=>higherViews.forEach(v=>v.setColorMode('mono')));await page.screenshot({path:path.join(output,'higher-tiers-mono.png'),fullPage:true});
   const fills=await page.evaluate(()=>Array.from(higherViews[0].el.querySelectorAll('.card__material--lite .crown-red-gem,.card__material--lite .crown-blue-gem,.card__material--lite .crown-green-gem'),e=>getComputedStyle(e).fill));
   fills.forEach(fill=>{const n=fill.match(/\d+/g).map(Number);assert.equal(n[0],n[1]);assert.equal(n[1],n[2]);});
   await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await group('real pending reveals keep all five designs and actions visible on laptop, portrait and landscape',async()=>{
   await page.goto(url);await page.waitForTimeout(180);const seed=await page.evaluate(()=>JSON.parse(JSON.stringify(Cardable.state.current)));
   for(const tier of ['legendary','mythical','exotic','ascendant','secret']){
    for(const [width,height] of [[1280,720],[390,844],[844,390]]){
     await page.setViewportSize({width,height});
     await page.evaluate(({seed,tier})=>{const save=JSON.parse(JSON.stringify(seed)),card=Cardable.data.cards.find(c=>c.pullable&&c.rarity===tier);save.tutorial={step:'done',done:true};save.currency=200;save.serialCounter=1;save.pendingReveal={packId:'standard',committedAt:Date.now(),keptCount:0,cards:[{instanceId:'pending-'+tier,cardId:card.id,serial:Cardable.serial.format(save.playerCode,1),pulledAt:Date.now(),seen:false}]};localStorage.setItem('cardable.save',JSON.stringify(save));},{seed,tier});
     await page.reload();await page.waitForFunction(()=>Cardable.opening.phase==='revealed'&&!Cardable.opening.keepButton.hidden,{timeout:12000});await page.waitForTimeout(200);
     const bounds=await page.evaluate(()=>{const v=Cardable.opening.view,rect=e=>e.getBoundingClientRect().toJSON();return {card:rect(v.el),keep:rect(Cardable.opening.keepButton),discard:rect(Cardable.opening.deleteButton),prop:rect(v.el.querySelector('.card__material--live .finish-legendary-crown,.card__material--live .finish-mythical-flames,.card__material--live .finish-exotic-frame,.card__material--live .finish-ascendant-frame,.card__material--live .finish-secret-frame')),tier:v.card.rarity,state:v.finishState,money:Cardable.state.current.currency};});
     for(const b of [bounds.keep,bounds.discard,bounds.prop]){assert(b.left>=0&&b.right<=width,tier+' horizontal fit');assert(b.top>=0&&b.bottom<=height,tier+' vertical fit '+width+'x'+height+': '+JSON.stringify(b));}assert.equal(bounds.money,200);if(tier==='secret')assert.equal(bounds.state,'found');evidence.reveals.push({width,height,...bounds});
     if(tier==='mythical'){const hints=await page.evaluate(()=>[document.querySelector('.opening-card-note'),Cardable.opening.view.el.querySelector('.card__flip-hint')].map(e=>e.getBoundingClientRect().toJSON()));assert(hints.every(b=>b.top>=0&&b.bottom<bounds.card.top),'Mythical hints clear the fire');}
     if(width===390||width===844&&tier==='legendary')await page.screenshot({path:path.join(output,'reveal-'+tier+'-'+width+'x'+height+'.png')});
    }
   }
   const keptCard=await page.evaluate(()=>Cardable.opening.view.card.id);await page.locator('.opening-keep').click();await page.waitForFunction(()=>Cardable.opening.phase==='idle');assert.equal(await page.evaluate(()=>Cardable.state.current.inventory[0].cardId),keptCard);
   await page.reload();assert.equal(await page.evaluate(()=>Cardable.state.current.currency),200);assert.equal(await page.evaluate(()=>Cardable.state.current.inventory.length),1);
  });
  await group('focused card still flips to the engraved Cardable back and pauses the front finish',async()=>{
   await page.setViewportSize({width:1440,height:1000});await page.goto(url+'?dev=1&gallery=1');await study(page);await focus(page,1);
   await page.evaluate(()=>higherViews[1].setFace('back'));await page.waitForTimeout(700);const before=await live(page,1,'.finish-flame','transform');await page.waitForTimeout(250);assert.equal(await live(page,1,'.finish-flame','transform'),before);
   assert.equal(await page.evaluate(()=>higherViews[1].el.querySelector('.card__back-wordmark').textContent),'cardable');
   await page.screenshot({path:path.join(output,'cardable-back.png'),fullPage:true});
  });
  await group('collection detail reserves space for crowns, flames and frames across three window sizes',async()=>{
   evidence.details=[];
   for(const tier of ['legendary','mythical','exotic','ascendant','secret']){
    for(const [width,height] of [[1280,720],[390,844],[844,390]]){
     await page.setViewportSize({width,height});await page.goto(url);
     await page.evaluate(tier=>{const card=Cardable.data.cards.find(c=>c.pullable&&c.rarity===tier),instance={instanceId:'detail-'+tier,cardId:card.id,serial:Cardable.serial.format(Cardable.state.current.playerCode,1),pulledAt:1,seen:false};
      const view=Cardable.cardView.create(card,instance,{autoFocus:false,owned:true}),host=document.createElement('div');host.style.cssText='position:fixed;left:50px;top:100px;width:140px';host.appendChild(view.el);document.body.appendChild(host);
      Cardable.events.emit('inventory:detailOpen',{entry:{card:card,rarity:Cardable.rarity(tier),owned:true,instances:[instance]},view:view,visual:view.el,sourceRect:view.el.getBoundingClientRect().toJSON()});},tier);
     await page.waitForFunction(()=>Cardable.detail.phase==='detail');await page.waitForTimeout(150);
     const layout=await page.evaluate(()=>{const v=Cardable.detail.view,rect=e=>e.getBoundingClientRect().toJSON();return {card:rect(v.el),prop:rect(v.el.querySelector('.card__material--live .finish-legendary-crown,.card__material--live .finish-mythical-flames,.card__material--live .finish-exotic-frame,.card__material--live .finish-ascendant-frame,.card__material--live .finish-secret-frame')),panel:rect(Cardable.detail.panel)};});
     assert(layout.prop.top>=0&&layout.prop.bottom<=height,tier+' detail vertical fit');assert(layout.prop.left>=0&&layout.prop.right<=width,tier+' detail horizontal fit');if(width===390)assert(layout.panel.top>layout.prop.bottom,tier+' panel clears prop');evidence.details.push({tier,width,height,...layout});
     if(width===390&&(tier==='legendary'||tier==='mythical'))await page.screenshot({path:path.join(output,'detail-'+tier+'-390x844.png')});
    }
   }
  });
  await group('local offline runtime has no JavaScript exceptions or HTTP requests',async()=>{assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);});
 }finally{fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');await browser.close();}
 console.log(evidence.groups.length+' browser groups passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
