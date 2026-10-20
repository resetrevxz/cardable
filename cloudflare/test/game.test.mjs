import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/economy.js';
import {start,stopAll,player,call,admin,sql,packageOf} from './helpers.mjs';
let server;
before(async()=>{server=await start(8847,{});});
after(()=>stopAll());
const post=(me,path,body,key,headers={})=>call(server,'POST',path,body,me.token,{key,headers});
const headers=(sequence=0,device='device-main')=>({'x-game-device':device,'x-game-sequence':String(sequence)});
const state=(me)=>call(server,'GET','/v1/game/state',null,me.token);
async function linked(options={}){
 const me=await player(server,options),pkg=packageOf(2);
 const body={deviceId:'device-main',originId:pkg.originCode,serialCounter:9,balance:1000,items:pkg.items.map(i=>({...i,seen:true,pickerChoice:{id:'preserve'}})),operationId:'link-'+pkg.originCode};
 const result=await post(me,'/v1/game/link',body,'link-key-'+pkg.originCode);
 assert.equal(result.status,200,result.text);assert.equal(result.data.originId,pkg.originCode);assert.equal(result.data.serialCounter,9);return {me,body,result};
}
test('link merges balance once, retains provenance and durable mapping, preserves canonical imported copies and sold cards',async()=>{
 const me=await player(server,{cards:2,credits:100});
 const rows=sql(server,"SELECT i.*,a.id AS account FROM instances i JOIN accounts a ON a.id=i.owner_id WHERE a.alias='"+me.alias+"' AND i.state='owned'");
 const buyer=await player(server,{credits:200});
 const listing=await post(me,'/v1/listings',{kind:'fixed',instanceIds:[rows[0].id],ask:50},'legacy-list-key');
 assert.equal(listing.status,200,listing.text);
 assert.equal((await post(buyer,'/v1/listings/'+listing.data.listingId+'/buy',{expectedPrice:50},'legacy-buy-key')).status,200);
 const items=rows.map((r,n)=>({instanceId:'local-'+n,cardId:r.card_id,serial:r.serial,variantId:r.variant_id,cardSkinId:r.skin_id,packId:r.pack_id,pulledAt:r.pulled_at,seen:true,source:'pack'}));
 const body={deviceId:'device-main',originId:rows[0].origin_code,balance:500,items,operationId:'merge-original'};
 const link=await post(me,'/v1/game/link',body,'merge-original-key');
 assert.equal(link.status,200,link.text);assert.equal(link.data.balance,649);assert.equal(link.data.items.length,1);assert.equal(link.data.mapping['local-0'],null);assert.equal(link.data.mapping['local-1'],rows[1].id);
 assert.equal(link.data.items[0].seen,true);
 const replay=await post(me,'/v1/game/link',body,'merge-original-key');assert.equal(replay.status,200,replay.text);assert.equal(replay.data.balance,649);
 const again=await post(me,'/v1/game/link',body,'merge-new-request');assert.equal(again.data.balance,649);
 assert.equal((await admin(server,'GET','/v1/admin/reconcile')).data.ok,true);
});
test('sync operations are exact once, preserve held funds/cards, reject stale device, transfer cleanly',async()=>{
 const {me,result}=await linked(), id=result.data.items[0].instanceId;
 const listing=await post(me,'/v1/listings',{kind:'auction',instanceIds:[id],start:10,buyout:100},'game-auction-create',headers());
 assert.equal(listing.status,200,listing.text);
 const blocked=await post(me,'/v1/game/sync',{deviceId:'device-main',sequence:1,operations:[{id:'remove-locked',delta:0,add:[],remove:[id]}]},'locked-sync-key');
 assert.equal(blocked.status,409,blocked.text);assert.equal((await state(me)).data.sequence,0);
 const item=packageOf(1).items[0],body={deviceId:'device-main',sequence:1,operations:[{id:'offline-op-one',delta:25,add:[{...item,seen:false,source:'pack'}],remove:[result.data.items[1].instanceId]}]};
 const sync=await post(me,'/v1/game/sync',body,'sync-first-key');assert.equal(sync.status,200,sync.text);assert.equal(sync.data.balance,1025);assert.equal(sync.data.sequence,1);assert.ok(sync.data.mapping[item.instanceId]);
 assert.equal((await post(me,'/v1/game/sync',body,'sync-first-key')).data.balance,1025);
 const second=await post(me,'/v1/game/sync',{...body,sequence:2},'sync-second-key');assert.equal(second.status,200,second.text);assert.equal(second.data.balance,1025);
 const mismatch=await post(me,'/v1/game/sync',{...body,sequence:3,operations:[{...body.operations[0],delta:26}]},'sync-third-key');assert.equal(mismatch.status,422,mismatch.text);
 assert.equal((await post(me,'/v1/listings/'+listing.data.listingId+'/cancel',{},'wrong-device-key',headers(2,'device-wrong'))).status,409);
 const transfer=await post(me,'/v1/game/transfer',{deviceId:'device-main',newDeviceId:'device-next',sequence:2},'transfer-first-key');assert.equal(transfer.status,200,transfer.text);
 assert.equal((await post(me,'/v1/game/sync',{deviceId:'device-main',sequence:3,operations:[]},'old-device-sync')).status,409);
 assert.equal((await post(me,'/v1/listings/'+listing.data.listingId+'/cancel',{},'next-device-cancel',headers(2,'device-next'))).status,200);
 const next=await post(me,'/v1/game/sync',{deviceId:'device-next',sequence:3,operations:[]},'next-device-sync');assert.equal(next.status,200,next.text);
 assert.equal((await admin(server,'GET','/v1/admin/reconcile')).data.ok,true);
});
test('server game traders list disclosed supply, buy player listing and never create player price observations',async()=>{
 const {me,result}=await linked();
 const listing=await post(me,'/v1/listings',{kind:'fixed',instanceIds:[result.data.items[0].instanceId],ask:1},'trader-bargain-list',headers());assert.equal(listing.status,200,listing.text);
 const at=Date.now()+600000;
 const tick=await admin(server,'POST','/v1/admin/traders',{},at);assert.equal(tick.status,200,tick.text);assert.equal(tick.data.errors,0);assert.ok(tick.data.bought>=1);
 const detail=await call(server,'GET','/v1/listings/'+listing.data.listingId,null,me.token);assert.equal(detail.data.listing.status,'sold');
 const market=await call(server,'GET','/v1/listings',null,me.token);assert.ok(market.data.items.some(i=>i.source==='trader'));
 const trade=sql(server,"SELECT id FROM trades WHERE listing_id='"+listing.data.listingId+"'")[0];
 assert.equal(sql(server,"SELECT COUNT(*) n FROM price_observations WHERE trade_id='"+trade.id+"'")[0].n,0);
 assert.equal((await admin(server,'POST','/v1/admin/traders',{},at)).data.replayed,true);
 assert.equal((await admin(server,'GET','/v1/admin/reconcile')).data.ok,true);
});
test('offline batch add then remove is atomic; bid holds exclude gameplay spending and buyout settles once',async()=>{
 const seller=await linked(),buyer=await linked();
 const listing=await post(seller.me,'/v1/listings',{kind:'auction',instanceIds:[seller.result.data.items[0].instanceId],start:10,buyout:200},'held-auction-list',headers());assert.equal(listing.status,200,listing.text);
 const bid=await post(buyer.me,'/v1/listings/'+listing.data.listingId+'/bid',{max:300},'held-auction-bid',headers());assert.equal(bid.status,200,bid.text);
 const buyout=await post(buyer.me,'/v1/listings/'+listing.data.listingId+'/buyout',{expectedPrice:200},'held-auction-buyout',headers());assert.equal(buyout.status,200,buyout.text);
 assert.equal((await post(buyer.me,'/v1/listings/'+listing.data.listingId+'/buyout',{expectedPrice:200},'held-auction-buyout',headers())).status,200);
 assert.equal((await state(buyer.me)).data.balance,800);
 assert.equal(sql(server,"SELECT COUNT(*) n FROM trades WHERE listing_id='"+listing.data.listingId+"'")[0].n,1);
 const reserve=await post(seller.me,'/v1/listings',{kind:'auction',instanceIds:[seller.result.data.items[1].instanceId],start:10},'held-reserve-list',headers());assert.equal(reserve.status,200,reserve.text);
 assert.equal((await post(buyer.me,'/v1/listings/'+reserve.data.listingId+'/bid',{max:300},'held-reserve-bid',headers())).status,200);
 const before=(await state(buyer.me)).data;assert.ok(before.held>=300);
 const rejected=await post(buyer.me,'/v1/game/sync',{deviceId:'device-main',sequence:1,operations:[{id:'cannot-spend-hold',delta:-(before.balance-before.held+1),add:[],remove:[]}]},'held-spend-sync');assert.equal(rejected.status,409,rejected.text);
 const item={...packageOf(1).items[0],seen:false};
 const batch=await post(buyer.me,'/v1/game/sync',{deviceId:'device-main',sequence:1,operations:[{id:'batch-add-card',delta:0,add:[item],remove:[]},{id:'batch-sell-card',delta:5,add:[],remove:[item.instanceId]}]},'batch-add-remove');assert.equal(batch.status,200,batch.text);
 assert.equal(batch.data.mapping[item.instanceId],null);assert.equal(batch.data.balance,before.balance+5);assert.equal(batch.data.held,before.held);
 const restored=await post(buyer.me,'/v1/game/sync',{deviceId:'device-main',sequence:2,operations:[{id:'undo-offline-sale',delta:-5,add:[item],remove:[]}]},'undo-offline-sync');assert.equal(restored.status,200,restored.text);
 const restoredId=restored.data.mapping[item.instanceId];assert.ok(restoredId);assert.equal(restored.data.balance,before.balance);
 const serverSale=await post(buyer.me,'/v1/sell',{instanceIds:[restoredId]},'real-system-redemption',headers(2));assert.equal(serverSale.status,200,serverSale.text);
 const prohibited=await post(buyer.me,'/v1/game/sync',{deviceId:'device-main',sequence:3,operations:[{id:'cannot-undo-system-sale',delta:0,add:[item],remove:[]}]},'undo-system-sync');assert.equal(prohibited.status,409,prohibited.text);
 assert.equal((await admin(server,'GET','/v1/admin/reconcile')).data.ok,true);
});

test('a queued offline sale and undo in the same batch restore one canonical card and its provenance',async()=>{
 const {me,result}=await linked(), item={...packageOf(1).items[0],seen:true,pickerChoice:{id:'queued-choice'},source:'pack'};
 const batch=await post(me,'/v1/game/sync',{deviceId:'device-main',sequence:1,operations:[
  {id:'queued-pack-keep',delta:0,add:[item],remove:[]},
  {id:'queued-quick-sale',delta:25,add:[],remove:[item.instanceId]},
  {id:'queued-sale-undo',delta:-25,add:[item],remove:[]}
 ]},'queued-sale-and-undo');
 assert.equal(batch.status,200,batch.text);assert.equal(batch.data.balance,result.data.balance);
 const id=batch.data.mapping[item.instanceId],restored=batch.data.items.find(i=>i.instanceId===id);
 assert.ok(restored);assert.equal(restored.serial,item.serial);assert.equal(restored.packId,item.packId);
 assert.equal(restored.pulledAt,item.pulledAt);assert.equal(restored.seen,true);assert.deepEqual(restored.pickerChoice,item.pickerChoice);
 assert.equal(sql(server,"SELECT COUNT(*) n FROM instances WHERE serial='"+item.serial+"'")[0].n,1);
 assert.equal((await admin(server,'GET','/v1/admin/reconcile')).data.ok,true);
});

test('competing transfer and gameplay cannot both commit against one active device sequence',async()=>{
 const {me,result}=await linked();
 const [transfer,sync]=await Promise.all([
  post(me,'/v1/game/transfer',{deviceId:'device-main',newDeviceId:'device-race',sequence:0},'race-transfer-device'),
  post(me,'/v1/game/sync',{deviceId:'device-main',sequence:1,operations:[{id:'race-gameplay-credit',delta:17,add:[],remove:[]}]},'race-gameplay-sync')
 ]);
 assert.deepEqual([transfer.status,sync.status].sort(),[200,409],transfer.text+' '+sync.text);
 const final=(await state(me)).data;
 if(transfer.status===200){assert.equal(final.deviceId,'device-race');assert.equal(final.sequence,0);assert.equal(final.balance,result.data.balance);}
 else {assert.equal(final.deviceId,'device-main');assert.equal(final.sequence,1);assert.equal(final.balance,result.data.balance+17);}
 assert.equal((await admin(server,'GET','/v1/admin/reconcile')).data.ok,true);
});

test('game link and sync receipts survive history cleanup and replay without issuing again',async()=>{
 const {me,body,result}=await linked(),syncBody={deviceId:'device-main',sequence:1,operations:[{id:'durable-offline-credit',delta:31,add:[],remove:[]}]};
 const first=await post(me,'/v1/game/sync',syncBody,'durable-sync-request');assert.equal(first.status,200,first.text);
 const cleanup=await admin(server,'POST','/v1/admin/sweep',{limit:1},Date.now()+RULES.history.keepIdempotencyMs+60000);
 assert.equal(cleanup.status,200,cleanup.text);
 const linkReplay=await post(me,'/v1/game/link',body,'link-key-'+body.originId);
 assert.equal(linkReplay.status,200,linkReplay.text);assert.equal(linkReplay.data.replayed,true);
 const syncReplay=await post(me,'/v1/game/sync',syncBody,'durable-sync-request');
 assert.equal(syncReplay.status,200,syncReplay.text);assert.equal(syncReplay.data.replayed,true);assert.equal(syncReplay.data.balance,result.data.balance+31);
 assert.equal(sql(server,"SELECT COUNT(*) n FROM ledger WHERE account_id='"+result.data.accountId+"' AND ref='durable-offline-credit'")[0].n,1);
});

test('an uncertain linked market write retains its receipt past cleanup and can replay before gameplay advances',async()=>{
 const {me,result}=await linked(),body={instanceIds:[result.data.items[0].instanceId]},key='uncertain-system-sale';
 const first=await post(me,'/v1/sell',body,key,headers());assert.equal(first.status,200,first.text);
 const before=(await state(me)).data;
 const cleanup=await admin(server,'POST','/v1/admin/sweep',{limit:1},Date.now()+RULES.history.keepIdempotencyMs+60000);
 assert.equal(cleanup.status,200,cleanup.text);
 const replay=await post(me,'/v1/sell',body,key,headers());
 assert.equal(replay.status,200,replay.text);assert.equal(replay.data.replayed,true);
 const after=(await state(me)).data;assert.equal(after.balance,before.balance);assert.equal(after.sequence,before.sequence);
 assert.equal(sql(server,"SELECT COUNT(*) n FROM redemptions WHERE instance_id='"+body.instanceIds[0]+"'")[0].n,1);
 assert.equal((await admin(server,'GET','/v1/admin/reconcile')).data.ok,true);
});

test('optional buyout stays available after bids pass it and releases every bid hold exactly once',async()=>{
 const seller=await linked(),leader=await linked(),buyer=await linked();
 const made=await post(seller.me,'/v1/listings',{kind:'auction',instanceIds:[seller.result.data.items[0].instanceId],start:10,buyout:100},'buyout-after-high-bids',headers());
 assert.equal(made.status,200,made.text);const id=made.data.listingId;
 assert.equal((await post(leader.me,'/v1/listings/'+id+'/bid',{max:500},'high-leading-bid',headers())).status,200);
 const bid=await post(buyer.me,'/v1/listings/'+id+'/bid',{max:400},'high-competing-bid',headers());
 assert.equal(bid.status,200,bid.text);assert.ok(bid.data.price>=100);
 const buyout=await post(buyer.me,'/v1/listings/'+id+'/buyout',{expectedPrice:100},'buyout-high-bid-retry',headers());
 assert.equal(buyout.status,200,buyout.text);assert.equal(buyout.data.price,100);
 assert.equal((await post(buyer.me,'/v1/listings/'+id+'/buyout',{expectedPrice:100},'buyout-high-bid-retry',headers())).status,200);
 const a=(await state(leader.me)).data,b=(await state(buyer.me)).data,s=(await state(seller.me)).data;
 assert.equal(a.held,0);assert.equal(a.balance,1000);assert.equal(b.held,0);assert.equal(b.balance,900);assert.equal(s.balance,1098);
 assert.equal(sql(server,"SELECT COUNT(*) n FROM trades WHERE listing_id='"+id+"'")[0].n,1);
 assert.equal((await admin(server,'GET','/v1/admin/reconcile')).data.ok,true);
});
