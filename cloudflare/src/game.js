// Trusted offline gameplay joins the same wallet and instances used by the market. Every batch is guarded and
// receipted: retries cannot issue Credits or cards twice, and an old device cannot overwrite a new device's work.
import { ApiError, randomId, sha256 } from './util.js';
import { CATALOG } from './catalog.js';
import { Tx, mutate } from './ops.js';
import { runTraders } from './traders.js';

const fail = (code, message) => { throw new ApiError(409, code, message); };
function token(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{4,160}$/.test(value)) throw new ApiError(422, 'invalid', 'A valid ' + label + ' is required.');
  return value;
}
function integer(value, label) {
  if (!Number.isSafeInteger(value)) throw new ApiError(422, 'invalid', label + ' must be a whole number.');
  return value;
}
function itemsOf(value) {
  if (!Array.isArray(value) || value.length > 20000) throw new ApiError(422, 'invalid', 'Supply at most 20,000 card instances.');
  const ids = new Set(), serials = new Set();
  return value.map((it) => {
    if (!it || !CATALOG.cards[it.cardId] || typeof it.instanceId !== 'string' || !it.instanceId || it.instanceId.length > 160 ||
        typeof it.serial !== 'string' || !it.serial || it.serial.length > 160 ||
        (it.variantId != null && !CATALOG.variants.includes(it.variantId)) ||
        ((it.cardSkinId || it.skinId) != null && !CATALOG.skins.includes(it.cardSkinId || it.skinId))) throw new ApiError(422, 'invalid-card', 'A card has invalid identity or catalog details.');
    if (ids.has(it.instanceId) || serials.has(it.serial)) throw new ApiError(422, 'duplicate-card', 'A card occurs twice in this operation.');
    ids.add(it.instanceId); serials.add(it.serial);
    return { ...it, cardSkinId: it.cardSkinId || it.skinId || null };
  });
}
async function linkOf(env, id) { return env.DB.prepare('SELECT * FROM game_links WHERE account_id = ?').bind(id).first(); }
export async function gameState(env, who, receipt = null) {
  // A snapshot reads one database transaction, including when another player buys during this request.
  const [links,wallets,rows,mapped] = await env.DB.batch([
    env.DB.prepare("SELECT g.*,MAX(g.serial_counter,COALESCE((SELECT MAX(CAST(substr(i.serial,length(g.origin_id)+6) AS INTEGER)) FROM instances i WHERE i.serial LIKE 'CBL-' || g.origin_id || '-%'),0)) AS max_counter FROM game_links g WHERE account_id=?").bind(who.accountId),
    env.DB.prepare('SELECT balance, held, version FROM wallets WHERE account_id=?').bind(who.accountId),
    env.DB.prepare("SELECT * FROM instances WHERE owner_id=? AND state <> 'redeemed' ORDER BY created_at,id").bind(who.accountId),
    env.DB.prepare('SELECT m.local_id,m.instance_id,i.owner_id,i.state FROM game_mapping m JOIN instances i ON i.id=m.instance_id WHERE m.account_id=?').bind(who.accountId)
  ]);
  const link=links.results[0],wallet=wallets.results[0];
  const items = rows.results.map((r) => ({ ...(r.game_data ? JSON.parse(r.game_data) : {}), instanceId: r.id, cardId: r.card_id,
    variantId: r.variant_id, cardSkinId: r.skin_id, serial: r.serial, packId: r.pack_id, pulledAt: r.pulled_at, state: r.state, lockRef: r.escrow_ref }));
  const mapping = Object.fromEntries(mapped.results.map((r) => [r.local_id, r.owner_id === who.accountId && r.state !== 'redeemed' ? r.instance_id : null]));
  const locks = Object.fromEntries(items.filter((i) => i.state === 'escrow').map((i) => [i.instanceId, i.lockRef || 'market']));
  return { linked: !!link, accountId: who.accountId, deviceId: link?.device_id || null, originId:link?.origin_id || null, serialCounter:link?.max_counter || 0, sequence: link?.sequence || 0,
    revision: wallet.version, balance: wallet.balance, credits: wallet.balance, held: wallet.held, heldCredits: wallet.held,
    items, inventory: items, mapping, locks, receipt: receipt || (link ? JSON.parse(link.receipt) : null) };
}
async function addItems(env, tx, who, origin, items, now, migration, planned = new Map(), plannedRows = new Map(), removed = new Set()) {
  for (const it of items) {
    const prior = plannedRows.get(it.serial) || await env.DB.prepare('SELECT * FROM instances WHERE serial = ?').bind(it.serial).first();
    const mapped = await env.DB.prepare('SELECT instance_id FROM game_mapping WHERE account_id=? AND local_id=?').bind(who.accountId,it.instanceId).first();
    if (mapped && prior?.id !== mapped.instance_id) fail('identity-conflict','That local card identity already belongs to another serial.');
    if (prior) {
      if (prior.card_id !== it.cardId || (prior.variant_id || null) !== (it.variantId || null) || (prior.skin_id || null) !== it.cardSkinId) fail('identity-conflict', 'That serial has different card details.');
      const restore = !migration && prior.owner_id === who.accountId && ((prior.state === 'redeemed' && prior.game_removed) || removed.has(prior.id));
      if (!migration && !restore && (prior.owner_id !== who.accountId || prior.state !== 'owned')) fail('not-owned', 'That card has already been sold, reserved or redeemed.');
      if (restore) {
        tx.guard('not_owned',"EXISTS(SELECT 1 FROM instances WHERE id=? AND owner_id=? AND state='redeemed' AND game_removed=1)",prior.id,who.accountId);
        tx.add("UPDATE instances SET state='owned',game_removed=0,game_data=? WHERE id=?",JSON.stringify(it),prior.id);
        removed.delete(prior.id);
      }
      planned.set(it.instanceId,prior.id);
      plannedRows.set(it.serial,{...prior,state:restore ? 'owned' : prior.state,game_removed:restore ? 0 : prior.game_removed});
      // Sold/redeemed import copies stay with their canonical owner; mapping marks them absent in the snapshot.
      tx.add('INSERT INTO game_mapping(account_id,local_id,instance_id) VALUES(?,?,?) ON CONFLICT(account_id,local_id) DO NOTHING',who.accountId,it.instanceId,prior.id);
      if (prior.owner_id === who.accountId && prior.state !== 'redeemed') tx.add('UPDATE instances SET game_data=COALESCE(game_data,?) WHERE id=?',JSON.stringify(it),prior.id);
      continue;
    }
    const id = randomId('gmi');
    planned.set(it.instanceId,id);
    plannedRows.set(it.serial,{id,owner_id:who.accountId,card_id:it.cardId,variant_id:it.variantId || null,skin_id:it.cardSkinId,state:'owned'});
    tx.add("INSERT INTO instances(id,owner_id,card_id,variant_id,skin_id,serial,origin_code,pack_id,pulled_at,source,created_at,game_data) VALUES(?,?,?,?,?,?,?,?,?,'online-pack',?,?)",
      id,who.accountId,it.cardId,it.variantId || null,it.cardSkinId,it.serial,origin,it.packId || null,it.pulledAt || null,now,JSON.stringify(it));
    tx.add('INSERT INTO game_mapping(account_id,local_id,instance_id) VALUES(?,?,?)',who.accountId,it.instanceId,id);
  }
}
export async function linkGame(env, who, key, body, now) {
  const device = token(body.deviceId,'device id'), origin = token(body.originId,'save origin'), operation = token(body.operationId || body.opId,'operation id');
  const balance = integer(body.balance ?? body.credits,'Balance');
  if (balance < 0) throw new ApiError(422,'invalid','Balance cannot be negative.');
  const items = itemsOf(body.items || body.inventory);
  const result = await mutate(env,who,key || operation,{game:'link',body},now,async () => {
    const existing = await linkOf(env,who.accountId);
    if (existing) {
      if (existing.device_id !== device) fail('device-conflict','This account is active on another device. Transfer it before continuing.');
      if (existing.origin_id !== origin) fail('origin-conflict','This account is linked to another save.');
      return {tx:new Tx(env,now),result:{receipt:JSON.parse(existing.receipt)}};
    }
    const claimed = await env.DB.prepare('SELECT account_id FROM imports WHERE origin_code=?').bind(origin).first();
    if (claimed && claimed.account_id !== who.accountId) fail('origin-claimed','Another account imported this save.');
    const linkedOrigin = await env.DB.prepare('SELECT account_id FROM game_links WHERE origin_id=?').bind(origin).first();
    if (linkedOrigin && linkedOrigin.account_id !== who.accountId) fail('origin-claimed','Another account linked this save.');
    const tx=new Tx(env,now), receipt={id:operation,kind:'game-link',at:now,mergedCredits:balance};
    tx.guard('stale','NOT EXISTS(SELECT 1 FROM game_links WHERE account_id=?)',who.accountId);
    tx.add('INSERT INTO game_links(account_id,device_id,origin_id,receipt,created_at,serial_counter) VALUES(?,?,?,?,?,?)',who.accountId,device,origin,JSON.stringify(receipt),now,Math.max(0,integer(body.serialCounter ?? 0,'Serial counter')));
    tx.guard('funds','EXISTS(SELECT 1 FROM wallets WHERE account_id=? AND balance<=?)',who.accountId,Number.MAX_SAFE_INTEGER-balance);
    tx.credit(who.accountId,balance,'game migration',operation);
    await addItems(env,tx,who,origin,items,now,true);
    return {tx,result:{receipt}};
  });
  // First contact supplies disclosed traders immediately; the durable five-minute turn still bounds cron and links.
  try { await runTraders(env,now); } catch (error) { console.error(JSON.stringify({traderBootstrap:String(error.message).slice(0,160)})); }
  return {...await gameState(env,who,result.receipt),replayed:result.replayed};
}
export async function syncGame(env,who,key,body,now) {
  const device=token(body.deviceId,'device id'), sequence=integer(body.sequence,'Sequence');
  if (!Array.isArray(body.operations) || body.operations.length>100) throw new ApiError(422,'invalid','Supply at most 100 game operations.');
  const result=await mutate(env,who,key || ('game-sync-'+device+'-'+sequence),{game:'sync',body},now,async()=>{
    const link=await linkOf(env,who.accountId);
    if (!link) fail('not-linked','Link this game first.');
    if (link.device_id!==device) fail('device-conflict','This account is active on another device.');
    if (sequence!==link.sequence+1) fail('sequence-conflict','Sync the next sequence before continuing.');
    const tx=new Tx(env,now), acknowledged=[], seen=new Set(), planned=new Map(), plannedRows=new Map(), removed=new Set();
    tx.guard('stale','EXISTS(SELECT 1 FROM game_links WHERE account_id=? AND device_id=? AND sequence=?)',who.accountId,device,link.sequence);
    for (const op of body.operations) {
      const id=token(op.id,'operation id');
      if(seen.has(id)) throw new ApiError(422,'duplicate-operation','An operation occurs twice in this batch.');
      seen.add(id); acknowledged.push(id);
      const hash=await sha256(JSON.stringify(op));
      const prior=await env.DB.prepare('SELECT body_hash FROM game_operations WHERE account_id=? AND operation_id=?').bind(who.accountId,id).first();
      if(prior){if(prior.body_hash!==hash) throw new ApiError(422,'operation-mismatch','An operation id was already used for different gameplay.');continue;}
      const delta=integer(op.delta ?? op.creditDelta ?? 0,'Credit delta'), adds=itemsOf(op.add || []), removes=op.remove || [];
      if(!Array.isArray(removes)||removes.length>20000||new Set(removes).size!==removes.length) throw new ApiError(422,'invalid','Invalid removed card list.');
      tx.add('INSERT INTO game_operations(account_id,operation_id,body_hash) VALUES(?,?,?)',who.accountId,id,hash);
      if(delta<0){tx.guard('funds','EXISTS(SELECT 1 FROM wallets WHERE account_id=? AND balance-held>=?)',who.accountId,-delta);tx.debit(who.accountId,-delta,0,'gameplay',id);}
      else {tx.guard('funds','EXISTS(SELECT 1 FROM wallets WHERE account_id=? AND balance<=?)',who.accountId,Number.MAX_SAFE_INTEGER-delta);tx.credit(who.accountId,delta,'gameplay',id);}
      for(const local of removes){
        const mapped=await env.DB.prepare('SELECT instance_id FROM game_mapping WHERE account_id=? AND local_id=?').bind(who.accountId,local).first();
        const instance=planned.get(local) || mapped?.instance_id || local;
        tx.guard('not_owned',"EXISTS(SELECT 1 FROM instances WHERE id=? AND owner_id=? AND state='owned')",instance,who.accountId);
        tx.add("UPDATE instances SET state='redeemed',game_removed=1 WHERE id=? AND owner_id=? AND state='owned'",instance,who.accountId);
        removed.add(instance);
      }
      await addItems(env,tx,who,link.origin_id,adds,now,false,planned,plannedRows,removed);
    }
    tx.add('UPDATE game_links SET sequence=?,serial_counter=MAX(serial_counter,?) WHERE account_id=?',sequence,Math.max(0,integer(body.serialCounter ?? 0,'Serial counter')),who.accountId);
    // Revision also moves for card-only gameplay.
    tx.add('UPDATE wallets SET version=version+1 WHERE account_id=?',who.accountId);
    return {tx,result:{receipt:{kind:'game-sync',sequence,at:now},acknowledged}};
  });
  return {...await gameState(env,who,result.receipt),acknowledged:result.acknowledged,replayed:result.replayed};
}
export async function transferGame(env,who,key,body,now){
  const device=token(body.deviceId,'current device'), next=token(body.newDeviceId,'new device'), sequence=integer(body.sequence,'Sequence');
  const result=await mutate(env,who,key,{game:'transfer',body},now,async()=>{
    const link=await linkOf(env,who.accountId);
    if(!link || link.device_id!==device) fail('device-conflict','The current active device must authorize transfer.');
    if(link.sequence!==sequence) fail('sequence-conflict','Flush current gameplay before transferring.');
    const tx=new Tx(env,now);tx.guard('stale','EXISTS(SELECT 1 FROM game_links WHERE account_id=? AND device_id=? AND sequence=?)',who.accountId,device,sequence);
    tx.add('UPDATE game_links SET device_id=?,serial_counter=MAX(serial_counter,?) WHERE account_id=?',next,Math.max(0,integer(body.serialCounter ?? 0,'Serial counter')),who.accountId);
    return {tx,result:{receipt:{kind:'game-transfer',deviceId:next,at:now}}};
  });return {...await gameState(env,who,result.receipt),replayed:result.replayed};
}
export async function requireGameDevice(env,who,request){
  const link=await linkOf(env,who.accountId);if(!link)return;
  if(request.headers.get('x-game-device')!==link.device_id)fail('device-conflict','Continue from the active game device.');
  if(Number(request.headers.get('x-game-sequence'))!==link.sequence)fail('sequence-conflict','Sync gameplay before trading.');
  who.gameDevice=link.device_id;who.gameSequence=link.sequence;
}
