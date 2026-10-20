// Disclosed game traders are server actors with no sessions or usable recovery credential. The scheduler gives
// each a bounded decision turn; buying, bidding and listing use exactly the same guarded planners as players.
import { CATALOG } from './catalog.js';
import { baselineOf, RULES } from './economy.js';
import { createListing, buyListing, placeBid, buyoutListing } from './listings.js';
import { currentMode } from './maintenance.js';
import { Tx } from './ops.js';

const TRADERS = [ ['trader_atlas','Atlas Game Trader'], ['trader_iris','Iris Game Trader'], ['trader_nova','Nova Game Trader'] ];
export async function runTraders(env,now){
  if ((await currentMode(env)).mode !== 'open' || env.GAME_TRADERS === 'off') return {disabled:true};
  const slot=Math.floor(now/300000);
  // A durable slot claim prevents cron retries from issuing extra turns, even across Worker isolates.
  const claim=await env.DB.prepare('INSERT OR IGNORE INTO trader_runs(slot,created_at) VALUES(?,?)').bind(slot,now).run();
  if(!claim.meta.changes)return {replayed:true};
  const out={decisions:0,listed:0,bought:0,bid:0,errors:0};
  for(let n=0;n<TRADERS.length;n++){
    const [id,alias]=TRADERS[n], who={accountId:id,alias};
    const tx=new Tx(env,now);
    tx.add("INSERT OR IGNORE INTO accounts(id,alias,created_at,recovery_hash,actor_kind) VALUES(?,?,?,?,'trader')",id,alias,now,'non-authenticating:'+id);
    tx.add('INSERT OR IGNORE INTO wallets(account_id) VALUES(?)',id);
    // The first turn seeds finite working capital. No refill or balance reset follows.
    tx.add("INSERT INTO ledger(account_id,at,delta,reason,ref,balance_after,idem) SELECT ?,?,100000,'trader issuance',?,100000,'initial-capital' WHERE NOT EXISTS(SELECT 1 FROM ledger WHERE account_id=? AND idem='initial-capital')",id,now,id,id);
    tx.add("UPDATE wallets SET balance=100000,version=version+1 WHERE account_id=? AND version=0 AND balance=0 AND EXISTS(SELECT 1 FROM ledger WHERE account_id=? AND idem='initial-capital' AND at=?)",id,id,now);
    const cardId=Object.keys(CATALOG.cards)[(n*31)%Object.keys(CATALOG.cards).length], instance='trader_seed_'+n;
    tx.add("INSERT OR IGNORE INTO instances(id,owner_id,card_id,serial,origin_code,pack_id,pulled_at,source,created_at,game_data) VALUES(?,?,?,?,?,'standard',?,'online-pack',?,?)",
      instance,id,cardId,'CBL-TRDR-'+String(n+1).padStart(6,'0'),'TRDR',now,now,JSON.stringify({source:'pack',seen:false}));
    await env.DB.batch(tx.statements);
    try{
      const candidates=await env.DB.prepare("SELECT l.* FROM listings l JOIN accounts a ON a.id=l.seller_id WHERE l.status='active' AND l.ends_at>? AND a.actor_kind='player' AND l.kind IN ('fixed','auction') ORDER BY l.ends_at LIMIT 8").bind(now).all();
      let acted=false;
      for(const l of candidates.results){
        const fair=Math.max(1,Math.round(baselineOf(l.card_id,l.variant_id,l.skin_id)*1.1));
        const key='trader-'+slot+'-'+n;
        if(l.kind==='fixed'&&l.ask<=fair){await buyListing(env,who,key,l.id,{expectedPrice:l.ask},now);out.bought++;acted=true;break;}
        if(l.kind==='auction'&&l.buyout&&l.buyout<=fair){await buyoutListing(env,who,key,l.id,{expectedPrice:l.buyout},now);out.bought++;acted=true;break;}
        if(l.kind==='auction'&&l.leader_id!==id&&l.price<fair){await placeBid(env,who,key,l.id,{max:fair},now);out.bid++;acted=true;break;}
      }
      if(!acted){
        const open=await env.DB.prepare("SELECT COUNT(*) n FROM listings WHERE seller_id=? AND status='active'").bind(id).first();
        const card=await env.DB.prepare("SELECT * FROM instances WHERE owner_id=? AND state='owned' ORDER BY created_at LIMIT 1").bind(id).first();
        if(card&&open.n<2){const price=Math.max(RULES.price.min,Math.min(RULES.price.max,Math.round(baselineOf(card.card_id,card.variant_id,card.skin_id)*(1.05+n*.08))));
          await createListing(env,who,'trader-list-'+slot+'-'+n,{kind:n%2?'fixed':'auction',instanceIds:[card.id],ask:price,start:price,buyout:n%2?undefined:Math.max(price+1,Math.round(price*1.5)),durationMs:86400000},now);out.listed++;}
      }
      out.decisions++;
    }catch(error){out.errors++;console.error(JSON.stringify({trader:id,error:String(error.message).slice(0,160)}));}
  }
  await env.DB.prepare('DELETE FROM trader_runs WHERE slot<?').bind(slot-288).run();
  return out;
}
