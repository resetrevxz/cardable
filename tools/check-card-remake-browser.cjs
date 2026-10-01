'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const output = process.env.CARDABLE_QA_OUTPUT || path.resolve(__dirname, '../../../outputs/card-remake');
const evidence = {groups: [], errors: [], network: []};
async function main() {
 fs.mkdirSync(output,{recursive:true}); const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({viewport:{width:1600,height:1100}}), page=await context.newPage();
  page.on('pageerror',e=>evidence.errors.push(e.message)); page.on('request',r=>{if(/^https?:/.test(r.url()))evidence.network.push(r.url());});
  const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
  await page.goto(url+'?dev=1&gallery=1'); await page.waitForTimeout(800);
  await page.evaluate(()=>{
   document.querySelectorAll('.card-gallery,.gallery-profile,.menu-shell,.dev-panel,.tutorial').forEach(el=>el.style.display='none');
   const grid=document.createElement('main'); grid.id='remake-study'; grid.style.cssText='position:relative;z-index:20;display:grid;grid-template-columns:repeat(4,300px);gap:35px 40px;padding:40px 80px;background:#08080a;width:max-content;';
   const views=[];
   Cardable.data.rarities.filter(r=>r.frontDesign==='full-art'&&r.tier<=6).forEach((r,i)=>{
    const card=Cardable.data.cards.find(c=>c.pullable&&c.rarity===r.id&&c.art.kind==='image')||Cardable.data.cards.find(c=>c.pullable&&c.rarity===r.id);
    const v=Cardable.cardView.create(card,{cardId:card.id,instanceId:'study-'+i,serial:Cardable.serial.format(Cardable.state.current.playerCode,100+i)},{autoFocus:false});
    const figure=document.createElement('figure');figure.style.cssText='margin:0;width:300px';figure.appendChild(v.el);
    const label=document.createElement('figcaption');label.textContent=r.name+' / '+r.code;label.style.cssText='color:#aaa;font:11px monospace;padding-top:18px';figure.appendChild(label);grid.appendChild(figure); views.push(v);
   });
   const back=Cardable.cardView.create(views[0].card,views[0].instance,{autoFocus:false});back.setFace('back'); const fig=document.createElement('figure');fig.style.cssText='margin:0;width:300px';fig.appendChild(back.el);grid.appendChild(fig);
   document.body.appendChild(grid);window.remakeViews=views;window.remakeBack=back;
  });
  await page.waitForTimeout(800); await page.screenshot({path:path.join(output,'seven-tiers.png')});
  const layout=await page.evaluate(()=>remakeViews.map(v=>({id:v.card.id,rarity:v.card.rarity,art:v.el.querySelector('.card__art-window').getBoundingClientRect().toJSON(),card:v.el.getBoundingClientRect().toJSON(),specCount:v.el.querySelectorAll('.card__spec').length,serial:v.el.querySelector('.card__serial').getBoundingClientRect().toJSON(),info:v.el.querySelector('.card__info').getBoundingClientRect().toJSON(),imageLoaded:!v.el.querySelector('img')||v.el.querySelector('img').naturalWidth>0,mask:getComputedStyle(v.el.querySelector('.card__finish')).maskComposite})));
  for(const l of layout){assert(l.imageLoaded);assert(l.art.height>l.card.height*.9);assert(l.serial.top<l.card.top+l.card.height*.15);assert(l.info.bottom<l.card.bottom);assert(l.mask.includes('exclude'));}
  evidence.layout=layout;evidence.groups.push('seven local portrait compositions, inset rarity frames, top serials and contained glass panels');
  const fit=await page.evaluate(()=>{
    const v=remakeViews[0],card=Cardable.card('apple-m1-gpu'),sample=Cardable.cardView.create(card,{cardId:card.id,instanceId:'shared-memory-study',serial:v.instance.serial},{autoFocus:false});
    const host=document.createElement('div');host.style.cssText='position:fixed;left:10px;top:10px;width:220px;z-index:30';host.appendChild(sample.el);document.body.appendChild(host);
    const m=sample.el.querySelector('.card__memory-values'),i=sample.el.querySelector('.card__info');const ok=m.getBoundingClientRect().right<=i.getBoundingClientRect().right;sample.destroy();host.remove();return ok;
  });assert(fit);evidence.groups.push('Shared and unified memory fit a compact card without inventing VRAM');
  await page.evaluate(()=>{remakeViews[1].setMode('full');remakeViews[1].el.scrollIntoView();});await page.waitForTimeout(250);
  const orbit=await page.evaluate(()=>remakeViews[1].el.querySelector('.card__material--live .finish-common').style.getPropertyValue('--common-angle'));
  await page.waitForTimeout(300);assert.notEqual(await page.evaluate(()=>remakeViews[1].el.querySelector('.card__material--live .finish-common').style.getPropertyValue('--common-angle')),orbit);
  assert.equal(await page.evaluate(()=>Cardable.cardView.stats.fullCards),1);evidence.groups.push('Common orbit updates through the shared loop with only one full card');
  await page.evaluate(()=>remakeViews[1].setMode('lite'));await page.waitForTimeout(250);
  await page.evaluate(()=>remakeViews[4].setMode('full'));await page.waitForTimeout(200);
  const wave=await page.evaluate(()=>remakeViews[4].el.querySelector('.card__material--live .finish-sr-wave').style.transform);await page.waitForTimeout(200);
  assert.notEqual(await page.evaluate(()=>remakeViews[4].el.querySelector('.card__material--live .finish-sr-wave').style.transform),wave);
  await page.evaluate(()=>remakeViews[6].setMode('full'));await page.waitForTimeout(200);
  const gold=await page.evaluate(()=>remakeViews[6].el.querySelector('.card__material--live .finish-double-super-rare').style.getPropertyValue('--ssr-gold'));await page.waitForTimeout(200);
  assert.notEqual(await page.evaluate(()=>remakeViews[6].el.querySelector('.card__material--live .finish-double-super-rare').style.getPropertyValue('--ssr-gold')),gold);evidence.groups.push('Super Rare waves and Double Super Rare gold drift animate only the focused border');
  await page.evaluate(()=>remakeViews.forEach(v=>v.setColorMode('mono')));await page.waitForTimeout(180);await page.screenshot({path:path.join(output,'seven-tiers-mono.png')});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>parseFloat(getComputedStyle(remakeViews[6].el.querySelector('.card__finish .card__material--live')).opacity)<.01);evidence.groups.push('monochrome and reduced motion keep static border materials');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});await page.goto(url+'?dev=1');
  await page.evaluate(()=>{if(Cardable.tutorial.skipButton)Cardable.tutorial.skipButton.click();Cardable.dev.panel.style.display='none';});await page.waitForTimeout(300);
  const initial=await page.evaluate(()=>Cardable.state.current.currency);
  await page.keyboard.down('Space');await page.waitForTimeout(3060);await page.keyboard.up('Space');
  assert.equal(await page.evaluate(()=>Cardable.state.current.currency),initial+200);
  assert.equal(await page.locator('.pack-reward__coin').count(),6);await page.waitForTimeout(320);
  await page.screenshot({path:path.join(output,'pack-reward.png')});
  await page.waitForFunction(()=>Cardable.opening.phase==='cutting');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>Cardable.opening.phase==='revealed'&&!Cardable.opening.keepButton.hidden,{timeout:15000});
  await page.screenshot({path:path.join(output,'revealed-actions.png')});
  for(const [width,height] of [[1280,720],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(160);
    const bounds=await page.locator('.opening-delete').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);assert(bounds.y+bounds.height<=height);
    await page.screenshot({path:path.join(output,'reveal-'+width+'x'+height+'.png')});
  }evidence.groups.push('Keep and Delete stay on screen at laptop, portrait and landscape sizes');await page.setViewportSize({width:1440,height:1000});
  const reserved=await page.evaluate(()=>Cardable.state.current.pendingReveal.cards[0].instanceId);
  await page.reload();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>Cardable.state.current.currency),initial+200);assert.equal(await page.evaluate(()=>Cardable.state.current.pendingReveal.cards[0].instanceId),reserved);
  await page.locator('.opening-delete').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>Cardable.opening.phase==='idle');
  assert.equal(await page.evaluate(()=>Cardable.state.current.inventory.some(x=>x.instanceId===reserved)),false);assert.equal(await page.evaluate(()=>Cardable.state.current.pendingReveal),null);
  assert.equal(await page.evaluate(()=>Cardable.state.current.currency),initial+200);evidence.groups.push('real Space opening pays once, reload retains reward, keyboard Delete consumes only the reserved card');
  await page.keyboard.down('Space');await page.waitForTimeout(3060);await page.keyboard.up('Space');await page.waitForFunction(()=>Cardable.opening.phase==='cutting');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>Cardable.opening.phase==='revealed'&&!Cardable.opening.keepButton.hidden,{timeout:15000});await page.locator('.opening-keep').click();await page.waitForFunction(()=>Cardable.opening.phase==='idle');
  assert.equal(await page.evaluate(()=>Cardable.state.current.inventory.length),1);assert.equal(await page.evaluate(()=>Cardable.state.current.currency),initial+400);evidence.groups.push('Keep still collects the next card and a second pack pays exactly $200');
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.network,[]);evidence.groups.push('no browser exceptions or network requests');
 } finally { await browser.close();fs.writeFileSync(path.join(output,'browser-evidence.json'),JSON.stringify(evidence,null,2)); }
 console.log(JSON.stringify(evidence,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
