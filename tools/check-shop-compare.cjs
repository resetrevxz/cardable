/* Compare real catalog specs and frozen quotes without changing offers or ownership. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let browser;
(async () => {
  browser = await chromium.launch({ headless:true, executablePath:process.env.SHOP_BROWSER_PATH || undefined });
  const page = await browser.newPage({ viewport:{width:1366,height:768} }), errors=[], requests=[];
  page.on('pageerror', error=>errors.push(error.message));
  page.on('request', request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
  await page.goto('file:///' + path.join(root,'index.html').replace(/\\/g,'/'));
  await page.waitForFunction(()=>Cardable.setup && !Cardable.setup.loading);
  const fixture = await page.evaluate(()=>{
    const C=Cardable;
    if(C.tutorial.active)C.tutorial.skipButton.click();
    C.settings.applyPreset('high'); C.settings.set('shopMotion','quiet'); C.currency.add(100000,'dev');
    const day=C.shopState.ensure().snapshot, pool=C.data.cards.filter(card=>C.shopState.eligible(card,C.rarity(card.rarity)));
    const cards=[pool.find(card=>card.vram && card.vram.shared),pool.find(card=>card.vram && card.vram.amount && !card.vram.shared)];
    for(const card of pool)if(cards.length<4 && !cards.includes(card))cards.push(card);
    const candidate=JSON.parse(C.state.encode(C.state.current));
    const saved=candidate.shop.days.find(item=>item.dayKey===day.dayKey);
    saved.offers=cards.map((card,index)=>({offerId:day.dayKey+':'+String(index+1).padStart(2,'0')+':'+card.id,
      cardId:card.id,variantId:null,cardSkinId:null,price:C.shopState.quote(card,null),purchased:false}));
    if(!C.state.commit(C.state.validate(candidate,false)))throw Error('Comparison fixture save failed');
    return { memory:cards.map(card=>C.cardSpecs.vram(card)), prices:saved.offers.map(offer=>offer.price),
      ids:cards.map(card=>card.id), rows:cards.map(card=>C.cardSpecs.rows(card)) };
  });
  const business = ()=>page.evaluate(()=>({wallet:Cardable.state.current.currency,serial:Cardable.state.current.serialCounter,
    shop:JSON.parse(Cardable.state.encode(Cardable.state.current.shop)),inventory:Cardable.state.current.inventory.length}));
  await page.locator('#shop-entry').click();
  const before=await business();
  const live=await page.evaluate(()=>Cardable.cardView.stats.liveViews);
  await page.locator('.shop-compare-open').click();
  assert.equal(await page.locator('.shop-compare-art').count(),4);
  const row=label=>page.locator('.shop-compare-table tbody tr').filter({has:page.locator('th',{hasText:new RegExp('^'+label+'$')})});
  assert.deepEqual(await row('Memory').locator('td').allTextContents(),fixture.memory);
  assert.equal(fixture.memory[0],'Shared');
  assert.deepEqual(await page.locator('.shop-compare-table .shop-price strong').allTextContents(),fixture.prices.map(price=>price.toLocaleString()));
  for(const spec of fixture.rows[0])assert.equal(await row(spec.label).locator('td').first().textContent(),spec.value);
  await page.screenshot({path:path.join(root,'artifacts/shop-compare-desktop.png')});
  await page.locator('.shop-compare-differences').click();
  assert.equal(await row('Finish').isVisible(),false);
  assert.equal(await row('Memory').isVisible(),true);
  assert.equal(await page.locator('.shop-compare-differences').getAttribute('aria-checked'),'true');
  assert.deepEqual(await business(),before,'Comparison or filtering changed gameplay');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>Cardable.settings.set('rarityColor','mono'));
  const geometry=await page.evaluate(()=>{
    const scroll=document.querySelector('.shop-scroll'), table=document.querySelector('.shop-compare-scroll');
    return {sheetOverflow:scroll.scrollWidth>scroll.clientWidth+1,tableScroll:table.scrollWidth>table.clientWidth,
      small:[...scroll.querySelectorAll('button')].filter(el=>el.getClientRects().length && !el.disabled && el.getBoundingClientRect().height<43.9).map(el=>el.className)};
  });
  assert.equal(geometry.sheetOverflow,false);assert.equal(geometry.tableScroll,true);assert.deepEqual(geometry.small,[]);
  await page.screenshot({path:path.join(root,'artifacts/shop-compare-mobile-mono.png')});
  await page.locator('.shop-compare-scroll').focus(); await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  assert.ok(await page.locator('.shop-compare-scroll').evaluate(el=>el.scrollLeft>0),'Keyboard did not scroll comparison');
  await page.setViewportSize({width:1366,height:768});
  await page.locator('.shop-compare-art').first().click();
  await page.locator('.shop-detail-card').waitFor();
  assert.equal(await page.locator('.shop-detail .shop-price strong').textContent(),fixture.prices[0].toLocaleString());
  await page.locator('.shop-back').click(); await page.locator('.shop-compare-art').first().waitFor();
  assert.equal(await page.evaluate(()=>Cardable.cardView.stats.liveViews),live);
  await page.evaluate(()=>{
    const C=Cardable, day=C.shopState.ensure().snapshot;
    const result=C.shopPurchase.buyCard({...day.offers[0],dayKey:day.dayKey});if(!result.ok)throw Error(result.message);
  });
  assert.equal(await row('Owned').locator('td').first().textContent(),'1');
  assert.equal(await row('Offer').locator('td').first().textContent(),'Purchased');
  await page.evaluate(()=>{
    const C=Cardable, current=JSON.parse(C.state.encode(C.state.current)); current.currency=0;C.state.commit(current);
  });
  assert.equal(await row('Offer').locator('td').nth(1).textContent(),'Not enough Credits');
  const rollover=await page.evaluate(()=>{
    const C=Cardable, now=C.clock.now(); window.compareRealNow=C.clock.now;C.clock.now=()=>now+86400000;
    C.events.notify('save:written',C.state.current); return C.shopState.dayKey();
  });
  assert.equal(await page.locator('.shop-compare-art').count(),4);
  assert.equal(await page.evaluate(()=>Cardable.shopState.ensure().snapshot.dayKey),rollover);
  await page.evaluate(()=>{Cardable.clock.now=compareRealNow;Cardable.events.notify('save:written',Cardable.state.current);});
  await page.reload(); await page.waitForFunction(()=>Cardable.setup && !Cardable.setup.loading);
  assert.equal(await page.evaluate(()=>Cardable.settings.get('shopCompareDifferences')),true);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log(JSON.stringify({pass:true,sharedMemory:true,catalogSpecs:true,frozenQuotes:true,nonSpendingPreview:true,
    differencesSaved:true,liveOwnership:true,rollover:true,keyboardScroll:true,geometry,stableViews:true}));
  await browser.close();browser=null;
})().catch(async error=>{console.error(error);process.exitCode=1;if(browser)await browser.close();});
